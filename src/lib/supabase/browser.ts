import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";
import {
  fetchWithSupabaseTimeout,
  SUPABASE_REQUEST_TIMEOUT_MS,
} from "@/lib/supabase/fetch";

export function createSupabaseBrowserClient() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient(
    getSupabaseProjectUrl(),
    key!,
    {
      db: {
        timeout: SUPABASE_REQUEST_TIMEOUT_MS,
      },
      global: {
        fetch: fetchWithSupabaseTimeout,
      },
    },
  );
}
