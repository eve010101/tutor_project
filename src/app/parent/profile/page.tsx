import Link from "next/link";
import { ArrowRight, FileText, MessageSquare, PhoneCall, Send } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { type MatchRecord, normalizeMatchStatus } from "@/lib/matchmaking";
import { type ParentRequestRecord, normalizeParentRequestStatus } from "@/lib/parent-request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ParentRequestManager } from "@/components/parent-request-manager";
import { ProfileBasicForm } from "@/components/profile-basic-form";
import { MobileProfileSignOut } from "@/components/mobile-profile-sign-out";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const parentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;
const matchSelect =
  "id, request_id, parent_id, tutor_id, status, parent_interested, tutor_interested, parent_interest_at, tutor_interest_at, contact_unlocked_at, rejected_by, reject_reason, rejected_at, created_at, updated_at" as const;

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

function getStatusLabel(match: MatchRecord) {
  const status = normalizeMatchStatus(match.status);
  if (status === "matched") {
    return "已接受";
  }
  if (status === "rejected") {
    return "已拒绝";
  }
  return "待回应";
}

export default async function ParentProfilePage() {
  const { user, profile } = await requireRole("parent");
  const supabase = createSupabaseServerClient();

  const [{ data: requestData }, { data: matchData }] = await Promise.all([
    supabase
      .from("parent_requests")
      .select(parentRequestSelect)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("match_records")
      .select(matchSelect)
      .eq("parent_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const requests = (requestData ?? []) as ParentRequestRecord[];
  const matches = (matchData ?? []) as MatchRecord[];
  const tutorIds = Array.from(new Set(matches.map((item) => item.tutor_id)));
  const requestIds = Array.from(new Set(matches.map((item) => item.request_id)));

  const [{ data: tutorProfiles }, { data: requestSummaries }] = await Promise.all([
    tutorIds.length
      ? supabase.from("profiles").select("id, full_name, phone").in("id", tutorIds)
      : Promise.resolve({ data: [] }),
    requestIds.length
      ? supabase.from("parent_requests").select("id, subject, grade").in("id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  const tutorMap = new Map(((tutorProfiles ?? []) as ProfileRow[]).map((item) => [item.id, item]));
  const requestMap = new Map(
    ((requestSummaries ?? []) as Array<{ id: number; subject: string; grade: string }>).map((item) => [
      item.id,
      item,
    ])
  );

  const openRequests = requests.filter(
    (item) => normalizeParentRequestStatus(item.status) === "招募中"
  ).length;
  const closedRequests = requests.length - openRequests;
  const receivedInterest = matches.filter((item) => item.tutor_interested);
  const sentInterest = matches.filter((item) => item.parent_interested);
  const unlockedContacts = matches.filter((item) => normalizeMatchStatus(item.status) === "matched");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-sky-700">家长个人中心</p>
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                管理资料、需求帖与匹配进展
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                这里集中查看你发布的需求、收到与发出的感兴趣请求，以及已经解锁的联系方式记录。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="/parent/request">
                  发布新需求
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "我的需求帖", value: `${requests.length}`, sub: `招聘中 ${openRequests} / 已关闭 ${closedRequests}` },
            { label: "收到的感兴趣请求", value: `${receivedInterest.length}`, sub: "家教对我的需求发起兴趣" },
            { label: "我发出的感兴趣请求", value: `${sentInterest.length}`, sub: "我主动表达过合作意向" },
            { label: "已解锁联系方式", value: `${unlockedContacts.length}`, sub: "双方互选成功的记录" },
          ].map((item) => (
            <Card className="border-slate-200 bg-white/90" key={item.label}>
              <CardContent className="p-6">
                <div className="text-sm text-slate-500">{item.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{item.value}</div>
                <div className="mt-2 text-sm text-slate-600">{item.sub}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <ProfileBasicForm profile={profile} />
            <ParentRequestManager requests={requests} />
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-sky-600" />
                  收到的感兴趣请求列表
                </CardTitle>
                <CardDescription>按家教主动发起的兴趣记录展示，可见当前回应状态。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {receivedInterest.length ? (
                  receivedInterest.map((match) => {
                    const tutor = tutorMap.get(match.tutor_id);
                    const request = requestMap.get(match.request_id);

                    return (
                      <div className="rounded-2xl border border-slate-200 px-4 py-3" key={match.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900">
                            {tutor?.full_name?.trim() || "未填写姓名"}
                          </div>
                          <span className="text-sm text-slate-500">{getStatusLabel(match)}</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {request ? `${request.subject} / ${request.grade}` : `需求 ID ${match.request_id}`}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    暂无收到的感兴趣请求。
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-sky-600" />
                  我发出的感兴趣请求列表
                </CardTitle>
                <CardDescription>展示你主动表达兴趣的合作记录。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sentInterest.length ? (
                  sentInterest.map((match) => {
                    const tutor = tutorMap.get(match.tutor_id);
                    const request = requestMap.get(match.request_id);

                    return (
                      <div className="rounded-2xl border border-slate-200 px-4 py-3" key={match.id}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium text-slate-900">
                            {tutor?.full_name?.trim() || "未填写姓名"}
                          </div>
                          <span className="text-sm text-slate-500">{getStatusLabel(match)}</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {request ? `${request.subject} / ${request.grade}` : `需求 ID ${match.request_id}`}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    暂无发出的感兴趣请求。
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5 text-emerald-600" />
                  已解锁的联系方式记录
                </CardTitle>
                <CardDescription>仅展示已互选成功并解锁联系方式的记录。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {unlockedContacts.length ? (
                  unlockedContacts.map((match) => {
                    const tutor = tutorMap.get(match.tutor_id);
                    const request = requestMap.get(match.request_id);

                    return (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3" key={match.id}>
                        <div className="font-medium text-slate-900">
                          {tutor?.full_name?.trim() || "未填写姓名"}
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {request ? `${request.subject} / ${request.grade}` : `需求 ID ${match.request_id}`}
                        </div>
                        <div className="mt-2 text-sm text-slate-700">
                          联系方式：{tutor?.phone?.trim() || "暂无手机号"}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    暂无已解锁记录。
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-700" />
                  意见反馈入口
                </CardTitle>
                <CardDescription>当前先提供统一反馈通道，可后续接入工单或表单系统。</CardDescription>
              </CardHeader>
              <CardContent className="text-sm leading-7 text-slate-600">
                如需反馈页面问题、匹配异常或产品建议，请联系平台客服邮箱
                <span className="mx-1 font-medium text-slate-900">feedback@tutor-platform.local</span>。
              </CardContent>
            </Card>
          </div>
        </div>
        <MobileProfileSignOut />
      </div>
    </main>
  );
}
