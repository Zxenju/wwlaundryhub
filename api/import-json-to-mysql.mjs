import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importMysqlData, isMysqlConfigured } from './mysql-store.mjs';

const apiDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = join(apiDirectory, '.data');

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

if (!isMysqlConfigured()) {
  throw new Error('Set DATABASE_URL or Railway MYSQL* variables before importing JSON data.');
}

const bookings = await readJson(join(dataDirectory, 'bookings.json'), []);
const replacePricing = process.argv.includes('--replace-pricing');
const pricing = await readJson(
  join(dataDirectory, 'pricing.json'),
  await readJson(join(apiDirectory, 'default-pricing.json')),
);

if (!Array.isArray(bookings)) throw new Error('api/.data/bookings.json must contain a JSON array.');
await importMysqlData(bookings, pricing, { replacePricing });
console.log(
  `Imported ${bookings.length} booking record(s); existing IDs were left unchanged.`
  + (replacePricing ? ' Pricing was replaced from the JSON file.' : ' Existing database pricing was left unchanged.'),
);
