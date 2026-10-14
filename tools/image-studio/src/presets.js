// 仕上がりのプリセット。画面からは「何を描くか」しか入力できず、
// 画風の指示（style）・避けること（avoid）・仕上げ加工（finish）はここで固定する。
//
// finish は画面側（public/app.js）の仕上げ加工に渡す数値:
//   levels  … 色数を減らす段階（小さいほどベタ塗りっぽい。0 は減らさない）
//   wobble  … 線の揺れ（px）。手で引いた線のわずかなブレ
//   paper   … 紙の凹凸の濃さ（0〜1）
//   grain   … 細かい粒子の濃さ（0〜1）
//   warmth  … 色味を暖かく寄せる量（0〜1）。真っ白な背景を生成り色にする
//   fade    … 色の鮮やかさを落とす量（0〜1）

// どの画風でも共通で避ける「AIっぽさ」の特徴
const COMMON_AVOID = [
  "glossy or plastic-looking surfaces",
  "airbrushed smooth gradients",
  "glowing rim light, lens flare, bokeh, dramatic cinematic lighting",
  "hyper-detailed rendering, 3D render look, octane or unreal engine look",
  "perfect symmetry, perfectly centered composition",
  "uncanny faces, extra or merged fingers",
  "any text, letters, numbers, logos, watermarks or signatures",
  "oversaturated neon colors",
];

// どの画風でも共通で入れる「人が描いた」特徴
const COMMON_STYLE = [
  "made by a human illustrator by hand, not digital painting",
  "slightly imperfect proportions and naturally uneven lines",
  "limited color palette",
];

// 「〜しない」を書くと逆にそれを描いてしまう画像モデル（FLUXなど）向けに、
// COMMON_AVOID を「こうする」の言い方に直したもの
const COMMON_AVOID_AS_STYLE = [
  "matte surfaces",
  "flat, even, natural lighting",
  "loose and simple rendering, not detailed",
  "relaxed asymmetric composition",
  "muted natural colors",
  "blank unmarked surfaces wherever lettering might go",
];

// 新しく描くときだけ入れる構図の指示（描き直しは元の構図を残すので入れない）
const NEW_LAYOUT = ["simple, relaxed composition with generous empty space", "plain background"];

export const PRESETS = [
  {
    id: "watercolor",
    name: "鉛筆＋水彩",
    description: "鉛筆の下描きに淡い水彩。やさしい雰囲気。",
    style: [
      "loose pencil sketch with light transparent watercolor washes",
      "visible pencil construction lines left in",
      "watercolor pooling and blooms at the edges, paint slightly outside the lines",
      "cold-press watercolor paper",
    ],
    avoid: ["clean vector lines", "solid opaque fills"],
    finish: { levels: 0, wobble: 1.2, paper: 0.55, grain: 0.25, warmth: 0.35, fade: 0.15 },
  },
  {
    id: "colored-pencil",
    name: "色鉛筆",
    description: "色鉛筆の塗り。線の向きが見える素朴な絵。",
    style: [
      "colored pencil drawing",
      "visible hatching strokes and pencil direction",
      "paper texture showing through the color",
      "soft, slightly uneven coloring",
    ],
    avoid: ["smooth blended shading", "photographic detail"],
    finish: { levels: 0, wobble: 0.8, paper: 0.65, grain: 0.4, warmth: 0.3, fade: 0.1 },
  },
  {
    id: "marker",
    name: "ペン＋マーカー",
    description: "黒ペンの線にマーカーのベタ塗り。チラシ向き。",
    style: [
      "black felt-tip pen line drawing with alcohol marker coloring",
      "marker streaks and overlapping strokes visible",
      "a few flat colors only",
      "line weight varies naturally",
    ],
    avoid: ["gradients", "soft shading"],
    finish: { levels: 7, wobble: 1.0, paper: 0.3, grain: 0.2, warmth: 0.25, fade: 0.05 },
  },
  {
    id: "crayon",
    name: "クレヨン",
    description: "クレヨン・パステルの素朴なタッチ。",
    style: [
      "wax crayon and oil pastel drawing",
      "rough waxy strokes with paper texture gaps",
      "childlike warmth but competent drawing",
    ],
    avoid: ["fine detail", "clean edges"],
    finish: { levels: 9, wobble: 1.6, paper: 0.7, grain: 0.45, warmth: 0.3, fade: 0.1 },
  },
  {
    id: "line-icon",
    name: "手描き線画アイコン",
    description: "ペン1本で描いたような線画＋差し色1色。チラシの挿絵・アイコン用。",
    style: [
      "single hand-drawn ink line illustration, like a quick doodle with a fineliner pen",
      "one accent color applied loosely, slightly misaligned with the lines",
      "white background, isolated subject, icon-like",
    ],
    avoid: ["shading", "backgrounds", "multiple colors"],
    finish: { levels: 4, wobble: 1.1, paper: 0.2, grain: 0.15, warmth: 0.2, fade: 0 },
  },
  {
    id: "notebook-diagram",
    name: "手描き図解",
    description: "ノートやホワイトボードに描いた説明図風。流れや仕組みの図に。",
    style: [
      "hand-drawn explanatory diagram sketched in a notebook with a ballpoint pen",
      "simple boxes, arrows and stick-figure-like drawings, slightly crooked",
      "one highlighter color for emphasis",
      "faint grid or ruled notebook paper",
    ],
    avoid: ["infographic template look", "icons from icon sets", "drop shadows"],
    finish: { levels: 5, wobble: 1.3, paper: 0.35, grain: 0.25, warmth: 0.2, fade: 0.05 },
  },
];

export function findPreset(id) {
  return PRESETS.find((p) => p.id === id) || null;
}

// 画風と避けることの部分。negatives が false のモデルには「避けること」を書かない
function styleLines(preset, extra, negatives) {
  if (!negatives) {
    return [`Style: ${[...preset.style, ...COMMON_STYLE, ...extra, ...COMMON_AVOID_AS_STYLE].join("; ")}.`];
  }
  return [
    `Style: ${[...preset.style, ...COMMON_STYLE, ...extra].join("; ")}.`,
    "",
    `Do NOT include: ${[...preset.avoid, ...COMMON_AVOID].join("; ")}.`,
  ];
}

// プリセットと「何を描くか」から、生成用の指示文を組み立てる
export function buildPrompt(preset, subject, { negatives = true } = {}) {
  return [
    `Subject: ${subject}`,
    "",
    ...styleLines(preset, NEW_LAYOUT, negatives),
    "",
    "If the subject asks for written words, leave blank space for them instead of drawing letters.",
  ].join("\n");
}

// 手持ちの画像を、構図と中身はそのままに手描きで描き直させるための指示文
export function buildRedrawPrompt(preset, note, { negatives = true } = {}) {
  return [
    "Redraw this image by hand as an illustration.",
    "Keep the same subject, layout, poses and colors roughly the same, but redraw everything in the style below.",
    "Simplify details the way a human illustrator would; do not trace photographic detail.",
    note ? `Notes: ${note}` : "",
    "",
    ...styleLines(preset, [], negatives),
    "",
    "Remove any text or letters from the original image and leave that area plain.",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
}

// 画面に渡す分（指示文の中身は渡さない）
export function publicPresets() {
  return PRESETS.map(({ id, name, description, finish }) => ({ id, name, description, finish }));
}
