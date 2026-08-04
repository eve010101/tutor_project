import { notFound } from "next/navigation";

import { ParentRequestDetail } from "@/components/parent-request-detail";
import { getCurrentUserProfile } from "@/lib/auth";
import type { MatchRecord } from "@/lib/matchmaking";
import { normalizeParentRequest, type ParentRequestRecord } from "@/lib/parent-request";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ParentRequestRow = ParentRequestRecord & {
  user_id: string;
};

export default async function ParentRequestDetailPage({ params }: { params: { id: string } }) {
  const requestId = Number(params.id);
  if (!Number.isInteger(requestId)) {
    notFound();
  }

  const supabase = createSupabaseServerClient();
  const { user, profile } = await getCurrentUserProfile();
  const { data } = await supabase
    .from("parent_requests")
    .select(
      "id, user_id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at"
    )
    .eq("id", requestId)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const requestRow = data as ParentRequestRow;
  const request = normalizeParentRequest(requestRow);
  let tutorId: string | undefined;
  let tutorOrderStatus: string | null = null;
  let tutorReviewStatus: string | null = null;
  let existingMatch: MatchRecord | null = null;
  let counterpartProfile: { fullName?: string | null; phone?: string | null } | null = null;

  if (user && profile?.role === "tutor") {
    tutorId = user.id;

    const { data: tutorProfile } = await supabase
      .from("tutor_profiles")
      .select("order_status, status")
      .eq("user_id", user.id)
      .maybeSingle();

    tutorOrderStatus = tutorProfile?.order_status ?? null;
    tutorReviewStatus = tutorProfile?.status ?? null;

    const { data: matchData } = await supabase
      .from("match_records")
      .select("*")
      .eq("request_id", requestId)
      .eq("tutor_id", user.id)
      .maybeSingle();

    existingMatch = (matchData as MatchRecord | null) ?? null;

    if (existingMatch?.status === "matched") {
      const { data: parentProfile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", requestRow.user_id)
        .maybeSingle();

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
