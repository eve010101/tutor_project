import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createBrowserClient(
    getSupabaseProjectUrl(),
    key!
  );
}
