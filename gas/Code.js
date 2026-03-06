/**
 * gas/Code.js
 *
 * Google Apps Script – Notion ↔ Shopify ↔ Weclapp Vergleich Web App
 *
 * Deployment:
 *   cd gas && clasp push && clasp deploy --deploymentId AKfycbzvM91iDFmitiJtkEOEBg1nIwVd1JiN0bMtwDtdfK2vQxYY7hvY-0JB7T3PpcOKWINxsw --description "vXX"
 *
 * Script-Properties (Einstellungen → Script-Properties):
 *   SHOPIFY_SHOP         – z.B. "verbum-medien"
 *   SHOPIFY_ACCESS_TOKEN – shpat_…
 *   WECLAPP_BASE_URL     – https://verbummedien.weclapp.com/webapp/api/v2
 *   WECLAPP_API_KEY      – AuthenticationToken
 *   VLB_API_TOKEN        – (optional) UUID Token
 *   COMPARE_REFRESH_URL  – URL der compareRefresh Cloud Function
 *   ALLOWED_EDITOR_EMAILS – optional: kommagetrennte E-Mails mit Schreibrecht
 *
 * Notion-Daten kommen via BigQuery-Cache (inkl. notion_url) – kein NOTION_TOKEN nötig.
 */

'use strict';

// ── Konstanten ─────────────────────────────────────────────────────────────

var BQ_PROJECT      = 'reporting-470420';
var BQ_DATASET      = 'datenvergleich';
var BQ_LOCATION     = 'EU';
var CACHE_TTL       = 300;
var SHOPIFY_API_VER = '2026-01';
var APP_VERSION     = 'v83';

// ── Config ─────────────────────────────────────────────────────────────────

function _prop(key) {
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

function _shopifyHeaders() {
  return {
    'Content-Type':             'application/json',
    'X-Shopify-Access-Token':   _prop('SHOPIFY_ACCESS_TOKEN'),
  };
}

function _weclappHeaders() {
  return {
    'Accept':              'application/json',
    'Content-Type':        'application/json',
    'AuthenticationToken': _prop('WECLAPP_API_KEY'),
  };
}

function _writeAccessConfig() {
  var raw = _prop('ALLOWED_EDITOR_EMAILS');
  var list = String(raw || '')
    .split(',')
    .map(function(s) { return s.trim().toLowerCase(); })
    .filter(Boolean);
  return list;
}

/** Wenn ALLOWED_EDITOR_EMAILS gesetzt ist, dürfen nur diese E-Mails schreiben. */
function _canWrite() {
  var allowed = _writeAccessConfig();
  if (!allowed.length) return true; // Backward-compatible: ohne Konfig keine Sperre
  var email = (Session.getActiveUser().getEmail() || '').trim().toLowerCase();
  return !!email && allowed.indexOf(email) !== -1;
}

function _requireWriteAccess() {
  if (_canWrite()) return;
  throw new Error('Keine Schreibberechtigung');
}

// ── UrlFetch Helper ────────────────────────────────────────────────────────

function _fetchJson(url, options) {
  try {
    var res = UrlFetchApp.fetch(url, Object.assign({ muteHttpExceptions: true }, options));
    var code = res.getResponseCode();
    var body = res.getContentText();
    if (code === 404) return { __notFound: true };
    if (code >= 400) throw new Error('HTTP ' + code + ': ' + body.slice(0, 300));
    return JSON.parse(body);
  } catch (e) {
    throw new Error(e.message || String(e));
  }
}

// ── Notion API (Fallback bis notion_url in BQ) ────────────────────────────

/**
 * Liest eine Notion-Seite per API und gibt das Page-Objekt zurück.
 * Benötigt NOTION_TOKEN als Script Property.
 * Wird nur als Bridge genutzt, solange notion_url noch nicht in BQ steht.
 */
function notionGetPage(pageId) {
  var token = _prop('NOTION_TOKEN');
  if (!token || !pageId) return null;
  return _fetchJson('https://api.notion.com/v1/pages/' + pageId, {
    method: 'get',
    headers: {
      'Authorization':  'Bearer ' + token,
      'Notion-Version': '2022-06-28',
    },
  });
}

// ── BigQuery API ───────────────────────────────────────────────────────────

/**
 * Führt einen synchronen BigQuery-Query über den Advanced Service aus.
 * GAS verwaltet OAuth automatisch und fragt bei Bedarf nach Berechtigung.
 * Gibt Array von Row-Objekten zurück: [{ col: val, ... }, ...]
 */
function _bqQuery(sql) {
  // Konfiguration als separate Variable – verhindert Serialisierungs-Bugs in GAS
  var queryConfig = {
    query:        sql,
    useLegacySql: false,
  };
  var jobConfig = {
    configuration: { query: queryConfig },
    jobReference:  {
      projectId: BQ_PROJECT,
      jobId:     Utilities.getUuid(),
      location:  BQ_LOCATION,
    },
  };

  var insertedJob = BigQuery.Jobs.insert(jobConfig, BQ_PROJECT);
  var jobId       = insertedJob.jobReference.jobId;

  // Exponentielles Backoff: 500ms → 1s → 2s → 4s …, max. 30s
  var waited = 0;
  var delay  = 500;
  while (true) {
    Utilities.sleep(delay);
    waited += delay;
    var jobStatus = BigQuery.Jobs.get(BQ_PROJECT, jobId, { location: BQ_LOCATION });
    if (jobStatus.status.errorResult) {
      throw new Error('BigQuery Fehler: ' + jobStatus.status.errorResult.message);
    }
    if (jobStatus.status.state === 'DONE') break;
    if (waited >= 30000) throw new Error('BigQuery Timeout nach 30s');
    delay = Math.min(delay * 2, 4000);
  }

  // Alle Seiten abrufen (pageToken-Loop)
  var fields    = [];
  var allRows   = [];
  var pageToken = null;

  do {
    var queryOpts = { maxResults: 10000, location: BQ_LOCATION };
    if (pageToken) queryOpts.pageToken = pageToken;

    var page = BigQuery.Jobs.getQueryResults(BQ_PROJECT, jobId, queryOpts);

    if (!fields.length && page.schema && page.schema.fields) {
      fields = page.schema.fields;
    }
    (page.rows || []).forEach(function(row) {
      var obj = {};
      (row.f || []).forEach(function(cell, i) {
        obj[fields[i] ? fields[i].name : String(i)] = cell.v;
      });
      allRows.push(obj);
    });
    pageToken = page.pageToken || null;
  } while (pageToken);

  return allRows;
}

/** Lädt Mapping + Verbum-Medien-Daten per JOIN aus BigQuery.
 *  Fällt auf verbum_medien-only zurück, wenn mapping-Tabelle noch nicht existiert. */
function bqLoadData(limit, only) {
  // Versuche zuerst JOIN mit mapping-Tabelle
  try {
    var where;
    if      (only === 'shopify') where = 'm.shopify_id IS NOT NULL';
    else if (only === 'weclapp') where = 'm.weclapp_id IS NOT NULL';
    else                         where = '(m.shopify_id IS NOT NULL OR m.weclapp_id IS NOT NULL)';

    var sql = 'SELECT m.page_id AS mapping_page_id, m.shopify_id, m.weclapp_id, v.*'
            + ' FROM `' + BQ_PROJECT + '.' + BQ_DATASET + '.mapping` m'
            + ' LEFT JOIN `' + BQ_PROJECT + '.' + BQ_DATASET + '.verbum_medien` v'
            + '   ON m.verbum_page_id = v.page_id'
            + ' WHERE ' + where
            + ' LIMIT ' + limit;
    return _bqQuery(sql);
  } catch (e) {
    // mapping-Tabelle existiert noch nicht → nur verbum_medien laden
    if (String(e.message).indexOf('mapping') !== -1 || String(e.message).indexOf('Not found') !== -1) {
      var fallbackSql = 'SELECT NULL AS mapping_page_id, NULL AS shopify_id, NULL AS weclapp_id, v.*'
                      + ' FROM `' + BQ_PROJECT + '.' + BQ_DATASET + '.verbum_medien` v'
                      + ' LIMIT ' + limit;
      return _bqQuery(fallbackSql);
    }
    throw e;
  }
}

/** Wandelt eine BQ-Zeile in ein Mock-Objekt um, das die Accessor-Funktionen verstehen */
function bqRowToMock(row) {
  return {
    _isBq:         true,
    _resolvedIsbn: row.isbn_rollup || '',
    _resolvedAutor: row.autor || '',
    _bqMap: {
      'Titel':                    row.titel || '',
      'Name':                     row.titel || '',
      'Untertitel':               row.untertitel || '',
      'Bestell-Nr':               row.bestell_nr || '',
      'Status':                   row.status || '',
      'Lieferbarkeit':            row.lieferbarkeit || '',
      'Format':                   row.format || '',
      'Preis D/AT (Print)':       row.preis_dat_print  != null ? String(row.preis_dat_print)  : '',
      'Preis E-Book':             row.preis_ebook      != null ? String(row.preis_ebook)      : '',
      'Preis Hörbuch':            row.preis_hoerbuch   != null ? String(row.preis_hoerbuch)   : '',
      'Preis Hörspiel Download':  row.preis_hsp_download != null ? String(row.preis_hsp_download) : '',
      'Preis Hörspiel CD':        row.preis_hsp_cd     != null ? String(row.preis_hsp_cd)     : '',
      'Preis PDF':                row.preis_pdf        != null ? String(row.preis_pdf)        : '',
      'Preis Aufkleber':          row.preis_aufkleber  != null ? String(row.preis_aufkleber)  : '',
      'Seiten':                   row.seiten           || '',
      'Auflage':                  row.auflage          || '',
      'Laufzeit in Minuten':      row.laufzeit_minuten || '',
      'Ausstattung':              row.ausstattung      || '',
      'Originaltitel':            row.originaltitel    || '',
      'Kategorie':                row.kategorie        || '',
      'Altersgruppe':             row.altersgruppe     || '',
      'DOI-Adresse':              row.doi              || '',
      'Erstveröffentlichung':     row.erstveroeffentlichung || '',
      'Neuauflagedatum':          row.neuauflagedatum  || '',
      'Endformat (B x H cm)':     row.endformat        || '',
      'Buchinfo (kurz)':          row.buchinfo_kurz    || '',
      'Gewicht in Gramm':         row.gewicht_gramm    || '',
      'Webseite-Kategorien':      row.webseite_kategorien || '',
      'Autor/Illustrator':        row.autor            || '',
      'Autor':                    row.autor            || '',
    },
  };
}

// ── Shopify GraphQL API ────────────────────────────────────────────────────

function shopifyGraphql(query, variables) {
  var shop = _prop('SHOPIFY_SHOP');
  var url  = 'https://' + shop + '.myshopify.com/admin/api/' + SHOPIFY_API_VER + '/graphql.json';
  var body = JSON.stringify({ query: query, variables: variables || {} });
  var data = _fetchJson(url, { method: 'post', headers: _shopifyHeaders(), payload: body });
  if (data && data.errors && data.errors.length) {
    throw new Error('Shopify GraphQL: ' + data.errors.map(function(e){return e.message;}).join('; '));
  }
  return data && data.data ? data.data : null;
}

function shopifyGetProduct(productId) {
  var gid = String(productId).indexOf('gid://') === 0
    ? productId
    : 'gid://shopify/Product/' + productId;

  var q = 'query($id:ID!){product(id:$id){id title tags vendor status '
    + 'variants(first:1){edges{node{id sku barcode price}}} '
    + 'metafields(first:50){edges{node{namespace key value type}}}}}';

  var data = shopifyGraphql(q, { id: gid });
  var p = data && data.product ? data.product : null;
  if (!p) return null;
  p._variant    = p.variants && p.variants.edges && p.variants.edges[0]
                  ? p.variants.edges[0].node : null;
  p._metafields = (p.metafields && p.metafields.edges || []).map(function(e){ return e.node; });
  return p;
}

/**
 * Batch-Fetch: lädt bis zu 250 Shopify-Produkte pro Aufruf via nodes(ids:[...]).
 * Gibt ein Object zurück: { [gid]: product }
 */
function shopifyGetProductsBatch(productIds) {
  var map = {};
  if (!productIds || !productIds.length) return map;

  // Chunk in 250er-Gruppen (Shopify-Limit)
  var CHUNK = 250;
  for (var s = 0; s < productIds.length; s += CHUNK) {
    var chunk = productIds.slice(s, s + CHUNK);
    var gids  = chunk.map(function(id) {
      return String(id).indexOf('gid://') === 0 ? id : 'gid://shopify/Product/' + id;
    });

    var q = 'query($ids:[ID!]!){';
    q    += 'nodes(ids:$ids){';
    q    += '...on Product{';
    q    += 'id title tags vendor status ';
    q    += 'variants(first:1){edges{node{id sku barcode price}}} ';
    q    += 'metafields(first:50){edges{node{namespace key value type}}}';
    q    += '}}}';

    try {
      var data  = shopifyGraphql(q, { ids: gids });
      var nodes = data && data.nodes ? data.nodes : [];
      nodes.forEach(function(p) {
        if (!p || !p.id) return;
        p._variant    = p.variants && p.variants.edges && p.variants.edges[0]
                        ? p.variants.edges[0].node : null;
        p._metafields = (p.metafields && p.metafields.edges || []).map(function(e){ return e.node; });
        map[p.id] = p;
      });
    } catch(e) {
      // Chunk-Fehler → Chunk wird übersprungen, nicht der ganze Batch
      Logger.log('[Shopify Batch] Chunk-Fehler: ' + e.message);
    }
  }
  return map;
}

// ── Weclapp REST API ───────────────────────────────────────────────────────

function weclappGetArticle(id) {
  var base = _prop('WECLAPP_BASE_URL').replace(/\/+$/, '');
  return _fetchJson(base + '/article/id/' + encodeURIComponent(id),
    { method: 'get', headers: _weclappHeaders() });
}

/**
 * Batch-Fetch: lädt alle Weclapp-Artikel per id-in-list in einem Call.
 * Gibt ein Object zurück: { [id]: article }
 */
function weclappGetArticlesBatch(ids) {
  var map = {};
  if (!ids || !ids.length) return map;

  var base   = _prop('WECLAPP_BASE_URL').replace(/\/+$/, '');
  // Weclapp unterstützt id-in-list als kommaseparierte ID-Liste
  var CHUNK  = 500;
  for (var s = 0; s < ids.length; s += CHUNK) {
    var chunk   = ids.slice(s, s + CHUNK);
    var idList  = chunk.join(',');
    var url     = base + '/article?id-in-list=' + encodeURIComponent(idList) + '&pageSize=' + CHUNK;
    try {
      var data = _fetchJson(url, { method: 'get', headers: _weclappHeaders() });
      var items = data && data.result ? data.result : (Array.isArray(data) ? data : []);
      items.forEach(function(a) { if (a && a.id) map[String(a.id)] = a; });
    } catch(e) {
      Logger.log('[Weclapp Batch] Chunk-Fehler: ' + e.message);
    }
  }
  return map;
}

function weclappUpdateArticle(id, fields) {
  var base = _prop('WECLAPP_BASE_URL').replace(/\/+$/, '');
  // Weclapp benötigt version für optimistisches Locking → vorher laden
  var current = weclappGetArticle(id);
  var body = Object.assign({ id: id }, fields);
  if (current && current.version) body.version = current.version;
  return _fetchJson(base + '/article/id/' + encodeURIComponent(id), {
    method:  'put',
    headers: _weclappHeaders(),
    payload: JSON.stringify(body),
  });
}

// ── VLB API ────────────────────────────────────────────────────────────────

function vlbGetProduct(isbn) {
  var clean = String(isbn || '').replace(/[-\s]/g, '');
  if (!clean) return null;
  var token = _prop('VLB_API_TOKEN') || '82f15032-cc8b-4ae1-a602-9ae7c320b838';
  var res = _fetchJson(
    'https://api.vlb.de/api/v2/product/' + clean + '/isbn13',
    { method: 'get', headers: { Authorization: 'Bearer ' + token } }
  );
  return res && res.__notFound ? null : res;
}

// ── Shopify Update ─────────────────────────────────────────────────────────

function shopifyUpdateProduct(productId, fields) {
  var gid = String(productId).indexOf('gid://') === 0
    ? productId : 'gid://shopify/Product/' + productId;

  var setFields = Object.keys(fields).map(function(k) {
    return k + ': ' + JSON.stringify(fields[k]);
  }).join(', ');

  var q = 'mutation($id:ID!){productUpdate(input:{id:$id,' + setFields + '}){product{id}userErrors{field message}}}';
  var data = shopifyGraphql(q, { id: gid });
  var errs = data && data.productUpdate && data.productUpdate.userErrors || [];
  if (errs.length) throw new Error(errs.map(function(e){ return e.message; }).join('; '));
}

function shopifySetMetafield(productId, namespace, key, value, type) {
  var gid = String(productId).indexOf('gid://') === 0
    ? productId : 'gid://shopify/Product/' + productId;
  var q = 'mutation($mf:[MetafieldsSetInput!]!){metafieldsSet(metafields:$mf){metafields{id}userErrors{field message}}}';
  var data = shopifyGraphql(q, { mf: [{ namespace: namespace, key: key, value: String(value), type: type, ownerId: gid }] });
  var errs = data && data.metafieldsSet && data.metafieldsSet.userErrors || [];
  if (errs.length) throw new Error(errs.map(function(e){ return e.message; }).join('; '));
}

function shopifyUpdateVariant(productId, field, value) {
  var gid = String(productId).indexOf('gid://') === 0
    ? productId : 'gid://shopify/Product/' + productId;
  var q = 'query($id:ID!){product(id:$id){variants(first:1){edges{node{id}}}}}';
  var data = shopifyGraphql(q, { id: gid });
  var vid  = data && data.product && data.product.variants && data.product.variants.edges[0]
             ? data.product.variants.edges[0].node.id : null;
  if (!vid) throw new Error('Keine Variante gefunden');
  var q2 = 'mutation($pid:ID!,$vars:[ProductVariantsBulkInput!]!)'
         + '{productVariantsBulkUpdate(productId:$pid,variants:$vars)'
         + '{productVariants{id}userErrors{field message}}}';
  var varInput = { id: vid };
  varInput[field] = value;
  var res = shopifyGraphql(q2, { pid: gid, vars: [varInput] });
  var errs = res && res.productVariantsBulkUpdate && res.productVariantsBulkUpdate.userErrors || [];
  if (errs.length) throw new Error(errs.map(function(e){ return e.message; }).join('; '));
}

// ── Notion Property-Helfer ─────────────────────────────────────────────────

function text_(page, propName) {
  if (page && page._bqMap) return page._bqMap[propName] != null ? String(page._bqMap[propName]) : '';
  var prop = page && page.properties && page.properties[propName];
  if (!prop) return '';
  if (prop.type === 'title')     return (prop.title     || []).map(function(t){ return t.plain_text; }).join('').trim();
  if (prop.type === 'rich_text') return (prop.rich_text || []).map(function(t){ return t.plain_text; }).join('').trim();
  if (prop.type === 'url')       return prop.url || '';
  if (prop.type === 'formula')   return String(prop.formula ? (prop.formula.string != null ? prop.formula.string : (prop.formula.number != null ? prop.formula.number : '')) : '');
  return '';
}

function num_(page, propName) {
  if (page && page._bqMap) return page._bqMap[propName] != null ? String(page._bqMap[propName]) : '';
  var prop = page && page.properties && page.properties[propName];
  if (!prop) return '';
  if (prop.type === 'number')  return prop.number != null ? String(prop.number) : '';
  if (prop.type === 'formula') return String(prop.formula ? (prop.formula.number != null ? prop.formula.number : (prop.formula.string != null ? prop.formula.string : '')) : '');
  return '';
}

function sel_(page, propName) {
  if (page && page._bqMap) return page._bqMap[propName] != null ? String(page._bqMap[propName]) : '';
  var prop = page && page.properties && page.properties[propName];
  if (!prop) return '';
  if (prop.type === 'select') return prop.select ? prop.select.name || '' : '';
  if (prop.type === 'status') return prop.status ? prop.status.name || '' : '';
  return '';
}

function date_(page, propName) {
  if (page && page._bqMap) return page._bqMap[propName] != null ? String(page._bqMap[propName]) : '';
  var prop = page && page.properties && page.properties[propName];
  if (!prop) return '';
  if (prop.type === 'date') return prop.date ? prop.date.start || '' : '';
  return '';
}

function multiSel_(page, propName) {
  if (page && page._bqMap) return page._bqMap[propName] != null ? String(page._bqMap[propName]) : '';
  var prop = page && page.properties && page.properties[propName];
  if (!prop || prop.type !== 'multi_select') return '';
  return (prop.multi_select || []).map(function(o){ return o.name; }).sort().join(', ');
}

function mf_(product, namespace, key) {
  if (!product || !product._metafields) return '';
  var node = (product._metafields || []).filter(function(n){ return n.namespace === namespace && n.key === key; })[0];
  return node ? node.value || '' : '';
}

function normDate_(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
  return s.slice(0, 10);
}

function vlbPreis_(v, country) {
  if (!v || !v.prices) return '';
  var found = (v.prices || []).filter(function(p){
    return p.priceType === '04' && p.countriesIncluded === country && !p.minimumOrderQuantity && !p.priceQualifier;
  })[0];
  return found ? String(found.priceAmount) : '';
}

function vlbTitel_(v) {
  if (!v || !v.titles) return '';
  var found = (v.titles || []).filter(function(t){ return t.titleType === '01'; })[0];
  return found ? found.title || '' : '';
}

function vlbUntertitel_(v) {
  if (!v || !v.titles) return '';
  var found = (v.titles || []).filter(function(t){ return t.titleType === '01'; })[0];
  return found ? found.subtitle || '' : '';
}

function vlbDatum_(v) {
  return v ? (v.publicationDate || v.onSaleDate || '') : '';
}

function vlbAutor_(v) {
  if (!v || !v.contributors) return '';
  return (v.contributors || []).filter(function(c){ var r = c.contributorRole || c.type || ''; return r === 'A01' || r === 'B01'; })
    .map(function(c){ return c.personNameInverted || (c.lastName ? (c.firstName ? c.lastName + ', ' + c.firstName : c.lastName) : '') || c.groupName || c.corporateName || ''; })
    .filter(Boolean).join('; ');
}

function vlbSeiten_(v) {
  if (!v) return '';
  if (v.extent != null) {
    var n = v.extent.mainContentPageCount != null ? v.extent.mainContentPageCount : (v.extent.absolutePageCount != null ? v.extent.absolutePageCount : v.extent.totalNumberedPages);
    return n != null ? String(n) : '';
  }
  if (!v.extents) return '';
  var e = (v.extents || []).filter(function(ex){ return ex.extentType === '11' || ex.extentType === '08'; })[0];
  return e && e.extentValue != null ? String(e.extentValue) : '';
}

function vlbLaufzeit_(v) {
  if (!v) return '';
  if (v.extent != null) return v.extent.duration != null ? String(v.extent.duration) : '';
  if (!v.extents) return '';
  var e = (v.extents || []).filter(function(ex){ return ex.extentType === '09'; })[0];
  return e && e.extentValue != null ? String(e.extentValue) : '';
}

function vlbVerlag_(v) {
  if (!v || !v.publishers) return '';
  var p = (v.publishers || []).filter(function(p){ return p.publisherRole === '01'; })[0];
  return p ? p.publisherName || '' : '';
}

function vlbProduktform_(v) { return v && v.form ? v.form.productForm || '' : ''; }
function vlbAuflage_(v) { return v && v.edition && v.edition.editionNumber != null ? String(v.edition.editionNumber) : ''; }
function vlbWarengruppe_(v) {
  if (!v || !v.subjects) return '';
  var s = (v.subjects || []).filter(function(s){ return s.subjectSchemeIdentifier === '26'; })[0];
  return s ? s.subjectCode || '' : '';
}
function vlbReihe_(v) {
  if (!v || !v.collections) return '';
  var c = (v.collections || []).filter(function(c){ return c.collectionId && !c.setId; })[0];
  return c ? c.title || '' : '';
}
function vlbOriginaltitel_(v) {
  if (!v || !v.titles) return '';
  var t = (v.titles || []).filter(function(t){ return t.titleType === '03'; })[0];
  return t ? t.title || '' : '';
}
function vlbLieferstatus_(v) { return v ? (v.productAvailability || '') : ''; }

function cb_(page, propName) {
  if (page && page._bqMap) return page._bqMap[propName] != null ? String(page._bqMap[propName]) : '';
  var prop = page && page.properties && page.properties[propName];
  if (!prop || prop.type !== 'checkbox') return '';
  return prop.checkbox ? 'Ja' : 'Nein';
}

function notionPreis_(p) {
  var fmt = sel_(p, 'Format');
  if (fmt === 'E-Book')                                   return num_(p, 'Preis E-Book');
  if (fmt === 'Hoerbuch')                                 return num_(p, 'Preis Hörbuch');
  if (fmt === 'Hoerbuch Download' || fmt === 'Hoerspiel Download') return num_(p, 'Preis Hörspiel Download');
  if (fmt === 'Hoerspiel CD')                             return num_(p, 'Preis Hörspiel CD');
  if (fmt === 'PDF')                                      return num_(p, 'Preis PDF');
  if (fmt === 'Sticker')                                  return num_(p, 'Preis Aufkleber') || num_(p, 'Preis D/AT (Print)');
  return num_(p, 'Preis D/AT (Print)');
}

// ── Vergleichs-Felder ──────────────────────────────────────────────────────

var COMPARE_FIELDS = [
  // Beide
  { label:'Titel',            source:'both',    notion:function(p){var t=text_(p,'Titel')||text_(p,'Name');var u=text_(p,'Untertitel');return u?t+': '+u:t;}, shopify:function(s){return s&&s.title?s.title:'';}, weclapp:function(w){return w&&w.name?w.name:'';} },
  { label:'ISBN / EAN',       source:'both',    notion:function(p){return p._resolvedIsbn||'';},  shopify:function(s){return s&&s._variant?s._variant.barcode||'':'';}, weclapp:function(w){return w&&w.ean?w.ean:'';},    normalize:function(v){return String(v||'').replace(/[-\s]/g,'');} },
  { label:'Bestell-Nr / SKU', source:'both',    notion:function(p){return text_(p,'Bestell-Nr');}, shopify:function(s){return s&&s._variant?s._variant.sku||'':'';},     weclapp:function(w){return w&&w.articleNumber?w.articleNumber:'';} },
  // Shopify Produkt
  { label:'Autor → Vendor',   source:'shopify', notion:function(p){return p._resolvedAutor||text_(p,'Autor/Illustrator')||text_(p,'Autor');}, shopify:function(s){return s&&s.vendor?s.vendor:'';} },
  { label:'Shopify Status',   source:'shopify', notion:function(p){return sel_(p,'Status');}, shopify:function(s){return s&&s.status?s.status:'';}, normalize:function(v){return String(v||'').toUpperCase();} },
  { label:'Kategorien → Tags',source:'shopify', notion:function(p){return multiSel_(p,'Webseite-Kategorien');}, shopify:function(s){return s&&s.tags?(s.tags||[]).sort().join(', '):'';}, normalize:function(v){return String(v||'').split(',').map(function(s){return s.trim();}).filter(Boolean).sort().join(', ');} },
  // Shopify Variante
  { label:'Preis (Verkauf)',  source:'shopify', notion:function(p){return notionPreis_(p);}, shopify:function(s){return s&&s._variant?s._variant.price||'':'';}, normalize:function(v){return v===''?'':parseFloat(String(v)).toFixed(2);} },
  // Shopify Metafields
  { label:'ISBN → Metafield', source:'shopify', notion:function(p){return p._resolvedIsbn||'';}, shopify:function(s){return mf_(s,'custom','isbn');}, normalize:function(v){return String(v||'').replace(/[-\s]/g,'');} },
  { label:'Seitenanzahl',     source:'shopify', notion:function(p){return text_(p,'Seiten');}, shopify:function(s){return mf_(s,'custom','seitenanzahl');}, normalize:function(v){return v===''?'':String(parseInt(v,10)||'');} },
  { label:'Auflage',          source:'shopify', notion:function(p){var s=sel_(p,'Auflage');var m=s.match(/(\d+)/);return m?m[1]:'';}, shopify:function(s){return mf_(s,'custom','auflage');}, normalize:function(v){return v===''?'':String(parseInt(v,10)||'');} },
  { label:'Laufzeit (min)',   source:'shopify', notion:function(p){return text_(p,'Laufzeit in Minuten');}, shopify:function(s){return mf_(s,'custom','laufzeit');}, normalize:function(v){return v===''?'':String(parseInt(v,10)||'');} },
  { label:'Einband',          source:'shopify', notion:function(p){return multiSel_(p,'Ausstattung');}, shopify:function(s){return mf_(s,'custom','einband');} },
  { label:'Sprache',          source:'shopify', notion:function(_p){return 'Deutsch';}, shopify:function(s){return mf_(s,'custom','sprache');} },
  { label:'Herausgeber',      source:'shopify', notion:function(_p){return 'Verbum Medien';}, shopify:function(s){return mf_(s,'custom','herausgeber');} },
  { label:'Originaltitel',    source:'shopify', notion:function(p){return text_(p,'Originaltitel');}, shopify:function(s){return mf_(s,'custom','originaltitel');} },
  { label:'Kategorie',        source:'shopify', notion:function(p){return sel_(p,'Kategorie');}, shopify:function(s){return mf_(s,'custom','kategorie');} },
  { label:'Altersgruppe',     source:'shopify', notion:function(p){return sel_(p,'Altersgruppe');}, shopify:function(s){return mf_(s,'custom','altersgruppe');} },
  { label:'DOI',              source:'shopify', notion:function(p){return text_(p,'DOI-Adresse');}, shopify:function(s){return mf_(s,'custom','doi');} },
  { label:'Erstveröffentl.',  source:'shopify', notion:function(p){return date_(p,'Erstveröffentlichung');}, shopify:function(s){return mf_(s,'custom','vdatum');}, normalize:function(v){return normDate_(v);} },
  { label:'Neuauflage-Datum', source:'shopify', notion:function(p){return date_(p,'Neuauflagedatum');}, shopify:function(s){return mf_(s,'custom','neuauflage');}, normalize:function(v){return normDate_(v);} },
  { label:'Breite (cm)',      source:'shopify', notion:function(p){var s=text_(p,'Endformat (B x H cm)');var m=s.match(/^([\d.,]+)/);return m?m[1].replace(',','.'):'';}, shopify:function(s){try{return JSON.parse(mf_(s,'custom','format')||'{}').value||'';}catch(e){return '';}} , normalize:function(v){return v===''?'':String(parseFloat(v));} },
  { label:'Höhe (cm)',        source:'shopify', notion:function(p){var s=text_(p,'Endformat (B x H cm)');var m=s.match(/x\s*([\d.,]+)/i);return m?m[1].replace(',','.'):'';}, shopify:function(s){try{return JSON.parse(mf_(s,'custom','formathoehe')||'{}').value||'';}catch(e){return '';}} , normalize:function(v){return v===''?'':String(parseFloat(v));} },
  // Weclapp
  { label:'Verkaufspreis',    source:'weclapp', notion:function(p){return notionPreis_(p);}, weclapp:function(w){return w&&w.articlePrices?String((w.articlePrices.filter(function(ap){return ap.currencyId==='EUR'||ap.currencyName==='EUR';})[0]||{}).price||w.sellPrice||''):(w&&w.sellPrice!=null?String(w.sellPrice):'');}, normalize:function(v){return v===''?'':parseFloat(String(v)).toFixed(2);} },
  { label:'Aktiv',            source:'weclapp', notion:function(p){var s=sel_(p,'Lieferbarkeit');return s==='lieferbar'||s==='Print-on-demand'?'true':s==='vergriffen'||s==='Inaktiv'?'false':'';}, weclapp:function(w){return w&&w.active!=null?String(w.active):'';} },
  { label:'Kurzbeschreibung', source:'weclapp', notion:function(p){return text_(p,'Buchinfo (kurz)');}, weclapp:function(w){return w&&w.shortDescription1?w.shortDescription1:'';} },
  { label:'Gewicht (kg)',     source:'weclapp', notion:function(p){return text_(p,'Gewicht in Gramm');}, weclapp:function(w){return w&&w.articleNetWeight!=null?String(w.articleNetWeight):'';}, normalize:function(v){if(v==='')return'';var n=parseFloat(v);return n>100?(n/1000).toFixed(3):n.toFixed(3);} },
  { label:'Erstveröffentlichung', source:'weclapp', notion:function(p){return date_(p,'Neuauflagedatum')||date_(p,'Erstveröffentlichung');}, weclapp:function(w){return w&&w.launchDate?new Date(w.launchDate).toISOString().slice(0,10):'';}, normalize:function(v){return normDate_(v);} },
  // VLB
  { label:'Titel (VLB)',           source:'vlb', notion:function(p){var t=text_(p,'Titel')||text_(p,'Name');var u=text_(p,'Untertitel');return u?t+': '+u:t;}, vlb:function(v){return vlbTitel_(v);} },
  { label:'Untertitel (VLB)',      source:'vlb', notion:function(p){return text_(p,'Untertitel');}, vlb:function(v){return vlbUntertitel_(v);} },
  { label:'Erscheinungsdatum (VLB)', source:'vlb', notion:function(p){return date_(p,'Neuauflagedatum')||date_(p,'Erstveröffentlichung');}, vlb:function(v){return vlbDatum_(v);}, normalize:function(v){return normDate_(v);} },
  { label:'Preis DE (VLB)',        source:'vlb', notion:function(p){return notionPreis_(p);}, vlb:function(v){return vlbPreis_(v,'DE');}, normalize:function(v){return v===''?'':parseFloat(String(v)).toFixed(2);} },
  { label:'Preis AT (VLB)',        source:'vlb', notion:function(p){return notionPreis_(p);}, vlb:function(v){return vlbPreis_(v,'AT');}, normalize:function(v){return v===''?'':parseFloat(String(v)).toFixed(2);} },
  { label:'Autor (VLB)',           source:'vlb', notion:function(p){return p._resolvedAutor||text_(p,'Autor/Illustrator')||text_(p,'Autor');}, vlb:function(v){return vlbAutor_(v);} },
  { label:'Seiten (VLB)',          source:'vlb', notion:function(p){return text_(p,'Seiten');}, vlb:function(v){return vlbSeiten_(v);}, normalize:function(v){return v===''?'':String(parseInt(v,10)||'');} },
  { label:'Laufzeit (Min) (VLB)',  source:'vlb', notion:function(p){return text_(p,'Laufzeit in Minuten');}, vlb:function(v){return vlbLaufzeit_(v);}, normalize:function(v){return v===''?'':String(parseInt(v,10)||'');} },
  { label:'Verlag (VLB)',           source:'vlb', notion:function(_p){return 'Verbum Medien';}, vlb:function(v){return vlbVerlag_(v);} },
  { label:'Preis CH (VLB)',          source:'vlb', notion:function(p){return notionPreis_(p);}, vlb:function(v){var pr=vlbPreis_(v,'CH');return pr===''?'':String(pr);}, normalize:function(v){return v===''?'':parseFloat(String(v)).toFixed(2);} },
  { label:'Auflage (VLB)',           source:'vlb', notion:function(p){var s=sel_(p,'Auflage');var m=s.match(/(\d+)/);return m?m[1]:'';}, vlb:function(v){return vlbAuflage_(v);}, normalize:function(v){return v===''?'':String(parseInt(v,10)||'');} },
  { label:'Reihe (VLB)',             source:'vlb', notion:function(p){return text_(p,'Reihe');}, vlb:function(v){return vlbReihe_(v);} },
  { label:'Produktform (VLB)',       source:'vlb', notion:function(p){return sel_(p,'Produktform')||sel_(p,'Format');}, vlb:function(v){return vlbProduktform_(v);} },
  { label:'Originaltitel (VLB)',     source:'vlb', notion:function(p){return text_(p,'Originaltitel');}, vlb:function(v){return vlbOriginaltitel_(v);} },
  { label:'Lieferstatus (VLB)',      source:'vlb', notion:function(p){return sel_(p,'Lieferbarkeit');}, vlb:function(v){return vlbLieferstatus_(v);} },

  // ══════════════ Nur Notion – Stammdaten (alle Properties) ═════
  // Selects & Status
  { label:'Format',                     source:'notion', notion:function(p){return sel_(p,'Format');} },
  { label:'Publikationsstatus',         source:'notion', notion:function(p){return sel_(p,'Publikationsstatus');} },
  { label:'Lieferbarkeit',              source:'notion', notion:function(p){return sel_(p,'Lieferbarkeit');} },
  { label:'Publikationsort',            source:'notion', notion:function(p){return sel_(p,'Publikationsort');} },
  { label:'Herstellungsland',           source:'notion', notion:function(p){return sel_(p,'Herstellungsland');} },
  { label:'Auflagentyp',                source:'notion', notion:function(p){return sel_(p,'Auflagentyp');} },
  { label:'Zolltarifnummer',            source:'notion', notion:function(p){return sel_(p,'Zolltarifnummer');} },
  { label:'Preisbindung',               source:'notion', notion:function(p){return sel_(p,'Preisbindung');} },
  { label:'Genre',                      source:'notion', notion:function(p){return sel_(p,'Genre');} },
  { label:'Warengruppen-Index',         source:'notion', notion:function(p){return sel_(p,'Warengruppen-Index');} },
  { label:'Haupt-Lesemotiv',            source:'notion', notion:function(p){return sel_(p,'Haupt-Lesemotiv');} },
  { label:'Neben-Lesemotiv',            source:'notion', notion:function(p){return sel_(p,'Neben-Lesemotiv');} },
  { label:'Churchslides',               source:'notion', notion:function(p){return sel_(p,'Churchslides');} },
  { label:'Shopify Crash',              source:'notion', notion:function(p){return sel_(p,'Shopify Crash');} },
  { label:'Sync',                       source:'notion', notion:function(p){return sel_(p,'Sync');} },

  // Preise (einzeln sichtbar)
  { label:'Preis D/AT (Print)',         source:'notion', notion:function(p){return num_(p,'Preis D/AT (Print)');} },
  { label:'Preis AT (Print)',           source:'notion', notion:function(p){return num_(p,'Preis AT (Print)');} },
  { label:'Preis CH (Print)',           source:'notion', notion:function(p){return num_(p,'Preis CH (Print)');} },
  { label:'Preis E-Book',              source:'notion', notion:function(p){return num_(p,'Preis E-Book');} },
  { label:'Preis Hörbuch',             source:'notion', notion:function(p){return num_(p,'Preis Hörbuch');} },
  { label:'Preis Hörspiel Download',   source:'notion', notion:function(p){return num_(p,'Preis Hörspiel Download');} },
  { label:'Preis Hörspiel CD',         source:'notion', notion:function(p){return num_(p,'Preis Hörspiel CD');} },
  { label:'Preis PDF',                  source:'notion', notion:function(p){return num_(p,'Preis PDF');} },
  { label:'Preis Aufkleber',            source:'notion', notion:function(p){return num_(p,'Preis Aufkleber');} },
  { label:'Preis Bilder',               source:'notion', notion:function(p){return num_(p,'Preis Bilder');} },
  { label:'D/AT Subskriptionspreis',    source:'notion', notion:function(p){return num_(p,'D/AT Subskriptionspreis');} },
  { label:'CH Subskriptionspreis',      source:'notion', notion:function(p){return num_(p,'CH Subskriptionspreis');} },
  { label:'Mengenpreise in €',          source:'notion', notion:function(p){return text_(p,'Mengenpreise in €');} },
  { label:'Mengenrabatte in Stk',       source:'notion', notion:function(p){return text_(p,'Mengenrabatte in Stk');} },
  { label:'Print Preise',               source:'notion', notion:function(p){return text_(p,'Print Preise');} },
  { label:'Ablaufdatum Subskription',   source:'notion', notion:function(p){return date_(p,'Ablaufdatum Subskriptionspreis');} },

  // IDs & ISBNs
  { label:'ASIN',                       source:'notion', notion:function(p){return text_(p,'ASIN');} },
  { label:'Buch-Nr. (intern)',          source:'notion', notion:function(p){return text_(p,'Buch-Nr. (intern)');} },
  { label:'Best-Nr Extern',             source:'notion', notion:function(p){return text_(p,'Best-Nr Extern');} },
  { label:'Print-ISBN',                 source:'notion', notion:function(p){return text_(p,'Print-ISBN');} },
  { label:'E-Book-ISBN',                source:'notion', notion:function(p){return text_(p,'E-Book-ISBN');} },
  { label:'Hörbuch-ISBN',               source:'notion', notion:function(p){return text_(p,'Hörbuch-ISBN');} },
  { label:'Hörbuch Download-ISBN',      source:'notion', notion:function(p){return text_(p,'Hörbuch Download-ISBN');} },
  { label:'Hörspiel CD-ISBN',           source:'notion', notion:function(p){return text_(p,'Hörspiel CD-ISBN');} },

  // Shopify-IDs
  { label:'Print Shopify ID',           source:'notion', notion:function(p){return text_(p,'Print Shopify ID');} },
  { label:'E-Book Shopify ID',          source:'notion', notion:function(p){return text_(p,'E-Book Shopify ID');} },
  { label:'Hörbuch Shopify ID',         source:'notion', notion:function(p){return text_(p,'Hörbuch Shopify ID');} },
  { label:'Produkt ID (E-Book)',        source:'notion', notion:function(p){return text_(p,'Produkt ID Shopify (E-Book)');} },
  { label:'Variant ID (Print)',         source:'notion', notion:function(p){return text_(p,'Variant ID Shopify (Print)');} },
  { label:'Variant ID (E-Book)',        source:'notion', notion:function(p){return text_(p,'Variant ID Shopify (E-Book)');} },
  { label:'Variant ID (Hoerbuch)',      source:'notion', notion:function(p){return text_(p,'Variant ID Shopify (Hoerbuch)');} },
  { label:'InventoryId Shopify',        source:'notion', notion:function(p){return text_(p,'InventoryId Shopify');} },

  // Termine
  { label:'Shopify Veröffentlichung',   source:'notion', notion:function(p){return date_(p,'Shopify Veröffentlichung');} },
  { label:'Hörspiel Veröffentlichung',  source:'notion', notion:function(p){return date_(p,'Hörspiel Veröffentlichung');} },
  { label:'Hörbuch Veröffentlichung',   source:'notion', notion:function(p){return date_(p,'Hörbuch Veröffentlichung');} },
  { label:'E-Book Veröffentlichung',    source:'notion', notion:function(p){return date_(p,'E-Book Veröffentlichungstermin');} },
  { label:'Frühester Ankündigungst.',   source:'notion', notion:function(p){return date_(p,'Frühester Ankündigungstermin');} },

  // Inhaltliche Felder
  { label:'Buchinfo (lang)',            source:'notion', notion:function(p){return text_(p,'Buchinfo (lang)');} },
  { label:'Slogan',                     source:'notion', notion:function(p){return text_(p,'Slogan');} },
  { label:'Impressum',                  source:'notion', notion:function(p){return text_(p,'Impressum');} },
  { label:'Originaluntertitel',         source:'notion', notion:function(p){return text_(p,'Originaluntertitel');} },
  { label:'Inhaltsverzeichnis',         source:'notion', notion:function(p){return text_(p,'Inhaltsverzeichnis');} },
  { label:'Hörbuch-Sprecher',           source:'notion', notion:function(p){return text_(p,'Hörbuch-Sprecher');} },
  { label:'Hörspiel-Darsteller',        source:'notion', notion:function(p){return text_(p,'Hörspiel-Darsteller');} },
  { label:'Hörspielinfo CD (kurz)',     source:'notion', notion:function(p){return text_(p,'Hörspielinfo CD (kurz)');} },
  { label:'Hörspielinfo CD (lang)',     source:'notion', notion:function(p){return text_(p,'Hörspielinfo CD (lang)');} },
  { label:'Hörspielinfo DL (kurz)',     source:'notion', notion:function(p){return text_(p,'Hörspielinfo Download (kurz)');} },
  { label:'Hörspielinfo DL (lang)',     source:'notion', notion:function(p){return text_(p,'Hörspielinfo Download (lang)');} },
  { label:'Schlagworte VLB',            source:'notion', notion:function(p){return text_(p,'Schlagworte VLB');} },
  { label:'Shopify Titel',              source:'notion', notion:function(p){return text_(p,'Shopify Titel');} },
  { label:'Buchblock (B x H cm)',       source:'notion', notion:function(p){return text_(p,'Buchblock (B x H cm)');} },

  // Multi-Selects
  { label:'Schlagworte',                source:'notion', notion:function(p){return multiSel_(p,'Schlagworte');} },
  { label:'Audio',                      source:'notion', notion:function(p){return multiSel_(p,'Audio');} },
  { label:'Bookwire ePub',              source:'notion', notion:function(p){return multiSel_(p,'Bookwire ePub');} },
  { label:'THEMA Kennung (BW)',         source:'notion', notion:function(p){return multiSel_(p,'THEMA Kennung (BW)');} },
  { label:'Verlag (Original)',          source:'notion', notion:function(p){return multiSel_(p,'Verlag (Original)');} },
  { label:'Kundengruppe',               source:'notion', notion:function(p){return multiSel_(p,'Kundengruppe');} },
  { label:'Navigations Tags',           source:'notion', notion:function(p){return multiSel_(p,'Navigations Tags Website');} },
  { label:'Print Sales channels',       source:'notion', notion:function(p){return multiSel_(p,'Print Sales channels Shopify');} },
  { label:'E-Book Sales channels',      source:'notion', notion:function(p){return multiSel_(p,'E-Book Sales channels Shopify');} },
  { label:'Hörbuch Sales channels',     source:'notion', notion:function(p){return multiSel_(p,'Hörbuch Sales channels Shopify');} },
  { label:'Ausstattung',                source:'notion', notion:function(p){return multiSel_(p,'Ausstattung');} },

  // Checkboxen
  { label:'E-Book (CB)',                source:'notion', notion:function(p){return cb_(p,'E-Book');} },
  { label:'PDF (CB)',                   source:'notion', notion:function(p){return cb_(p,'PDF');} },
  { label:'Hörbuch (CB)',               source:'notion', notion:function(p){return cb_(p,'Hörbuch');} },
  { label:'Hörbuch Download (CB)',      source:'notion', notion:function(p){return cb_(p,'Hörbuch Download');} },
  { label:'Hörbuch CD (CB)',            source:'notion', notion:function(p){return cb_(p,'Hörbuch CD');} },
  { label:'Aufkleber (CB)',             source:'notion', notion:function(p){return cb_(p,'Aufkleber');} },
  { label:'Präsentationsbilder (CB)',   source:'notion', notion:function(p){return cb_(p,'Präsentationsbilder');} },
  { label:'Logos (CB)',                 source:'notion', notion:function(p){return cb_(p,'Logos');} },

  // Zahlen & Maße
  { label:'Geschätzte Auflage',         source:'notion', notion:function(p){return num_(p,'Geschätzte Auflage');} },
  { label:'Reihenbandnummer',           source:'notion', notion:function(p){return num_(p,'Reihenbandnummer');} },
  { label:'Laufzeit Hörspiel (min)',    source:'notion', notion:function(p){return text_(p,'Laufzeit in Minuten (Hörspiel)');} },

  // URLs
  { label:'GPSR',                       source:'notion', notion:function(p){return text_(p,'GPSR');} },
  { label:'Video-URL',                  source:'notion', notion:function(p){return text_(p,'Video-URL');} },
  { label:'Amazon',                     source:'notion', notion:function(p){return text_(p,'Amazon');} },
  { label:'VLB-LINK',                   source:'notion', notion:function(p){return text_(p,'VLB-LINK');} },
  { label:'VLB-LINK CD',                source:'notion', notion:function(p){return text_(p,'VLB-LINK CD');} },
  { label:'Ansichts-PDF',               source:'notion', notion:function(p){return text_(p,'Ansichts-PDF');} },
  { label:'Shop-URL',                   source:'notion', notion:function(p){return text_(p,'Shop-URL');} },
  { label:'Haus der Bibel',             source:'notion', notion:function(p){return text_(p,'Haus der Bibel');} },
  { label:'Fontis',                     source:'notion', notion:function(p){return text_(p,'Fontis');} },
  { label:'Original',                   source:'notion', notion:function(p){return text_(p,'Original');} },
  { label:'Logos Shopify',              source:'notion', notion:function(p){return text_(p,'Logos Shopify');} },
  { label:'Antolin Shopify',            source:'notion', notion:function(p){return text_(p,'Antolin Shopify');} },
  { label:'Bilder',                     source:'notion', notion:function(p){return text_(p,'Bilder');} },

  // Berechnete Felder (Formeln)
  { label:'BestellNr (Gesamt)',         source:'notion', notion:function(p){return text_(p,'BestellNr (Gesamt)');} },
  { label:'Best-Nr E-Book',             source:'notion', notion:function(p){return text_(p,'Best-Nr E-Book (intern)');} },
  { label:'Best-Nr Hörbuch',            source:'notion', notion:function(p){return text_(p,'Best-Nr Hörbuch (intern)');} },
  { label:'Best-Nr Hörspiel CD',        source:'notion', notion:function(p){return text_(p,'Best-Nr Hörspiel CD (intern)');} },
  { label:'Best-Nr Hörspiel DL',        source:'notion', notion:function(p){return text_(p,'Best-Nr Hörspiel Download (intern)');} },
  { label:'Best-Nr PDF',                source:'notion', notion:function(p){return text_(p,'Best-Nr PDF');} },
  { label:'Best-Nr Aufkleber',          source:'notion', notion:function(p){return text_(p,'Best-Nr Aufkleber (intern)');} },
  { label:'Best-Nr Präsentation',       source:'notion', notion:function(p){return text_(p,'Best-Nr Präsentationsbilder (intern) ');} },
  { label:'Preisstaffelung D/AT',       source:'notion', notion:function(p){return text_(p,'Preisstaffelung D/AT');} },
  { label:'Preisstaffelung AT',         source:'notion', notion:function(p){return text_(p,'Preisstaffelung AT');} },
  { label:'Reiheninfo (kurz)',          source:'notion', notion:function(p){return text_(p,'Reiheninfo (kurz)');} },
  { label:'Reiheninfo (lang)',          source:'notion', notion:function(p){return text_(p,'Reiheninfo (lang)');} },
  { label:'_Vita',                      source:'notion', notion:function(p){return text_(p,'_Vita');} },
];

// ── Vergleich ──────────────────────────────────────────────────────────────

function compare_(a, b, fn) {
  var na = (fn ? fn(String(a || '')) : String(a || '')).trim();
  var nb = (fn ? fn(String(b || '')) : String(b || '')).trim();
  if (na === '' && nb === '') return 'both_empty';
  if (na === '' || nb === '') return 'missing';
  return na === nb ? 'equal' : 'diff';
}

// ── Haupt-Vergleichsfunktion (aufgerufen via google.script.run) ────────────

/** Gibt BQ-Diagnosedaten zurück */
/** Gibt den echten Standort des BQ-Datasets zurück – einmal ausführen um location zu prüfen */
function debugDatasetLocation() {
  try {
    var ds = BigQuery.Datasets.get(BQ_PROJECT, BQ_DATASET);
    return 'Dataset location: ' + ds.location;
  } catch(e) {
    return 'Fehler: ' + e.message;
  }
}

function debugBqQuery() {
  try {
    var csRows = _bqQuery(
      'SELECT COUNT(DISTINCT medien_id) AS products,'
      + ' COUNT(*) AS total_rows,'
      + " COUNTIF(status = 'abweichung') AS diffs,"
      + " COUNTIF(status = 'fehlt extern') AS missing"
      + ' FROM `' + BQ_PROJECT + '.datenvergleich.view`'
    );
    var cs = csRows[0] || {};
    return {
      project:    BQ_PROJECT,
      dataset:    'datenvergleich',
      table:      'view',
      products:   cs.products   || 0,
      totalRows:  cs.total_rows || 0,
      diffs:      cs.diffs      || 0,
      missing:    cs.missing    || 0,
      lastSync:   '–',
    };
  } catch(e) {
    return { error: e.message };
  }
}

/**
 * Wird per google.script.run aus der UI aufgerufen.
 * Sendet die ISBN an die compareRefresh Cloud Function und leert den Cache.
 * @param {string} isbn
 * @returns {{ ok: boolean, title?: string, rows?: number, error?: string }}
 */
function refreshProduct(mappingPageId) {
  try { _requireWriteAccess(); } catch(authErr) { return { ok: false, error: authErr.message }; }
  var url = _prop('COMPARE_REFRESH_URL');
  if (!url) return { ok: false, error: 'COMPARE_REFRESH_URL nicht konfiguriert' };
  if (!mappingPageId) return { ok: false, error: 'mappingPageId fehlt' };

  try {
    var res = UrlFetchApp.fetch(url, {
      method:             'post',
      contentType:        'application/json',
      payload:            JSON.stringify({ mappingPageId: mappingPageId }),
      muteHttpExceptions: true,
    });
    var code = res.getResponseCode();
    var rawText = res.getContentText();
    if (code >= 400) {
      var errBody = {};
      try { errBody = JSON.parse(rawText); } catch(e2) {}
      return { ok: false, error: errBody.error || ('HTTP ' + code + ': ' + rawText.slice(0, 200)) };
    }
    var body = JSON.parse(rawText);
    // Cache leeren, damit beim nächsten runCheck() frische Daten geladen werden
    try {
      var cache   = CacheService.getScriptCache();
      var keys    = _allCacheKeys();
      cache.removeAll(keys);
    } catch(cacheErr) { /* Cache-Fehler ignorieren */ }
    return { ok: true, title: body.title || mappingPageId, rows: body.rows || 0 };
  } catch(e) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ── Caching ───────────────────────────────────────────────────────────────────────

function _cacheKey(params) {
  var statuses = (params.statuses || []).slice().sort().join(',');
  return APP_VERSION + ':cmp:' + (params.limit || 25) + ':' + (params.only || '') + ':' + statuses;
}

function _allCacheKeys() {
  var keys    = [];
  var limits  = [10, 25, 50, 100, 200, 500, 999999];
  var systems = ['', 'shopify', 'weclapp', 'vlb'];
  limits.forEach(function(limit) {
    systems.forEach(function(only) {
      var k = APP_VERSION + ':cmp:' + limit + ':' + only + ':';
      keys.push(k);
      keys.push(k + ':index');
    });
  });
  return keys;
}

function _cachePut(key, data) {
  try {
    var s     = JSON.stringify(data);
    var cache = CacheService.getScriptCache();
    if (s.length < 95000) {
      cache.put(key, s, CACHE_TTL);
    } else {
      var chunkKeys = [];
      for (var i = 0; i < s.length; i += 90000) {
        var k = key + ':chunk:' + chunkKeys.length;
        cache.put(k, s.slice(i, i + 90000), CACHE_TTL);
        chunkKeys.push(k);
      }
      cache.put(key + ':index', JSON.stringify(chunkKeys), CACHE_TTL);
    }
  } catch(e) { /* Cache-Fehler ignorieren */ }
}

function _cacheGet(key) {
  try {
    var cache  = CacheService.getScriptCache();
    var direct = cache.get(key);
    if (direct) return JSON.parse(direct);
    var indexRaw = cache.get(key + ':index');
    if (!indexRaw) return null;
    var keys   = JSON.parse(indexRaw);
    var joined = keys.map(function(k) { return cache.get(k) || ''; }).join('');
    return JSON.parse(joined);
  } catch(e) { return null; }
}

// ── SQL aufbauen ──────────────────────────────────────────────────────────────────
// Quelle: datenvergleich.view (fertig berechnete Vergleichszeilen)
// Spalten: medien_id, feldname, wert_verbum, wert_extern, schnittstelle, status
//   status-Werte: 'gleich', 'abweichung', 'fehlt extern'

function _buildSql(params) {
  var limit    = parseInt(params.limit || '25', 10) || 25;
  if (limit !== 999999) limit = Math.min(limit, 500);
  var only     = params.only     || '';
  var statuses = params.statuses || [];

  var viewTbl = '`' + BQ_PROJECT + '.datenvergleich.view`';

  var sysFilter = only === 'shopify' ? " AND schnittstelle = 'shopify'"
                : only === 'weclapp' ? " AND schnittstelle = 'weclapp'"
                : only === 'vlb'     ? " AND schnittstelle = 'vlb'"
                : '';

  var statusFilter = statuses.length > 0 && statuses.length < 3
    ? ' AND status IN (' + statuses.map(function(s) { return "'" + s.replace(/'/g, "\\'")+"'"; }).join(',') + ')'
    : '';

  var topProducts = limit < 999999
    ? '(SELECT medien_id FROM ' + viewTbl
      + ' WHERE 1=1' + sysFilter + statusFilter
      + ' GROUP BY medien_id ORDER BY medien_id LIMIT ' + limit + ')'
    : null;

  var joinTop = topProducts
    ? ' INNER JOIN ' + topProducts + ' tp ON v.medien_id = tp.medien_id'
    : '';

  return 'SELECT'
    + '  v.medien_id,'
    + "  MAX(IF(v.feldname = 'titel', v.wert_verbum, NULL)) OVER (PARTITION BY v.medien_id) AS titel,"
    + '  v.feldname,'
    + '  v.wert_verbum,'
    + '  v.wert_extern,'
    + '  v.schnittstelle,'
    + '  v.status'
    + ' FROM ' + viewTbl + ' v'
    + joinTop
    + ' WHERE 1=1' + sysFilter
    + ' ORDER BY v.medien_id, v.schnittstelle, v.feldname';
}

// ── Zeilen gruppieren & Statistiken ──────────────────────────────────────────

// Notion-Felder die aus verbum_medien kommen und als eigene Zeilen angezeigt werden
var NOTION_DISPLAY_FIELDS = [
  { label: 'Titel',                col: 'n_titel' },
  { label: 'Untertitel',           col: 'n_untertitel' },
  { label: 'ISBN',                 col: 'n_isbn' },
  { label: 'Bestell-Nr',           col: 'n_bestell_nr' },
  { label: 'Format / Medium',      col: 'n_format' },
  { label: 'Status (intern)',      col: 'n_status' },
  { label: 'Lieferbarkeit',        col: 'n_lieferbarkeit' },
  { label: 'Publikationsstatus',   col: 'n_publikationsstatus' },
  { label: 'Autor',                col: 'n_autor' },
  { label: 'Preis DE/AT (Print)',  col: 'n_preis_dat' },
  { label: 'Preis CH (Print)',     col: 'n_preis_chf' },
  { label: 'Preis E-Book',         col: 'n_preis_ebook' },
  { label: 'Preis Hörbuch',        col: 'n_preis_hoerbuch' },
  { label: 'Preis Hörspiel DL',    col: 'n_preis_hsp_dl' },
  { label: 'Preis Hörspiel CD',    col: 'n_preis_hsp_cd' },
  { label: 'Preis PDF',            col: 'n_preis_pdf' },
  { label: 'Preis Aufkleber',      col: 'n_preis_aufkleber' },
  { label: 'Seiten',               col: 'n_seiten' },
  { label: 'Auflage',              col: 'n_auflage' },
  { label: 'Laufzeit (Min)',       col: 'n_laufzeit' },
  { label: 'Ausstattung',          col: 'n_ausstattung' },
  { label: 'Originaltitel',        col: 'n_originaltitel' },
  { label: 'Kategorie',            col: 'n_kategorie' },
  { label: 'Altersgruppe',         col: 'n_altersgruppe' },
  { label: 'DOI',                  col: 'n_doi' },
  { label: 'Erstveröffentlichung', col: 'n_erstveroeffentlichung' },
  { label: 'Neuauflagedatum',      col: 'n_neuauflagedatum' },
  { label: 'Endformat (B×H cm)',   col: 'n_endformat' },
  { label: 'Buchinfo (kurz)',      col: 'n_buchinfo_kurz' },
  { label: 'Gewicht (g)',          col: 'n_gewicht' },
  { label: 'Web-Kategorien',       col: 'n_kategorien_web' },
];

function _processRows(dataRows) {
  var productsMap   = {};
  var productsOrder = [];

  for (var ri = 0; ri < dataRows.length; ri++) {
    var row = dataRows[ri];
    var key = row.medien_id;
    if (!productsMap[key]) {
      productsMap[key] = {
        title:        row.titel || key,
        notionUrl:    '',
        shopifyId:    '',
        weclappId:    '',
        vlbIsbn:      '',
        vlbProductId: '',
        syncedAt:     '',
        mappingPageId: key,
        rows:         [],
        errs:         [],
        statusFlags:  {},
      };
      productsOrder.push(key);
    }
    var prod = productsMap[key];
    // Titel aktualisieren sobald ein Wert vorhanden
    if (!prod.title && row.titel) prod.title = row.titel;

    var result = row.status === 'gleich'     ? 'equal'
               : row.status === 'abweichung' ? 'diff'
               : 'missing'; // 'fehlt extern'

    prod.rows.push({
      label:     row.feldname    || '',
      notionVal: row.wert_verbum || '',
      extVal:    row.wert_extern || '',
      ext:       _capitalize(row.schnittstelle || ''),
      result:    result,
    });
  }

  var entries = [];
  var stats   = { total: 0, equal: 0, diff: 0, missing: 0, notion_only: 0, errors: 0, not_registered: 0 };

  for (var pi = 0; pi < productsOrder.length; pi++) {
    var p = productsMap[productsOrder[pi]];
    for (var fi = 0; fi < p.rows.length; fi++) {
      var r = p.rows[fi];
      stats.total++;
      if      (r.result === 'equal')   stats.equal++;
      else if (r.result === 'diff')    stats.diff++;
      else if (r.result === 'missing') stats.missing++;
    }
    entries.push(p);
  }

  return { entries: entries, stats: stats, syncedAt: null };
}

function _capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ── Haupt-Funktion ──────────────────────────────────────────────────────────────

function getComparisonData(params) {
  params = params || {};

  var key    = _cacheKey(params);
  var cached = _cacheGet(key);
  if (cached) return cached;

  var sql      = _buildSql(params);
  var dataRows = _bqQuery(sql);

  if (!dataRows || !dataRows.length) {
    return { entries: [], stats: { total: 0, equal: 0, diff: 0, missing: 0, notion_only: 0, errors: 0 }, syncedAt: null };
  }

  var result = _processRows(dataRows);

  _cachePut(key, result);
  return result;
}

// ── Cache invalidieren ───────────────────────────────────────────────────────

function invalidateCache() {
  var cache = CacheService.getScriptCache();
  _allCacheKeys().forEach(function(k) { cache.remove(k); });
}

// ── Update-Handler (via google.script.run) ─────────────────────────────────

function updateField(data) {
  try { _requireWriteAccess(); } catch(authErr) { return { ok: false, error: authErr.message }; }
  var shopifyId = data.shopifyId;
  var weclappId = data.weclappId;
  var label     = data.label;
  var ext       = data.ext;
  var val       = data.val;

  try {
    if (ext === 'Shopify') {
      var smf = function(key, type) { return function(){ shopifySetMetafield(shopifyId, 'custom', key, val, type); }; };
      var svar = function(field) { return function(){ shopifyUpdateVariant(shopifyId, field, val); }; };
      var smap = {
        'Titel':               function(){ shopifyUpdateProduct(shopifyId, { title: val }); },
        'Autor → Vendor':      function(){ shopifyUpdateProduct(shopifyId, { vendor: val }); },
        'Shopify Status':      function(){ shopifyUpdateProduct(shopifyId, { status: val.toUpperCase() }); },
        'Kategorien → Tags':   function(){ shopifyUpdateProduct(shopifyId, { tags: val.split(', ').filter(Boolean) }); },
        'Preis (Verkauf)':     svar('price'),
        'ISBN / EAN':          svar('barcode'),
        'Bestell-Nr / SKU':    svar('sku'),
        'ISBN → Metafield':    smf('isbn',          'single_line_text_field'),
        'Seitenanzahl':        smf('seitenanzahl',   'single_line_text_field'),
        'Auflage':             smf('auflage',        'single_line_text_field'),
        'Laufzeit (min)':      smf('laufzeit',       'single_line_text_field'),
        'Einband':             smf('einband',        'single_line_text_field'),
        'Sprache':             smf('sprache',        'single_line_text_field'),
        'Herausgeber':         smf('herausgeber',    'single_line_text_field'),
        'Originaltitel':       smf('originaltitel',  'single_line_text_field'),
        'Kategorie':           smf('kategorie',      'single_line_text_field'),
        'Altersgruppe':        smf('altersgruppe',   'single_line_text_field'),
        'DOI':                 smf('doi',            'single_line_text_field'),
        'Erstveröffentl.':     function(){ shopifySetMetafield(shopifyId, 'custom', 'vdatum', normDate_(val), 'date'); },
        'Neuauflage-Datum':    function(){ shopifySetMetafield(shopifyId, 'custom', 'neuauflage', normDate_(val), 'date'); },
        'Breite (cm)':         function(){ shopifySetMetafield(shopifyId, 'custom', 'format', JSON.stringify({ value: parseFloat(val), unit: 'CENTIMETERS' }), 'dimension'); },
        'Höhe (cm)':           function(){ shopifySetMetafield(shopifyId, 'custom', 'formathoehe', JSON.stringify({ value: parseFloat(val), unit: 'CENTIMETERS' }), 'dimension'); },
      };
      var fn = smap[label];
      if (!fn) throw new Error('Kein Shopify-Update für "' + label + '" definiert');
      fn();
    } else if (ext === 'Weclapp') {
      var wmap = {
        'Titel':              function(){ weclappUpdateArticle(weclappId, { name: val }); },
        'ISBN / EAN':         function(){ weclappUpdateArticle(weclappId, { ean: val }); },
        'Bestell-Nr / SKU':   function(){ weclappUpdateArticle(weclappId, { articleNumber: val }); },
        'Verkaufspreis':      function(){ weclappUpdateArticle(weclappId, { sellPrice: parseFloat(val) }); },
        'Aktiv':              function(){ weclappUpdateArticle(weclappId, { active: val === 'true' }); },
        'Kurzbeschreibung':   function(){ weclappUpdateArticle(weclappId, { shortDescription1: val }); },
        'Gewicht (kg)':       function(){ weclappUpdateArticle(weclappId, { articleNetWeight: parseFloat(val) }); },
        'Erscheinungsdatum':  function(){ weclappUpdateArticle(weclappId, { launchDate: new Date(normDate_(val)).getTime() }); },
      };
      var wfn = wmap[label];
      if (!wfn) throw new Error('Kein Weclapp-Update für "' + label + '" definiert');
      wfn();
    } else {
      throw new Error('Unbekanntes System: ' + ext);
    }
    return { ok: true };
  } catch(e) {
    return { ok: false, error: e.message };
  }
}

// ── Konfigurationsprüfung ──────────────────────────────────────────────────

function checkConfig() {
  var required = ['SHOPIFY_SHOP', 'SHOPIFY_ACCESS_TOKEN', 'WECLAPP_BASE_URL', 'WECLAPP_API_KEY'];
  var missing  = required.filter(function(k) { return !_prop(k); });
  return missing;
}

// ── URL-Konfiguration für Direktlinks ──────────────────────────────────────

function getUrlConfig() {
  var shop        = _prop('SHOPIFY_SHOP');
  var weclappHost = _prop('WECLAPP_BASE_URL').replace(/\/+$/, '').replace(/\/webapp\/api\/v[12]$/, '');
  return {
    notion:  'https://www.notion.so/',
    shopify: shop ? 'https://' + shop + '.myshopify.com/admin/products/' : '',
    weclapp: weclappHost ? weclappHost + '/app/article/' : '',
    vlb:     'https://app.vlb.de/#/product/show/',
  };
}

function getClientConfig() {
  return {
    canWrite: _canWrite(),
  };
}

// ── Web App Entry Point ────────────────────────────────────────────────────

function doGet(e) {
  var tmpl = HtmlService.createTemplateFromFile('index');
  tmpl.initialData = 'null';
  tmpl.urlConfig   = JSON.stringify(getUrlConfig());
  tmpl.clientConfig = JSON.stringify(getClientConfig());
  tmpl.appVersion  = APP_VERSION;
  return tmpl.evaluate()
    .setTitle('Notion ↔ Shopify ↔ Weclapp')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}
