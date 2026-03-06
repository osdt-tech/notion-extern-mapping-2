'use strict';

require('dotenv').config();
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const articleId = process.argv[2];
if (!articleId) {
  console.error('Usage: node fetch-weclapp-article.js <articleId> [outputFile]');
  process.exit(1);
}

const baseUrl = (process.env.WECLAPP_BASE_URL || 'https://verbummedien.weclapp.com/webapp/api/v2').replace(/\/$/, '');
const apiKey = process.env.WECLAPP_API_KEY;
const outputFile = process.argv[3] || `weclapp-article-${articleId}.json`;

if (!apiKey) {
  console.error('Fehlende Variable: WECLAPP_API_KEY');
  process.exit(1);
}

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
          reject(new Error(`weclapp API ${res.statusCode}: ${body.slice(0, 300)}`));
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

(async () => {
  try {
    const data = await requestJson(`${baseUrl}/article/id/${encodeURIComponent(articleId)}`);
    const fullPath = path.resolve(outputFile);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Gespeichert: ${fullPath}`);
  } catch (err) {
    console.error(`Fehler: ${err.message}`);
    process.exit(1);
  }
})();
