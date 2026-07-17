function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSupabaseProjectUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!rawUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  const normalized = stripTrailingSlash(rawUrl);

  if (normalized.endsWith("/rest/v1")) {
    return normalized.slice(0, -"/rest/v1".length);
  }

  return normalized;
}
