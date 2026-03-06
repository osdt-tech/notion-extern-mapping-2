'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// node create-vergleich-view.js
// Erstellt / ersetzt die BigQuery-View `datenvergleich_felder` aus einer
// flexiblen Konfiguration.  Neue Felder oder Schnittstellen ergänzen:
//   1. Eintrag in SOURCES[x].fields  (für ein bestehendes System)
//   2. Neues Objekt in SOURCES       (für ein neues System)
// ─────────────────────────────────────────────────────────────────────────────
require('dotenv').config();

const { BigQuery } = require('@google-cloud/bigquery');

// ─── Globale Parameter ────────────────────────────────────────────────────────
const PROJECT    = process.env.BQ_PROJECT_ID  || 'reporting-470420';
const DATASET    = process.env.BQ_DATASET     || 'datenvergleich';
const VIEW_NAME  = process.env.VERGLEICH_VIEW || 'view';
const LOCATION   = process.env.BQ_LOCATION    || 'EU';

const bigquery = new BigQuery({ projectId: PROJECT, location: LOCATION });

// ─────────────────────────────────────────────────────────────────────────────
// KONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/** Master-Tabelle (Verbum-Seite) */
const MASTER = {
  tableId: 'verbum_medien',
  alias:   't1',
  keyField: 'bestell_nr',   // wird zu medien_id
};

/**
 * Externe Quellen.
 *
 * joinCondition  – SQL-Ausdruck für die ON-Klausel (Alias t1 = Master)
 * fields         – Liste der zu vergleichenden Felder
 *   verbumField  – Spaltenname in verbum_medien  (t1.xxx)
 *   externField  – Spaltenname in der externen Tabelle (alias.xxx)
 *   feldname     – Bezeichner, der in der View-Spalte `feldname` erscheint
 */
const SOURCES = [
  {
    name:          'vlb',
    tableId:       'vlb_produkte',
    alias:         't2',
    dedupKey:      'product_id',
    joinCondition: 't1.vlb_id = t2.product_id',
    fields: [
      { verbumField: 'titel', externField: 'title',       feldname: 'titel'  },
      // { verbumField: 'preis', externField: 'retail_price', feldname: 'preis'  },
    ],
  },
  {
    name:          'shopify',
    tableId:       'shopify_produkte',
    alias:         't3',
    dedupKey:      'product_id',
    // Shopify-ID liegt als URL vor, daher REGEXP_EXTRACT
    joinCondition: "REGEXP_EXTRACT(t1.shopify_id, r'(\\d+)$') = CAST(t3.product_id AS STRING)",
    fields: [
      { verbumField: 'titel', externField: 'title', feldname: 'titel' },
    ],
  },
  {
    name:          'weclapp',
    tableId:       'weclapp_artikel',
    alias:         't4',
    dedupKey:      'weclapp_id',
    joinCondition: 't1.weclapp_id = t4.weclapp_id',
    fields: [
      { verbumField: 'titel', externField: 'name', feldname: 'titel' },
      { verbumField: 'bestell_nr', externField: 'articlenumber', feldname: 'bestell_nr' },
       { verbumField: 'zolltarifnummer', externField: 'systemcode', feldname: 'Zolltarifnummer' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SQL-Generator
// ─────────────────────────────────────────────────────────────────────────────

/** Gibt einen CAST-Ausdruck als STRING zurück */
function asStr(expr) {
  return `CAST(${expr} AS STRING)`;
}

/** Baut einen einzelnen SELECT-Block für eine Quelle + ein Feld */
function buildBlock(source, field) {
  const m  = MASTER;
  const vb = `${m.alias}.${field.verbumField}`;
  const ex = `${source.alias}.${field.externField}`;

  // Beide Seiten deduplizieren – verhindert Zeilen-Multiplikation durch Duplikate
  // in verbum_medien (APPEND-Sync) und in externen Tabellen
  const masterSubquery = `(SELECT * FROM \`${PROJECT}.${DATASET}.${m.tableId}\``
    + ` QUALIFY ROW_NUMBER() OVER (PARTITION BY ${m.keyField} ORDER BY ${m.keyField}) = 1)`;

  const externKey = source.dedupKey || 'product_id';
  const externSubquery = `(SELECT * FROM \`${PROJECT}.${DATASET}.${source.tableId}\``
    + ` QUALIFY ROW_NUMBER() OVER (PARTITION BY ${externKey} ORDER BY ${externKey}) = 1)`;

  return `
SELECT
  ${m.alias}.${m.keyField}                       AS medien_id,
  '${field.feldname}'                            AS feldname,
  ${asStr(vb)}                                   AS wert_verbum,
  ${asStr(ex)}                                   AS wert_extern,
  '${source.name}'                               AS schnittstelle,
  CASE
    WHEN ${ex} IS NULL
      THEN 'fehlt extern'
    WHEN LOWER(TRIM(${asStr(vb)})) = LOWER(TRIM(${asStr(ex)}))
      THEN 'gleich'
    ELSE 'abweichung'
  END                                            AS status
FROM
  ${masterSubquery} ${m.alias}
LEFT JOIN
  ${externSubquery} ${source.alias}
  ON ${source.joinCondition}`.trimStart();
}

/** Baut die gesamte View-SQL aus allen Quellen und Feldern */
function buildViewSQL() {
  const blocks = [];

  for (const source of SOURCES) {
    for (const field of source.fields) {
      blocks.push(buildBlock(source, field));
    }
  }

  return blocks.join('\n\nUNION ALL\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// BigQuery – View erstellen / ersetzen
// ─────────────────────────────────────────────────────────────────────────────

async function createOrReplaceView() {
  const sql = buildViewSQL();

  console.log('──────────────────────────────────────────────────');
  console.log(`View: ${PROJECT}.${DATASET}.${VIEW_NAME}`);
  console.log('Generiertes SQL:');
  console.log(sql);
  console.log('──────────────────────────────────────────────────');

  const ddl = `CREATE OR REPLACE VIEW \`${PROJECT}.${DATASET}.${VIEW_NAME}\` AS\n${sql}`;

  const [job] = await bigquery.createQueryJob({
    query:    ddl,
    location: LOCATION,
  });

  console.log(`Job gestartet: ${job.id}`);
  await job.getQueryResults();
  console.log(`✓ View \`${VIEW_NAME}\` erfolgreich erstellt / ersetzt.`);
}

createOrReplaceView().catch((err) => {
  console.error('Fehler:', err.message);
  process.exit(1);
});
