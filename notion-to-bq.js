'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// notion-to-bq.js
//SYNC_SINCE=all MAX_PAGES=5 node notion-to-bq.js --recreate
//BESTELL_NR=VM-001 node notion-to-bq.js          ← gezielt eine Bestell-Nr
//node notion-to-bq.js --bestell-nr=8652000         ← alternativ als CLI-Arg
// Liest ALLE Seiten aus einer Notion-Datenbank, löst alle Relationen auf
// und überträgt die Daten 1:1 in eine BigQuery-Tabelle.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const { Client }    = require('@notionhq/client');
const { BigQuery }  = require('@google-cloud/bigquery');

// ─── Konfiguration ────────────────────────────────────────────────────────────
const DATABASE_ID   = process.env.NOTION_DATA_SOURCE_ID;
const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;
const BQ_DATASET    = process.env.BQ_DATASET;
const BQ_TABLE      = process.env.BQ_TABLE;            // optional, sonst aus DB-Titel
const CONCURRENCY   = parseInt(process.env.CONCURRENCY   || '2',   10); // parallele API-Calls
const BQ_BATCH_SIZE = parseInt(process.env.BQ_BATCH_SIZE || '500', 10); // Rows pro Insert
const BQ_LOCATION   = process.env.BQ_LOCATION || 'EU';
const MAX_PAGES     = parseInt(process.env.MAX_PAGES     || '0',   10); // 0 = alle
const SYNC_SINCE    = process.env.SYNC_SINCE || 'today';             // 'today', 'yesterday', oder ISO-String
const FUNCTION_SECRET = (process.env.FUNCTION_SECRET || '').trim();
const RECREATE_TABLE  = process.argv.includes('--recreate');

// Bestell-Nr: aus Env oder --bestell-nr=xxx CLI-Arg
const _bestellNrArg = (process.argv.find((a) => /^--bestell-nr=/i.test(a)) || '').replace(/^--bestell-nr=/i, '').trim();
const BESTELL_NR    = (_bestellNrArg || (process.env.BESTELL_NR || '').trim()) || null;

if (!DATABASE_ID || !BQ_PROJECT_ID || !BQ_DATASET) {
  console.error('Fehlende Pflicht-Variablen: NOTION_DATA_SOURCE_ID, BQ_PROJECT_ID, BQ_DATASET');
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────
const notion = new Client({
  auth:           process.env.NOTION_TOKEN,
  notionVersion:  process.env.NOTION_VERSION || '2022-06-28',
});

const bigquery = new BigQuery({ projectId: BQ_PROJECT_ID });

// ─── Concurrency-Limiter (ohne externe Abhängigkeit) ─────────────────────────
function createLimiter(max) {
  let active = 0;
  const queue = [];
  return (fn) =>
    new Promise((resolve, reject) => {
      const next = () => {
        active++;
        Promise.resolve()
          .then(() => fn())
          .then(
            (v) => { active--; if (queue.length) queue.shift()(); resolve(v); },
            (e) => { active--; if (queue.length) queue.shift()(); reject(e); }
          );
      };
      active < max ? next() : queue.push(next);
    });
}

const limit = createLimiter(CONCURRENCY);

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Notion-Eigenschaftsname → BigQuery-konformer Spaltenname */
function sanitize(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/^(\d)/, '_$1')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 300) || 'unnamed';
}

/** Rich-Text-Array → einfacher String */
function richText(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr.map((t) => t.plain_text).join('');
}

// ─── Seiten-Titel-Cache ───────────────────────────────────────────────────────
const titleCache      = new Map(); // page_id → title (Rückwärtskompatibilität)
const pageDetailsCache = new Map(); // page_id → { title, urheberart }

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** Berechnet das Start-Datum für den Sync-Filter */
function getSyncStartDate() {
  if (SYNC_SINCE === 'all') return null;

  const now = new Date();
  let startDate;

  if (SYNC_SINCE === 'today') {
    // Heute 00:00 UTC
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  } else if (SYNC_SINCE === 'yesterday') {
    // Gestern 00:00 UTC
    startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  } else {
    // ISO-String oder Custom-Datum
    startDate = new Date(SYNC_SINCE);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error(
        `Ungueltiger SYNC_SINCE Wert: "${SYNC_SINCE}". Erlaubt: today, yesterday, all oder ISO-String.`
      );
    }
  }

  return startDate.toISOString();
}

function getProvidedSecret(req) {
  const headerSecret = req.get('x-function-secret');
  if (headerSecret) return String(headerSecret).trim();

  const authHeader = req.get('authorization');
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    return authHeader.replace(/^Bearer\s+/i, '').trim();
  }

  if (typeof req.query?.secret === 'string' && req.query.secret) {
    return req.query.secret.trim();
  }

  if (typeof req.body?.secret === 'string' && req.body.secret) {
    return req.body.secret.trim();
  }

  return '';
}

function isAuthorizedRequest(req) {
  if (!FUNCTION_SECRET) return true;
  return getProvidedSecret(req) === FUNCTION_SECRET;
}

async function resolvePage(pageId) {
  if (pageDetailsCache.has(pageId)) return pageDetailsCache.get(pageId);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const page       = await notion.pages.retrieve({ page_id: pageId });
      const titleProp  = Object.values(page.properties).find((p) => p.type === 'title');
      const title      = richText(titleProp?.title) || pageId;
      // Urheberart ist eine Relation → ersten verlinkten Seiten-Titel auflösen
      let urheberart = null;
      const urheberartRel = page.properties['Urheberart']?.relation ?? [];
      if (urheberartRel.length > 0) {
        try {
          const uPage = await notion.pages.retrieve({ page_id: urheberartRel[0].id });
          const uTitleProp = Object.values(uPage.properties).find((p) => p.type === 'title');
          urheberart = richText(uTitleProp?.title) || null;
        } catch (_) { /* ignorieren */ }
      }
      const details    = { title, urheberart };
      pageDetailsCache.set(pageId, details);
      titleCache.set(pageId, title);
      return details;
    } catch (err) {
      if (err.code === 'rate_limited' && attempt < 5) {
        await sleep(attempt * 3000);
        continue;
      }
      const fallback = { title: pageId, urheberart: null };
      pageDetailsCache.set(pageId, fallback);
      titleCache.set(pageId, pageId);
      return fallback;
    }
  }
}

async function resolveTitle(pageId) {
  const details = await resolvePage(pageId);
  return details.title;
}

// ─── Relation mit Pagination (has_more) ──────────────────────────────────────
async function fetchFullRelation(pageId, propId, initialItems) {
  // Wenn has_more=true, alle weiteren Seiten laden
  const all = [...initialItems];
  let cursor;
  const firstRes = await notion.pages.properties.retrieve({
    page_id: pageId, property_id: propId, page_size: 100,
  });
  // Das Ergebnis ist ein "list" Objekt mit results[]
  if (firstRes.object !== 'list') return all;
  all.length = 0; // reset, vollständig vom Server laden
  all.push(...(firstRes.results ?? []));
  cursor = firstRes.has_more ? firstRes.next_cursor : undefined;
  while (cursor) {
    const res = await notion.pages.properties.retrieve({
      page_id: pageId, property_id: propId,
      start_cursor: cursor, page_size: 100,
    });
    all.push(...(res.results ?? []));
    cursor = res.has_more ? res.next_cursor : undefined;
  }
  return all.map((r) => (r.relation ?? r)); // items enthalten {relation: {id}}
}

// ─── Notion Property → BQ-Wert ───────────────────────────────────────────────
async function propValue(pageId, propId, prop) {
  if (!prop) return null;

  switch (prop.type) {
    case 'title':             return richText(prop.title);
    case 'rich_text':         return richText(prop.rich_text);
    case 'number':            return prop.number ?? null;
    case 'select':            return prop.select?.name ?? null;
    case 'status':            return prop.status?.name ?? null;
    case 'checkbox':          return prop.checkbox ?? null;
    case 'url':               return prop.url ?? null;
    case 'email':             return prop.email ?? null;
    case 'phone_number':      return prop.phone_number ?? null;
    case 'created_time':      return prop.created_time ?? null;
    case 'last_edited_time':  return prop.last_edited_time ?? null;
    case 'created_by':        return prop.created_by?.name ?? prop.created_by?.id ?? null;
    case 'last_edited_by':    return prop.last_edited_by?.name ?? prop.last_edited_by?.id ?? null;

    case 'unique_id': {
      const uid = prop.unique_id;
      if (!uid) return null;
      return uid.prefix ? `${uid.prefix}-${uid.number}` : String(uid.number);
    }

    case 'verification':
      return prop.verification?.state ?? null;

    case 'multi_select':
      return (prop.multi_select ?? []).map((s) => s.name);

    case 'people':
      return (prop.people ?? []).map((p) => p.name ?? p.id);

    case 'files':
      return (prop.files ?? [])
        .map((f) => f.file?.url ?? f.external?.url)
        .filter(Boolean);

    case 'date': {
      const d = prop.date;
      if (!d) return null;
      return { start: d.start ?? null, end: d.end ?? null };
    }

    case 'formula': {
      const f = prop.formula;
      if (!f) return null;
      switch (f.type) {
        case 'string':  return f.string ?? null;
        case 'number':  return f.number  != null ? String(f.number)  : null;
        case 'boolean': return f.boolean != null ? String(f.boolean) : null;
        case 'date':    return f.date?.start ?? null;
        default:        return null;
      }
    }

    case 'relation': {
      let items = prop.relation ?? [];
      // Notion paginiert Relationen bei > 25 Einträgen
      if (prop.has_more && propId) {
        const full = await fetchFullRelation(pageId, propId, items);
        items = full.map((r) => r?.relation ?? r).filter((r) => r?.id);
      }
      if (items.length === 0) return [];
      return items.map((r) => {
        const det = pageDetailsCache.get(r.id);
        return {
          page_id:    r.id,
          title:      det?.title      ?? titleCache.get(r.id) ?? r.id,
          urheberart: det?.urheberart ?? null,
        };
      });
    }

    case 'rollup': {
      const ru = prop.rollup;
      if (!ru) return null;
      switch (ru.type) {
        case 'number': return ru.number != null ? String(ru.number) : null;
        case 'date':   return ru.date?.start ?? null;
        case 'array':
          return (ru.array ?? [])
            .map((v) => {
              if (v.type === 'number')     return String(v.number ?? '');
              if (v.type === 'title')      return richText(v.title) ?? '';
              if (v.type === 'rich_text')  return richText(v.rich_text) ?? '';
              if (v.type === 'select')     return v.select?.name ?? '';
              return '';
            })
            .filter(Boolean)
            .join(', ');
        default: return null;
      }
    }

    default:
      return null;
  }
}

// ─── BigQuery Schema-Generierung ─────────────────────────────────────────────
function notionPropToBqField(propName, prop) {
  const name = sanitize(propName);
  switch (prop.type) {
    case 'title':
    case 'rich_text':
    case 'select':
    case 'status':
    case 'url':
    case 'email':
    case 'phone_number':
    case 'formula':
    case 'rollup':
    case 'created_by':
    case 'last_edited_by':
    case 'unique_id':
    case 'verification':
      return { name, type: 'STRING', mode: 'NULLABLE' };

    case 'number':
      return { name, type: 'FLOAT64', mode: 'NULLABLE' };

    case 'checkbox':
      return { name, type: 'BOOL', mode: 'NULLABLE' };

    case 'created_time':
    case 'last_edited_time':
      return { name, type: 'TIMESTAMP', mode: 'NULLABLE' };

    case 'date':
      return {
        name, type: 'RECORD', mode: 'NULLABLE',
        fields: [
          { name: 'start', type: 'STRING', mode: 'NULLABLE' },
          { name: 'end',   type: 'STRING', mode: 'NULLABLE' },
        ],
      };

    case 'multi_select':
    case 'people':
    case 'files':
      return { name, type: 'STRING', mode: 'REPEATED' };

    case 'relation':
      return {
        name, type: 'RECORD', mode: 'REPEATED',
        fields: [
          { name: 'page_id',    type: 'STRING', mode: 'NULLABLE' },
          { name: 'title',      type: 'STRING', mode: 'NULLABLE' },
          { name: 'urheberart', type: 'STRING', mode: 'NULLABLE' },
        ],
      };

    default:
      return { name, type: 'STRING', mode: 'NULLABLE' };
  }
}

function buildSchema(dbProps) {
  const fields = [
    { name: 'page_id',    type: 'STRING',    mode: 'REQUIRED' },
    { name: '_synced_at', type: 'TIMESTAMP', mode: 'NULLABLE' },
  ];
  for (const [propName, prop] of Object.entries(dbProps)) {
    fields.push(notionPropToBqField(propName, prop));
  }
  return fields;
}

/** Normalisiert einen JS-Wert entsprechend des echten BigQuery-Feldtyps */
function normalizeForField(value, fieldDef) {
  if (!fieldDef) return value ?? null;

  if (fieldDef.mode === 'REPEATED') {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  }

  if (value == null) return null;

  const temporalTypes = new Set(['TIMESTAMP', 'DATE', 'DATETIME', 'TIME']);

  // Scalar-Felder duerfen kein Array enthalten.
  if (Array.isArray(value)) {
    if (fieldDef.type === 'STRING') {
      return value.some((v) => v !== null && typeof v === 'object')
        ? JSON.stringify(value)
        : value.join(', ');
    }

    const first = value.length > 0 ? value[0] : null;
    if (first == null) return null;

    if (fieldDef.type === 'BOOL') {
      if (typeof first === 'boolean') return first;
      if (typeof first === 'string') {
        if (/^(true|1)$/i.test(first)) return true;
        if (/^(false|0)$/i.test(first)) return false;
      }
      return null;
    }

    if (['FLOAT64', 'NUMERIC', 'BIGNUMERIC', 'INT64'].includes(fieldDef.type)) {
      const parsed = Number(first);
      return Number.isFinite(parsed) ? parsed : null;
    }

    if (temporalTypes.has(fieldDef.type)) {
      return typeof first === 'string' ? first : null;
    }

    if (fieldDef.type === 'RECORD' && typeof first === 'object') {
      return first;
    }

    return null;
  }

  // Scalar-Felder duerfen kein Objekt enthalten (ausser RECORD).
  if (typeof value === 'object') {
    if (fieldDef.type === 'RECORD') return value;
    if (fieldDef.type === 'STRING') return JSON.stringify(value);

    if (temporalTypes.has(fieldDef.type)) {
      if (typeof value.start === 'string') return value.start;
      if (typeof value.end === 'string') return value.end;
      return null;
    }

    return null;
  }

  if (['FLOAT64', 'NUMERIC', 'BIGNUMERIC', 'INT64'].includes(fieldDef.type)) {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (fieldDef.type === 'BOOL') {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (/^(true|1)$/i.test(value)) return true;
      if (/^(false|0)$/i.test(value)) return false;
    }
    return null;
  }

  return value;
}

// ─── Notion: Seiten laden (gefiltert nach last_edited_time) ─────────────────
async function fetchAllPages() {
  const pages = [];
  let cursor;
  const batchSize = MAX_PAGES > 0 ? Math.min(MAX_PAGES, 100) : 100;
  const syncStartDate = !BESTELL_NR ? getSyncStartDate() : null;

  if (BESTELL_NR) {
    console.log(`  Filter: Bestell-Nr = "${BESTELL_NR}"`);
  } else if (syncStartDate) {
    console.log(`  Filter: last_edited_time >= ${syncStartDate}`);
  } else {
    console.log('  Filter: kein Zeitfilter (SYNC_SINCE=all)');
  }

  const apiFilter = BESTELL_NR
    ? { property: 'Bestell-Nr', formula: { string: { equals: BESTELL_NR } } }
    : syncStartDate
      ? { timestamp: 'last_edited_time', last_edited_time: { on_or_after: syncStartDate } }
      : null;

  do {
    const queryOpts = {
      data_source_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: batchSize,
    };

    if (apiFilter) queryOpts.filter = apiFilter;

    const res = await notion.dataSources.query(queryOpts);
    pages.push(...res.results);
    if (MAX_PAGES > 0 && pages.length >= MAX_PAGES) {
      pages.splice(MAX_PAGES);
      break;
    }
    cursor = res.has_more ? res.next_cursor : undefined;
    process.stdout.write(`\r  → ${pages.length} Seiten geladen...`);
  } while (cursor);
  console.log();

  return pages;
}

// ─── Alle Relation-IDs vorher sammeln & Titel cachen ─────────────────────────
function collectRelationIds(pages, dbProps) {
  const ids = new Set();
  const relPropNames = Object.entries(dbProps)
    .filter(([, v]) => v.type === 'relation')
    .map(([k]) => k);

  for (const page of pages) {
    for (const name of relPropNames) {
      const prop = page.properties[name];
      for (const r of (prop?.relation ?? [])) ids.add(r.id);
    }
  }
  return ids;
}

async function preloadTitles(ids) {
  const arr = [...ids];
  let done = 0;

  for (let i = 0; i < arr.length; i += CONCURRENCY) {
    const batch = arr.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map((id) =>
        limit(async () => {
          await resolveTitle(id);
          done++;
          if (done % 50 === 0 || done === arr.length) {
            process.stdout.write(`\r  → ${done}/${arr.length} Relation-Titel gecacht`);
          }
        })
      )
    );
  }
  console.log();
}


// ─── Schema-Merge: Subfelder in bestehende RECORD-Spalten einfügen ───────────
function mergeRecordSubfields(existingFields, desiredFields) {
  const byName = {};
  for (const f of existingFields) byName[f.name] = f;
  let changed = false;
  for (const desired of desiredFields) {
    if (!byName[desired.name]) {
      existingFields.push(desired);
      changed = true;
    } else if (
      desired.type === 'RECORD' &&
      byName[desired.name].type === 'RECORD' &&
      Array.isArray(desired.fields)
    ) {
      byName[desired.name].fields = byName[desired.name].fields || [];
      if (mergeRecordSubfields(byName[desired.name].fields, desired.fields)) changed = true;
    }
  }
  return changed;
}

// ─── BigQuery: Tabelle sicherstellen ─────────────────────────────────────────
async function ensureTable(tableName, schema) {
  const ds = bigquery.dataset(BQ_DATASET);
  const [dsExists] = await ds.exists();
  if (!dsExists) {
    console.log(`  → Dataset "${BQ_DATASET}" erstellen (${BQ_LOCATION})...`);
    await ds.create({ location: BQ_LOCATION });
  }

  const tbl = ds.table(tableName);
  const [tExists] = await tbl.exists();
  if (!tExists) {
    console.log(`  → Tabelle "${BQ_DATASET}.${tableName}" erstellen...`);
    await tbl.create({
      schema,
      timePartitioning: { type: 'DAY', field: '_synced_at' },
    });
    console.log(`  → Tabelle erstellt.`);
  } else {
    const [meta] = await tbl.getMetadata();
    meta.schema = meta.schema || { fields: [] };
    meta.schema.fields = meta.schema.fields || [];

    // Normalisiert BQ-Typ-Aliase: FLOAT=FLOAT64, BOOLEAN=BOOL, INTEGER=INT64
    const normType = (t) => ({ FLOAT: 'FLOAT64', BOOLEAN: 'BOOL', INTEGER: 'INT64' })[t] || t;

    // Prüfe ob Typ-Konflikte vorliegen (z.B. STRING → RECORD nicht in-place möglich)
    const conflicts = schema.filter(desired => {
      const existing = meta.schema.fields.find(f => f.name === desired.name);
      return existing && normType(existing.type) !== normType(desired.type);
    });

    if (conflicts.length > 0) {
      if (RECREATE_TABLE) {
        console.log(`  → ${conflicts.length} Typ-Konflikte gefunden (${conflicts.map(f=>f.name).join(', ')}).`);
        console.log(`  → Tabelle "${BQ_DATASET}.${tableName}" wird gelöscht und neu erstellt...`);
        await tbl.delete();
        // Kurz warten bis Löschung propagiert
        await new Promise(r => setTimeout(r, 3000));
        await ds.table(tableName).create({
          schema,
          timePartitioning: { type: 'DAY', field: '_synced_at' },
        });
        console.log(`  → Tabelle neu erstellt.`);
        return ds.table(tableName);
      } else {
        console.error(`\n  ✗ Schema-Konflikt: ${conflicts.length} Felder haben inkompatible Typen:`);
        conflicts.forEach(f => {
          const ex = meta.schema.fields.find(e => e.name === f.name);
          console.error(`    "${f.name}": BQ=${ex.type} → gewünscht=${f.type}`);
        });
        console.error('\n  → Tabelle mit --recreate neu erstellen: node notion-to-bq.js --recreate');
        console.error('     ACHTUNG: Alle vorhandenen Daten gehen verloren. Danach SYNC_SINCE=all setzen.');
        process.exit(1);
      }
    }

    const changed = mergeRecordSubfields(meta.schema.fields, schema);
    if (changed) {
      await tbl.setMetadata(meta);
      console.log(`  → Tabelle "${BQ_DATASET}.${tableName}" Schema aktualisiert (inkl. Subfelder).`);
    } else {
      console.log(`  → Tabelle "${BQ_DATASET}.${tableName}" existiert bereits. Schema unverändert.`);
    }
  }
  return tbl;
}

// ─── BigQuery: Batch-Load (vermeidet Streaming Buffer Probleme) ─────────────
async function batchLoad(tbl, rows) {
  const fs = require('fs/promises');
  const os = require('os');
  const path = require('path');

  // NDJSON temporär lokal speichern und als Load-Job hochladen.
  const tempFile = path.join(
    os.tmpdir(),
    `notion-bq-${Date.now()}-${Math.random().toString(16).slice(2)}.ndjson`
  );

  const ndjson = `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`;

  try {
    await fs.writeFile(tempFile, ndjson, 'utf8');

    const [job] = await tbl.load(tempFile, {
      sourceFormat: 'NEWLINE_DELIMITED_JSON',
      ignoreUnknownValues: true,
      writeDisposition: 'WRITE_APPEND',
    });

    if (job?.id) {
      console.log(`  → Load-Job gestartet: ${job.id}`);
    }
  } catch (err) {
    // Formatiere BigQuery Load-Job Fehler
    if (err.errors) {
      console.error(`\n  BigQuery Load-Fehler (${err.errors?.length ?? 0} Fehler):`);
      (err.errors ?? []).slice(0, 5).forEach((e) => {
        console.error(`    ${e.message}`);
      });
      if ((err.errors?.length ?? 0) > 5) console.error(`    ... und ${err.errors.length - 5} weitere.`);
    }
    throw err;
  } finally {
    await fs.unlink(tempFile).catch(() => {});
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log('═══════════════════════════════════════════════════');
  console.log(' Notion → BigQuery Sync');
  console.log(`   DB  : ${DATABASE_ID}`);
  console.log(`   BQ  : ${BQ_PROJECT_ID}.${BQ_DATASET}`);
  if (BESTELL_NR) console.log(`   NR  : ${BESTELL_NR}`);
  console.log('═══════════════════════════════════════════════════\n');

  // ── 1. Notion Datenbankschema laden ────────────────────────────────────────
  console.log('1/6  Notion-Datenbankschema laden...');
  const db      = await notion.dataSources.retrieve({ data_source_id: DATABASE_ID });
  const dbTitle = richText(db.title) || 'notion_data';
  const tableName = BQ_TABLE || sanitize(dbTitle) || 'notion_data';
  const dbProps   = db.properties;
  const propCount = Object.keys(dbProps).length;
  console.log(`     Datenbank : "${dbTitle}"`);
  console.log(`     BQ-Tabelle: "${tableName}"`);
  console.log(`     Felder    : ${propCount}`);

  // ── 2. BQ Schema & Tabelle ─────────────────────────────────────────────────
  console.log('\n2/6  BigQuery Tabelle vorbereiten...');
  const schema = buildSchema(dbProps);
  const tbl    = await ensureTable(tableName, schema);

  // Lookup: ECHTES Tabellen-Schema (wichtig bei Legacy-Spaltenmodi)
  const [tblMeta] = await tbl.getMetadata();
  const tableFieldByName = {};
  for (const f of (tblMeta.schema?.fields ?? [])) tableFieldByName[f.name] = f;

  // ── 3. Alle Notion-Seiten laden ────────────────────────────────────────────
  console.log('\n3/6  Alle Notion-Seiten laden...');
  const pages = await fetchAllPages();
  console.log(`     ${pages.length} Seiten geladen.`);

  // ── 4. Relation-Titel vorauflösen ──────────────────────────────────────────
  console.log('\n4/6  Relation-Titel auflösen...');
  const relIds = collectRelationIds(pages, dbProps);
  if (relIds.size > 0) {
    console.log(`     ${relIds.size} verknüpfte Seiten gefunden.`);
    await preloadTitles(relIds);
    console.log(`     Alle Titles gecacht.`);
  } else {
    console.log('     Keine Relationen gefunden.');
  }

  // ── 5. Seiten in BQ-Zeilen konvertieren ────────────────────────────────────
  console.log('\n5/6  Konvertiere Seiten in BQ-Zeilen...');
  const syncedAt  = new Date().toISOString();
  const propEntries = Object.entries(dbProps);
  const rows = [];
  let converted = 0;

  await Promise.all(
    pages.map((page) =>
      limit(async () => {
        const row = {
          page_id:    page.id,
          _synced_at: syncedAt,
        };

        for (const [propName, propMeta] of propEntries) {
          const colName = sanitize(propName);
          const prop    = page.properties[propName];
          // propId für Pagination bei Relationen
          const propId  = prop?.id ?? propMeta?.id;
          const fieldDef = tableFieldByName[colName];

          if (!fieldDef) continue;

          try {
            let value = await propValue(page.id, propId, prop);
            row[colName] = normalizeForField(value, fieldDef);
          } catch (err) {
            console.warn(`\n  Warnung [${page.id}] "${propName}": ${err.message}`);
            row[colName] = fieldDef.mode === 'REPEATED' ? [] : null;
          }
        }

        // Legacy-/Pflichtfelder im bestehenden BQ-Schema absichern.
        for (const fieldDef of Object.values(tableFieldByName)) {
          if (fieldDef.mode !== 'REQUIRED') continue;
          if (row[fieldDef.name] != null) continue;

          if (fieldDef.name === 'page_id') {
            row[fieldDef.name] = page.id;
          } else if (fieldDef.name === '_synced_at' || fieldDef.name === 'synced_at') {
            row[fieldDef.name] = syncedAt;
          } else if (fieldDef.mode === 'REPEATED') {
            row[fieldDef.name] = [];
          } else if (fieldDef.type === 'BOOL') {
            row[fieldDef.name] = false;
          } else if (['FLOAT64', 'NUMERIC', 'BIGNUMERIC', 'INT64'].includes(fieldDef.type)) {
            row[fieldDef.name] = 0;
          } else {
            row[fieldDef.name] = '';
          }
        }

        rows.push(row);
        converted++;
        if (converted % 100 === 0 || converted === pages.length) {
          process.stdout.write(`\r  → ${converted}/${pages.length} Seiten konvertiert`);
        }
      })
    )
  );
  console.log();
  console.log(`     ${rows.length} Zeilen bereit.`);

  // ── 6. In BigQuery schreiben (Batch-Load statt Streaming) ──────────────────
  console.log('\n6/6  Lade in BigQuery...');
  if (rows.length > 0) {
    await batchLoad(tbl, rows);
    console.log(`  → ${rows.length} Zeilen geladen.`);
  } else {
    console.log('  → Keine Zeilen zum Laden vorhanden.');
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(` ✓ Fertig in ${elapsed}s`);
  console.log(`   ${rows.length} Zeilen → ${BQ_PROJECT_ID}.${BQ_DATASET}.${tableName}`);
  console.log('═══════════════════════════════════════════════════');
}

// ─── Cloud Function Export (HTTP-Trigger für Cloud Scheduler) ────────────────
exports.notionToBq = (req, res) => {
  if (!isAuthorizedRequest(req)) {
    res.status(403).send('Forbidden');
    return;
  }

  // Sofort OK senden, damit Google Apps Script nicht in ein Timeout läuft.
  res.status(200).send('OK – Sync gestartet');

  // Sync im Hintergrund ausführen.
  main().catch((err) => {
    console.error('\n✗ Fehler:', err.message);
    if (err.errors) console.error('  Details:', JSON.stringify(err.errors, null, 2));
  });
};

// ─── Lokale Ausführung (node notion-to-bq.js) ─────────────────────────────────
if (require.main === module) {
  main().catch((err) => {
    console.error('\n✗ Fehler:', err.message);
    if (err.errors) console.error('  Details:', JSON.stringify(err.errors, null, 2));
    process.exit(1);
  });
}
