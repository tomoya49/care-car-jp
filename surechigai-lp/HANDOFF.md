# 引き継ぎメモ（2026-10-15 時点）

すれ違いマッチングアプリの事前登録LPの作業状況です。PCのローカルセッションで続きをするときは、まずこのファイルと `README.md` を読んでください。

> **⚠️ 未確認：** 本番でフォームから送信して Supabase に保存されるところは、まだ確認できていません。
> 1回目のテストでは「登録ありがとう」が出たのに保存されていませんでした。原因と思われる箇所を直して再デプロイ済みで、再テストがまだです（下の「未完了」1）。

## 現状

| 項目 | 内容 |
| --- | --- |
| コード | `care-car-jp` リポジトリの `surechigai-lp/` フォルダ。ブランチ `ccr-ac1dbf1e-oayrs7`（PR #2） |
| 公開URL | https://surechigai-lp-three.vercel.app （Vercel プロジェクト `surechigai-lp`、誰でも閲覧可） |
| Vercel の設定 | ルートディレクトリ `surechigai-lp`、関数は東京リージョン（hnd1）。プレビューだけ Vercel ログインで保護 |
| Vercel の環境変数 | `SUPABASE_URL`、`SUPABASE_ANON_KEY` 登録済み |
| Supabase | プロジェクト `surechigai-lp`（ref: `mqlazutwhabcmjdtefgf`、東京）。`pre_registrations` テーブル作成済み |
| 権限 | RLS 有効。匿名ユーザーは INSERT のみ。SELECT / UPDATE / DELETE はできないことを確認済み |

**注意：** Supabase の無料枠（動かせるプロジェクトは2つまで）の上限のため、**genba-parking を一時停止**しています。
genba-parking を使う場合はダッシュボードで再開してください（無料枠が埋まるので、どれか1つを止める必要があります）。

## これまでの経緯

1. LP・フォーム・`/api/register`（zod による入力検証、ハニーポット、簡易レート制限、UTM保存）を実装した
2. Supabase のテーブルと RLS を作り、匿名ユーザーの権限を SQL で確認した
3. Vercel に本番デプロイした
4. 本番でテスト登録したところ、完了表示は出たのに DB は0件だった。Supabase 側にもリクエストが届いていなかった
   - 保存されないまま成功表示が出る経路は「ハニーポットに値が入っている」場合だけ。その項目名が `website` だったため、ブラウザの自動入力が値を入れたと考えられる
   - 項目名を `hp_b7f3e` に変更し、引っかかった場合は `honeypot hit` をログに出すようにして再デプロイした（コミット 42285f5）

クラウドの作業環境はネットワーク制限で Supabase と vercel.app に直接つながらなかったため、送信の確認ができていません。ローカルの PC なら確認できるはずです。

## ローカルでの始め方

```bash
cd care-car-jp
git fetch origin ccr-ac1dbf1e-oayrs7
git checkout ccr-ac1dbf1e-oayrs7
cd surechigai-lp
npm install
cp .env.example .env.local
npm run dev        # http://localhost:3000
```

`.env.local`（Git には入れない）の中身：

- `SUPABASE_URL=https://mqlazutwhabcmjdtefgf.supabase.co`
- `SUPABASE_ANON_KEY=` の値は、Supabase のダッシュボード →（プロジェクト `surechigai-lp`）→ Project Settings → API Keys の **Publishable key**（`sb_publishable_...`）

## 未完了

1. **フォーム送信 → 保存の確認**（ローカルと本番の両方）
   - 登録すると「登録ありがとうございます」が出て、`pre_registrations` に1行増える
   - 同じメールで再送すると「登録済みです」になる（大文字・小文字の違いも同じメール扱い）
   - `?utm_source=test&utm_medium=manual` 付きで開いたとき、utm_source / utm_medium が保存される
   - まだ保存されない場合は、Vercel のログで `honeypot hit` や `pre_registrations insert failed` が出ていないか見る
2. 確認できたらテストデータを削除する（SQL Editor：`delete from pre_registrations where utm_source = 'test';`）
3. Lighthouse（モバイル）で90以上か確認する
4. 問題がなければ PR #2 を main にマージする（マージ後は main への push で本番が自動デプロイされる。`surechigai-lp/` に変更がないコミットではビルドをスキップする）

## 手動でやることチェックリスト

- [ ] **インターネット異性紹介事業の届出**（アプリ公開前に必須）。受理番号は `lib/config.ts` の `OPERATOR.notificationNumber` に入力
- [ ] アプリ名：`lib/config.ts` の `APP_NAME` を変える（1か所だけ）
- [ ] 運営者名・所在地・連絡先：`lib/config.ts` の `OPERATOR`
- [ ] プライバシーポリシー：`app/privacy/page.tsx` を弁護士・行政書士に確認してもらう。制定日も入力
- [ ] LP の文言：`content.ts` を見直す（「女性は無料、男性の料金は後日お知らせ」という書き方にしている）
- [ ] 画像：Canva で作った OGP 画像（1200×630）を `public/og.png` に上書き。ファビコンは `app/icon.svg`
- [ ] 独自ドメインにする場合：Vercel の環境変数に `NEXT_PUBLIC_SITE_URL` を追加
- [ ] 登録者の確認と CSV：Supabase のダッシュボード → Table Editor → `pre_registrations` → Export（集計用 SQL は README に記載）
- [ ] SNS 用リンクの例：`https://surechigai-lp-three.vercel.app/?utm_source=instagram&utm_medium=social&utm_campaign=launch`

## ローカルの Claude Code に最初に送る文章

```
surechigai-lp/HANDOFF.md と surechigai-lp/README.md を読んで、「未完了」の1から順に進めて。
```
