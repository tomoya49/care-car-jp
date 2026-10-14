// 画像生成の受け口。
// 生成エンジンは IMAGE_ENGINE で切り替える（wrangler.jsonc）:
//   cloudflare … Cloudflare Workers AI の FLUX.2 [klein]（無料枠の範囲なら無料・APIキー不要）
//   openai     … OpenAI の画像API（有料・OPENAI_API_KEY が必要）
//   GET  /api/presets  … 画風の一覧と、使っているエンジン
//   POST /api/generate … { password, preset, subject, size, quality } → { image(base64), mime }
//   POST /api/redraw   … { password, preset, image(dataURL), subject?, size, quality } → { image(base64), mime }
//                        手持ちの画像を、選んだ画風で描き直す
// それ以外のパスは public/ の画面を返す。

import { buildPrompt, buildRedrawPrompt, findPreset, publicPresets } from "./presets.js";

const SIZES = new Set(["1024x1024", "1536x1024", "1024x1536"]);
const QUALITIES = new Set(["low", "medium", "high"]);
const MAX_SUBJECT = 500;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const CF_MODEL = "@cf/black-forest-labs/flux-2-klein-4b";
// Cloudflare のモデルに渡す元画像は 512x512 より小さくする決まり（画面側で縮めて送る）
const CF_MAX_INPUT_SIDE = 511;

const engineOf = (env) => (env.IMAGE_ENGINE === "openai" ? "openai" : "cloudflare");

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// 呼び出し側でそのまま返すための入力エラー
class InputError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
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

// 両方の受け口で共通の確認（設定・合言葉・画風・入力文・形・品質）
async function readCommon(request, env, { subjectRequired }) {
  if (!env.APP_PASSWORD) throw new InputError("サーバーの設定（APP_PASSWORD）がまだです。", 500);
  if (engineOf(env) === "openai" && !env.OPENAI_API_KEY) {
    throw new InputError("サーバーの設定（OPENAI_API_KEY）がまだです。", 500);
  }
  if (engineOf(env) === "cloudflare" && !env.AI) {
    throw new InputError("サーバーの設定（Workers AI の AI バインディング）がまだです。", 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    throw new InputError("送られた内容が読めませんでした。");
  }

  if (typeof body.password !== "string" || !(await samePassword(body.password, env.APP_PASSWORD))) {
    throw new InputError("合言葉がちがいます。", 401);
  }

  const preset = findPreset(body.preset);
  if (!preset) throw new InputError("画風を選んでください。");

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (subjectRequired && !subject) throw new InputError("何を描くかを入力してください。");
  if (subject.length > MAX_SUBJECT) {
    throw new InputError(`入力は${MAX_SUBJECT}文字以内にしてください。`);
  }

  const size = SIZES.has(body.size) ? body.size : "1024x1024";
  const quality = QUALITIES.has(body.quality) ? body.quality : "medium";
  return { body, preset, subject, size, quality };
}

// base64 の先頭から画像の種類を見分ける
function mimeOf(b64) {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("UklGR")) return "image/webp";
  return "image/png";
}

function imageResponse(b64) {
  return json({ image: b64, mime: mimeOf(b64) });
}

// 送られてきた元画像（data URL）を取り出す
function readSourceImage(body) {
  const match = typeof body.image === "string" && body.image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) throw new InputError("画像を選んでください（PNG・JPEG・WebP）。");
  let bytes;
  try {
    bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  } catch {
    throw new InputError("画像が読めませんでした。");
  }
  if (bytes.length > MAX_IMAGE_BYTES) throw new InputError("画像が大きすぎます（8MBまで）。");
  return new Blob([bytes], { type: match[1] });
}

// ---- Cloudflare Workers AI（無料枠あり） ----
async function runCloudflare(env, { prompt, size, image }) {
  const [width, height] = size.split("x");
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("width", width);
  form.append("height", height);
  if (image) form.append("input_image_0", image, "source");
  // FormData を Response に通すと、区切り文字入りの Content-Type ができる（公式の書き方）
  const formResponse = new Response(form);

  let resp;
  try {
    resp = await env.AI.run(CF_MODEL, {
      multipart: { body: formResponse.body, contentType: formResponse.headers.get("content-type") },
    });
  } catch (err) {
    const message = String(err?.message || err);
    if (/neuron|limit|quota|capacity|4006/i.test(message)) {
      throw new InputError("今日の無料枠を使い切りました。日本時間の朝9時に戻ります。", 429);
    }
    throw new InputError(`生成に失敗しました：${message}`, 502);
  }
  if (!resp?.image) throw new InputError("生成結果に画像が入っていませんでした。", 502);
  return imageResponse(resp.image);
}

// ---- OpenAI（有料） ----
async function readOpenAI(res) {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = data?.error?.message || `HTTP ${res.status}`;
    throw new InputError(`生成に失敗しました：${message}`, 502);
  }
  const image = data?.data?.[0]?.b64_json;
  if (!image) throw new InputError("生成結果に画像が入っていませんでした。", 502);
  return imageResponse(image);
}

async function generate(request, env) {
  const { preset, subject, size, quality } = await readCommon(request, env, { subjectRequired: true });

  if (engineOf(env) === "cloudflare") {
    return runCloudflare(env, { prompt: buildPrompt(preset, subject, { negatives: false }), size });
  }

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
  return readOpenAI(res);
}

async function redraw(request, env) {
  const { body, preset, subject, size, quality } = await readCommon(request, env, { subjectRequired: false });

  if (engineOf(env) === "cloudflare") {
    const image = readSourceImage(body);
    return runCloudflare(env, { prompt: buildRedrawPrompt(preset, subject, { negatives: false }), size, image });
  }

  const image = readSourceImage(body);
  const form = new FormData();
  form.append("model", env.OPENAI_IMAGE_MODEL || "gpt-image-2");
  form.append("image", image, `source.${image.type.split("/")[1]}`);
  form.append("prompt", buildRedrawPrompt(preset, subject));
  form.append("size", size);
  form.append("quality", quality);
  form.append("n", "1");
  form.append("output_format", "png");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });
  return readOpenAI(res);
}

const ROUTES = { "/api/generate": generate, "/api/redraw": redraw };

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/presets" && request.method === "GET") {
      const engine = engineOf(env);
      return json({
        presets: publicPresets(),
        engine,
        // 画面側で元画像をこの大きさまで縮めてから送る
        maxInputSide: engine === "cloudflare" ? CF_MAX_INPUT_SIDE : 1536,
      });
    }
    const handler = ROUTES[pathname];
    if (handler) {
      if (request.method !== "POST") return json({ error: "POST で送ってください。" }, 405);
      try {
        return await handler(request, env);
      } catch (err) {
        if (err instanceof InputError) return json({ error: err.message }, err.status);
        throw err;
      }
    }
    if (pathname.startsWith("/api/")) return json({ error: "見つかりません。" }, 404);

    return env.ASSETS.fetch(request);
  },
};
