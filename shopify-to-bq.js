'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// shopify-to-bq.js
// Lädt alle Produkte aus dem Shopify Admin REST-API und schreibt sie 1:1
// in BigQuery. Schema wird dynamisch aus den API-Antworten ermittelt.
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const https      = require('https');
const { BigQuery } = require('@google-cloud/bigquery');

// ─── Konfiguration ────────────────────────────────────────────────────────────
const SHOPIFY_SHOP         = process.env.SHOPIFY_SHOP;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_API_VERSION  = process.env.SHOPIFY_API_VERSION || '2026-01';

const BQ_PROJECT_ID = process.env.BQ_PROJECT_ID;
const BQ_DATASET    = process.env.BQ_DATASET;
const BQ_TABLE      = process.env.SHOPIFY_BQ_TABLE || 'shopify_produkte';
const BQ_LOCATION   = process.env.BQ_LOCATION      || 'EU';
const BQ_BATCH_SIZE = parseInt(process.env.BQ_BATCH_SIZE || '500', 10);

if (!SHOPIFY_SHOP)         { console.error('Fehlende Variable: SHOPIFY_SHOP');         process.exit(1); }
if (!SHOPIFY_ACCESS_TOKEN) { console.error('Fehlende Variable: SHOPIFY_ACCESS_TOKEN'); process.exit(1); }
if (!BQ_PROJECT_ID)        { console.error('Fehlende Variable: BQ_PROJECT_ID');        process.exit(1); }
if (!BQ_DATASET)           { console.error('Fehlende Variable: BQ_DATASET');           process.exit(1); }

const bigquery = new BigQuery({ projectId: BQ_PROJECT_ID });

// ─── Shopify GraphQL-Hilfsfunktion ───────────────────────────────────────────
/**
 * Führt einen GraphQL-Request gegen die Shopify Admin API aus.
 * Die REST Products API ist ab Version 2025-01 deprecated → GraphQL.
 */
function shopifyGraphQL(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query, variables });
    const opts = {
      hostname: `${SHOPIFY_SHOP}.myshopify.com`,
      path:     `/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      method:   'POST',
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
        'Content-Type':           'application/json',
        'Accept':                 'application/json',
        'Content-Length':         Buffer.byteLength(body),
      },
    };

    const req = https.request(opts, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(raw);
            if (json.errors) reject(new Error(JSON.stringify(json.errors)));
            else resolve(json.data);
          } catch (e) {
            reject(new Error(`JSON-Parse-Fehler: ${e.message}`));
          }
        } else {
          reject(new Error(`Shopify GraphQL ${res.statusCode}: ${raw.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// GraphQL-Fragment mit allen Produktfeldern + je ein Alias pro Metafield
const PRODUCTS_QUERY = `
  query fetchProducts($cursor: String) {
    products(first: 100, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        handle
        status
        vendor
        productType
        tags
        description
        descriptionHtml
        onlineStoreUrl
        isGiftCard
        requiresSellingPlan
        totalInventory
        tracksInventory
        createdAt
        updatedAt
        publishedAt
        seo { title description }
        priceRangeV2 {
          minVariantPrice { amount currencyCode }
          maxVariantPrice { amount currencyCode }
        }
        featuredImage { url altText width height }
        images(first: 20) {
          nodes { id url altText width height }
        }
        options { name position values }
        variants(first: 100) {
          nodes {
            id title sku price compareAtPrice
            availableForSale inventoryQuantity
            barcode
            taxable taxCode
            createdAt updatedAt
            selectedOptions { name value }
            image { url altText }
          }
        }
        collections(first: 30) {
          nodes { id handle title }
        }
        mf_einband:            metafield(namespace: "custom",   key: "einband")            { value }
        mf_format:             metafield(namespace: "custom",   key: "format")             { value }
        mf_formathoehe:        metafield(namespace: "custom",   key: "formathoehe")        { value }
        mf_seitenanzahl:       metafield(namespace: "custom",   key: "seitenanzahl")       { value }
        mf_herausgeber:        metafield(namespace: "custom",   key: "herausgeber")        { value }
        mf_auflage:            metafield(namespace: "custom",   key: "auflage")            { value }
        mf_vdatum:             metafield(namespace: "custom",   key: "vdatum")             { value }
        mf_altersgruppe:       metafield(namespace: "custom",   key: "altersgruppe")       { value }
        mf_laufzeit:           metafield(namespace: "custom",   key: "laufzeit")           { value }
        mf_doi:                metafield(namespace: "custom",   key: "doi")                { value }
        mf_amazonlink:         metafield(namespace: "custom",   key: "amazonlink")         { value }
        mf_hausderbibellink:   metafield(namespace: "custom",   key: "hausderbibellink")   { value }
        mf_leseprobe:          metafield(namespace: "custom",   key: "leseprobe")          { value }
        mf_originaltitel:      metafield(namespace: "custom",   key: "originaltitel")      { value }
        mf_malbilder:          metafield(namespace: "custom",   key: "malbilder")          { value }
        mf_sprache:            metafield(namespace: "custom",   key: "sprache")            { value }
        mf_inhaltsverzeichnis: metafield(namespace: "custom",   key: "inhaltsverzeichnis") { value }
        mf_empfehlungen:       metafield(namespace: "custom",   key: "empfehlungen")       { value }
        mf_horprobe:           metafield(namespace: "custom",   key: "horprobe")           { value }
        mf_serieninfo:         metafield(namespace: "custom",   key: "serieninfo")         { value }
        mf_autor:              metafield(namespace: "custom",   key: "autor")              { value }
        mf_logos_link:         metafield(namespace: "custom",   key: "logos_link")         { value }
        mf_ebooklinking:       metafield(namespace: "custom",   key: "ebooklinking")       { value }
        mf_buchlinking:        metafield(namespace: "custom",   key: "buchlinking")        { value }
        mf_hoerbuchlinking:    metafield(namespace: "custom",   key: "hoerbuchlinking")    { value }
        mf_illustrator:        metafield(namespace: "custom",   key: "illustrator")        { value }
        mf_youtubelink:        metafield(namespace: "custom",   key: "youtubelink")        { value }
        mf_antolin_link:       metafield(namespace: "custom",   key: "antolin_link")       { value }
        mf_serie:              metafield(namespace: "custom",   key: "serie")              { value }
        mf_zeitraum:           metafield(namespace: "custom",   key: "zeitraum")           { value }
        mf_hoerbuchsprecher:   metafield(namespace: "custom",   key: "hoerbuchsprecher")   { value }
        mf_neuauflage:         metafield(namespace: "custom",   key: "neuauflage")         { value }
        mf_ablaufdatum:        metafield(namespace: "custom",   key: "ablaufdatum")        { value }
        mf_themen_tags:        metafield(namespace: "custom",   key: "themen_tags")        { value }
        mf_link_fontis:        metafield(namespace: "custom",   key: "link_fontis")        { value }
        mf_link_prasentationsfolien: metafield(namespace: "custom", key: "link_prasentationsfolien") { value }
        mf_ausverkauft:        metafield(namespace: "custom",   key: "ausverkauft")        { value }
        mf_sichtbarkeit:       metafield(namespace: "custom",   key: "sichtbarkeit")       { value }
        mf_link_horspiel:      metafield(namespace: "custom",   key: "link_horspiel")      { value }
        mf_reviews_rating:     metafield(namespace: "reviews",  key: "rating")             { value }
        mf_reviews_count:      metafield(namespace: "reviews",  key: "rating_count")       { value }
        mf_google_custom:      metafield(namespace: "mm-google-shopping", key: "custom_product") { value }
        mf_genre:              metafield(namespace: "shopify",  key: "genre")              { value }
        mf_target_audience:    metafield(namespace: "shopify",  key: "target-audience")    { value }
        mf_book_cover_type:    metafield(namespace: "shopify",  key: "book-cover-type")    { value }
        mf_language_version:   metafield(namespace: "shopify",  key: "language-version")   { value }
        mf_related_products:   metafield(namespace: "shopify--discovery--product_recommendation", key: "related_products")         { value }
        mf_related_display:    metafield(namespace: "shopify--discovery--product_recommendation", key: "related_products_display")  { value }
        mf_complementary:      metafield(namespace: "shopify--discovery--product_recommendation", key: "complementary_products")    { value }
        mf_search_boost:       metafield(namespace: "shopify--discovery--product_search_boost", key: "queries")                    { value }
      }
    }
  }
`;

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

/** Ermittelt den BQ-Typ eines JS-Wertes */
function inferType(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return 'BOOL';
  if (typeof value === 'number')  return Number.isInteger(value) ? 'INT64' : 'FLOAT64';
  if (typeof value === 'object')  return 'STRING'; // Array / Object → JSON
  // Timestamps
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return 'TIMESTAMP';
  return 'STRING';
}

/** Führt zwei BQ-Typen zusammen (dominanterer Typ gewinnt) */
function mergeType(a, b) {
  if (a === b)    return a;
  if (a === null) return b;
  if (b === null) return a;
  if (a === 'STRING'  || b === 'STRING')  return 'STRING';
  if (a === 'FLOAT64' || b === 'FLOAT64') return 'FLOAT64';
  if (a === 'INT64'   || b === 'INT64')   return 'INT64';
  if (a === 'TIMESTAMP' || b === 'TIMESTAMP') return 'STRING'; // gemischt → String
  return 'STRING';
}

/** Scannt alle Records und liefert {feldname → BQ-Typ} */
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
    if (key === 'id') continue; // wird als product_id gesondert behandelt
    const name = sanitize(key);
    if (!name) continue;
    // Duplikate durch sanitize vermeiden
    if (fields.some((f) => f.name === name)) continue;
    fields.push({ name, type: bqType || 'STRING', mode: 'NULLABLE' });
  }
  return fields;
}

/** Konvertiert einen Shopify-Produktdatensatz in eine BQ-Zeile */
function toRow(product, syncedAt) {
  // GraphQL liefert GIDs wie "gid://shopify/Product/9043920683275"
  const numericId = String(product.id ?? '').split('/').pop();
  const row = {
    product_id: numericId,
    _synced_at: syncedAt,
  };
  for (const [key, value] of Object.entries(product)) {
    if (key === 'id') continue;
    const col = sanitize(key);
    if (!col || col === 'product_id') continue;
    if (value === null || value === undefined) {
      row[col] = null;
    } else if (Array.isArray(value)) {
      row[col] = JSON.stringify(value);
    } else if (typeof value === 'object') {
      row[col] = JSON.stringify(value);
    } else {
      row[col] = value;
    }
  }
  return row;
}

// ─── Shopify: Alle Produkte laden (GraphQL cursor-Paginierung) ────────────────
async function fetchAllProducts() {
  const all = [];
  let cursor = null;

  do {
    let data;
    try {
      data = await shopifyGraphQL(PRODUCTS_QUERY, { cursor });
    } catch (err) {
      if (all.length === 0) throw err;
      console.warn(`\n  Warnung: Seite fehlgeschlagen – Abbruch (${err.message})`);
      break;
    }

    const nodes    = data.products.nodes ?? [];
    const pageInfo = data.products.pageInfo;

    if (nodes.length === 0) break;

    // Nested-Listen aus GraphQL-Connections flach machen (nodes-Wrapper entfernen)
    // Metafields (mf_*) werden auf ihren .value reduziert
    const flat = nodes.map((p) => {
      const out = { ...p };
      if (out.images?.nodes)      out.images      = out.images.nodes;
      if (out.variants?.nodes)    out.variants    = out.variants.nodes;
      if (out.collections?.nodes) out.collections = out.collections.nodes;

      // Varianten: v1_* … v5_* (je sku, title, price, compare_at_price,
      //   barcode, inventory_quantity, available_for_sale, taxable)
      const vArr = out.variants ?? [];
      for (let i = 0; i < 5; i++) {
        const v   = vArr[i] ?? null;
        const pfx = `v${i + 1}_`;
        out[`${pfx}id`]                 = v ? String(v.id ?? '').split('/').pop() : null;
        out[`${pfx}sku`]                = v?.sku               ?? null;
        out[`${pfx}title`]              = v?.title             ?? null;
        out[`${pfx}price`]              = v?.price             ?? null;
        out[`${pfx}compare_at_price`]   = v?.compareAtPrice    ?? null;
        out[`${pfx}barcode`]            = v?.barcode           ?? null;
        out[`${pfx}inventory_quantity`] = v?.inventoryQuantity ?? null;
        out[`${pfx}available_for_sale`] = v?.availableForSale  ?? null;
        out[`${pfx}taxable`]            = v?.taxable           ?? null;
      }

      // Collections: coll1_* … coll10_* (je id, handle, title)
      const cArr = out.collections ?? [];
      for (let i = 0; i < 10; i++) {
        const c   = cArr[i] ?? null;
        const pfx = `coll${i + 1}_`;
        out[`${pfx}id`]     = c ? String(c.id ?? '').split('/').pop() : null;
        out[`${pfx}handle`] = c?.handle ?? null;
        out[`${pfx}title`]  = c?.title  ?? null;
      }

      // mf_* Aliase: { value } → direkt den Wert speichern (null wenn nicht gesetzt)
      for (const key of Object.keys(out)) {
        if (key.startsWith('mf_')) {
          out[key] = out[key]?.value ?? null;
        }
      }
      return out;
    });

    all.push(...flat);
    process.stdout.write(`\r  → ${all.length} Produkte geladen…`);

    cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;
  } while (cursor);

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

  // Tabelle existiert → Schema erweitern (nur neue Spalten hinzufügen)
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
    console.log(' Shopify → BigQuery Sync');
    console.log(`  Shop    : ${SHOPIFY_SHOP}.myshopify.com`);
    console.log(`  API-Ver : ${SHOPIFY_API_VERSION}`);
    console.log(`  Projekt : ${BQ_PROJECT_ID}`);
    console.log(`  Dataset : ${BQ_DATASET}`);
    console.log(`  Tabelle : ${BQ_TABLE}`);
    console.log('═══════════════════════════════════════════');

    // 1. Alle Produkte von Shopify laden
    console.log('\n[1/4] Produkte von Shopify laden…');
    const products = await fetchAllProducts();
    console.log(`  ${products.length} Produkte geladen.`);
    if (products.length === 0) { console.log('  Keine Produkte gefunden – Ende.'); return; }

    // 2. Schema dynamisch aus Daten ableiten
    console.log('\n[2/4] Schema aus Daten ableiten…');
    const typeMap = scanSchema(products);
    const schema  = buildSchema(typeMap);
    console.log(`  ${schema.length} Spalten erkannt: ${schema.map((f) => f.name).join(', ')}`);

    // 3. BQ-Tabelle sicherstellen (anlegen oder erweitern)
    console.log('\n[3/4] BigQuery-Tabelle sicherstellen…');
    await ensureTable(schema);

    // 4. Daten in BQ schreiben
    console.log('\n[4/4] Daten in BigQuery schreiben…');
    const syncedAt = new Date().toISOString();
    const rows = products.map((p) => toRow(p, syncedAt));
    await insertRows(rows);

    console.log('\n✓ Fertig.');
  } catch (err) {
    console.error('\nFehler:', err.message);
    if (err.errors) {
      for (const e of err.errors.slice(0, 10)) {
        console.error('  BQ-Fehler:', JSON.stringify(e));
      }
    }
    process.exit(1);
  }
})();
