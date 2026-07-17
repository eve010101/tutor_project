import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  normalizeParentRequestStatus,
  type ParentRequestRecord,
} from "@/lib/parent-request";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ParentRequestList } from "@/components/parent-request-list";

const parentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;

export default async function TutorRequestsPage() {
  await requireRole("tutor");

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parent_requests")
    .select(parentRequestSelect)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as ParentRequestRecord[];
  const recruitingCount = requests.filter(
    (request) => normalizeParentRequestStatus(request.status) === "招募中"
  ).length;
  const closedCount = requests.length - recruitingCount;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#fffef7_0%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-amber-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-amber-700">
            家长需求列表
          </p>
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                查看最新家教需求
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                这里展示家长已发布的需求，不展示联系方式。你可以先按科目、区域、预算和时间判断是否匹配。
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-amber-800">
                  共 {requests.length} 条
                </span>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-emerald-700">
                  招募中 {recruitingCount} 条
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-slate-600">
                  已找到 {closedCount} 条
                </span>
              </div>
            </div>

            <Button asChild variant="outline">
              <Link href="/tutor/profile">
                返回资料页
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {error ? (
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader>
              <CardTitle>需求列表暂时无法读取</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-red-700">
              {error.message}
              如果刚更新代码但数据库还没同步，请先执行
              <code className="mx-1 rounded bg-red-100 px-1.5 py-0.5 text-red-800">
                supabase/update_parent_request_schema.sql
              </code>
              。
            </CardContent>
          </Card>
        ) : (
          <ParentRequestList
            emptyDescription="暂时还没有家长发布需求，或需求已经全部结束招募。"
            emptyTitle="暂时没有可查看的需求"
            requests={requests}
          />
        )}
      </div>
    </main>
  );
}
