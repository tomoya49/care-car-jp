import Link from "next/link";
import Footer from "@/components/Footer";

export default function SubPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <main className="bg-cream px-5 pt-8 pb-16">
        <div className="mx-auto max-w-2xl">
          <Link href="/" className="text-sm font-bold text-pink-500 underline-offset-4 hover:underline">
            ← トップへ戻る
          </Link>
          <h1 className="mt-6 text-2xl font-bold">{title}</h1>
          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-ink-soft [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
