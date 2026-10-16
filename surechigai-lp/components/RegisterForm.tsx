"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { content } from "@/content";
import type { RegisterResponse } from "@/lib/registration";

const f = content.form;
type FieldKey = keyof typeof f.errors;
type Done = "created" | "duplicate" | null;

function readTracking() {
  const params = new URLSearchParams(window.location.search);
  let referrer = "";
  try {
    // 自サイト内の遷移は流入元ではないので保存しない
    if (document.referrer && new URL(document.referrer).host !== window.location.host) {
      referrer = document.referrer;
    }
  } catch {}
  return {
    utmSource: params.get("utm_source") ?? "",
    utmMedium: params.get("utm_medium") ?? "",
    utmCampaign: params.get("utm_campaign") ?? "",
    referrer,
  };
}

function validate(fd: FormData): FieldKey[] {
  const errors: FieldKey[] = [];
  const email = String(fd.get("email") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email");
  if (!fd.get("gender")) errors.push("gender");
  if (!fd.get("ageGroup")) errors.push("ageGroup");
  if (!fd.get("agreeAge")) errors.push("agreeAge");
  if (!fd.get("agreePrivacy")) errors.push("agreePrivacy");
  return errors;
}

export default function RegisterForm() {
  const [errors, setErrors] = useState<FieldKey[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const found = validate(fd);
    setErrors(found);
    setMessage(null);
    if (found.length) {
      form.querySelector<HTMLElement>(`[name="${found[0]}"]`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          gender: fd.get("gender"),
          ageGroup: fd.get("ageGroup"),
          area: fd.get("area") ?? "",
          agreeAge: fd.get("agreeAge") === "on",
          agreePrivacy: fd.get("agreePrivacy") === "on",
          hp: fd.get("hp_b7f3e") ?? "",
          ...readTracking(),
        }),
      });
      const data = (await res.json()) as RegisterResponse;
      if (data.status === "created" || data.status === "duplicate") {
        setDone(data.status);
      } else if (data.status === "invalid") {
        setErrors(data.fields.filter((k): k is FieldKey => k in f.errors));
        setMessage(f.errors.server);
      } else if (data.status === "rate_limited") {
        setMessage(f.errors.rateLimited);
      } else {
        setMessage(f.errors.server);
      }
    } catch {
      setMessage(f.errors.server);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const m = done === "created" ? f.success : f.duplicate;
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-3xl bg-blush p-6 text-center"
      >
        <div
          aria-hidden
          className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-pink-500 text-2xl text-white shadow-md"
        >
          ♡
        </div>
        <p className="text-lg font-bold">{m.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{m.body}</p>
      </div>
    );
  }

  const has = (k: FieldKey) => errors.includes(k);
  const errorText = (k: FieldKey) =>
    has(k) ? (
      <p id={`${k}-error`} className="mt-1.5 text-sm font-bold text-pink-500">
        {f.errors[k]}
      </p>
    ) : null;

  const tag = (required: boolean) => (
    <span
      className={`ml-2 rounded px-1.5 py-0.5 text-[11px] font-bold ${
        required ? "bg-pink-500 text-white" : "bg-sky text-ink-soft"
      }`}
    >
      {required ? f.required : f.optional}
    </span>
  );

  const chip =
    "flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 border-pink-300/60 bg-white px-2 text-[15px] whitespace-nowrap transition peer-checked:border-pink-500 peer-checked:bg-pink-500 peer-checked:font-bold peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-pink-300";

  const radioGroup = (
    name: "gender" | "ageGroup" | "area",
    options: readonly { value: string; label: string }[],
    label: string,
    required: boolean,
    cols: string,
  ) => (
    <fieldset aria-describedby={required && has(name as FieldKey) ? `${name}-error` : undefined}>
      <legend className="mb-2 text-sm font-bold">
        {label}
        {tag(required)}
      </legend>
      <div className={`grid gap-2 ${cols}`}>
        {options.map((o) => (
          <label key={o.value} className="block">
            <input type="radio" name={name} value={o.value} className="peer sr-only" />
            <span className={chip}>{o.label}</span>
          </label>
        ))}
      </div>
      {required && errorText(name as FieldKey)}
    </fieldset>
  );

  const checkbox = (name: "agreeAge" | "agreePrivacy", children: React.ReactNode) => (
    <div>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-cream px-4 py-3">
        <input
          type="checkbox"
          name={name}
          aria-invalid={has(name)}
          aria-describedby={has(name) ? `${name}-error` : undefined}
          className="size-5 shrink-0 accent-pink-500"
        />
        <span className="text-[15px]">
          {children}
          {tag(true)}
        </span>
      </label>
      {errorText(name)}
    </div>
  );

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-bold">
          {f.email.label}
          {tag(true)}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={f.email.placeholder}
          aria-invalid={has("email")}
          aria-describedby={has("email") ? "email-error" : undefined}
          className="block h-13 w-full rounded-2xl border-2 border-pink-300/60 bg-white px-4 text-base text-ink placeholder:text-ink-soft/50 focus:border-pink-500 focus:outline-none focus:ring-4 focus:ring-pink-300/40"
        />
        {errorText("email")}
      </div>

      {radioGroup("gender", f.gender.options, f.gender.label, true, "grid-cols-3")}
      {radioGroup("ageGroup", f.ageGroup.options, f.ageGroup.label, true, "grid-cols-2")}
      {radioGroup("area", f.area.options, f.area.label, false, "grid-cols-2")}

      {/* ハニーポット：画面にもスクリーンリーダーにも出さない */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        {/* 名前に website / email などを使うとブラウザの自動入力で値が入り、本物の登録が捨てられるので意味のない名前にする */}
        <input type="text" name="hp_b7f3e" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="space-y-2">
        {checkbox("agreeAge", f.agreeAge)}
        {checkbox(
          "agreePrivacy",
          <>
            {f.agreePrivacyBefore}
            <Link href="/privacy" target="_blank" className="font-bold text-pink-500 underline underline-offset-2">
              {f.agreePrivacyLink}
            </Link>
            {f.agreePrivacyAfter}
          </>,
        )}
      </div>

      {message && (
        <p role="alert" className="rounded-2xl bg-blush px-4 py-3 text-sm font-bold text-pink-500">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-pop flex h-15 w-full items-center justify-center rounded-full text-lg font-bold text-white disabled:opacity-60"
      >
        {submitting ? f.submitting : f.submit}
      </button>
      <p className="text-center text-xs leading-relaxed text-ink-soft">{f.privacyNote}</p>
    </form>
  );
}
