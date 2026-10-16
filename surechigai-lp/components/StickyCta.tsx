"use client";

import { useEffect, useState } from "react";
import { content } from "@/content";

// 画面下に固定する登録ボタン。ヒーローのボタンかフォームが見えている間は隠す
export default function StickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = ["hero-cta", "register"]
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setShow(visible.size === 0);
    });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-pink-300/40 bg-white/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur transition-transform duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!show}
    >
      <a
        href="#register"
        tabIndex={show ? 0 : -1}
        className="btn-pop mx-auto flex h-13 max-w-md items-center justify-center rounded-full text-base font-bold text-white"
      >
        {content.stickyCta}
      </a>
    </div>
  );
}
