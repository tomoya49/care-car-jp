# すれ違いマッチングアプリ 事前登録LP

神戸・三宮エリア（平日18〜22時）限定で始める、すれ違いマッチングアプリの事前登録ページ（先行招待リスト）です。
Next.js (App Router) + TypeScript + Tailwind CSS / Supabase / Vercel。

> ## ⚠️ サービス公開前に必須：インターネット異性紹介事業の届出
> 出会い系サイト規制法（インターネット異性紹介事業を利用して児童を誘引する行為の規制等に関する法律）により、
> **アプリ本体を公開する前に**、事業の本拠となる事務所の所在地を管轄する警察署を経由して、都道府県公安委員会への届出が必要です。
> 届出が受理されたら、受理番号を `lib/config.ts` の `OPERATOR.notificationNumber` に入力し、運営者情報ページに表示してください。
> （このLPは事前登録のみで、利用者同士が連絡を取り合う機能はありません。）

## 文言・設定を直す場所

| 直したいもの | ファイル |
| --- | --- |
| アプリ名 | `lib/config.ts` の `APP_NAME`（1か所だけ） |
| 運営者名・所在地・連絡先・届出番号 | `lib/config.ts` の `OPERATOR` |
| LPのコピー・FAQ・フォームの文言 | `content.ts` |
| プライバシーポリシー（雛形） | `app/privacy/page.tsx` |
| 色 | `app/globals.css` の `@theme` |
| OGP画像（1200×630） | `public/og.png` を上書き |
| ファビコン | `app/icon.svg`、`app/apple-icon.png`（180×180） |

ヒーローの夜景はCSSのグラデーション（`app/globals.css` の `.hero-sky` / `.city-lights`）です。Canvaの素材に差し替える場合は `public/` に画像を置き、`app/page.tsx` のヒーローで `next/image` を使ってください。

## 環境変数

`.env.example` をコピーして `.env.local` を作ります。`.env.local` はGitに含めません。

| 変数 | 内容 |
| --- | --- |
| `SUPABASE_URL` | Supabase のプロジェクトURL |
| `SUPABASE_ANON_KEY` | Supabase の publishable（anon）キー。サーバー側だけで使い、ブラウザには渡しません |
| `NEXT_PUBLIC_SITE_URL` | 公開URL（OGP・canonical 用）。未設定なら Vercel の本番URLを使います |

Vercel ではプロジェクトの Settings → Environment Variables に同じ値を登録します。

## ローカルで動かす

```bash
npm install
npm run dev   # http://localhost:3000
```

## しくみ

- フォーム → `POST /api/register`（`app/api/register/route.ts`）→ Supabase の `pre_registrations` に INSERT
- 入力検証は zod（`lib/registration.ts`）
- 同じメールアドレスは一意制約で弾き、画面には「登録済みです」と表示（エラーにはしない）。メールは小文字にそろえて保存
- スパム対策：ハニーポット項目（`hp_b7f3e`。自動入力に反応しない名前にしている）、同一IPから1分に6回以上の送信を拒否（`lib/rate-limit.ts`、メモリ内の簡易版）、他サイトからの送信を拒否
- URL の `utm_source` / `utm_medium` / `utm_campaign` と外部の参照元URLを一緒に保存
  - 例：`https://（公開URL）/?utm_source=instagram&utm_medium=social&utm_campaign=launch`
- 取得するのはフォームの項目だけ。氏名・位置情報・IPアドレスは保存しません

## データベース（Supabase）

テーブル定義と権限は `supabase/migrations/` にあります。

- RLS 有効。匿名ユーザー（anon）は INSERT のみ可能。SELECT / UPDATE / DELETE はできません（メールアドレスは外から読めません）
- 登録一覧は Supabase ダッシュボード → Table Editor → `pre_registrations` で確認できます
- CSV で書き出すとき：Table Editor 右上の「Export」→「Export to CSV」。または SQL Editor で下のクエリを実行し、結果を「Download CSV」

```sql
-- 登録者一覧（新しい順）
select * from pre_registrations order by created_at desc;

-- 性別ごとの人数（目標：100人・女性優先）
select gender, count(*) from pre_registrations group by gender;

-- 流入元ごとの人数
select coalesce(utm_source, '(なし)') as source, count(*) from pre_registrations group by 1 order by 2 desc;
```

フォームの値とDBの値の対応：

| 項目 | 値 |
| --- | --- |
| gender | `female` 女性 / `male` 男性 / `no_answer` 回答しない |
| age_group | `20_early` 20代前半 / `20_late` 20代後半 / `30_early` 30代前半 / `30_late` 30代後半 |
| area | `sannomiya` 三宮 / `motomachi` 元町 / `kobe_station` 神戸駅 / `other` その他 / 空欄 |

## デプロイ

Vercel のプロジェクトはこのフォルダ（`surechigai-lp/`）をルートディレクトリにしています。
このフォルダに変更がないコミットではビルドをスキップします。
