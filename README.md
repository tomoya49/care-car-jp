# ケアカーサポートサービス LP

福祉・介護事業所向け車両管理サービスのランディングページ。

## 24時間自動物件情報獲得システム（見込み客リード収集）

新規開業した介護事業所（＝車両管理サービスの見込み客）の情報を、公開されているオープンデータから自動収集する仕組みです。GitHub Actions が定期的に巡回し、新規のデータを検出したら `data/leads.json` に追記し、社内向けページ `leads.html`（`/leads`）に反映します。

### 仕組み

- `config/sources.json` … 巡回するデータソースの定義（URL・文字コード・列マッピング）
- `scripts/fetch-leads.mjs` … 各ソースのCSVを取得し、未取得の事業所番号を新規リードとして `data/leads.json` に追記
- `scripts/generate-leads-page.mjs` … `data/leads.json` から社内閲覧用の `leads.html` を再生成
- `.github/workflows/collect-leads.yml` … 6時間ごとに上記スクリプトを自動実行し、新着があればコミット＆push（Vercelの自動デプロイで `/leads` に反映される）

### データソースについて

法的に安全な情報源として、厚生労働省が無償・二次利用可で公開している「介護サービス情報公表システム」オープンデータ（[https://www.mhlw.go.jp/stf/kaigo-kouhyou_opendata.html](https://www.mhlw.go.jp/stf/kaigo-kouhyou_opendata.html)、年2回更新）や、各都道府県のオープンデータポータルが二次配布している同データ（更新頻度が高い場合あり）の利用を想定しています。任意サイトのスクレイピングは利用規約違反のリスクがあるため、この仕組みには含めていません。

**セットアップ手順:**

1. 対象都道府県の公式ページ／オープンデータポータルで実際のCSVダウンロードURLを確認する
2. `config/sources.json` の該当エントリを複製し、`url` を実URLに、`enabled` を `true` に、`fieldMap` の左側キーを実際のCSVヘッダーに合わせて書き換える
3. 通知が必要な場合は、Slack または Discord の Incoming Webhook URL を GitHub リポジトリの Secrets に `WEBHOOK_URL` として登録する（未設定でも収集自体は動作し、`data/leads.json` に保存される）

### 注意事項

- `leads.html` は `noindex` を設定していますが、見込み客の名称・住所などを含む社内向けデータです。公開ドメイン上に置きたくない場合は Vercel のデプロイ保護（パスワード保護）などを検討してください。
- 収集対象は厚労省・都道府県が公表している事業者の一般情報（法人・事業所単位）であり、個人情報は含みません。
