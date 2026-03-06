'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');

const inputFile = process.argv[2] || 'weclapp-article-4456.json';
const baseUrl = (process.env.WECLAPP_BASE_URL || '').replace(/\/$/, '');
const apiKey = process.env.WECLAPP_API_KEY;

if (!baseUrl) {
  console.error('Fehlende Variable: WECLAPP_BASE_URL');
  process.exit(1);
}
if (!apiKey) {
  console.error('Fehlende Variable: WECLAPP_API_KEY');
  process.exit(1);
}

const idKeyToEntity = {
  manufacturerId: 'manufacturer',
  customsTariffNumberId: 'customsTariffNumber',
  packagingUnitBaseArticleId: 'article',
  unitId: 'unit',
  currencyId: 'currency',
  lastModifiedByUserId: 'user',
  attributeDefinitionId: 'customAttributeDefinition',
};

const cache = new Map();

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: 'GET',
      headers: {
        AuthenticationToken: apiKey,
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    }, (res) => {
      let stream = res;
      const enc = String(res.headers['content-encoding'] || '').toLowerCase();
      if (enc === 'gzip') stream = res.pipe(zlib.createGunzip());
      else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());

      let body = '';
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => {
        body += chunk;
      });
      stream.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(new Error(`JSON-Parse-Fehler: ${err.message}`));
        }
      });
      stream.on('error', reject);
    });

    req.on('error', reject);
    req.end();
  });
}

function deriveEntityFromIdKey(idKey) {
  if (idKeyToEntity[idKey]) return idKeyToEntity[idKey];
  if (!idKey.endsWith('Id')) return null;
  return idKey.slice(0, -2);
}

function pickLabel(entity, data, rawId) {
  if (!data || typeof data !== 'object') return String(rawId);

  if (entity === 'manufacturer') return data.name || String(rawId);
  if (entity === 'customsTariffNumber') {
    const num = data.positionNumber || '';
    const name = data.name || '';
    return `${num} ${name}`.trim() || String(rawId);
  }
  if (entity === 'unit') return data.name || data.description || String(rawId);
  if (entity === 'currency') return data.name || data.currencySymbol || String(rawId);
  if (entity === 'user') {
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    return fullName || data.email || String(rawId);
  }
  if (entity === 'article') {
    const nr = data.articleNumber || '';
    const name = data.name || '';
    return `${nr} ${name}`.trim() || String(rawId);
  }
  if (entity === 'customAttributeDefinition') {
    return data.label || (Array.isArray(data.attributeLabels) ? (data.attributeLabels[0] || {}).labelText : '') || String(rawId);
  }

  return data.name || data.label || data.description || data.value || String(rawId);
}

async function resolveEntity(entity, rawId) {
  if (rawId === null || rawId === undefined || rawId === '') return null;

  const id = String(rawId);
  const cacheKey = `${entity}:${id}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const url = `${baseUrl}/${entity}/id/${encodeURIComponent(id)}`;
  try {
    const data = await requestJson(url);
    const resolved = {
      entity,
      id,
      label: pickLabel(entity, data, id),
      data,
    };
    cache.set(cacheKey, resolved);
    return resolved;
  } catch (_) {
    cache.set(cacheKey, null);
    return null;
  }
}

async function enrichNode(node) {
  if (Array.isArray(node)) {
    for (const item of node) {
      await enrichNode(item);
    }
    return;
  }

  if (!node || typeof node !== 'object') return;

  let attrDefResolved = null;
  const entries = Object.entries(node);

  for (const [key, value] of entries) {
    if (key.endsWith('Id')) {
      const entity = deriveEntityFromIdKey(key);
      if (entity) {
        const resolved = await resolveEntity(entity, value);
        if (resolved) {
          node[`${key}Resolved`] = resolved.label;
          if (key === 'attributeDefinitionId') {
            attrDefResolved = resolved;
          }
        }
      }
    }

    await enrichNode(value);
  }

  if (attrDefResolved && Array.isArray(node.selectedValues)) {
    const options = Array.isArray(attrDefResolved.data.selectableValues)
      ? attrDefResolved.data.selectableValues
      : [];
    const optionById = new Map(options.map((o) => [String(o.id), o]));

    for (const selected of node.selectedValues) {
      if (!selected || typeof selected !== 'object') continue;
      if (!('id' in selected)) continue;
      const opt = optionById.get(String(selected.id));
      if (!opt) continue;
      selected.idResolved = opt.value || opt.label || String(selected.id);
    }
  }
}

(async () => {
  const fullPath = path.resolve(inputFile);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const json = JSON.parse(raw);

  await enrichNode(json);

  fs.writeFileSync(fullPath, JSON.stringify(json, null, 2), 'utf8');
  console.log(`Enriched: ${fullPath}`);
})();
