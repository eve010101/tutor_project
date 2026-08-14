"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";

import {
  normalizeParentRequestStatus,
  type ParentRequestRecord,
} from "@/lib/parent-request";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCompleteErrorDetails, logSupabaseQuery } from "@/lib/supabase/query-log";
import { fetchSupabaseWithFallback } from "@/lib/supabase/query-with-fallback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParentRequestList } from "@/components/parent-request-list";

const parentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, preferred_time_note, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;
const legacyParentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "未知错误");
  }
  return String(error);
}

export function TutorRequestDirectory() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [requests, setRequests] = useState<ParentRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      setLoading(true);
      setErrorMessage("");

      try {
        const sessionResult = await supabase.auth.getSession();
        logSupabaseQuery("browser auth session for parent requests", sessionResult);

        if (sessionResult.error) throw sessionResult.error;
        if (!sessionResult.data.session) {
          throw new Error("登录状态已失效，请重新登录后再查看需求列表。");
        }

        const { data: requestData, error: requestError } = await fetchSupabaseWithFallback({
          primaryLabel: "parent request list (browser)",
          fallbackLabel: "parent request list legacy fallback (browser)",
          missingField: "preferred_time_note",
          onMissingFieldError: (error) =>
            console.log("需求列表错误:", JSON.stringify(error, null, 2)),
          primary: () =>
            supabase
              .from("parent_requests")
              .select(parentRequestSelect)
              .order("created_at", { ascending: false }),
          fallback: () =>
            supabase
              .from("parent_requests")
              .select(legacyParentRequestSelect)
              .order("created_at", { ascending: false }),
        });

        if (requestError) {
          console.log("需求列表错误:", JSON.stringify(requestError, null, 2));
          throw requestError;
        }

        if (active) setRequests((requestData ?? []) as ParentRequestRecord[]);
      } catch (error) {
        const completeError = getCompleteErrorDetails(error);
        const message = getErrorMessage(error);

        console.log("需求列表错误:", JSON.stringify(error, null, 2));
        console.log(
          `[Supabase] parent request browser fetch exception: ${JSON.stringify(completeError)}`
        );

        if (active) {
          setRequests([]);
          setErrorMessage(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRequests();
    return () => {
      active = false;
    };
  }, [reloadKey, supabase]);

  const recruitingCount = requests.filter(
    (request) => normalizeParentRequestStatus(request.status) === "招募中"
  ).length;
  const closedCount = requests.length - recruitingCount;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#fffef7_0%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[32px] border border-amber-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-amber-700">家长需求列表</p>
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">查看最新家教需求</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">这里展示家长已发布的需求，不展示联系方式。你可以先按科目、区域、预算和时间判断是否匹配。</p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-amber-800">共 {requests.length} 条</span>
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-emerald-700">招募中 {recruitingCount} 条</span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-slate-600">已找到 {closedCount} 条</span>
              </div>
            </div>

            <Button asChild variant="outline">
              <Link href="/tutor/profile">返回资料页<ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        {loading ? (
          <Card className="border-slate-200 bg-white/80">
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />正在读取需求列表...
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader><CardTitle>需求列表暂时无法读取</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-red-700">
              <p>{errorMessage}</p>
              <Button type="button" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
                <RefreshCw className="h-4 w-4" />重新读取
              </Button>
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
