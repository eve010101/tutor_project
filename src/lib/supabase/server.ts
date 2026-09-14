import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";
import {
  fetchWithSupabaseTimeout,
  SUPABASE_REQUEST_TIMEOUT_MS,
} from "@/lib/supabase/fetch";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createServerClient(
    getSupabaseProjectUrl(),
    key!,
    {
      db: {
        timeout: SUPABASE_REQUEST_TIMEOUT_MS,
      },
      global: {
        fetch: fetchWithSupabaseTimeout,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            console.error('设置 cookie 失败:', error)
            // Ignored when called from a Server Component during render.
          }
        },
      },
    }
  );
}
