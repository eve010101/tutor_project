import { TutorDirectory, type TutorCard } from "@/components/tutor-directory";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function TutorsPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("approved_tutor_cards")
    .select(
      "user_id, display_name, avatar_url, gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, service_areas, hourly_rate, available_time_slots, weekly_capacity, tagline, intro, order_status"
    )
    .order("hourly_rate", { ascending: true, nullsFirst: false });

  return <TutorDirectory tutors={(data ?? []) as TutorCard[]} />;
}
