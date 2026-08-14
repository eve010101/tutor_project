import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";
import { logSupabaseQuery } from "@/lib/supabase/query-log";

const DEVELOPMENT_PREVIEW_USER_ID = "00000000-0000-4000-8000-000000000000";

export function getRolePath(role?: string | null) {
  return role === "parent" ? "/parent/profile" : "/tutor/profile";
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const profileResult = await supabase
    .from("profiles")
    .select("id, role, phone, full_name, city, bio")
    .eq("id", user.id)
    .maybeSingle();
  const { data: profile } = logSupabaseQuery("current user profile", profileResult);

  return { user, profile };
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
  if (process.env.NODE_ENV === "development") {
    return {
      user: { id: DEVELOPMENT_PREVIEW_USER_ID },
      profile: {
        id: DEVELOPMENT_PREVIEW_USER_ID,
        role,
        phone: null,
        full_name: "开发预览用户",
        city: "北京",
        bio: null,
      },
    };
  }

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
