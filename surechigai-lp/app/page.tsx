import { content } from "@/content";
import { APP_NAME } from "@/lib/config";
import RegisterForm from "@/components/RegisterForm";
import StickyCta from "@/components/StickyCta";
import Footer from "@/components/Footer";

const c = content;

function SectionHeading({ children, lead }: { children: React.ReactNode; lead?: string }) {
  return (
    <div className="mb-8 text-center">
      <h2 className="text-2xl leading-snug font-bold tracking-wide sm:text-3xl">{children}</h2>
      <span aria-hidden className="mx-auto mt-3 block h-1 w-10 rounded-full bg-ember-500" />
      {lead && <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-mist">{lead}</p>}
    </div>
  );
}

function PreLaunchBadge() {
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-ember-400/50 bg-ember-500/10 px-3 py-1 text-xs font-bold text-ember-300">
      <span aria-hidden className="size-1.5 rounded-full bg-ember-400" />
      {c.preLaunchBadge}
    </p>
  );
}

const safetyIcons = ["🪪", "📍", "🛡️", "🤝"];

export default function Home() {
  return (
    <>
      <header className="absolute inset-x-0 top-0 z-30 px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-sm font-bold tracking-wide">{APP_NAME}</span>
          <a href="#register" className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-bold">
            先行登録
          </a>
        </div>
      </header>

      <main>
        {/* 1. ヒーロー */}
        <section className="hero-sky relative overflow-hidden px-5 pt-20 pb-12 sm:pt-28 sm:pb-20">
          <div aria-hidden className="city-lights absolute inset-x-0 bottom-0 h-1/2 opacity-60" />
          <div className="relative mx-auto max-w-3xl">
            <PreLaunchBadge />
            <p className="mt-5 text-sm font-bold tracking-wider text-ember-300">{c.hero.eyebrow}</p>
            <h1 className="mt-3 text-[2rem] leading-[1.35] font-bold tracking-wide sm:text-5xl sm:leading-tight">
              {c.hero.title.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mist sm:text-base">{c.hero.sub}</p>
            <div className="mt-8 max-w-sm">
              <a
                id="hero-cta"
                href="#register"
                className="flex h-14 w-full items-center justify-center rounded-full bg-ember-500 text-lg font-bold text-night-950 shadow-lg shadow-ember-500/30 transition hover:bg-ember-400"
              >
                {c.hero.cta}
              </a>
              <p className="mt-3 text-center text-xs text-mist/80">{c.hero.note}</p>
            </div>
          </div>
        </section>

        {/* 2. 共感 */}
        <section className="bg-night-950 px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading>{c.empathy.heading}</SectionHeading>
            <ul className="space-y-3">
              {c.empathy.items.map((item) => (
                <li key={item.title} className="rounded-2xl border border-white/8 bg-night-900 p-5">
                  <p className="font-bold">{item.title}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-mist">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 3. 仕組み */}
        <section className="bg-night-900 px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading lead={c.howItWorks.lead}>{c.howItWorks.heading}</SectionHeading>
            <ol className="relative space-y-4">
              {c.howItWorks.steps.map((s, i) => (
                <li key={s.title} className="flex gap-4 rounded-2xl bg-night-800 p-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ember-500 text-lg font-bold text-night-950">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold">{s.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-mist">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-mist/70">{c.howItWorks.note}</p>
          </div>
        </section>

        {/* 4. 安心・安全 */}
        <section className="bg-night-950 px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading lead={c.safety.lead}>{c.safety.heading}</SectionHeading>
            <ul className="grid gap-3 sm:grid-cols-2">
              {c.safety.items.map((item, i) => (
                <li key={item.title} className="rounded-2xl border border-white/8 bg-night-900 p-5">
                  <p className="flex items-center gap-2 font-bold">
                    <span aria-hidden className="text-xl">
                      {safetyIcons[i]}
                    </span>
                    {item.title}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-mist">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5. 先行招待 */}
        <section className="bg-gradient-to-b from-night-900 to-night-800 px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading lead={c.invite.lead}>{c.invite.heading}</SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2">
              {c.invite.cards.map((card, i) => (
                <div
                  key={card.title}
                  className={`rounded-2xl p-6 ${
                    i === 0
                      ? "border-2 border-ember-400/70 bg-night-950 shadow-xl shadow-ember-500/10"
                      : "border border-white/10 bg-night-950/60"
                  }`}
                >
                  <p
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                      i === 0 ? "bg-ember-500 text-night-950" : "bg-night-700 text-mist"
                    }`}
                  >
                    {card.badge}
                  </p>
                  <p className="mt-3 text-xl font-bold">{card.title}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-mist">{card.body}</p>
                  <ul className="mt-4 space-y-2">
                    {card.points.map((p) => (
                      <li key={p} className="flex gap-2 text-[15px]">
                        <span aria-hidden className="text-ember-400">
                          ✓
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 6. FAQ */}
        <section className="bg-night-950 px-5 py-16">
          <div className="mx-auto max-w-3xl">
            <SectionHeading>{c.faq.heading}</SectionHeading>
            <div className="space-y-3">
              {c.faq.items.map((item) => (
                <details key={item.q} className="group rounded-2xl bg-night-900 open:bg-night-800">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="mr-2 text-ember-400">Q.</span>
                      {item.q}
                    </span>
                    <span aria-hidden className="text-xl text-mist transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-[15px] leading-relaxed text-mist">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 7. 登録フォーム */}
        <section id="register" className="scroll-mt-4 bg-night-900 px-5 py-16">
          <div className="mx-auto max-w-lg">
            <div className="mb-6 text-center">
              <PreLaunchBadge />
            </div>
            <SectionHeading lead={c.form.lead}>{c.form.heading}</SectionHeading>
            <div className="rounded-3xl border border-white/10 bg-night-800 p-5 sm:p-8">
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
