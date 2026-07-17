import { MapPin, Wallet } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TutorCard = {
  user_id: string;
  display_name: string;
  avatar_url?: string | null;
  gender?: string | null;
  school?: string | null;
  department?: string | null;
  academic_stage?: string | null;
  subjects?: string[] | null;
  service_types?: string[] | null;
  grade_ranges?: string[] | null;
  service_areas?: string[] | null;
  hourly_rate?: number | null;
  tagline?: string | null;
  intro?: string | null;
  order_status?: string | null;
};

function renderTags(values?: string[] | null, limit = 4) {
  return (values ?? []).slice(0, limit);
}

export default async function TutorsPage() {
  const supabase = createSupabaseServerClient();
  const tutorCardSelect =
    "user_id, display_name, avatar_url, gender, school, department, academic_stage, subjects, service_types, grade_ranges, service_areas, hourly_rate, tagline, intro, order_status" as const;
  const { data } = await supabase
    .from("approved_tutor_cards")
    .select(tutorCardSelect)
    .order("hourly_rate", { ascending: true, nullsFirst: false });

  const tutors = (data ?? []) as TutorCard[];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.1),_transparent_26%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="space-y-3">
            <p className="text-sm font-medium tracking-wide text-sky-700">
              家教列表
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              已通过审核的家教资料
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              这里只展示审核状态为 <code>approved</code> 的家教资料。待审核或未通过审核的资料不会出现在列表页。
            </p>
          </div>
          <div className="mt-5 inline-flex rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sm text-sky-700">
            当前可展示家教 {tutors.length} 位
          </div>
        </section>

        {tutors.length ? (
          <section className="grid gap-5 lg:grid-cols-2">
            {tutors.map((tutor) => {
              const subjectTags = renderTags(tutor.subjects);
              const serviceTypeTags = renderTags(tutor.service_types, 3);
              const gradeTags = renderTags(tutor.grade_ranges, 3);

              return (
                <Card className="overflow-hidden border-slate-200" key={tutor.user_id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          "h-20 w-20 shrink-0 rounded-3xl border border-slate-200 bg-slate-100 bg-cover bg-center",
                          !tutor.avatar_url && "flex items-center justify-center text-xl font-semibold text-slate-400"
                        )}
                        style={
                          tutor.avatar_url
                            ? { backgroundImage: `url("${tutor.avatar_url}")` }
                            : undefined
                        }
                      >
                        {tutor.avatar_url ? null : tutor.display_name.slice(0, 1)}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-slate-950">
                            {tutor.display_name}
                          </h2>
                          <span
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium",
                              tutor.order_status === "暂不接单"
                                ? "border-slate-200 bg-slate-100 text-slate-500"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            )}
                          >
                            {tutor.order_status ?? "接单中"}
                          </span>
                        </div>

                        <div className="text-sm leading-6 text-slate-600">
                          {[tutor.school, tutor.department, tutor.academic_stage]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>

                        {tutor.tagline ? (
                          <p className="text-sm font-medium leading-6 text-slate-900">
                            {tutor.tagline}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {subjectTags.map((subject) => (
                        <span
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                          key={subject}
                        >
                          {subject}
                        </span>
                      ))}
                      {serviceTypeTags.map((serviceType) => (
                        <span
                          className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs text-sky-700"
                          key={serviceType}
                        >
                          {serviceType}
                        </span>
                      ))}
                      {gradeTags.map((grade) => (
                        <span
                          className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs text-amber-700"
                          key={grade}
                        >
                          {grade}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <Wallet className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>
                          {tutor.hourly_rate ? `${tutor.hourly_rate} 元 / 小时` : "面议"}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
                        <span>
                          {tutor.service_areas?.length
                            ? tutor.service_areas.join(" / ")
                            : "北京市区可沟通"}
                        </span>
                      </div>
                    </div>

                    {tutor.intro ? (
                      <p className="mt-5 line-clamp-4 text-sm leading-7 text-slate-600">
                        {tutor.intro}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        ) : (
          <Card className="border-dashed border-slate-300 bg-white/80">
            <CardHeader>
              <CardTitle>暂无可展示家教</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-slate-600">
              当前还没有审核通过的家教资料，或数据库迁移尚未执行。
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
