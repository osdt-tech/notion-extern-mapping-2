'use strict';
require('dotenv').config();

const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const bestellNr = (process.argv.find((a) => /^--bestell-nr=/i.test(a)) || '')
  .replace(/^--bestell-nr=/i, '')
  .trim();

if (!bestellNr) {
  console.error('Usage: node query-bestell-nr.js --bestell-nr=8652000');
  process.exit(1);
}

(async () => {
  const response = await notion.dataSources.query({
    data_source_id: process.env.NOTION_DATA_SOURCE_ID,
    filter: {
      property: 'Bestell-Nr',
      formula: {
        string: { equals: bestellNr },
      },
    },
  });

  console.log(JSON.stringify(response, null, 2));
})();
