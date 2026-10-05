# LP を Vercel から Cloudflare へ移す手順

作成：2026-10-06（開発担当）。**準備まで完了・まだ公開していない。** 公開はオーナーの「公開して」をもらってから。

## なぜ移すか

Vercel の無料プラン（Hobby）は「個人の非商用利用のみ」。サービスを宣伝するこのLPは商用にあたる（[Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)、2026-10-05確認）。
Cloudflare の無料プランには同じような「商用禁止」の条項は見当たらなかった。ただし規約の全文までは照合していない（推測を含む）。

## 準備でやったこと（ローカルのみ・push していない）

| 変更 | 中身 |
|---|---|
| `public/` フォルダを作った | 公開するファイル（index.html・reserve.html・ogp.png・qr-line.png・robots.txt・sitemap.xml）をここへ移動。バックアップ `*.bak*` と説明書は公開されない |
| `wrangler.jsonc` を追加 | カタテマ・ブログと同じ Cloudflare Workers の静的サイト方式。名前 `care-car-jp`。`/reserve` で予約ページが開く設定入り |
| `vercel.json` に1行追加 | `"outputDirectory": "public"`。フォルダを動かしても、切り替えまでの間 Vercel 側が壊れないように |
| URLの書き換え | `index.html` の canonical・og:url・og:image・構造化データ、`robots.txt`、`sitemap.xml` を新URL `https://care-car-jp.tooshiro-blog.workers.dev` に |
| `.gitignore` | Cloudflare の作業フォルダ `.wrangler/` を Git に入れない |

確認：`wrangler dev`（PCの中だけで動く試運転。ネットには出ない）で、`/`・`/reserve`・画像・robots・sitemap が 200、`/index.html`→`/`・`/reserve.html`→`/reserve` に自動転送、`wrangler.jsonc`・`README.md` は 404（公開されない）ことを確認した。

## Vercel だけの機能を使っていたか

- API routes・サーバー処理・環境変数：**使っていない**（ただの HTML と画像だけ）
- `vercel.json` の「拡張子なしURL」と「/reserve → reserve.html」：Cloudflare 側は `wrangler.jsonc` の `html_handling: auto-trailing-slash` で同じ動きになる（確認済み）
- 予約フォームの送信先：Apps Script（台帳）と Formspree（メール通知）。どちらも外部のURLなので、**移しても変わらない**。Apps Script 側に送信元チェックは無い。Formspree は管理画面で「許可するドメイン」を設定していると新URLから届かないので、オーナーが一度確認する（設定していなければ何もしなくてよい）

## オーナーが打つコマンド（「公開して」のあと）

PowerShell（Runボタン）で、次の2つを順に。

```
cd C:\Users\resty\クラウドコード\care-car-jp; ..\tooshiro-blog\node_modules\.bin\wrangler.cmd deploy
```
→ 最後に `https://care-car-jp.tooshiro-blog.workers.dev` と出れば公開完了。スマホで開いて、LINEボタンと予約フォーム（テスト送信1件）を確認。

```
cd C:\Users\resty\クラウドコード\care-car-jp; git push
```
→ GitHub に保存（Vercel 側も自動で更新されるが、中身は同じ）。

## そのあと：旧 Vercel（care-car-jp.vercel.app）をどうするか

**すぐには消さない。** 旧URLは、送ったはがき220通（表面・宛名面）・DM返信テンプレ・テレアポ台本に載っている。消すと、はがきを見て来た人が「ページが見つかりません」になる。

1. 新URLが動くのを確かめたら、`vercel.json` を下の「転送だけ」の中身に差し替えて push（開発担当が用意、オーナーのOKで push）。旧URLのどのページも新URLへ自動で飛ぶ
   ```json
   {
     "redirects": [
       { "source": "/(.*)", "destination": "https://care-car-jp.tooshiro-blog.workers.dev/$1", "permanent": true }
     ]
   }
   ```
2. 転送は、はがき特典の締切（10/31）と反応が落ち着くまで（目安：2026年12月末）残す。転送だけでも Vercel 無料プランの上に「商用サイトの入口」が残る点はグレーなので、長くは置かない
3. その後、Vercel の管理画面でプロジェクトを削除（オーナーが操作）
4. Google Search Console：新URLを「URLプレフィックス」で登録し直し、出てくる確認タグを `index.html` に入れる（今の確認タグ2つは旧URL用。残しても害はない）
5. 営業文書（はがき・DM返信テンプレ・テレアポ台本の署名）の URL を新URLに直す（営業文書担当）

## LINEボタン・問い合わせ導線の行き先（2026-10-06 確認）

| 場所 | 行き先 |
|---|---|
| index.html ヘッダー「LINEで相談」／最初の画面「LINEで無料相談する」／比較表の下「LINEで料金を聞いてみる」／最下部「LINEで無料相談する」 | `https://lin.ee/QyshQN6` → LINE `@423bhznk`（ケアカーの公式LINE） |
| index.html 最下部のQRコード画像（qr-line.png） | 読み取ると `https://lin.ee/54wuGsi` → 同じ `@423bhznk` |
| reserve.html 上部「入力せずにLINEで相談する」・下部「LINEで相談する」 | `https://lin.ee/QyshQN6`（同上） |
| index.html「入力フォーム」2か所 | `reserve.html`（新サイトでは `/reserve` に自動転送。確認済み） |
| reserve.html「トップへ戻る」等3か所 | `index.html`（`/` に自動転送） |
| 予約フォームの送信 | Apps Script（台帳）＋ Formspree（メール通知） |

リンク切れ・仮URLは無し（ヘッダーのロゴの `#` はページ先頭へ戻るだけで問題なし）。
`https://lin.ee/sPKy1ee` は `@453mpxfm`＝インスタ・AIおまもり用の別の公式LINE。**ケアカーのLPには使わない。**

## 気になる点

- 新URLに `tooshiro-blog`（ブログの名前）が入る。福祉施設向けの名刺・はがきに載せると少しちぐはぐ。独自ドメイン（年1,500円前後〜。購入はオーナー本人）を取れば、今後どこへ移してもURLが変わらない。今回は無料の workers.dev のまま進める
