// 運営者情報（仮置き）。値は lib/config.ts の OPERATOR を書き換えてください。
import type { Metadata } from "next";
import SubPage from "@/components/SubPage";
import { APP_NAME, OPERATOR } from "@/lib/config";

export const metadata: Metadata = {
  title: "運営者情報",
  alternates: { canonical: "/operator" },
};

const rows = [
  ["サービス名", APP_NAME],
  ["運営者", OPERATOR.name],
  ["所在地", OPERATOR.address],
  ["連絡先", OPERATOR.email],
  ["インターネット異性紹介事業 届出受理番号", OPERATOR.notificationNumber],
  ["サービスの状況", "サービス開始前（事前登録のみ受付中）"],
];

export default function OperatorPage() {
  return (
    <SubPage title="運営者情報">
      <dl className="divide-y divide-white/10 rounded-2xl bg-night-800">
        {rows.map(([k, v]) => (
          <div key={k} className="px-5 py-4">
            <dt className="text-xs font-bold text-mist/70">{k}</dt>
            <dd className="mt-1 text-white">{v}</dd>
          </div>
        ))}
      </dl>

      <section id="contact" className="scroll-mt-6">
        <h2>お問い合わせ</h2>
        <p>
          事前登録の内容の確認・削除、その他のお問い合わせは、下記までメールでご連絡ください。削除をご希望の場合は、登録したメールアドレスからお送りください。
        </p>
        <p className="mt-2 text-white">{OPERATOR.email}</p>
      </section>
    </SubPage>
  );
}
