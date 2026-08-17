import Link from "next/link";
import { ArrowRight, FileText, PhoneCall, Send, ToggleLeft } from "lucide-react";

import { TutorProfileForm } from "@/components/tutor-profile-form";
import { MobileProfileSignOut } from "@/components/mobile-profile-sign-out";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { type MatchRecord, normalizeMatchStatus } from "@/lib/matchmaking";
import { normalizeParentRequest, type ParentRequestRecord } from "@/lib/parent-request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSupabaseQuery } from "@/lib/supabase/query-log";
import { getTutorReviewStatusMeta } from "@/lib/tutor-review-status";

type RelatedProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

type RequestSummary = ParentRequestRecord & {
  id: number;
  subject: string;
  grade: string;
};

function getStatusLabel(status?: string | null) {
  const normalized = normalizeMatchStatus(status);
  if (normalized === "matched") {
    return "已接受";
  }
  if (normalized === "rejected") {
    return "已拒绝";
  }
  return "待回应";
}

function getDisplayName(profile?: RelatedProfile) {
  return profile?.full_name?.trim() || "未填写姓名";
}

function getRequestLabel(request?: RequestSummary, requestId?: number) {
  if (!request) {
    return `需求 ID ${requestId}`;
  }

  const normalizedRequest = normalizeParentRequest(request);

  return `${normalizedRequest.subject} / ${normalizedRequest.grade}`;
}

export default async function TutorProfilePage() {
  const { user, profile } = await requireRole("tutor");
  const supabase = await createSupabaseServerClient();
  const tutorProfileSelect =
    "gender, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, grade, service_areas, service_area, hourly_rate, available_time_slots, available_time_note, available_days, weekly_capacity, tagline, intro, order_status, status, verification_image_path" as const;

  const [tutorProfileResult, matchResult] = await Promise.all([
    supabase
      .from("tutor_profiles")
      .select(tutorProfileSelect)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("match_records")
      .select(
        "id, request_id, parent_id, tutor_id, status, parent_interested, tutor_interested, parent_interest_at, tutor_interest_at, contact_unlocked_at, rejected_by, reject_reason, rejected_at, created_at, updated_at"
      )
      .eq("tutor_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  const { data: tutorProfile } = logSupabaseQuery("current tutor profile", tutorProfileResult);
  const { data: matchData } = logSupabaseQuery("tutor match list", matchResult);

  const matches = (matchData ?? []) as MatchRecord[];
  const parentIds = Array.from(new Set(matches.map((item) => item.parent_id)));
  const requestIds = Array.from(new Set(matches.map((item) => item.request_id)));

  const [parentProfileResult, requestResult] = await Promise.all([
    parentIds.length
      ? supabase.from("profiles").select("id, full_name, phone").in("id", parentIds)
      : Promise.resolve({ data: [], error: null }),
    requestIds.length
      ? supabase.from("parent_requests").select("id, subject, grade").in("id", requestIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const { data: parentProfiles } = logSupabaseQuery(
    "matched parent profiles",
    parentProfileResult
  );
  const { data: requestRows } = logSupabaseQuery(
    "matched parent request summaries",
    requestResult
  );

  const parentMap = new Map(((parentProfiles ?? []) as RelatedProfile[]).map((item) => [item.id, item]));
  const requestMap = new Map(((requestRows ?? []) as RequestSummary[]).map((item) => [item.id, item]));
  const receivedInterest = matches.filter((item) => item.parent_interested);
  const sentInterest = matches.filter((item) => item.tutor_interested);
  const unlockedContacts = matches.filter((item) => normalizeMatchStatus(item.status) === "matched");
  const orderStatus = tutorProfile?.order_status ?? "接单中";
  const reviewStatus = getTutorReviewStatusMeta(tutorProfile?.status);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#fffef7_0%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-amber-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-amber-700">家教个人中心</p>
          <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                管理家教资料与匹配进展
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                这里集中处理家教资料表、接单状态、审核状态，以及你与家长之间的感兴趣记录。
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href="/tutor/requests">
                查看需求列表
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <Card className="border-amber-100 bg-amber-50/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5 text-amber-700" />
                状态总览
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3">
                接单状态：<span className="font-medium text-slate-950">{orderStatus}</span>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3">
                审核状态：<span className="font-medium text-slate-950">{reviewStatus.label}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-amber-700" />
                收到的感兴趣请求列表
              </CardTitle>
              <CardDescription>展示家长对你发起兴趣的记录，区分待回应、已接受、已拒绝。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {receivedInterest.length ? (
                receivedInterest.map((match) => {
                  const parent = parentMap.get(match.parent_id);
                  const request = requestMap.get(match.request_id);

                  return (
                    <div className="rounded-2xl border border-slate-200 px-4 py-3" key={match.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{getDisplayName(parent)}</div>
                        <span className="text-sm text-slate-500">{getStatusLabel(match.status)}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {getRequestLabel(request, match.request_id)}
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
                <ArrowRight className="h-5 w-5 text-amber-700" />
                我发出的感兴趣请求列表
              </CardTitle>
              <CardDescription>展示你主动对家长需求发起兴趣的记录。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sentInterest.length ? (
                sentInterest.map((match) => {
                  const parent = parentMap.get(match.parent_id);
                  const request = requestMap.get(match.request_id);

                  return (
                    <div className="rounded-2xl border border-slate-200 px-4 py-3" key={match.id}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium text-slate-900">{getDisplayName(parent)}</div>
                        <span className="text-sm text-slate-500">{getStatusLabel(match.status)}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {getRequestLabel(request, match.request_id)}
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
              <CardDescription>仅展示已互选成功的家长联系方式。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {unlockedContacts.length ? (
                unlockedContacts.map((match) => {
                  const parent = parentMap.get(match.parent_id);
                  const request = requestMap.get(match.request_id);

                  return (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3" key={match.id}>
                      <div className="font-medium text-slate-900">{getDisplayName(parent)}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {getRequestLabel(request, match.request_id)}
                      </div>
                      <div className="mt-2 text-sm text-slate-700">
                        联系方式：{parent?.phone?.trim() || "暂无手机号"}
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
        </section>

        <TutorProfileForm profile={profile} tutorProfile={tutorProfile} />

        <Card className="border-slate-200 bg-slate-50/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-700" />
              意见反馈入口
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-7 text-slate-600">
            如需反馈审核、接单或匹配问题，请联系平台客服邮箱
            <span className="mx-1 font-medium text-slate-900">weiming_0205@qq.com</span>。
          </CardContent>
        </Card>
        <MobileProfileSignOut />
      </div>
    </main>
  );
}
