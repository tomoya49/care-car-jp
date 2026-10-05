# ケアカーサポートサービス LP

福祉・介護事業所向け車両管理サービスのランディングページ。

## 公開先の移行（Vercel → Cloudflare）※まだ実行しない

**なぜ移すか：** Vercelの無料プラン（Hobby）は「個人の非商用利用のみ」。商品・サービスの販売を宣伝するサイトは商用利用にあたると、公式に書かれている（[Fair Use Guidelines「Commercial usage」](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)、[Hobby Plan](https://vercel.com/docs/plans/hobby)。2026-10-05確認）。このLPはサービスの宣伝なので、無料プランのままでは規約違反になる。Vercelに残すなら有料のProプラン（1人 月20ドル）が必要。
Cloudflareの無料プランには、Vercelのような「商用禁止」の条項は見当たらなかった。ただし規約の全文までは照合していない。

**移し方：** 準備（`public/` フォルダ・`wrangler.jsonc`・URL書き換え）は2026-10-06に済み。公開のコマンドと、旧Vercelの片付け方は `docs/cloudflare-migration.md` を見る。オーナーの「公開して」をもらってから行う。

- 公開するファイルは `public/` の中だけ（バックアップの `*.bak*` は外に置いてあるので公開されない）
- 新URL：`https://care-car-jp.tooshiro-blog.workers.dev`（ブログ・カタテマと同じアカウント）
