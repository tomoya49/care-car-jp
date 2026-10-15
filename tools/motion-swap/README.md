# motion-swap

元動画の人物の**動き（体・手・表情）はそのまま**に、**顔と体つき**を写真の人物に置き換えるツールです。
背景や照明は元動画のまま残ります。中で使っているのは [Wan2.2-Animate-14B](https://github.com/Wan-Video/Wan2.2) の replacement モードで、ライセンスは Apache 2.0 なので商用利用もできます。

**同意済みの素材専用です。** 同意記録がないと処理は始まりません。

## 使う前に必ずすること（同意）

同意が要るのは次の**2人**です。

1. **演者**：元動画で演じている人
2. **置き換え先**：顔・体つきを使われる人

両方から、利用目的と期限を書いた**署名済みの同意書**をもらいます。そのうえで `consent.example.json` をコピーして書き換え、同意書のファイル（PDFなど）と同じフォルダに置いてください。

ツールは、次のどれかに当てはまると処理を止めます。

- 2人分の名前・同意日・目的がそろっていない
- 同意書のファイルがない
- 期限が切れている

出力の横には `*.provenance.json` が作られます。入力ファイルのハッシュ、同意記録のハッシュ、作った日時が残り、あとから「何から・誰の同意で作ったか」を確かめられます。

- 出力の mp4 には、常に「AI生成」のメタデータが入ります
- 画面にも表示したいときは `--label "AI生成"` を付けます。広告の出稿先がAI生成の表示を求める場合があります
- 実在の有名人や、同意のない人には使わないでください

## 必要なもの

- NVIDIA GPU
  - VRAM 24GB 以上（RTX 4090 / 3090 など）がおすすめ
  - それ未満なら `--low-vram` と小さい `--resolution` を使います。遅くなります
- ffmpeg
- Wan2.2 本体と、Wan2.2-Animate-14B の重み（数十GB）

## セットアップ

### かんたんな方法（Windows の WSL2 / Ubuntu 24.04）

```bash
git clone https://github.com/tomoya49/care-car-jp.git ~/care-car-jp
bash ~/care-car-jp/tools/motion-swap/setup_wsl.sh
```

`setup_wsl.sh` は次の8つを順に行います。

1. GPU の確認
2. 必要な道具を入れる
3. Wan2.2 本体を入れる（動作を確かめた版に固定）
4. CUDA ツールキット 12.8 を入れる（約3GB。SAM 2 の組み立てに必要）
5. Python の部品を入れる（PyTorch 2.8 / CUDA 12.8）
6. SAM 2 をこの PC の GPU 向けに組み立て、flash_attn の組み立て済み版を入れる
7. 重み（数十GB）をダウンロードする
8. 設定を `~/.bashrc` に保存する

- 何度実行しても大丈夫です。重みのダウンロードは、途中で止まっても続きから入ります
- 最後に、準備がそろっているかの確認（`motion-swap doctor`）が自動で走ります

Wan2.2-Animate は flash_attn がないと動きません。代わりの仕組みに切り替わらない作りです。Windows のままだと flash_attn を自分で組み立てる必要があり、とても入りにくいので、WSL2 を使います。

### 準備の確認

```bash
motion-swap doctor
```

ffmpeg、Wan2.2、重みのファイル、PyTorch、GPU、flash_attn などを OK／NG の一覧で表示します。足りないものがあれば、直し方も表示します。VRAM に合わせて `--low-vram` などのおすすめの指定も出ます。

### 手作業でする場合

```bash
# 1) Wan2.2 本体（このツールとは別の場所に）
git clone https://github.com/Wan-Video/Wan2.2.git
cd Wan2.2
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements_animate.txt   # 詳しくは Wan2.2 の INSTALL.md
pip install "huggingface_hub[cli]"
huggingface-cli download Wan-AI/Wan2.2-Animate-14B --local-dir ./Wan2.2-Animate-14B
cd ..

# 2) このツール
git clone https://github.com/tomoya49/care-car-jp.git
cd care-car-jp/tools/motion-swap
pip install -e .
```

毎回指定しなくて済むように、場所を環境変数に入れておくと楽です。

```bash
export WAN_REPO=/path/to/Wan2.2
export WAN_ANIMATE_CKPT=/path/to/Wan2.2/Wan2.2-Animate-14B
export WAN_PYTHON=/path/to/Wan2.2/.venv/bin/python
```

## 使い方

```bash
motion-swap \
  --video 元動画.mp4 \
  --person 置き換え先の写真.jpg \
  --consent consent.json \
  --out 完成.mp4 \
  --label "AI生成"
```

| オプション | 意味 |
|---|---|
| `--resolution 832x480` | 処理解像度。既定は 1280x720。下げると速く・軽くなる |
| `--low-vram` | VRAM 24GB 未満のとき。モデルを CPU に逃がしながら動かす |
| `--segment-seconds 10` | 長い動画を10秒ずつ処理する。メモリ不足の対策だが、継ぎ目が目立つことがある |
| `--no-relighting` | 元動画の照明に人物を合わせる処理を切る |
| `--seed 42` | 毎回同じ結果にしたいとき |
| `--work-dir DIR` | 途中ファイルの置き場。既定は出力の横の `*_work/` |

### いい結果を出すコツ

- **人物の写真**：全身が写っていて、正面に近く、背景がすっきりしたもの。体つきはこの写真から取られます
- **元動画**：人物が1人で、体が画面から大きくはみ出さず、速すぎない動きのもの
- まず数秒の動画と `--resolution 832x480` で試し、よければ本番の解像度で回す

## 処理の流れ

1. 同意記録を確認する
2. （必要なら）動画を区切る
3. Wan2.2-Animate の前処理で、骨格・顔・人物マスク・背景を取り出す
4. Wan2.2-Animate の生成で、写真の人物が同じ動きをする映像を作る（背景は元のまま）
5. 生成結果の長さが元とずれていたら補正し、区切った動画をつなぎ直す
6. 元の音声を戻し、AI生成のメタデータと（任意で）画面表示を付けて mp4 にする

顔だけをさらに似せる InsightFace（inswapper）系の仕上げは、モデルが**非商用限定**なので、広告用のこのツールには入れていません。

## 開発

```bash
pip install -e ".[dev]"
pytest
```

テストでは、本物の Wan2.2 の代わりに「入力をコピーするだけの偽物」を使います。GPU なしで全体の流れを確かめられますが、生成の品質そのものはテストしていません。
