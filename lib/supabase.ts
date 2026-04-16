import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ブラウザ用クライアント（公開キー）
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars not set");
  return createClient(url, key);
}

// サーバー用クライアント（service role）— APIルート専用
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server env vars not set");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// 後方互換性のためのデフォルトエクスポート（ビルド時に評価されないようlazy）
export const supabase = {
  get client() { return getSupabaseClient(); }
};
