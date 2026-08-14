import { notFound } from "next/navigation";

import { TutorDetail } from "@/components/tutor-detail";
import { getCurrentUserProfile } from "@/lib/auth";
import type { MatchRecord, ParentSelectableRequest } from "@/lib/matchmaking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSupabaseQuery } from "@/lib/supabase/query-log";
import { fetchSupabaseWithFallback } from "@/lib/supabase/query-with-fallback";
import type { TutorCard } from "@/components/tutor-directory";

const tutorCardSelect =
  "user_id, display_name, gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, service_areas, hourly_rate, available_time_slots, available_time_note, weekly_capacity, tagline, intro, order_status" as const;
const legacyTutorCardSelect =
  "user_id, display_name, gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, service_areas, hourly_rate, available_time_slots, weekly_capacity, tagline, intro, order_status" as const;

const developmentTutor: TutorCard = {
  user_id: "test-id",
  display_name: "Demo Tutor",
  school: "Tsinghua University",
  department: "Computer Science Department",
  academic_stage: "Junior",
  gaokao_origin: "Beijing",
  subjects: ["Mathematics", "English"],
  service_types: ["After-school tutoring"],
  grade_ranges: ["Middle school"],
  service_areas: ["Haidian District"],
  hourly_rate: 200,
  available_time_slots: ["Weekday evenings", "Weekend afternoons"],
  available_time_note: "Wednesday 7-9pm and weekend afternoons are preferred.",
  weekly_capacity: 3,
  tagline: "Patient, structured tutoring for middle-school students.",
  intro: "I focus on building a clear foundation and helping students form effective study habits.",
  order_status: "接单中",
};

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Keep the built-in preview link usable with both `next dev` and `next start`.
  // All regular detail URLs still resolve exclusively from public tutor data.
  if (id === developmentTutor.user_id) {
    return <TutorDetail tutor={developmentTutor} viewerRole={null} />;
  }

  const supabase = await createSupabaseServerClient();
  const { user, profile } = await getCurrentUserProfile();
  const { data, error: tutorError } = await fetchSupabaseWithFallback({
    primaryLabel: "approved tutor detail",
    fallbackLabel: "approved tutor detail legacy fallback",
    missingField: "available_time_note",
    primary: () =>
      supabase
        .from("approved_tutor_cards")
        .select(tutorCardSelect)
        .eq("user_id", id)
        .maybeSingle(),
    fallback: () =>
      supabase
        .from("approved_tutor_cards")
        .select(legacyTutorCardSelect)
        .eq("user_id", id)
        .maybeSingle(),
  });

  if (!data) {
    if (tutorError) {
      throw new Error(`Unable to load tutor detail: ${tutorError.message}`);
    }
    notFound();
  }

  const tutor = data as TutorCard;
  const tutorProfileResult = await supabase
    .from("tutor_profiles")
    .select("status")
    .eq("user_id", id)
    .maybeSingle();
  const { data: tutorProfile } = logSupabaseQuery("tutor review status", tutorProfileResult);

  let parentRequests: ParentSelectableRequest[] = [];
  let existingMatch: MatchRecord | null = null;
  let counterpartProfile: { fullName?: string | null; phone?: string | null } | null = null;

  if (user && profile?.role === "parent") {
    const requestResult = await supabase
      .from("parent_requests")
      .select("id, subject, grade, area, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const { data: requestRows } = logSupabaseQuery("parent selectable requests", requestResult);

    parentRequests = (requestRows ?? []) as ParentSelectableRequest[];

    if (parentRequests.length) {
      const requestIds = parentRequests.map((item) => item.id);
      const matchResult = await supabase
        .from("match_records")
        .select("*")
        .eq("tutor_id", id)
        .in("request_id", requestIds)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: matchData } = logSupabaseQuery("existing tutor match", matchResult);

      existingMatch = (matchData as MatchRecord | null) ?? null;

      if (existingMatch?.status === "matched") {
        const counterpartResult = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", id)
          .maybeSingle();
        const { data: profileData } = logSupabaseQuery("matched tutor contact", counterpartResult);

        counterpartProfile = profileData
          ? {
              fullName: profileData.full_name,
              phone: profileData.phone,
            }
          : null;
      }
    }
  }

  return (
    <TutorDetail
      counterpartProfile={counterpartProfile}
      existingMatch={existingMatch}
      parentRequests={parentRequests}
      tutor={tutor}
      tutorReviewStatus={tutorProfile?.status ?? null}
      viewerRole={profile?.role ?? null}
    />
  );
}
