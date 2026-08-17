import type { ReactNode } from "react";

import { CalendarDays, MapPin, School, Wallet } from "lucide-react";

import { MatchActions } from "@/components/match-actions";
import type { MatchRecord } from "@/lib/matchmaking";
import type { NormalizedParentRequest } from "@/lib/parent-request";
import type { UserRole } from "@/types/auth";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 border-b border-slate-100 py-4 sm:grid-cols-[9rem_1fr] sm:gap-5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm leading-6 text-slate-800">{children}</dd>
    </div>
  );
}

export function ParentRequestDetail({
  request,
  requestOwnerId,
  viewerRole,
  tutorId,
  tutorOrderStatus,
  tutorReviewStatus,
  existingMatch,
  counterpartProfile,
}: {
  request: NormalizedParentRequest;
  requestOwnerId: string;
  viewerRole: UserRole | null;
  tutorId?: string;
  tutorOrderStatus?: string | null;
  tutorReviewStatus?: string | null;
  existingMatch?: MatchRecord | null;
  counterpartProfile?: {
    fullName?: string | null;
    phone?: string | null;
  } | null;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-5 sm:p-7">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950">
                {request.subject}
              </h1>
              <p className="text-sm text-slate-600">家长需求详情</p>
            </div>
          </header>

          <div className="p-5 sm:p-7">
            <dl>
              <DetailRow label="年级">{request.grade}</DetailRow>
              <DetailRow label="科目">{request.subject}</DetailRow>
              <DetailRow label="服务类型">{request.serviceType}</DetailRow>
              <DetailRow label="地区">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sky-700" />
                  {`${request.city} ${request.area}`}
                </span>
              </DetailRow>
              <DetailRow label="预算">
                <span className="inline-flex items-center gap-2 font-semibold text-slate-950">
                  <Wallet className="h-4 w-4 text-amber-500" />
                  {request.budgetHourly ? `${request.budgetHourly} 元 / 小时` : "待补充"}
                </span>
              </DetailRow>
              <DetailRow label="课时频率">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sky-700" />
                  {request.weeklySessionCount ? `每周 ${request.weeklySessionCount} 次` : "待补充"}
                </span>
              </DetailRow>
              <DetailRow label="希望上课时间">
                {request.preferredTimeSlots.length
                  ? request.preferredTimeSlots.join(" / ")
                  : "暂无"}
              </DetailRow>
              <DetailRow label="时间补充说明">
                {request.preferredTimeNote || "暂无"}
              </DetailRow>
              <DetailRow label="对家教的要求">
                <span className="inline-flex items-start gap-2">
                  <School className="mt-1 h-4 w-4 shrink-0 text-sky-700" />
                  {request.extraNotes || "暂无"}
                </span>
              </DetailRow>
              <DetailRow label="孩子情况说明">{request.studySituation || "暂无"}</DetailRow>
              <DetailRow label="发布时间">
                {request.createdAt ? new Date(request.createdAt).toLocaleString("zh-CN") : "待补充"}
              </DetailRow>
            </dl>

            {viewerRole === "tutor" && tutorId ? (
              <div className="mt-7 border-t border-slate-100 pt-6">
                <MatchActions
                  counterpartProfile={counterpartProfile}
                  existingMatch={existingMatch}
                  requestId={request.id}
                  requestOwnerId={requestOwnerId}
                  tutorId={tutorId}
                  tutorOrderStatus={tutorOrderStatus}
                  tutorReviewStatus={tutorReviewStatus}
                  viewerRole={viewerRole}
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
