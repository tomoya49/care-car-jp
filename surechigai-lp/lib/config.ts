// サイト全体の差し替え用定数。アプリ名が決まったら APP_NAME だけ書き換えればページ全体に反映されます。
export const APP_NAME = "（仮称）すれ違いアプリ";

// 公開URL。Vercel の環境変数 NEXT_PUBLIC_SITE_URL で上書きします（OGP・canonical に使用）。
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");

// 運営者情報（TODO: 公開前に必ず実際の内容に差し替えてください）
export const OPERATOR = {
  name: "【運営者名を入力】",
  address: "【所在地を入力】",
  email: "【連絡先メールアドレスを入力】",
  // インターネット異性紹介事業の届出受理後、受理番号を表示します
  notificationNumber: "【届出受理番号（受理後に入力）】",
};
