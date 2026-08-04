"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Lock, RefreshCcw } from "lucide-react";

import type { ParentRequestRecord } from "@/lib/parent-request";
import { normalizeParentRequest, normalizeParentRequestStatus } from "@/lib/parent-request";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ParentRequestManagerProps {
  requests: ParentRequestRecord[];
}

export function ParentRequestManager({ requests }: ParentRequestManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState(requests);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<string>("");

  async function updateStatus(requestId: number, status: "招聘中" | "已找到") {
    setBusyId(requestId);
    setMessage("");

    const { error } = await supabase.from("parent_requests").update({ status }).eq("id", requestId);

    if (error) {
      setMessage(error.message);
      setBusyId(null);
      return;
    }

    setItems((current) =>
      current.map((item) => (item.id === requestId ? { ...item, status } : item))
    );
    setMessage(status === "已找到" ? "需求帖已标记为已找到。" : "需求帖已重新开放。");
    setBusyId(null);
  }

  if (!items.length) {
    return (
      <Card className="border-dashed border-slate-300 bg-white/80">
        <CardHeader>
          <CardTitle>我发布的需求帖</CardTitle>
          <CardDescription>你还没有发布需求，可以先新建一条家教需求。</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/parent/request">
              发布新需求
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>我发布的需求帖</CardTitle>
        <CardDescription>可以在这里查看需求概览，并手动关闭或重新开放需求帖。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((record) => {
          const request = normalizeParentRequest(record);
          const status = normalizeParentRequestStatus(record.status);
          const busy = busyId === record.id;

          return (
            <div
              className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5"
              key={record.id}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-950">
                      {request.subject} / {request.grade}
                    </h3>
                    <span
                      className={
                        status === "招募中"
                          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700"
                          : "rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                      }
                    >
                      {status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                    <span>{request.city} {request.area}</span>
                    <span>{request.budgetHourly ? `¥${request.budgetHourly}/小时` : "预算待补充"}</span>
                    <span>
                      {request.createdAt
                        ? `发布于 ${new Date(request.createdAt).toLocaleDateString("zh-CN")}`
                        : "发布时间待补充"}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    {request.studySituation || request.extraNotes || "暂无补充说明"}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                  {status === "招募中" ? (
                    <Button
                      className="w-full lg:w-36"
                      disabled={busy}
                      variant="outline"
                      onClick={() => updateStatus(record.id, "已找到")}
                    >
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      标记已找到
                    </Button>
                  ) : (
                    <Button
                      className="w-full lg:w-36"
                      disabled={busy}
                      variant="outline"
                      onClick={() => updateStatus(record.id, "招聘中")}
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="h-4 w-4" />
                      )}
                      重新开放
                    </Button>
                  )}

                  <Button asChild className="w-full lg:w-36" variant="ghost">
                    <Link href={`/parent/request/${record.id}`}>
                      查看详情
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {message ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
