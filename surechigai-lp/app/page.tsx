import Image from "next/image";
import { content } from "@/content";
import { APP_NAME } from "@/lib/config";
import RegisterForm from "@/components/RegisterForm";
import StickyCta from "@/components/StickyCta";
import Footer from "@/components/Footer";
import heroGirl from "@/public/hero-girl.webp";

const c = content;

function SectionHeading({ children, lead, en }: { children: React.ReactNode; lead?: string; en: string }) {
  return (
    <div className="mb-8 text-center">
      <p className="text-xs font-bold tracking-[0.25em] text-pink-500">{en}</p>
      <h2 className="mt-2 text-[1.6rem] leading-snug font-bold sm:text-3xl">{children}</h2>
      {lead && <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">{lead}</p>}
    </div>
  );
}

function PreLaunchBadge() {
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-pink-500 shadow-sm ring-2 ring-pink-300">
      <span aria-hidden>🔔</span>
      {c.preLaunchBadge}
    </p>
  );
}

function PerkBox() {
  return (
    <div className="relative mt-8 rounded-[2rem] border-4 border-dashed border-coral-400 bg-white p-6 text-center">
      <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-coral-500 px-4 py-1 text-xs font-bold whitespace-nowrap text-white shadow">
        🎁 {c.perk.badge}
      </span>
      <p className="mt-2 text-xl font-bold sm:text-2xl">{c.perk.title}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{c.perk.body}</p>
      <p className="mt-3 text-xs leading-relaxed text-ink-soft">{c.perk.note}</p>
    </div>
  );
}

const empathyIcons = ["🚉", "📱", "🏠"];
const empathyBg = ["bg-blush", "bg-sky", "bg-lemon"];
const stepBg = ["bg-pink-400", "bg-coral-400", "bg-[#8fb8ff]"];
const safetyIcons = ["🪪", "📍", "🛡️", "💌"];
const safetyBg = ["bg-mint", "bg-sky", "bg-blush", "bg-lemon"];

export default function Home() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-30 px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <span aria-hidden className="text-pink-500">♥</span>
            {APP_NAME}
          </span>
          <a href="#register" className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-pink-500 shadow-sm">
            先行登録
          </a>
        </div>
      </header>

      <main>
        {/* 1. ヒーロー */}
        <section className="hero-pop relative overflow-hidden px-5 pt-16 pb-12 sm:pt-24">
          <div className="relative mx-auto grid max-w-5xl items-center gap-6 sm:grid-cols-2 sm:gap-10">
            <div className="relative order-1 mx-auto w-full max-w-[340px] sm:order-2 sm:max-w-md">
              <span aria-hidden className="absolute -top-2 -left-3 z-10 rotate-[-10deg] rounded-full bg-lemon px-3 py-1 text-xs font-bold shadow-sm">
                三宮限定！
              </span>
              <span aria-hidden className="absolute top-6 -right-2 z-10 text-2xl">✨</span>
              {/* スマホでは高さを抑えて、最初の画面に登録ボタンが入るようにする */}
              <div className="float-slow overflow-hidden rounded-[2rem] border-4 border-white shadow-xl shadow-pink-300/40 sm:rounded-[2.5rem]">
                <Image
                  src={heroGirl}
                  alt={c.hero.imageAlt}
                  priority
                  sizes="(min-width: 640px) 448px, 340px"
                  className="h-[200px] w-full object-cover object-[50%_15%] sm:h-auto"
                  placeholder="blur"
                />
              </div>
              <p className="mt-1 text-right text-[11px] text-ink-soft">{c.hero.imageNote}</p>
            </div>

            <div className="order-2 text-center sm:order-1 sm:text-left">
              <PreLaunchBadge />
              <p className="mt-3 text-sm font-bold text-coral-500">{c.hero.eyebrow}</p>
              <h1 className="mt-2 text-[1.9rem] leading-[1.4] font-bold sm:text-5xl sm:leading-tight">
                {c.hero.title.map((line, i) => (
                  <span key={line} className="block">
                    {i === 1 ? (
                      <span className="bg-[linear-gradient(transparent_60%,#ffd1de_60%)]">{line}</span>
                    ) : (
                      line
                    )}
                  </span>
                ))}
              </h1>
              <p className="mt-4 hidden max-w-md text-[15px] leading-relaxed text-ink-soft sm:block">{c.hero.sub}</p>
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-lemon px-3.5 py-1.5 text-[13px] font-bold shadow-sm">
                <span aria-hidden>🎁</span>
                {c.perk.short}
              </p>
              <div className="mx-auto mt-4 max-w-sm sm:mx-0 sm:mt-5">
                <a
                  id="hero-cta"
                  href="#register"
                  className="btn-pop flex h-15 w-full items-center justify-center rounded-full text-lg font-bold text-white"
                >
                  {c.hero.cta} →
                </a>
                <p className="mt-4 text-xs text-ink-soft">{c.hero.note}</p>
              </div>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-ink-soft sm:hidden">{c.hero.sub}</p>
            </div>
          </div>
        </section>

        {/* 2. 共感 */}
        <section className="wave-top bg-white px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading en="DO YOU KNOW?">{c.empathy.heading}</SectionHeading>
            <ul className="space-y-4">
              {c.empathy.items.map((item, i) => (
                <li key={item.title} className={`flex gap-4 rounded-3xl p-5 ${empathyBg[i]}`}>
                  <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl shadow-sm">
                    {empathyIcons[i]}
                  </span>
                  <div>
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3. 仕組み */}
        <section className="wave-top dots bg-peach px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading en="HOW IT WORKS" lead={c.howItWorks.lead}>
              {c.howItWorks.heading}
            </SectionHeading>
            <ol className="grid gap-4 sm:grid-cols-3">
              {c.howItWorks.steps.map((s, i) => (
                <li key={s.title} className="relative rounded-3xl bg-white p-5 pt-8 text-center shadow-md shadow-coral-400/10">
                  <span
                    className={`absolute -top-4 left-1/2 grid size-10 -translate-x-1/2 place-items-center rounded-full text-lg font-bold text-white shadow ${stepBg[i]}`}
                  >
                    {i + 1}
                  </span>
                  <p className="font-bold">{s.title}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{s.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 text-center text-xs text-ink-soft">{c.howItWorks.note}</p>
          </div>
        </section>

        {/* 4. 安心・安全 */}
        <section className="wave-top bg-white px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading en="SAFETY" lead={c.safety.lead}>
              {c.safety.heading}
            </SectionHeading>
            <ul className="grid gap-4 sm:grid-cols-2">
              {c.safety.items.map((item, i) => (
                <li key={item.title} className={`rounded-3xl p-5 ${safetyBg[i]}`}>
                  <p className="flex items-center gap-2 font-bold">
                    <span aria-hidden className="grid size-10 place-items-center rounded-full bg-white text-xl shadow-sm">
                      {safetyIcons[i]}
                    </span>
                    {item.title}
                  </p>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. 先行招待 */}
        <section className="wave-top bg-blush px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading en="SPECIAL INVITATION" lead={c.invite.lead}>
              {c.invite.heading}
            </SectionHeading>
            <div className="grid gap-5 sm:grid-cols-2">
              {c.invite.cards.map((card, i) => (
                <div
                  key={card.title}
                  className={`relative rounded-[2rem] bg-white p-6 ${
                    i === 0 ? "shadow-xl shadow-pink-400/25 ring-4 ring-pink-300" : "shadow-md"
                  }`}
                >
                  {i === 0 && (
                    <span aria-hidden className="absolute -top-4 right-5 rotate-6 rounded-full bg-pink-500 px-3 py-1 text-xs font-bold text-white shadow">
                      無料 ♡
                    </span>
                  )}
                  <p
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      i === 0 ? "bg-blush text-pink-500" : "bg-sky text-ink"
                    }`}
                  >
                    {card.badge}
                  </p>
                  <p className="mt-3 text-xl font-bold">{card.title}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{card.body}</p>
                  <ul className="mt-4 space-y-2">
                    {card.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[15px]">
                        <span aria-hidden className="text-pink-500">
                          ♥
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <PerkBox />
          </div>
        </section>

        {/* 6. FAQ */}
        <section className="wave-top bg-white px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading en="FAQ">{c.faq.heading}</SectionHeading>
            <div className="space-y-3">
              {c.faq.items.map((item) => (
                <details key={item.q} className="group rounded-3xl bg-cream ring-1 ring-pink-300/50 open:bg-blush">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold [&::-webkit-details-marker]:hidden">
                    <span className="flex items-start gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-pink-500 text-xs text-white">Q</span>
                      {item.q}
                    </span>
                    <span aria-hidden className="text-xl text-pink-500 transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 7. 登録フォーム */}
        <section id="register" className="wave-top dots scroll-mt-4 bg-peach px-5 py-16">
          <div className="mx-auto max-w-lg">
            <div className="mb-5 text-center">
              <PreLaunchBadge />
            </div>
            <SectionHeading en="ENTRY" lead={c.form.lead}>
              {c.form.heading}
            </SectionHeading>
            <p className="mb-4 flex items-center justify-center gap-1.5 rounded-2xl bg-lemon px-4 py-3 text-center text-sm font-bold">
              <span aria-hidden>🎁</span>
              {c.perk.short}
            </p>
            <div className="rounded-[2rem] bg-white p-5 shadow-xl shadow-coral-400/15 sm:p-8">
              <RegisterForm />
            </div>
          </div>
        </section>
      </main>

      {/* 8. フッター */}
      <Footer />
      <StickyCta />
    </>
  );
}
