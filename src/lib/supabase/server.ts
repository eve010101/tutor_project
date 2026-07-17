import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return createServerClient(
    getSupabaseProjectUrl(),
    key!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored when called from a Server Component during render.
          }
        },
      },
    }
  );
}
