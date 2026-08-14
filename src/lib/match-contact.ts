import { MATCH_STATUS, normalizeMatchStatus, type MatchRecord } from "@/lib/matchmaking";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logSupabaseQuery } from "@/lib/supabase/query-log";

export type MatchContactProfile = {
  fullName?: string | null;
  phone?: string | null;
};

type SupabaseProfileClient = {
  from: (table: "profiles") => {
    select: (columns: string) => {
      eq: (column: "id", value: string) => {
        maybeSingle: () => PromiseLike<{
          data: {
            full_name: string | null;
            phone: string | null;
          } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
};

function getCounterpartId(match: MatchRecord, viewerId: string) {
  if (viewerId === match.parent_id) {
    return match.tutor_id;
  }

  if (viewerId === match.tutor_id) {
    return match.parent_id;
  }

  return null;
}

async function queryProfileContact(client: SupabaseProfileClient, profileId: string) {
  const result = await client
    .from("profiles")
    .select("full_name, phone")
    .eq("id", profileId)
    .maybeSingle();

  const { data } = logSupabaseQuery("matched contact profile", result);

  return data
    ? {
        fullName: data.full_name,
        phone: data.phone,
      }
    : null;
}

export async function getUnlockedCounterpartContact({
  match,
  viewerId,
  supabase,
}: {
  match: MatchRecord | null;
  viewerId?: string | null;
  supabase: unknown;
}): Promise<MatchContactProfile | null> {
  if (!match || !viewerId || normalizeMatchStatus(match.status) !== MATCH_STATUS.MATCHED) {
    return null;
  }

  const counterpartId = getCounterpartId(match, viewerId);
  if (!counterpartId) {
    return null;
  }

  try {
    return await queryProfileContact(
      createSupabaseAdminClient() as unknown as SupabaseProfileClient,
      counterpartId
    );
  } catch {
    return queryProfileContact(supabase as SupabaseProfileClient, counterpartId);
  }
}
