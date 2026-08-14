import { redirect } from "next/navigation";

import { TutorDirectory, type TutorCard } from "@/components/tutor-directory";
import { getCurrentUserProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchSupabaseWithFallback } from "@/lib/supabase/query-with-fallback";

const tutorCardSelect =
  "user_id, display_name, gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, service_areas, hourly_rate, available_time_slots, available_time_note, weekly_capacity, tagline, intro, order_status" as const;
const legacyTutorCardSelect =
  "user_id, display_name, gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, service_areas, hourly_rate, available_time_slots, weekly_capacity, tagline, intro, order_status" as const;

export default async function TutorsPage() {
  const { user } = await getCurrentUserProfile();
  if (!user) {
    redirect("/auth");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await fetchSupabaseWithFallback({
    primaryLabel: "approved tutor list",
    fallbackLabel: "approved tutor list legacy fallback",
    missingField: "available_time_note",
    primary: () =>
      supabase
        .from("approved_tutor_cards")
        .select(tutorCardSelect)
        .order("hourly_rate", { ascending: true, nullsFirst: false }),
    fallback: () =>
      supabase
        .from("approved_tutor_cards")
        .select(legacyTutorCardSelect)
        .order("hourly_rate", { ascending: true, nullsFirst: false }),
  });

  return <TutorDirectory loadError={error?.message} tutors={(data ?? []) as TutorCard[]} />;
}
