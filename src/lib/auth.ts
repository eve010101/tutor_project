import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";
import { logSupabaseQuery } from "@/lib/supabase/query-log";
import { isSupabaseAuthCookieName } from "@/lib/supabase/auth-cookie";

export function getRolePath(role?: string | null) {
  return role === "parent" ? "/parent/profile" : "/tutor/profile";
}

export async function getCurrentUserProfile() {
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore
    .getAll()
    .some(({ name }) => isSupabaseAuthCookieName(name));

  if (!hasAuthCookie) {
    return { user: null, profile: null };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn("[Supabase] current user lookup skipped", {
        name: userError.name,
        message: userError.message,
      });
      return { user: null, profile: null };
    }

    if (!user) {
      return { user: null, profile: null };
    }

    const profileResult = await supabase
      .from("profiles")
      .select("id, role, phone, full_name, city, bio")
      .eq("id", user.id)
      .maybeSingle();
    const { data: profile } = logSupabaseQuery(
      "current user profile",
      profileResult,
    );

    return {
      user,
      profile: profileResult.error ? null : profile,
    };
  } catch (error) {
    console.warn("[Supabase] current user lookup failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return { user: null, profile: null };
  }
}

export async function redirectAuthenticatedUser() {
  if (process.env.NODE_ENV === "development") {
    return;
  }

  const { user, profile } = await getCurrentUserProfile();

  if (user && profile?.role) {
    redirect(getRolePath(profile.role));
  }
}

export async function requireRole(role: UserRole) {
  const { user, profile } = await getCurrentUserProfile();

  if (!user || !profile?.role) {
    redirect("/auth");
  }

  if (profile.role !== role) {
    redirect(getRolePath(profile.role));
  }

  return {
    user,
    profile: {
      ...profile,
      role: profile.role,
      phone: profile.phone,
      full_name: profile.full_name,
      city: profile.city,
      bio: profile.bio,
    },
  };
}
