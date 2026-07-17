import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TutorProfileForm } from "@/components/tutor-profile-form";

export default async function TutorProfilePage() {
  const { user, profile } = await requireRole("tutor");
  const supabase = createSupabaseServerClient();
  const tutorProfileSelect =
    "gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, grade, service_areas, service_area, hourly_rate, available_time_slots, available_days, weekly_capacity, tagline, intro, order_status, status, verification_image_path" as const;
  const { data: tutorProfile } = await supabase
    .from("tutor_profiles")
    .select(tutorProfileSelect)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#fffef7_0%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[32px] border border-amber-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-amber-700">
            家教个人中心
          </p>
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                完善家教资料
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                补充真实且完整的教学信息后，平台更容易审核，也方便和家长需求做匹配。姓名与学信网截图仅用于平台留存，不会向家长展示完整实名信息。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900 sm:max-w-sm">
                上传学信网截图并保存后，资料会进入待审核状态；审核通过后才会出现在家教列表页。
              </div>
              <Button asChild className="w-full sm:w-auto" variant="outline">
                <Link href="/tutor/requests">
                  查看需求列表
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <TutorProfileForm profile={profile} tutorProfile={tutorProfile} />
      </div>
    </main>
  );
}
