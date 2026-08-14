"use client";

import { useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Flag,
  GraduationCap,
  Heart,
  MapPin,
  School,
  Wallet,
} from "lucide-react";

import type { MatchRecord, ParentSelectableRequest } from "@/lib/matchmaking";
import { MatchActions } from "@/components/match-actions";
import { Button } from "@/components/ui/button";
import type { TutorCard } from "@/components/tutor-directory";
import type { UserRole } from "@/types/auth";

type TutorDetailData = TutorCard;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b border-slate-100 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm leading-6 text-slate-800">{children}</dd>
    </div>
  );
}

function Tags({ values, emptyText = "暂未填写" }: { values?: string[] | null; emptyText?: string }) {
  if (!values?.length) {
    return <span className="text-slate-400">{emptyText}</span>;
  }

  return (
    <span className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700"
          key={value}
        >
          {value}
        </span>
      ))}
    </span>
  );
}

export function TutorDetail({
  tutor,
  viewerRole,
  tutorReviewStatus,
  parentRequests,
  existingMatch,
  counterpartProfile,
}: {
  tutor: TutorDetailData;
  viewerRole: UserRole | null;
  tutorReviewStatus?: string | null;
  parentRequests?: ParentSelectableRequest[];
  existingMatch?: MatchRecord | null;
  counterpartProfile?: {
    fullName?: string | null;
    phone?: string | null;
  } | null;
}) {
  const [reportHint, setReportHint] = useState("");
  const acceptingOrders = tutor.order_status !== "暂不接单";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 sm:p-7">
            <div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                    {tutor.display_name}
                  </h1>
                  <span
                    className={
                      acceptingOrders
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
                        : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600"
                    }
                  >
                    {acceptingOrders ? "接单中" : "暂不接单"}
                  </span>
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                  <School className="h-4 w-4 text-sky-700" />
                  {[tutor.school, tutor.academic_stage].filter(Boolean).join(" · ") || "认证家教"}
                </p>
                {tutor.tagline ? (
                  <p className="mt-3 text-sm leading-6 text-slate-700">{tutor.tagline}</p>
                ) : null}
              </div>
            </div>
          </header>

          <div className="p-5 sm:p-7">
            <dl>
              <DetailRow label="院系">
                <span className="inline-flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-sky-700" />
                  {tutor.department || "暂未填写"}
                </span>
              </DetailRow>
              <DetailRow label="高考来源地">{tutor.gaokao_origin || "暂未填写"}</DetailRow>
              <DetailRow label="教授科目">
                <Tags values={tutor.subjects} />
              </DetailRow>
              <DetailRow label="服务类型">
                <Tags values={tutor.service_types} />
              </DetailRow>
              <DetailRow label="辅导年级范围">
                <Tags values={tutor.grade_ranges} />
              </DetailRow>
              <DetailRow label="可上课区域">
                <span className="inline-flex items-start gap-2">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-sky-700" />
                  <Tags values={tutor.service_areas} />
                </span>
              </DetailRow>
              <DetailRow label="收费">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-950">
                  <Wallet className="h-4 w-4 text-amber-500" />
                  {tutor.hourly_rate ? `${tutor.hourly_rate} 元 / 小时` : "面议"}
                </span>
              </DetailRow>
              <DetailRow label="完整自我介绍">
                <p className="whitespace-pre-wrap">{tutor.intro || "暂未填写"}</p>
              </DetailRow>
              <DetailRow label="可上课时间">
                <span className="inline-flex items-start gap-2">
                  <CalendarDays className="mt-1 h-4 w-4 shrink-0 text-sky-700" />
                  <Tags values={tutor.available_time_slots} />
                </span>
              </DetailRow>
              <DetailRow label="时间补充说明">
                <p className="whitespace-pre-wrap">
                  {tutor.available_time_note || "暂未填写"}
                </p>
              </DetailRow>
              <DetailRow label="每周可接课次数">
                <span className="inline-flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-sky-700" />
                  {tutor.weekly_capacity ? `每周最多 ${tutor.weekly_capacity} 次` : "暂未填写"}
                </span>
              </DetailRow>
            </dl>

            <section className="mt-7 rounded-2xl bg-slate-50 p-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-sky-700" />
                <h2 className="font-semibold text-slate-950">历史评价</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                当前先展示双向评价入口。家教详情页的公开评价可在后续接真实评价列表后展示。
              </p>
            </section>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Button disabled size="lg" type="button">
                  <Heart className="h-4 w-4" />
                  {acceptingOrders ? "请使用下方撮合区" : "暂不接单"}
                </Button>
                {!acceptingOrders ? (
                  <p className="mt-2 text-xs text-slate-500">该家教当前不接受新的咨询。</p>
                ) : null}
              </div>
              <div className="text-right">
                <Button
                  onClick={() =>
                    setReportHint("已收到举报意向，举报流程将在后续版本开放。")
                  }
                  type="button"
                  variant="ghost"
                >
                  <Flag className="h-4 w-4" />
                  举报
                </Button>
                {reportHint ? <p className="mt-1 text-xs text-slate-500">{reportHint}</p> : null}
              </div>
            </div>

            <div className="mt-6">
              <MatchActions
                counterpartProfile={counterpartProfile}
                existingMatch={existingMatch}
                parentRequests={parentRequests}
                tutorId={tutor.user_id}
                tutorOrderStatus={tutor.order_status}
                tutorReviewStatus={tutorReviewStatus}
                viewerRole={viewerRole}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
