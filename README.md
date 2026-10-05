# ケアカーサポートサービス LP

福祉・介護事業所向け車両管理サービスのランディングページ。

## 公開先の移行（Vercel → Cloudflare）※まだ実行しない

**なぜ移すか：** Vercelの無料プラン（Hobby）は「個人の非商用利用のみ」。商品・サービスの販売を宣伝するサイトは商用利用にあたると、公式に書かれている（[Fair Use Guidelines「Commercial usage」](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)、[Hobby Plan](https://vercel.com/docs/plans/hobby)。2026-10-05確認）。このLPはサービスの宣伝なので、無料プランのままでは規約違反になる。Vercelに残すなら有料のProプラン（1人 月20ドル）が必要。
Cloudflareの無料プランには、Vercelのような「商用禁止」の条項は見当たらなかった。ただし規約の全文までは照合していない。

**移し方（トーシロ大工ブログと同じ Cloudflare Workers の静的サイト方式。オーナーの「公開して」をもらってから行う）：**
1. このフォルダに `wrangler.jsonc` を作り、`"name": "care-car-jp"` と `"assets": { "directory": "public" }` を書く。`index.html`・`reserve.html`・`ogp.png`・`robots.txt`・`sitemap.xml` は `public` フォルダにコピーする（バックアップの `*.bak*` は入れない）
2. `vercel.json` の設定を置き換える。「/reserve → reserve.html」は、wrangler.jsonc の `"assets"` に `"html_handling": "auto-trailing-slash"` を入れれば、拡張子なしの `/reserve` で開ける
3. `npx wrangler deploy` で公開する。URLは `https://care-car-jp.<アカウント名>.workers.dev` になる（ブログと同じアカウント）
4. URLが変わるので、`index.html` の canonical・og:url・og:image、`sitemap.xml`、`robots.txt` のURLを新しいものに書き換える。Search Console の確認タグは新しいURLで取り直す
5. 古いURL（care-car-jp.vercel.app）は、はがき・FAX・LINE・営業文書に載っている。すぐに消さず、新しいURLへの転送ページを置いてからVercelのプロジェクトを止める
6. 予約フォームの送信先（Apps Script・Formspree）はURLが変わらないので、そのまま使える
