/*
 * ⚠️ このプライバシーポリシーは雛形です。
 * 弁護士・行政書士など専門家の確認を受ける前の内容のため、公開前に必ず確認・修正してください。
 * - 【】の部分は運営者情報が決まりしだい lib/config.ts の OPERATOR を書き換えてください
 * - 制定日も実際の公開日に合わせてください
 */
import type { Metadata } from "next";
import SubPage from "@/components/SubPage";
import { APP_NAME, OPERATOR } from "@/lib/config";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <SubPage title="プライバシーポリシー">
      <p>
        {OPERATOR.name}（以下「運営者」）は、{APP_NAME}
        （以下「本サービス」）の事前登録においてお預かりする個人情報を、以下のとおり取り扱います。
      </p>

      <section>
        <h2>1. 取得する情報</h2>
        <ul>
          <li>メールアドレス</li>
          <li>性別、年代、よく使う駅・エリア（任意）</li>
          <li>
            登録ページへの流入元（広告・SNSのキャンペーン識別子〔utm_source / utm_medium /
            utm_campaign〕、参照元URL）
          </li>
        </ul>
        <p className="mt-2">氏名、住所、電話番号、位置情報は取得しません。</p>
      </section>

      <section>
        <h2>2. 利用目的</h2>
        <p>
          取得した情報は、本サービスの開始のご案内をお送りするためにのみ利用します。性別・年代・エリア・流入元は、ご案内の優先順位の決定と、登録状況の集計（個人を特定しない形）に利用します。
        </p>
      </section>

      <section>
        <h2>3. 第三者提供</h2>
        <p>
          法令に基づく場合を除き、ご本人の同意なく第三者に提供することはありません。なお、データの保管にはクラウドサービス（Supabase、Vercel）を利用しています。
        </p>
      </section>

      <section>
        <h2>4. 安全管理</h2>
        <p>
          お預かりした情報は、アクセスを運営者に限定した環境で管理し、他の登録者や第三者が閲覧できない状態で保管します。
        </p>
      </section>

      <section>
        <h2>5. 保存期間</h2>
        <p>
          本サービスの開始のご案内が完了するまで、または削除のご依頼をいただくまで保存します。本サービスの開始を取りやめた場合は、速やかに削除します。
        </p>
      </section>

      <section>
        <h2>6. 開示・訂正・削除のご依頼</h2>
        <p>
          登録内容の開示・訂正・削除、ご案内の停止をご希望の場合は、登録したメールアドレスから下記の連絡先までご連絡ください。ご本人であることを確認のうえ、速やかに対応します。
        </p>
        <p className="mt-2">連絡先：{OPERATOR.email}</p>
      </section>

      <section>
        <h2>7. 改定</h2>
        <p>本ポリシーを改定する場合は、このページでお知らせします。</p>
      </section>

      <section>
        <h2>運営者</h2>
        <p>
          {OPERATOR.name}
          <br />
          {OPERATOR.address}
          <br />
          {OPERATOR.email}
        </p>
        <p className="mt-4 text-sm">制定日：【制定日を入力】</p>
      </section>
    </SubPage>
  );
}
