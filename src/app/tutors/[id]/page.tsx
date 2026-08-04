import { notFound } from "next/navigation";

import { TutorDetail } from "@/components/tutor-detail";
import { getCurrentUserProfile } from "@/lib/auth";
import type { MatchRecord, ParentSelectableRequest } from "@/lib/matchmaking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TutorCard } from "@/components/tutor-directory";

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
  weekly_capacity: 3,
  tagline: "Patient, structured tutoring for middle-school students.",
  intro: "I focus on building a clear foundation and helping students form effective study habits.",
  order_status: "接单中",
};

export default async function TutorDetailPage({ params }: { params: { id: string } }) {
  if (process.env.NODE_ENV === "development" && params.id === developmentTutor.user_id) {
    return <TutorDetail tutor={developmentTutor} viewerRole={null} />;
  }

  const supabase = createSupabaseServerClient();
  const { user, profile } = await getCurrentUserProfile();
  const { data } = await supabase
    .from("approved_tutor_cards")
    .select(
      "user_id, display_name, avatar_url, gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, service_areas, hourly_rate, available_time_slots, weekly_capacity, tagline, intro, order_status"
    )
    .eq("user_id", params.id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const tutor = data as TutorCard;
  const { data: tutorProfile } = await supabase
    .from("tutor_profiles")
    .select("status")
    .eq("user_id", params.id)
    .maybeSingle();

  let parentRequests: ParentSelectableRequest[] = [];
  let existingMatch: MatchRecord | null = null;
  let counterpartProfile: { fullName?: string | null; phone?: string | null } | null = null;

  if (user && profile?.role === "parent") {
    const { data: requestRows } = await supabase
      .from("parent_requests")
      .select("id, subject, grade, area, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    parentRequests = (requestRows ?? []) as ParentSelectableRequest[];

    if (parentRequests.length) {
      const requestIds = parentRequests.map((item) => item.id);
      const { data: matchData } = await supabase
        .from("match_records")
        .select("*")
        .eq("tutor_id", params.id)
        .in("request_id", requestIds)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      existingMatch = (matchData as MatchRecord | null) ?? null;

      if (existingMatch?.status === "matched") {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", params.id)
          .maybeSingle();

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
