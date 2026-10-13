// 画面の動き。生成は /api/generate に頼み、届いた画像にこの端末で「手描きの仕上げ加工」をかける。

const $ = (id) => document.getElementById(id);
const form = $("form");
const statusEl = $("status");
const canvas = $("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

let presets = [];
let original = null; // 加工前の画像（Image）
let originalUrl = "";
let finish = null; // 生成時のプリセットの加工設定
let seed = 1;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

// ---- 合言葉を覚える（失敗しても動くように） ----
const STORE_KEY = "image-studio-password";
try {
  const saved = localStorage.getItem(STORE_KEY);
  if (saved) {
    $("password").value = saved;
    $("remember").checked = true;
  }
} catch {}
function rememberPassword() {
  try {
    if ($("remember").checked) localStorage.setItem(STORE_KEY, $("password").value);
    else localStorage.removeItem(STORE_KEY);
  } catch {}
}

// ---- 画風の一覧 ----
async function loadPresets() {
  const res = await fetch("/api/presets");
  ({ presets } = await res.json());
  $("presets").innerHTML = presets
    .map(
      (p, i) => `<label class="preset">
        <input type="radio" name="preset" value="${p.id}" ${i === 0 ? "checked" : ""}>
        <b>${p.name}</b><span>${p.description}</span>
      </label>`,
    )
    .join("");
}
loadPresets().catch(() => setStatus("画風の一覧が読み込めませんでした。再読み込みしてください。", true));

// ---- 作り方の切り替え ----
const mode = () => form.mode.value;
const apiNeeded = () => mode() === "new" || $("redrawAi").checked;
function updateMode() {
  const upload = mode() === "upload";
  document.querySelectorAll('[data-mode="upload"]').forEach((el) => (el.hidden = !upload));
  document.querySelectorAll('[data-need="api"]').forEach((el) => (el.hidden = !apiNeeded()));
  // 加工だけのときは入力文を使わない。描き直しのときは任意の補足として使う
  $("subject").closest("fieldset").hidden = upload && !$("redrawAi").checked;
  $("subjectLegend").textContent = upload ? "2-2. 補足（任意）" : "2. 何を描くか";
  $("subject").placeholder = upload
    ? "例：人物の顔はもっと簡単に。背景は省略して。"
    : "例：車いすの利用者さんを福祉車両に乗せるスタッフ。秋の事業所の駐車場。";
  $("go").textContent = !upload ? "描く" : apiNeeded() ? "描き直して加工する" : "加工する";
}
form.addEventListener("change", (e) => {
  if (e.target.name === "mode" || e.target.id === "redrawAi") updateMode();
});
updateMode();

// 選んだ画像を読み込み、長い辺を最大1536pxに縮める
let uploaded = null; // { img, dataUrl }
$("file").addEventListener("change", async () => {
  uploaded = null;
  const file = $("file").files[0];
  if (!file) return;
  try {
    const url = URL.createObjectURL(file);
    const src = await loadImage(url);
    URL.revokeObjectURL(url);
    const scale = Math.min(1, 1536 / Math.max(src.naturalWidth, src.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(src.naturalWidth * scale);
    c.height = Math.round(src.naturalHeight * scale);
    const cx = c.getContext("2d");
    cx.fillStyle = "#fff"; // 透明部分は白にする
    cx.fillRect(0, 0, c.width, c.height);
    cx.drawImage(src, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    uploaded = { img: await loadImage(dataUrl), dataUrl };
    // 形は元の画像の縦横比に近いものを選んでおく
    const ratio = c.width / c.height;
    $("size").value = ratio > 1.2 ? "1536x1024" : ratio < 0.83 ? "1024x1536" : "1024x1024";
    setStatus("");
  } catch (err) {
    setStatus(err.message, true);
  }
});

// ---- 生成・加工 ----
async function callApi(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      password: $("password").value,
      size: $("size").value,
      quality: $("quality").value,
      subject: $("subject").value,
      ...payload,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `エラー（${res.status}）`);
  return `data:${data.mime};base64,${data.image}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const presetId = form.preset?.value;
  const preset = presets.find((p) => p.id === presetId);
  if (!preset) return setStatus("画風を選んでください。", true);
  if (mode() === "new" && !$("subject").value.trim()) return setStatus("何を描くかを入力してください。", true);
  if (mode() === "upload" && !uploaded) return setStatus("画像を選んでください。", true);
  if (apiNeeded() && !$("password").value) return setStatus("合言葉を入れてください。", true);
  if (apiNeeded()) rememberPassword();

  $("go").disabled = true;
  try {
    if (mode() === "new") {
      setStatus("描いています…（30秒〜1分ほどかかります）");
      originalUrl = await callApi("/api/generate", { preset: presetId });
    } else if (apiNeeded()) {
      setStatus("手描きに描き直しています…（30秒〜1分ほどかかります）");
      originalUrl = await callApi("/api/redraw", { preset: presetId, image: uploaded.dataUrl });
    } else {
      originalUrl = uploaded.dataUrl;
    }
    original = await loadImage(originalUrl);
    finish = preset.finish;
    seed = (Math.random() * 2 ** 31) | 0;
    render();
    $("result").hidden = false;
    $("result").scrollIntoView({ behavior: "smooth" });
    setStatus("できました。");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    $("go").disabled = false;
  }
});

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像が読み込めませんでした。"));
    img.src = src;
  });
}

// ---- 表示と保存 ----
function strength() {
  return Number($("strength").value) / 100;
}
function render() {
  if (!original) return;
  canvas.width = original.naturalWidth;
  canvas.height = original.naturalHeight;
  ctx.drawImage(original, 0, 0);
  if ($("showOriginal").checked) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.putImageData(handFinish(img, finish, strength(), seed), 0, 0);
}
$("strength").addEventListener("input", () => {
  $("strengthOut").textContent = `${$("strength").value}%`;
});
$("strength").addEventListener("change", render);
$("showOriginal").addEventListener("change", render);
$("reroll").addEventListener("click", () => {
  seed = (Math.random() * 2 ** 31) | 0;
  render();
});

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
function save(href, name) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}
$("download").addEventListener("click", () => {
  const wasOriginal = $("showOriginal").checked;
  if (wasOriginal) {
    $("showOriginal").checked = false;
    render();
  }
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    save(url, `illust-${stamp()}.png`);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    if (wasOriginal) {
      $("showOriginal").checked = true;
      render();
    }
  }, "image/png");
});
$("downloadOriginal").addEventListener("click", () => save(originalUrl, `illust-${stamp()}-original.png`));

// =====================================================================
// 手描きの仕上げ加工
//   AIの画像は「線が完璧に滑らか」「色のグラデーションがつるつる」「紙がない」
//   ところで機械っぽく見えやすい。そこを、線の揺れ・色数の削減・紙の凹凸・粒子で崩す。
// =====================================================================

// 決まった seed から同じ乱数列を出す（「紙の質感を変える」を押すまで同じ仕上がり）
function rng(seedValue) {
  let s = seedValue >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

// なめらかなムラ（0〜1）。cell が大きいほどゆったりしたムラになる
function valueNoise(w, h, cell, rand) {
  const gw = Math.ceil(w / cell) + 2;
  const gh = Math.ceil(h / cell) + 2;
  const grid = new Float32Array(gw * gh);
  for (let i = 0; i < grid.length; i++) grid[i] = rand();
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const gy = y / cell;
    const y0 = gy | 0;
    let ty = gy - y0;
    ty = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < w; x++) {
      const gx = x / cell;
      const x0 = gx | 0;
      let tx = gx - x0;
      tx = tx * tx * (3 - 2 * tx);
      const i = y0 * gw + x0;
      const a = grid[i] + (grid[i + 1] - grid[i]) * tx;
      const b = grid[i + gw] + (grid[i + gw + 1] - grid[i + gw]) * tx;
      out[y * w + x] = a + (b - a) * ty;
    }
  }
  return out;
}

function handFinish(imageData, f, k, seedValue) {
  const { width: w, height: h, data: src } = imageData;
  const rand = rng(seedValue);
  const out = new ImageData(w, h);
  const dst = out.data;

  const wobble = f.wobble * k;
  const paper = Math.min(1, f.paper * k);
  const grain = Math.min(1, f.grain * k);
  const warmth = Math.min(1, f.warmth * k);
  const fade = Math.min(1, f.fade * k);
  // 加工を強めるほど色数を減らす（0 は減らさない）
  const levels = f.levels ? Math.max(2, Math.round(f.levels / Math.max(k, 0.5))) : 0;

  // 線の揺れ用（ゆったり揺れる2方向のずれ）
  const dx = wobble > 0 ? valueNoise(w, h, 38, rand) : null;
  const dy = wobble > 0 ? valueNoise(w, h, 38, rand) : null;
  // 紙の凹凸（細かい繊維・中くらいのムラ・大きなムラを重ねる）
  const p1 = paper > 0 ? valueNoise(w, h, 2.5, rand) : null;
  const p2 = paper > 0 ? valueNoise(w, h, 11, rand) : null;
  const p3 = paper > 0 ? valueNoise(w, h, 90, rand) : null;

  // 生成り色の紙（真っ白をやめる）
  const paperR = 251, paperG = 246, paperB = 234;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;

      // 1. 線の揺れ：少しずれた場所の色を拾う
      let sx = x, sy = y;
      if (dx) {
        sx = Math.min(w - 1, Math.max(0, Math.round(x + (dx[i] - 0.5) * 2 * wobble)));
        sy = Math.min(h - 1, Math.max(0, Math.round(y + (dy[i] - 0.5) * 2 * wobble)));
      }
      const si = (sy * w + sx) * 4;
      let r = src[si], g = src[si + 1], b = src[si + 2];

      // 2. 色の鮮やかさを少し落とす
      if (fade) {
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        r += (l - r) * fade;
        g += (l - g) * fade;
        b += (l - b) * fade;
      }

      // 3. 色数を減らす（グラデーションのつるつる感を消す）
      if (levels) {
        const step = 255 / (levels - 1);
        const jitter = (rand() - 0.5) * step * 0.35; // 縞にならないよう少し散らす
        r = Math.round((r + jitter) / step) * step;
        g = Math.round((g + jitter) / step) * step;
        b = Math.round((b + jitter) / step) * step;
      }

      // 4. 暖かみ：明るいところほど生成りの紙色に寄せる
      if (warmth) {
        const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const t = warmth * l * l;
        r += (paperR - r) * t;
        g += (paperG - g) * t;
        b += (paperB - b) * t;
        r *= 1 + 0.03 * warmth;
        b *= 1 - 0.05 * warmth;
      }

      // 5. 紙の凹凸：くぼみに少し影
      if (p1) {
        const n = p1[i] * 0.5 + p2[i] * 0.3 + p3[i] * 0.2;
        const shade = 1 - paper * 0.13 * n;
        r *= shade;
        g *= shade;
        b *= shade;
      }

      // 6. 粒子
      if (grain) {
        const n = (rand() - 0.5) * grain * 22;
        r += n;
        g += n;
        b += n;
      }

      const di = i * 4;
      dst[di] = r;
      dst[di + 1] = g;
      dst[di + 2] = b;
      dst[di + 3] = src[si + 3];
    }
  }
  return out;
}
