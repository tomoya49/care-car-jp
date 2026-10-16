import { NextResponse, type NextRequest } from "next/server";
import { registrationSchema, type RegisterResponse } from "@/lib/registration";
import { isRateLimited } from "@/lib/rate-limit";
import { getSupabase } from "@/lib/supabase";

const json = (body: RegisterResponse, status = 200) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  // 他サイトからのフォーム送信を受け付けない
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) {
    return json({ status: "error" }, 403);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) return json({ status: "rate_limited" }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ status: "invalid", fields: [] }, 400);
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    return json({ status: "invalid", fields }, 400);
  }
  const data = parsed.data;

  // ハニーポットに入力があればボット。保存せず、成功したように見せる
  if (data.hp) {
    console.warn("honeypot hit: registration discarded");
    return json({ status: "created" });
  }

  const { error } = await getSupabase()
    .from("pre_registrations")
    .insert({
      email: data.email,
      gender: data.gender,
      age_group: data.ageGroup,
      area: data.area ?? null,
      utm_source: data.utmSource,
      utm_medium: data.utmMedium,
      utm_campaign: data.utmCampaign,
      referrer: data.referrer,
    });

  if (error) {
    // 23505 = unique 制約違反（同じメールで登録済み）
    if (error.code === "23505") return json({ status: "duplicate" });
    console.error("pre_registrations insert failed", error.code, error.message);
    return json({ status: "error" }, 500);
  }
  return json({ status: "created" }, 201);
}
