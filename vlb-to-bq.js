'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// vlb-to-bq.js
// Lädt alle Produkte aus der VLB REST-API und schreibt sie 1:1 in BigQuery.
// Schema wird dynamisch aus den API-Antworten ermittelt.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const https      = require('https');
const { BigQuery } = require('@google-cloud/bigquery');

// ─── Konfiguration ────────────────────────────────────────────────────────────
const VLB_API_KEY   = process.env.VLB_API_KEY;
const VLB_BASE_URL  = (process.env.VLB_BASE_URL || 'https://api.vlb.de/api/v2').replace(/\/$/, '');
const VLB_SEARCH    = process.env.VLB_SEARCH || ''; // z.B. "VL=verbum" – leer = alle
const VLB_PAGE_SIZE = 250;                          // API-Maximum
const VLB_MAX_PAGE  = 40;                           // Deep-paging Sperre: max. 10.000

const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;
const BQ_DATASET    = process.env.BQ_DATASET;
const BQ_TABLE      = process.env.VLB_BQ_TABLE || 'vlb_produkte';
const BQ_LOCATION   = process.env.BQ_LOCATION  || 'EU';
const BQ_BATCH_SIZE = parseInt(process.env.BQ_BATCH_SIZE || '500', 10);

if (!VLB_API_KEY)   { console.error('Fehlende Variable: VLB_API_KEY');   process.exit(1); }
if (!BQ_PROJECT_ID) { console.error('Fehlende Variable: BQ_PROJECT_ID'); process.exit(1); }
if (!BQ_DATASET)    { console.error('Fehlende Variable: BQ_DATASET');    process.exit(1); }

const bigquery = new BigQuery({ projectId: BQ_PROJECT_ID });

// ─── HTTPS-Hilfsfunktion ─────────────────────────────────────────────────────
function vlbGet(path) {
  return new Promise((resolve, reject) => {
    const url = `${VLB_BASE_URL}${path}`;
    const opts = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VLB_API_KEY}`,
        'Accept':        'application/json',
      },
    };
    const req = https.request(url, opts, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error(`JSON-Parse-Fehler: ${e.message} (URL: ${url})`)); }
        } else {
          reject(new Error(`VLB API ${res.statusCode} für ${url}: ${body.slice(0, 200)}`));
        }
      });
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

/**
 * Ermittelt den BQ-Typ eines JS-Wertes (flach).
 * Arrays und Objekte → STRING (als JSON gespeichert).
 */
function inferType(value) {
  if (value === null || value === undefined) return null; // unbekannt
  if (typeof value === 'boolean') return 'BOOL';
  if (typeof value === 'number')  return 'FLOAT64';
  if (typeof value === 'object')  return 'STRING'; // Array oder Object → JSON
  return 'STRING';
}

/**
 * Führt zwei BQ-Typen zusammen (dominantes Typ gewinnt).
 * Reihenfolge: STRING > FLOAT64 > BOOL > null
 */
function mergeType(a, b) {
  if (a === b) return a;
  if (a === null) return b;
  if (b === null) return a;
  if (a === 'STRING' || b === 'STRING') return 'STRING';
  if (a === 'FLOAT64' || b === 'FLOAT64') return 'FLOAT64';
  return 'STRING';
}

/**
 * Scannt eine Liste von Datensätzen und liefert {feldname → BQ-Typ}.
 * Nur flache Felder; Arrays/Objekte werden direkt als STRING markiert.
 */
function scanSchema(records) {
  const types = {};
  for (const rec of records) {
    for (const [key, value] of Object.entries(rec)) {
      const t = inferType(value);
      types[key] = mergeType(types[key] ?? null, t);
    }
  }
  return types;
}

/** Baut BigQuery-Schema-Array aus dem Typ-Map */
function buildSchema(typeMap) {
  const fields = [
    { name: 'product_id', type: 'STRING',    mode: 'REQUIRED' },
    { name: '_synced_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
  ];
  for (const [key, bqType] of Object.entries(typeMap)) {
    if (key === 'productId') continue; // wird als product_id gesondert behandelt
    const name = sanitize(key);
    if (!name) continue;
    fields.push({ name, type: bqType || 'STRING', mode: 'NULLABLE' });
  }
  return fields;
}

/** Konvertiert einen VLB-Datensatz in eine BQ-Zeile */
function toRow(record, syncedAt) {
  const row = {
    product_id: record.productId || '',
    _synced_at: syncedAt,
  };
  for (const [key, value] of Object.entries(record)) {
    if (key === 'productId') continue;
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

// ─── VLB: Alle Seiten laden ───────────────────────────────────────────────────
async function fetchAllProducts() {
  const all = [];
  const maxPages = VLB_MAX_PAGE;

  let searchParam = '';
  if (VLB_SEARCH) {
    searchParam = `&search=${encodeURIComponent(VLB_SEARCH)}`;
  }

  for (let page = 1; page <= maxPages; page++) {
    const path = `/products?page=${page}&size=${VLB_PAGE_SIZE}${searchParam}`;
    let data;
    try {
      data = await vlbGet(path);
    } catch (err) {
      if (page === 1) throw err;
      console.warn(`\n  Warnung: Seite ${page} fehlgeschlagen – Abbruch (${err.message})`);
      break;
    }

    const items = Array.isArray(data.content) ? data.content : [];
    if (items.length === 0) break;

    all.push(...items);
    process.stdout.write(
      `\r  → ${all.length} / ${data.totalElements ?? '?'} Produkte geladen ` +
      `(Seite ${page}/${data.totalPages ?? '?'})...`
    );

    if (data.lastPage || data.last || page >= (data.totalPages ?? 0)) break;
  }

  process.stdout.write('\n');
  return all;
}

// ─── BigQuery: Tabelle anlegen / aktualisieren ────────────────────────────────
async function ensureTable(schema) {
  const dataset = bigquery.dataset(BQ_DATASET, { location: BQ_LOCATION });

  // Dataset anlegen falls nicht vorhanden
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

  // Tabelle existiert → Schema erweitern (neue Spalten hinzufügen)
  const [meta] = await table.getMetadata();
  const existing = new Set((meta.schema?.fields ?? []).map((f) => f.name));
  const newFields = schema.filter((f) => !existing.has(f.name));

  if (newFields.length > 0) {
    console.log(`  ${newFields.length} neue Spalte(n) werden hinzugefügt: ` +
      newFields.map((f) => f.name).join(', '));
    meta.schema.fields.push(...newFields);
    await table.setMetadata(meta);
  } else {
    console.log(`  Tabelle existiert bereits – Schema unverändert.`);
  }
}

// ─── BigQuery: Daten einfügen ─────────────────────────────────────────────────
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
    console.log(' VLB → BigQuery Sync');
    console.log(`  Projekt : ${BQ_PROJECT_ID}`);
    console.log(`  Dataset : ${BQ_DATASET}`);
    console.log(`  Tabelle : ${BQ_TABLE}`);
    if (VLB_SEARCH) console.log(`  Filter  : ${VLB_SEARCH}`);
    console.log('═══════════════════════════════════════════');

    // 1. Alle Produkte von VLB laden
    console.log('\n[1/3] VLB-Produkte abrufen…');
    const products = await fetchAllProducts();
    console.log(`  ${products.length} Produkte geladen.`);

    if (products.length === 0) {
      console.log('  Keine Produkte gefunden. Abbruch.');
      return;
    }

    // 2. Schema dynamisch ermitteln
    console.log('\n[2/3] Schema ermitteln…');
    const typeMap = scanSchema(products);
    const schema  = buildSchema(typeMap);
    console.log(`  ${schema.length} Spalten erkannt.`);
    await ensureTable(schema);

    // 3. Daten einfügen
    console.log('\n[3/3] Daten in BigQuery einfügen…');
    const syncedAt = new Date().toISOString();
    const rows = products.map((p) => toRow(p, syncedAt));
    await insertRows(rows);

    console.log('\n✓ Fertig.');
  } catch (err) {
    console.error('\nFehler:', err.message ?? err);
    process.exit(1);
  }
})();
