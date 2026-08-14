import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { type ParentRequestRecord, sortParentRequests } from "@/lib/parent-request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSupabaseQuery } from "@/lib/supabase/query-log";
import { ParentRequestManager } from "@/components/parent-request-manager";
import { MobileProfileSignOut } from "@/components/mobile-profile-sign-out";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const parentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, preferred_time_note, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;

export default async function ParentProfilePage() {
  const { user } = await requireRole("parent");
  const supabase = await createSupabaseServerClient();

  const result = await supabase
    .from("parent_requests")
    .select(parentRequestSelect)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const { data, error } = logSupabaseQuery("parent own request list", result);

  const requests = sortParentRequests((data ?? []) as ParentRequestRecord[]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-sky-700">家长个人中心</p>
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                我的需求帖
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                在这里直接管理你发布的所有需求，支持行内编辑、关闭和重新发布新需求。
              </p>
            </div>
            <Button asChild>
              <Link href="/parent/request">
                <Plus className="h-4 w-4" />
                发布新需求
              </Link>
            </Button>
          </div>
        </section>

        {error ? (
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader><CardTitle>需求列表读取失败</CardTitle></CardHeader>
            <CardContent className="text-sm text-red-700">{error.message}</CardContent>
          </Card>
        ) : <ParentRequestManager requests={requests} />}

        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" />
              意见反馈入口
            </CardTitle>
            <CardDescription>如需反馈页面问题、匹配异常或产品建议，请联系平台客服邮箱。</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            <span className="font-medium text-slate-900">weiming_0205@qq.com</span>
          </CardContent>
        </Card>
        <MobileProfileSignOut />
      </div>
    </main>
  );
}
