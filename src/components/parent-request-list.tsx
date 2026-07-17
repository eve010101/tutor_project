import {
  normalizeParentRequest,
  sortParentRequests,
  type ParentRequestRecord,
  type ParentRequestStatus,
} from "@/lib/parent-request";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ParentRequestListProps {
  requests: ParentRequestRecord[];
  emptyTitle: string;
  emptyDescription: string;
}

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatRequestDate(value?: string | null) {
  if (!value) {
    return "提交后自动生成";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "日期待同步";
  }

  return dateFormatter.format(date);
}

function getStatusMeta(status: ParentRequestStatus) {
  return status === "招募中"
    ? {
        cardClassName: "border-emerald-100",
        badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-700",
      }
    : {
        cardClassName: "border-slate-200 bg-slate-50/80",
        badgeClassName: "border-slate-200 bg-slate-100 text-slate-500",
      };
}

function RequestMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</div>
    </div>
  );
}

export function ParentRequestList({
  requests,
  emptyTitle,
  emptyDescription,
}: ParentRequestListProps) {
  const normalizedRequests = sortParentRequests(requests).map((request) =>
    normalizeParentRequest(request)
  );

  if (!normalizedRequests.length) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/80">
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-slate-600">
          {emptyDescription}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {normalizedRequests.map((request) => {
        const statusMeta = getStatusMeta(request.status);
        const scheduleSummary = request.weeklySessionCount
          ? `每周 ${request.weeklySessionCount} 次 · 每次 ${request.lessonDuration || "待沟通"}`
          : request.lessonDuration
            ? `每次 ${request.lessonDuration}`
            : "课时安排待沟通";
        const budgetSummary = request.budgetHourly
          ? `¥${request.budgetHourly} / 小时`
          : "预算待沟通";
        const timeSummary = request.preferredTimeSlots.length
          ? `${request.preferredTimeSlots.length} 个可上课时段`
          : "上课时间待沟通";

        return (
          <Card
            className={cn("overflow-hidden", statusMeta.cardClassName)}
            key={request.id}
          >
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                      需求 #{request.id}
                    </span>
                    <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs text-sky-700">
                      {request.serviceType}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        statusMeta.badgeClassName
                      )}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {request.subject}
                    </h2>
                    <p className="text-sm leading-6 text-slate-600">
                      {request.grade} · {request.city} {request.area}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right">
                  <div className="text-xs font-medium tracking-wide text-slate-500">
                    发布日期
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-900">
                    {formatRequestDate(request.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <RequestMeta label="上课区域" value={`${request.city} ${request.area}`} />
                <RequestMeta label="预算" value={budgetSummary} />
                <RequestMeta label="课时安排" value={scheduleSummary} />
                <RequestMeta label="时间偏好" value={timeSummary} />
              </div>

              {request.studySituation ? (
                <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50/80 p-4">
                  <div className="text-sm font-medium text-amber-900">孩子学习情况</div>
                  <p className="mt-2 text-sm leading-7 text-amber-900/90">
                    {request.studySituation}
                  </p>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                <div className="text-sm font-medium text-slate-900">希望上课时间</div>
                <div className="flex flex-wrap gap-2">
                  {(request.preferredTimeSlots.length
                    ? request.preferredTimeSlots
                    : ["时间待沟通"]
                  ).map((timeSlot) => (
                    <span
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
                      key={timeSlot}
                    >
                      {timeSlot}
                    </span>
                  ))}
                </div>
              </div>

              {request.extraNotes ? (
                <div className="mt-5 space-y-2">
                  <div className="text-sm font-medium text-slate-900">补充说明</div>
                  <p className="text-sm leading-7 text-slate-600">{request.extraNotes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
