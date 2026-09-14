import { createClient } from "@supabase/supabase-js";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";
import {
  fetchWithSupabaseTimeout,
  SUPABASE_REQUEST_TIMEOUT_MS,
} from "@/lib/supabase/fetch";

export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(getSupabaseProjectUrl(), key, {
    db: {
      timeout: SUPABASE_REQUEST_TIMEOUT_MS,
    },
    global: {
      fetch: fetchWithSupabaseTimeout,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
