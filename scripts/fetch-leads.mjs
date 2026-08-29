#!/usr/bin/env node
// 公開されている介護事業所オープンデータ（config/sources.json で定義）を巡回し、
// 未取得の事業所番号があれば新規リードとして data/leads.json に追記する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeBuffer, parseCsv } from './lib/csv.mjs';
import { loadStore, saveStore } from './lib/store.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcesPath = path.join(here, '..', 'config', 'sources.json');
const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));

const store = loadStore();
const existingIds = new Set(store.leads.map((l) => l.id));
const newLeads = [];
const now = new Date().toISOString();

for (const source of sources) {
  if (!source.enabled) {
    console.log(`[skip] ${source.id}: enabled=false（config/sources.json でURLを設定し enabled:true にしてください）`);
    continue;
  }
  if (!source.url || source.url.startsWith('REPLACE_ME')) {
    console.log(`[skip] ${source.id}: url が未設定です`);
    continue;
  }

  console.log(`[fetch] ${source.id}: ${source.url}`);
  let records;
  try {
    const res = await fetch(source.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const text = decodeBuffer(buffer, source.encoding);
    records = parseCsv(text);
  } catch (err) {
    console.error(`[error] ${source.id}: ${err.message}`);
    continue;
  }

  let addedForSource = 0;
  for (const record of records) {
    const rawKey = record[source.keyField];
    if (!rawKey) continue;
    const id = `${source.id}:${rawKey}`;
    if (existingIds.has(id)) continue;

    const lead = { id, sourceId: source.id, firstSeenAt: now, notifiedAt: null };
    for (const [csvField, internalField] of Object.entries(source.fieldMap || {})) {
      lead[internalField] = record[csvField] ?? '';
    }

    store.leads.push(lead);
    existingIds.add(id);
    newLeads.push(lead);
    addedForSource++;
  }

  console.log(`[done] ${source.id}: ${records.length}件中 新規${addedForSource}件`);
}

if (newLeads.length > 0) {
  saveStore(store);
}

const webhookUrl = process.env.WEBHOOK_URL;
if (newLeads.length > 0 && webhookUrl) {
  const lines = newLeads
    .slice(0, 20)
    .map((l) => `・${l.name || '(名称不明)'} / ${l.serviceType || ''} / ${l.address || ''}`);
  const summary = `【ケアカー】新着物件情報（見込み客リード） ${newLeads.length}件\n${lines.join('\n')}${
    newLeads.length > 20 ? `\n…他${newLeads.length - 20}件` : ''
  }`;

  try {
    // Slack (text) / Discord (content) の両方に対応できるよう両キーを送る
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: summary, content: summary }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const notifiedAt = new Date().toISOString();
    for (const lead of newLeads) {
      const stored = store.leads.find((x) => x.id === lead.id);
      if (stored) stored.notifiedAt = notifiedAt;
    }
    saveStore(store);
    console.log(`[notify] webhook 送信完了（${newLeads.length}件）`);
  } catch (err) {
    console.error(`[notify-error] ${err.message}`);
  }
} else if (newLeads.length > 0) {
  console.log(`[notify] WEBHOOK_URL 未設定のため通知はスキップ（新着${newLeads.length}件は data/leads.json に保存済み）`);
} else {
  console.log('[notify] 新着なし');
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_count=${newLeads.length}\n`);
}
