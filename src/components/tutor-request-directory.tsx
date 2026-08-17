"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";

import {
  PARENT_REQUEST_AREA_OPTIONS,
  PARENT_REQUEST_GRADE_OPTIONS,
  PARENT_REQUEST_SERVICE_TYPE_OPTIONS,
  PARENT_REQUEST_STATUS_OPTIONS,
  PARENT_REQUEST_SUBJECT_OPTIONS,
  normalizeParentRequest,
  normalizeParentRequestStatus,
  type ParentRequestRecord,
} from "@/lib/parent-request";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getCompleteErrorDetails, logSupabaseQuery } from "@/lib/supabase/query-log";
import { fetchSupabaseWithFallback } from "@/lib/supabase/query-with-fallback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParentRequestList } from "@/components/parent-request-list";
import { RegistrationOnboardingBanner } from "@/components/registration-onboarding-banner";

const parentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, preferred_time_note, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;
const legacyParentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;

type Filters = {
  subject: string;
  grade: string;
  service: string;
  area: string;
  budget: string;
  status: string;
};

const initialFilters: Filters = {
  subject: "",
  grade: "",
  service: "",
  area: "",
  budget: "",
  status: "",
};

const budgetOptions = [
  { label: "200元以内", value: "0-199" },
  { label: "200-300元", value: "200-300" },
  { label: "300-500元", value: "301-500" },
  { label: "500元以上", value: "501-999999" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "未知错误");
  }
  return String(error);
}

function matchesBudget(budgetHourly: number | null, range: string) {
  if (!range) return true;
  if (budgetHourly == null) return false;

  const [min, max] = range.split("-").map(Number);
  return budgetHourly >= min && budgetHourly <= max;
}

function requestMatches(record: ParentRequestRecord, filters: Filters, keyword: string) {
  const request = normalizeParentRequest(record);
  const normalizedKeyword = keyword.trim().toLowerCase();
  const searchText = [
    request.subject,
    request.serviceType,
    request.grade,
    request.city,
    request.area,
    request.studySituation,
    request.preferredTimeNote,
    request.lessonDuration,
    request.extraNotes,
    request.status,
    ...(request.preferredTimeSlots ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (!normalizedKeyword || searchText.includes(normalizedKeyword)) &&
    (!filters.subject || request.subject === filters.subject) &&
    (!filters.grade || request.grade === filters.grade) &&
    (!filters.service || request.serviceType === filters.service) &&
    (!filters.area || request.area === filters.area) &&
    (!filters.status || request.status === filters.status) &&
    matchesBudget(request.budgetHourly, filters.budget)
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly (string | { label: string; value: string })[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block min-w-[130px] flex-1">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      >
        <option value="">不限</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { label: option, value: option } : option;

          return (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export function TutorRequestDirectory() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [requests, setRequests] = useState<ParentRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const updateFilter = (key: keyof Filters) => (value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const filteredRequests = useMemo(
    () => requests.filter((request) => requestMatches(request, filters, keyword)),
    [requests, filters, keyword]
  );

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
            console.log("需求列表错误", JSON.stringify(error, null, 2)),
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
          console.log("需求列表错误", JSON.stringify(requestError, null, 2));
          throw requestError;
        }

        if (active) setRequests((requestData ?? []) as ParentRequestRecord[]);
      } catch (error) {
        const completeError = getCompleteErrorDetails(error);
        const message = getErrorMessage(error);

        console.log("需求列表错误", JSON.stringify(error, null, 2));
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
  const hasSearchOrFilters = Boolean(keyword.trim()) || activeFilterCount > 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#fffef7_0%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <RegistrationOnboardingBanner role="tutor" />
        <section className="rounded-[32px] border border-amber-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-amber-700">家长需求列表</p>
          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                查看最新家教需求
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                这里展示家长已发布的需求，不展示联系方式。你可以先按科目、区域、预算和时间判断是否匹配。
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-amber-800">
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
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索关键词，如“海淀数学”"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
            {keyword ? (
              <button
                onClick={() => setKeyword("")}
                aria-label="清空搜索"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
            <SlidersHorizontal className="h-4 w-4" />
            筛选条件
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SelectFilter
              label="科目"
              value={filters.subject}
              options={PARENT_REQUEST_SUBJECT_OPTIONS}
              onChange={updateFilter("subject")}
            />
            <SelectFilter
              label="孩子年级"
              value={filters.grade}
              options={PARENT_REQUEST_GRADE_OPTIONS}
              onChange={updateFilter("grade")}
            />
            <SelectFilter
              label="服务类型"
              value={filters.service}
              options={PARENT_REQUEST_SERVICE_TYPE_OPTIONS}
              onChange={updateFilter("service")}
            />
            <SelectFilter
              label="所在区域"
              value={filters.area}
              options={PARENT_REQUEST_AREA_OPTIONS}
              onChange={updateFilter("area")}
            />
            <SelectFilter
              label="预算区间"
              value={filters.budget}
              options={budgetOptions}
              onChange={updateFilter("budget")}
            />
            <SelectFilter
              label="需求状态"
              value={filters.status}
              options={PARENT_REQUEST_STATUS_OPTIONS}
              onChange={updateFilter("status")}
            />
          </div>

          {hasSearchOrFilters ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                已找到 <b className="text-slate-900">{filteredRequests.length}</b> 条需求
              </span>
              <button
                onClick={() => {
                  setFilters(initialFilters);
                  setKeyword("");
                }}
                className="text-sky-700 hover:text-sky-900"
                type="button"
              >
                清空筛选
              </button>
            </div>
          ) : null}
        </section>

        {loading ? (
          <Card className="border-slate-200 bg-white/80">
            <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              正在读取需求列表...
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader>
              <CardTitle>需求列表暂时无法读取</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-7 text-red-700">
              <p>{errorMessage}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                <RefreshCw className="h-4 w-4" />
                重新读取
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ParentRequestList
            emptyDescription={
              requests.length
                ? "当前没有匹配筛选条件的需求，试试清空关键词或放宽筛选条件。"
                : "暂时还没有家长发布需求，或需求已经全部结束招募。"
            }
            emptyTitle={requests.length ? "暂时没有符合条件的需求" : "暂时没有可查看的需求"}
            requests={filteredRequests}
          />
        )}
      </div>
    </main>
  );
}
