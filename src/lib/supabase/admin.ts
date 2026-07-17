import { createClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(getSupabaseProjectUrl(), key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
