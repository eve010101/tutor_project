import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/auth";

export function getRolePath(role?: string | null) {
  return role === "parent" ? "/parent/request" : "/tutor/profile";
}

export async function getCurrentUserProfile() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, phone, full_name, city, avatar_url, bio")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile };
}

export async function redirectAuthenticatedUser() {
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
      avatar_url: profile.avatar_url,
      bio: profile.bio,
    },
  };
}
