// 画像生成の受け口。APIキーはここ（サーバー側）だけが持ち、画面には出さない。
//   GET  /api/presets  … 画風の一覧
//   POST /api/generate … { password, preset, subject, size, quality } → { image(base64), mime }
// それ以外のパスは public/ の画面を返す。

import { buildPrompt, findPreset, publicPresets } from "./presets.js";

const SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);
const QUALITIES = new Set(["low", "medium", "high"]);
const MAX_SUBJECT = 500;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// 合言葉の比較（長さや一致位置で時間が変わらないようにする）
async function samePassword(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function generate(request, env) {
  if (!env.OPENAI_API_KEY || !env.APP_PASSWORD) {
    return json({ error: "サーバーの設定（OPENAI_API_KEY / APP_PASSWORD）がまだです。" }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "送られた内容が読めませんでした。" }, 400);
  }

  if (typeof body.password !== "string" || !(await samePassword(body.password, env.APP_PASSWORD))) {
    return json({ error: "合言葉がちがいます。" }, 401);
  }

  const preset = findPreset(body.preset);
  if (!preset) return json({ error: "画風を選んでください。" }, 400);

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!subject) return json({ error: "何を描くかを入力してください。" }, 400);
  if (subject.length > MAX_SUBJECT) {
    return json({ error: `何を描くかは${MAX_SUBJECT}文字以内にしてください。` }, 400);
  }

  const size = SIZES.has(body.size) ? body.size : "1024x1024";
  const quality = QUALITIES.has(body.quality) ? body.quality : "medium";

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_IMAGE_MODEL || "gpt-image-2",
      prompt: buildPrompt(preset, subject),
      size,
      quality,
      n: 1,
      output_format: "png",
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message || `HTTP ${res.status}`;
    return json({ error: `生成に失敗しました：${message}` }, 502);
  }
  const image = data?.data?.[0]?.b64_json;
  if (!image) return json({ error: "生成結果に画像が入っていませんでした。" }, 502);

  return json({ image, mime: "image/png" });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/presets" && request.method === "GET") {
      return json({ presets: publicPresets() });
    }
    if (pathname === "/api/generate") {
      if (request.method !== "POST") return json({ error: "POST で送ってください。" }, 405);
      return generate(request, env);
    }
    if (pathname.startsWith("/api/")) return json({ error: "見つかりません。" }, 404);

    return env.ASSETS.fetch(request);
  },
};
