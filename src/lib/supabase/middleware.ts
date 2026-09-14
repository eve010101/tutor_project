import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";
import { isSupabaseAuthCookieName } from "@/lib/supabase/auth-cookie";
import {
  fetchWithSupabaseTimeout,
  SUPABASE_REQUEST_TIMEOUT_MS,
} from "@/lib/supabase/fetch";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => isSupabaseAuthCookieName(name));

  if (!hasAuthCookie) {
    return supabaseResponse;
  }

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabase = createServerClient(
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
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });

          Object.entries(headers ?? {}).forEach(([key, value]) => {
            if (typeof value === "string") {
              supabaseResponse.headers.set(key, value);
            }
          });
        },
      },
    }
  );

  try {
    const { error } = await supabase.auth.getUser();
    if (error) {
      console.warn("[Supabase] session refresh skipped", {
        name: error.name,
        message: error.message,
      });
    }
  } catch (error) {
    console.warn("[Supabase] session refresh failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }

  return supabaseResponse;
}
