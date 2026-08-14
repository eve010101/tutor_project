import { notFound } from "next/navigation";

import { ParentRequestDetail } from "@/components/parent-request-detail";
import { getCurrentUserProfile } from "@/lib/auth";
import type { MatchRecord } from "@/lib/matchmaking";
import { normalizeParentRequest, type ParentRequestRecord } from "@/lib/parent-request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSupabaseQuery } from "@/lib/supabase/query-log";

type ParentRequestRow = ParentRequestRecord & {
  user_id: string;
};

export default async function ParentRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { user, profile } = await getCurrentUserProfile();
  const requestSelect =
    "id, user_id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, preferred_time_note, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at";

  let data: ParentRequestRow | null = null;

  try {
    const adminSupabase = createSupabaseAdminClient();
    const adminResult = await adminSupabase
      .from("parent_requests")
      .select(requestSelect)
      .eq("id", requestId)
      .maybeSingle();
    const { data: adminData } = logSupabaseQuery("parent request detail (admin)", adminResult);

    data = (adminData as ParentRequestRow | null) ?? null;
  } catch (error) {
    console.error("[Supabase] admin parent request query unavailable; using session client", error);
    const serverResult = await supabase
      .from("parent_requests")
      .select(requestSelect)
      .eq("id", requestId)
      .maybeSingle();
    const { data: serverData } = logSupabaseQuery("parent request detail", serverResult);

    data = (serverData as ParentRequestRow | null) ?? null;
  }

  if (!data) {
    notFound();
  }

  const requestRow = data;
  const request = normalizeParentRequest(requestRow);
  let tutorId: string | undefined;
  let tutorOrderStatus: string | null = null;
  let tutorReviewStatus: string | null = null;
  let existingMatch: MatchRecord | null = null;
  let counterpartProfile: { fullName?: string | null; phone?: string | null } | null = null;

  if (user && profile?.role === "tutor") {
    tutorId = user.id;

    const tutorProfileResult = await supabase
      .from("tutor_profiles")
      .select("order_status, status")
      .eq("user_id", user.id)
      .maybeSingle();
    const { data: tutorProfile } = logSupabaseQuery("current tutor status", tutorProfileResult);

    tutorOrderStatus = tutorProfile?.order_status ?? null;
    tutorReviewStatus = tutorProfile?.status ?? null;

    const matchResult = await supabase
      .from("match_records")
      .select("*")
      .eq("request_id", requestId)
      .eq("tutor_id", user.id)
      .maybeSingle();
    const { data: matchData } = logSupabaseQuery("parent request match", matchResult);

    existingMatch = (matchData as MatchRecord | null) ?? null;

    if (existingMatch?.status === "matched") {
      const parentProfileResult = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", requestRow.user_id)
        .maybeSingle();
      const { data: parentProfile } = logSupabaseQuery("matched parent contact", parentProfileResult);

      counterpartProfile = parentProfile
        ? {
            fullName: parentProfile.full_name,
            phone: parentProfile.phone,
          }
        : null;
    }
  }

  return (
    <ParentRequestDetail
      counterpartProfile={counterpartProfile}
      existingMatch={existingMatch}
      request={request}
      requestOwnerId={requestRow.user_id}
      tutorId={tutorId}
      tutorOrderStatus={tutorOrderStatus}
      tutorReviewStatus={tutorReviewStatus}
      viewerRole={profile?.role ?? null}
    />
  );
}
