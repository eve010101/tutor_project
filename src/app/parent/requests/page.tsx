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

export default async function ParentRequestsPage() {
  const { user } = await requireRole("parent");
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("parent_requests")
    .select(parentRequestSelect)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const requests = (data ?? []) as ParentRequestRecord[];
  const recruitingCount = requests.filter(
    (request) => normalizeParentRequestStatus(request.status) === "招募中"
  ).length;
  const closedCount = requests.length - recruitingCount;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-sky-700">我的需求</p>
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                已发布需求列表
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                这里会展示你已发布的全部需求，包含状态、预算、时间和发布日期，方便后续回看。
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-sky-700">
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
              <Link href="/parent/request">
                继续发布需求
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
            emptyDescription="你还没有发布任何需求，可以先回到发布页补充一条新的家教需求。"
            emptyTitle="还没有需求记录"
            requests={requests}
          />
        )}
      </div>
    </main>
  );
}
