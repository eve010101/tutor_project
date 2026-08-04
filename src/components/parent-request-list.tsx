import Link from "next/link";

import { normalizeParentRequest, sortParentRequests, type ParentRequestRecord } from "@/lib/parent-request";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ParentRequestListProps {
  requests: ParentRequestRecord[];
  emptyTitle: string;
  emptyDescription: string;
}

function RequestMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-medium tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium leading-6 text-slate-900">{value}</div>
    </div>
  );
}

export function ParentRequestList({ requests, emptyTitle, emptyDescription }: ParentRequestListProps) {
  const normalizedRequests = sortParentRequests(requests).map((request) => normalizeParentRequest(request));

  if (!normalizedRequests.length) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/80">
        <CardHeader>
          <CardTitle>{emptyTitle}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-slate-600">{emptyDescription}</CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {normalizedRequests.map((request) => {
        const budgetSummary = request.budgetHourly ? `¥${request.budgetHourly} / 小时` : "预算待补充";

        return (
          <Link className="block" href={`/parent/request/${request.id}`} key={request.id}>
            <Card className="overflow-hidden transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{request.subject}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <RequestMeta label="年级" value={request.grade} />
                <RequestMeta label="科目" value={request.subject} />
                <RequestMeta label="地区" value={`${request.city} ${request.area}`} />
                <RequestMeta label="预算" value={budgetSummary} />
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </section>
  );
}
