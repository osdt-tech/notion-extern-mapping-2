'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// notion-to-bq.js
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
const titleCache = new Map();

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function resolveTitle(pageId) {
  if (titleCache.has(pageId)) return titleCache.get(pageId);
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const page = await notion.pages.retrieve({ page_id: pageId });
      const prop  = Object.values(page.properties).find((p) => p.type === 'title');
      const title = richText(prop?.title) || pageId;
      titleCache.set(pageId, title);
      return title;
    } catch (err) {
      if (err.code === 'rate_limited' && attempt < 5) {
        await sleep(attempt * 3000); // 3s, 6s, 9s, 12s
        continue;
      }
      titleCache.set(pageId, pageId);
      return pageId;
    }
  }
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
      return items.map((r) => ({
        page_id: r.id,
        title:   titleCache.get(r.id) ?? r.id,
      }));
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
          { name: 'page_id', type: 'STRING', mode: 'NULLABLE' },
          { name: 'title',   type: 'STRING', mode: 'NULLABLE' },
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

// ─── Notion: Alle Seiten laden ────────────────────────────────────────────────
async function fetchAllPages() {
  const pages = [];
  let cursor;
  const batchSize = MAX_PAGES > 0 ? Math.min(MAX_PAGES, 100) : 100;
  do {
    const res = await notion.dataSources.query({
      data_source_id: DATABASE_ID,
      start_cursor: cursor,
      page_size: batchSize,
    });
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
    console.log(`  → Tabelle "${BQ_DATASET}.${tableName}" existiert bereits. Daten werden HINZUGEFÜGT.`);
  }
  return tbl;
}

// ─── BigQuery: Streaming-Insert mit Fehlerbehandlung ─────────────────────────
async function streamInsert(tbl, rows) {
  try {
    await tbl.insert(rows, { skipInvalidRows: false, ignoreUnknownValues: false });
  } catch (err) {
    if (err.name === 'PartialFailureError') {
      console.error(`\n  PartialFailureError (${err.errors?.length ?? 0} Zeilen betroffen):`);
      (err.errors ?? []).slice(0, 5).forEach((e) => {
        console.error(`    row ${e.index}: ${JSON.stringify(e.errors?.map((x) => x.message))}`);
      });
      if ((err.errors?.length ?? 0) > 5) console.error(`    ... und ${err.errors.length - 5} weitere.`);
    } else {
      throw err;
    }
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const t0 = Date.now();
  console.log('═══════════════════════════════════════════════════');
  console.log(' Notion → BigQuery Sync');
  console.log(`   DB  : ${DATABASE_ID}`);
  console.log(`   BQ  : ${BQ_PROJECT_ID}.${BQ_DATASET}`);
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

  // Lookup: BQ-Feldname → Modus (für REPEATED-Normalisierung)
  const fieldModeByName = {};
  for (const f of schema) fieldModeByName[f.name] = f.mode;

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

          try {
            let value = await propValue(page.id, propId, prop);

            // REPEATED-Felder dürfen nie null sein
            if (fieldModeByName[colName] === 'REPEATED') {
              row[colName] = Array.isArray(value) ? value : [];
            } else {
              row[colName] = value ?? null;
            }
          } catch (err) {
            console.warn(`\n  Warnung [${page.id}] "${propName}": ${err.message}`);
            row[colName] = fieldModeByName[colName] === 'REPEATED' ? [] : null;
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

  // ── 6. In BigQuery schreiben ───────────────────────────────────────────────
  console.log('\n6/6  Schreibe in BigQuery...');
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BQ_BATCH_SIZE) {
    const batch = rows.slice(i, i + BQ_BATCH_SIZE);
    await streamInsert(tbl, batch);
    inserted += batch.length;
    process.stdout.write(`\r  → ${inserted}/${rows.length} Zeilen eingefügt`);
  }
  console.log();

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log('\n═══════════════════════════════════════════════════');
  console.log(` ✓ Fertig in ${elapsed}s`);
  console.log(`   ${rows.length} Zeilen → ${BQ_PROJECT_ID}.${BQ_DATASET}.${tableName}`);
  console.log('═══════════════════════════════════════════════════');
}

// ─── Cloud Function Export (HTTP-Trigger für Cloud Scheduler) ────────────────
exports.notionToBq = async (req, res) => {
  try {
    await main();
    res.status(200).send('OK');
  } catch (err) {
    console.error('\n✗ Fehler:', err.message);
    if (err.errors) console.error('  Details:', JSON.stringify(err.errors, null, 2));
    res.status(500).send(err.message);
  }
};

// ─── Lokale Ausführung (node notion-to-bq.js) ─────────────────────────────────
if (require.main === module) {
  main().catch((err) => {
    console.error('\n✗ Fehler:', err.message);
    if (err.errors) console.error('  Details:', JSON.stringify(err.errors, null, 2));
    process.exit(1);
  });
}
