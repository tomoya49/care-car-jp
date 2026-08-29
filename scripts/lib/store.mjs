import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STORE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'data',
  'leads.json',
);

export function loadStore() {
  if (!fs.existsSync(STORE_PATH)) return { leads: [] };
  const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
  return { leads: Array.isArray(parsed.leads) ? parsed.leads : [] };
}

export function saveStore(store) {
  fs.writeFileSync(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`);
}
