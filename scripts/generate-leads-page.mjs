#!/usr/bin/env node
// data/leads.json から社内向けの新着物件情報（リード）一覧ページ leads.html を再生成する。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStore } from './lib/store.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcesPath = path.join(here, '..', 'config', 'sources.json');
const outPath = path.join(here, '..', 'leads.html');

const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
const labelById = Object.fromEntries(sources.map((s) => [s.id, s.label]));

const store = loadStore();
const leads = [...store.leads].sort((a, b) => (b.firstSeenAt || '').localeCompare(a.firstSeenAt || ''));

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function fmtDateTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

const cards = leads.length === 0
  ? `<div class="empty">まだ新着の物件情報はありません。config/sources.json でデータソースを設定すると、新規開業の介護事業所情報が見つかり次第ここに表示されます。</div>`
  : leads
      .map((l) => `
      <div class="lead-card">
        <div class="lead-top">
          <span class="lead-source">${esc(labelById[l.sourceId] || l.sourceId)}</span>
          <span class="lead-date">取得: ${esc(fmtDateTime(l.firstSeenAt))}</span>
        </div>
        <div class="lead-name">${esc(l.name) || '(名称不明)'}</div>
        ${l.serviceType ? `<div class="lead-meta">${esc(l.serviceType)}</div>` : ''}
        ${l.address ? `<div class="lead-meta">${esc(l.address)}</div>` : ''}
        ${l.phone ? `<div class="lead-meta">TEL: ${esc(l.phone)}</div>` : ''}
        ${l.designatedDate ? `<div class="lead-meta">指定年月日: ${esc(l.designatedDate)}</div>` : ''}
      </div>`)
      .join('\n');

const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>新着物件情報（社内用）｜ケアカーサポートサービス</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Serif+JP:wght@700;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
:root{
  --navy:#1a2d4a;--navy-mid:#2b4570;--steel:#4a6fa5;--sky:#7eb8d4;
  --cream:#f7f5f0;--accent:#e8a020;--accent-light:#fdf3e0;
  --text:#1a1a1a;--muted:#666;--border:#ddd8d0;
}
body{font-family:'Noto Sans JP',sans-serif;color:var(--text);background:var(--cream);max-width:640px;margin:0 auto;min-height:100vh;}
.header{background:var(--navy);padding:18px 20px 16px;position:relative;overflow:hidden;}
.header::after{content:'';position:absolute;top:-30px;right:-30px;width:130px;height:130px;border-radius:50%;background:var(--navy-mid);opacity:.5;}
.h-in{position:relative;z-index:1;}
.eyebrow{font-size:9px;font-weight:700;letter-spacing:.16em;color:var(--sky);text-transform:uppercase;margin-bottom:4px;}
.brand{font-family:'Noto Serif JP',serif;font-size:16px;font-weight:900;color:#fff;}
.htitle{font-size:20px;font-weight:900;color:#fff;margin-top:8px;line-height:1.4;}
.hsub{font-size:11px;color:rgba(255,255,255,.7);margin-top:4px;}
.wrap{padding:18px;}
.empty{background:#fff;border:1.5px dashed var(--border);border-radius:10px;padding:24px;text-align:center;font-size:12px;color:var(--muted);line-height:1.7;}
.lead-card{background:#fff;border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.05);}
.lead-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.lead-source{font-size:9px;font-weight:700;letter-spacing:.06em;color:#fff;background:var(--steel);padding:2px 8px;border-radius:10px;}
.lead-date{font-size:9px;color:var(--muted);}
.lead-name{font-size:15px;font-weight:900;color:var(--navy);margin-bottom:4px;}
.lead-meta{font-size:11.5px;color:var(--text);line-height:1.6;}
</style>
</head>
<body>
<div class="header"><div class="h-in">
  <div class="eyebrow">Internal / Leads</div>
  <div class="brand">ケアカーサポートサービス</div>
  <div class="htitle">新着物件情報（見込み客リード）</div>
  <div class="hsub">最終更新: ${esc(fmtDateTime(new Date().toISOString()))} ／ 累計${leads.length}件</div>
</div></div>
<div class="wrap">
${cards}
</div>
</body>
</html>
`;

fs.writeFileSync(outPath, html);
console.log(`leads.html を更新しました（${leads.length}件）`);
