# 手描き素材メーカー（画像生成ツール）

LPやチラシに使う挿絵・図解を、**手描きの画風に固定して**作るための社内ツール。
LP（`public/`）とは別の Worker として公開するので、LPには影響しない。

## なにが固定されているか

画面で入力できるのは「何を描くか」「形」「品質」だけ。画風は次の2段で固定している。

1. **生成時の指示（`src/presets.js`）** … プリセットごとの画風（鉛筆＋水彩・色鉛筆・ペン＋マーカー・クレヨン・手描き線画アイコン・手描き図解）に加えて、全プリセット共通で
   - 入れる：手で描いた不揃いな線・少ない色数・余白の多い素朴な構図
   - 避ける：つるつるのグラデーション、光沢、映画のような光、3DCG風、完璧な左右対称、崩れた手指、**文字**（AIは日本語の文字が崩れやすいので、文字はあとでデザインソフトで入れる）
   を毎回つけて送る。指示文はサーバー側だけにあり、画面からは変えられない。
2. **仕上げ加工（`public/app.js` の `handFinish`）** … 届いた画像に、線のわずかな揺れ・色数の削減・生成りの紙色・紙の凹凸・粒子をかける。強さは画面のつまみで0〜150%に調整できる。加工前の画像も保存できる。

画風を足したい・変えたいときは `src/presets.js` に1件追加するだけでよい。

## 使う画像モデル

OpenAI の画像API（`wrangler.jsonc` の `OPENAI_IMAGE_MODEL`、初期値 `gpt-image-2`）。
料金は1枚ごと。品質「下書き」がいちばん安く、「高品質」がいちばん高い。最新の料金はOpenAIの料金ページで確認する。

## 手元で動かす

```sh
cd tools/image-studio
# 秘密の値をファイルに書く（.dev.vars は git に入らない）
printf 'OPENAI_API_KEY=sk-...\nAPP_PASSWORD=好きな合言葉\n' > .dev.vars
npx wrangler dev
```

## 公開する（オーナーの「公開して」をもらってから）

```sh
cd tools/image-studio
npx wrangler secret put OPENAI_API_KEY   # OpenAIのAPIキーを貼る
npx wrangler secret put APP_PASSWORD     # 画面で入れる合言葉を決めて貼る
npx wrangler deploy
```

- 公開URLは `https://care-car-image-studio.tooshiro-blog.workers.dev` になる予定
- 合言葉を知らない人は生成できない（APIの料金を他人に使われないため）
- 検索エンジンには載せない設定（`noindex`）にしてある
- OpenAI 側で月の利用上限（Usage limits）を設定しておくと、使いすぎを防げる
