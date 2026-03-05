'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// weclapp-to-bq.js
// Lädt alle Artikel aus der weclapp REST-API (alle Felder) und schreibt
// sie 1:1 in BigQuery. Schema wird dynamisch aus den API-Antworten ermittelt.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const https      = require('https');
const zlib       = require('zlib');
const { BigQuery } = require('@google-cloud/bigquery');

// ─── Konfiguration ────────────────────────────────────────────────────────────
const WECLAPP_API_KEY  = process.env.WECLAPP_API_KEY;
const WECLAPP_BASE_URL = (process.env.WECLAPP_BASE_URL || '').replace(/\/$/, '');
const PAGE_SIZE        = parseInt(process.env.WECLAPP_PAGE_SIZE || '100', 10);

const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;
const BQ_DATASET    = process.env.BQ_DATASET;
const BQ_TABLE      = process.env.WECLAPP_BQ_TABLE || 'weclapp_artikel';
const BQ_LOCATION   = process.env.BQ_LOCATION      || 'EU';
const BQ_BATCH_SIZE = parseInt(process.env.BQ_BATCH_SIZE || '500', 10);

if (!WECLAPP_API_KEY)  { console.error('Fehlende Variable: WECLAPP_API_KEY');  process.exit(1); }
if (!WECLAPP_BASE_URL) { console.error('Fehlende Variable: WECLAPP_BASE_URL'); process.exit(1); }
if (!BQ_PROJECT_ID)    { console.error('Fehlende Variable: BQ_PROJECT_ID');    process.exit(1); }
if (!BQ_DATASET)       { console.error('Fehlende Variable: BQ_DATASET');       process.exit(1); }

const bigquery = new BigQuery({ projectId: BQ_PROJECT_ID });

// ─── HTTPS-Hilfsfunktion ─────────────────────────────────────────────────────
function weclappGet(path) {
  return new Promise((resolve, reject) => {
    const url = `${WECLAPP_BASE_URL}${path}`;
    const opts = {
      method: 'GET',
      headers: {
        'AuthenticationToken': WECLAPP_API_KEY,
        'Accept':              'application/json',
        'Accept-Encoding':     'gzip, deflate',
      },
    };
    const req = https.request(url, opts, (res) => {
      let stream = res;
      const enc  = (res.headers['content-encoding'] || '').toLowerCase();
      if (enc === 'gzip')    stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());

      let body = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => { body += chunk; });
      stream.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error(`JSON-Parse-Fehler: ${e.message} (URL: ${url})`)); }
        } else {
          reject(new Error(`weclapp API ${res.statusCode} für ${url}: ${body.slice(0, 300)}`));
        }
      });
      stream.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Schema-Hilfsfunktionen ───────────────────────────────────────────────────

/** Spaltenname BigQuery-kompatibel machen */
function sanitize(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 300) || 'unnamed';
}

/** BQ-Typ eines JS-Wertes ermitteln. Arrays/Objekte → STRING (JSON). */
function inferType(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return 'BOOL';
  if (typeof value === 'number')  return Number.isInteger(value) ? 'INT64' : 'FLOAT64';
  if (typeof value === 'object')  return 'STRING'; // Array oder Object → JSON
  return 'STRING';
}

/** Zwei BQ-Typen zusammenführen (breiter Typ gewinnt). */
function mergeType(a, b) {
  if (a === b) return a;
  if (a === null) return b;
  if (b === null) return a;
  if (a === 'STRING' || b === 'STRING')   return 'STRING';
  if (a === 'FLOAT64' || b === 'FLOAT64') return 'FLOAT64';
  return 'STRING';
}

/** Scannt alle Datensätze → { feldname → BQ-Typ } */
function scanSchema(records) {
  const types = {};
  for (const rec of records) {
    for (const [key, value] of Object.entries(rec)) {
      const col = sanitize(key);
      const t   = inferType(value);
      types[col] = mergeType(types[col] ?? null, t);
    }
  }
  return types;
}

/** Baut BigQuery-Schema-Array aus dem Typ-Map */
function buildSchema(typeMap) {
  const fields = [
    { name: 'weclapp_id', type: 'STRING',    mode: 'REQUIRED' },
    { name: '_synced_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
  ];
  for (const [col, bqType] of Object.entries(typeMap)) {
    if (col === 'id') continue; // wird als weclapp_id gesondert behandelt
    fields.push({ name: col, type: bqType || 'STRING', mode: 'NULLABLE' });
  }
  return fields;
}

/** Konvertiert einen weclapp-Artikel in eine BQ-Zeile */
function toRow(record, syncedAt) {
  const row = {
    weclapp_id: String(record.id ?? ''),
    _synced_at: syncedAt,
  };
  for (const [key, value] of Object.entries(record)) {
    if (key === 'id') continue;
    const col = sanitize(key);
    if (!col) continue;
    if (value === null || value === undefined) {
      row[col] = null;
    } else if (typeof value === 'object') {
      row[col] = JSON.stringify(value);
    } else {
      row[col] = value;
    }
  }
  return row;
}

// ─── weclapp: Alle Artikel laden (Offset-Paging) ─────────────────────────────
async function fetchAllArticles() {
  const all = [];
  let page  = 1;

  // Gesamtanzahl vorab ermitteln
  let totalCount = null;
  try {
    const countData = await weclappGet('/article/count');
    totalCount = countData.count ?? null;
  } catch (_) {
    // Count-Endpoint nicht verfügbar – kein Problem
  }

  while (true) {
    const path = `/article?page=${page}&pageSize=${PAGE_SIZE}&serializeNulls=false`;
    let data;
    try {
      data = await weclappGet(path);
    } catch (err) {
      if (page === 1) throw err;
      console.warn(`\n  Warnung: Seite ${page} fehlgeschlagen – Abbruch (${err.message})`);
      break;
    }

    const items = Array.isArray(data.result) ? data.result : [];
    if (items.length === 0) break;

    all.push(...items);
    const total = totalCount ?? '?';
    process.stdout.write(`\r  → ${all.length} / ${total} Artikel geladen (Seite ${page})...`);

    if (items.length < PAGE_SIZE) break; // letzte Seite
    page++;
  }

  process.stdout.write('\n');
  return all;
}

// ─── BigQuery: Tabelle anlegen / Schema erweitern ─────────────────────────────
async function ensureTable(schema) {
  const dataset = bigquery.dataset(BQ_DATASET, { location: BQ_LOCATION });

  const [dsExists] = await dataset.exists();
  if (!dsExists) {
    console.log(`  Dataset "${BQ_DATASET}" wird angelegt…`);
    await dataset.create({ location: BQ_LOCATION });
  }

  const table = dataset.table(BQ_TABLE);
  const [tblExists] = await table.exists();

  if (!tblExists) {
    console.log(`  Tabelle "${BQ_TABLE}" wird neu angelegt…`);
    await table.create({
      schema: { fields: schema },
      timePartitioning: { type: 'DAY', field: '_synced_at' },
    });
    console.log(`  Tabelle angelegt.`);
    return;
  }

  // Tabelle existiert → neue Spalten ergänzen
  const [meta] = await table.getMetadata();
  const existing = new Set((meta.schema?.fields ?? []).map((f) => f.name));
  const newFields = schema.filter((f) => !existing.has(f.name));

  if (newFields.length > 0) {
    console.log(`  ${newFields.length} neue Spalte(n) hinzufügen: ` +
      newFields.map((f) => f.name).join(', '));
    meta.schema.fields.push(...newFields);
    await table.setMetadata(meta);
  } else {
    console.log(`  Tabelle existiert bereits – Schema unverändert.`);
  }
}

// ─── BigQuery: Zeilen einfügen ────────────────────────────────────────────────
async function insertRows(rows) {
  const table = bigquery.dataset(BQ_DATASET).table(BQ_TABLE);
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BQ_BATCH_SIZE) {
    const batch = rows.slice(i, i + BQ_BATCH_SIZE);
    await table.insert(batch, { skipInvalidRows: false, ignoreUnknownValues: false });
    inserted += batch.length;
    process.stdout.write(`\r  → ${inserted} / ${rows.length} Zeilen eingefügt…`);
  }
  process.stdout.write('\n');
}

// ─── Hauptprogramm ────────────────────────────────────────────────────────────
(async () => {
  try {
    console.log('═══════════════════════════════════════════');
    console.log(' weclapp → BigQuery Sync (Artikel)');
    console.log(`  API     : ${WECLAPP_BASE_URL}/article`);
    console.log(`  Projekt : ${BQ_PROJECT_ID}`);
    console.log(`  Dataset : ${BQ_DATASET}`);
    console.log(`  Tabelle : ${BQ_TABLE}`);
    console.log('═══════════════════════════════════════════');

    // 1. Alle Artikel von weclapp laden
    console.log('\n[1/3] weclapp-Artikel abrufen…');
    const articles = await fetchAllArticles();
    console.log(`  ${articles.length} Artikel geladen.`);

    if (articles.length === 0) {
      console.log('  Keine Artikel gefunden. Abbruch.');
      return;
    }

    // 2. Schema dynamisch ermitteln
    console.log('\n[2/3] Schema ermitteln…');
    const typeMap = scanSchema(articles);
    const schema  = buildSchema(typeMap);
    console.log(`  ${schema.length} Spalten erkannt.`);
    await ensureTable(schema);

    // 3. Daten einfügen
    console.log('\n[3/3] Daten in BigQuery einfügen…');
    const syncedAt = new Date().toISOString();
    const rows = articles.map((a) => toRow(a, syncedAt));
    await insertRows(rows);

    console.log('\n✓ Fertig.');
  } catch (err) {
    console.error('\nFehler:', err.message ?? err);
    process.exit(1);
  }
})();
