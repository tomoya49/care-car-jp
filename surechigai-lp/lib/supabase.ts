import "server-only";
import { createClient } from "@supabase/supabase-js";

// サーバー側専用。キーは NEXT_PUBLIC_ を付けずに保存し、ブラウザには一切渡しません。
// 使うのは匿名（publishable / anon）キーで、RLS により INSERT しかできない権限です。
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY が設定されていません");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
