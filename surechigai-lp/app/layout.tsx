import type { Metadata, Viewport } from "next";
import { Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { content } from "@/content";
import { APP_NAME, SITE_URL } from "@/lib/config";

// 丸ゴシックでやわらかい印象に。日本語は文字数が多いので preload せず、表示は swap
const maru = Zen_Maru_Gothic({
  weight: ["500", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-maru",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: content.meta.title, template: `%s｜${APP_NAME}` },
  description: content.meta.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: APP_NAME,
    title: content.meta.title,
    description: content.meta.description,
    url: "/",
    // 仮のOGP画像。Canvaで作った 1200x630 の画像を public/og.png に上書きすれば差し替わります
    images: [{ url: "/og.png", width: 1200, height: 630, alt: content.meta.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: content.meta.title,
    description: content.meta.description,
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffe8ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={maru.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
