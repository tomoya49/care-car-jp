import Link from "next/link";
import { content } from "@/content";
import { APP_NAME } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-night-950 px-5 pt-10 pb-28 text-sm text-mist">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="font-bold text-white">
          {APP_NAME}
        </Link>
        <nav className="mt-5">
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {content.footer.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="underline-offset-4 hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-6 text-xs leading-relaxed text-mist/70">{content.footer.note}</p>
        <p className="mt-4 text-xs text-mist/50">
          © {new Date().getFullYear()} {APP_NAME}
        </p>
      </div>
    </footer>
  );
}
