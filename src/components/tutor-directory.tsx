"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpen,
  MapPin,
  Search,
  SlidersHorizontal,
  Wallet,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type TutorCard = {
  user_id: string;
  display_name: string;
  gender?: string | null;
  school?: string | null;
  department?: string | null;
  academic_stage?: string | null;
  gaokao_origin?: string | null;
  subjects?: string[] | null;
  service_types?: string[] | null;
  grade_ranges?: string[] | null;
  service_areas?: string[] | null;
  hourly_rate?: number | null;
  available_time_slots?: string[] | null;
  available_time_note?: string | null;
  weekly_capacity?: number | null;
  tagline?: string | null;
  intro?: string | null;
  order_status?: string | null;
};

type Filters = {
  subject: string;
  grade: string;
  gender: string;
  price: string;
  area: string;
  service: string;
};

const initialFilters: Filters = {
  subject: "",
  grade: "",
  gender: "",
  price: "",
  area: "",
  service: "",
};

const priceOptions = [
  { label: "200元以下", value: "0-199" },
  { label: "200-300元", value: "200-300" },
  { label: "300-500元", value: "301-500" },
  { label: "500元以上", value: "501-999999" },
];

function uniqueValues(tutors: TutorCard[], key: "subjects" | "grade_ranges" | "service_areas" | "service_types") {
  return Array.from(new Set(tutors.flatMap((tutor) => tutor[key] ?? [])));
}

function hasValue(values: string[] | null | undefined, value: string) {
  return !value || Boolean(values?.includes(value));
}

function tutorMatches(tutor: TutorCard, filters: Filters, keyword: string) {
  const [min, max] = filters.price ? filters.price.split("-").map(Number) : [0, Infinity];
  const searchText = [
    tutor.display_name,
    tutor.school,
    tutor.department,
    tutor.academic_stage,
    tutor.tagline,
    tutor.intro,
    ...(tutor.subjects ?? []),
    ...(tutor.grade_ranges ?? []),
    ...(tutor.service_types ?? []),
    ...(tutor.service_areas ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    (!keyword || searchText.includes(keyword.toLowerCase())) &&
    hasValue(tutor.subjects, filters.subject) &&
    hasValue(tutor.grade_ranges, filters.grade) &&
    (!filters.gender || tutor.gender === filters.gender) &&
    (!filters.price || (tutor.hourly_rate != null && tutor.hourly_rate >= min && tutor.hourly_rate <= max)) &&
    hasValue(tutor.service_areas, filters.area) &&
    hasValue(tutor.service_types, filters.service)
  );
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[] | { label: string; value: string }[]; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-[130px] flex-1">
      <span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100">
        <option value="">不限</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { label: option, value: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </label>
  );
}

function TutorTile({ tutor, compact = false }: { tutor: TutorCard; compact?: boolean }) {
  return (
    <Link
      aria-label={`查看${tutor.display_name}的详细资料`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 rounded-2xl"
      href={`/tutors/${tutor.user_id}`}
    >
    <article className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", compact && "p-4")}>
      <div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-900">{tutor.display_name}</h2>
            {tutor.gender ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{tutor.gender}</span> : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" />平台认证</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{[tutor.school, tutor.academic_stage].filter(Boolean).join(" · ") || "认证家教"}</p>
          {!compact && tutor.tagline ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">“{tutor.tagline}”</p> : null}
        </div>
      </div>
      <div className="mt-4 grid gap-2.5 text-sm text-slate-600 sm:grid-cols-2">
        <p className="flex gap-2"><BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><span><b className="font-medium text-slate-800">科目：</b>{tutor.subjects?.join(" / ") || "待补充"}</span></p>
        <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /><span><b className="font-medium text-slate-800">范围：</b>{tutor.grade_ranges?.join(" / ") || "待沟通"}</span></p>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-1.5">{(tutor.service_types ?? []).map((type) => <span key={type} className="rounded-lg bg-sky-50 px-2 py-1 text-xs text-sky-700">{type}</span>)}</div>
        <span className="inline-flex items-center gap-1 font-semibold text-slate-900"><Wallet className="h-4 w-4 text-amber-500" />{tutor.hourly_rate ? `${tutor.hourly_rate}元/小时` : "面议"}</span>
      </div>
    </article>
    </Link>
  );
}

export function TutorDirectory({ tutors, loadError }: { tutors: TutorCard[]; loadError?: string }) {
  const [keyword, setKeyword] = useState("");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const updateFilter = (key: keyof Filters) => (value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const results = useMemo(() => tutors.filter((tutor) => tutorMatches(tutor, filters, keyword)), [tutors, filters, keyword]);
  const suggestions = useMemo(() => tutors.filter((tutor) => !results.includes(tutor)).sort((a, b) => {
    const score = (tutor: TutorCard) => Number(hasValue(tutor.subjects, filters.subject)) + Number(hasValue(tutor.grade_ranges, filters.grade)) + Number(hasValue(tutor.service_areas, filters.area));
    return score(b) - score(a);
  }).slice(0, 3), [tutors, results, filters]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-medium text-sky-700">家长找家教</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">找到适合孩子的老师</h1><p className="mt-2 text-sm text-slate-500">全部老师均已完成平台认证</p></div>
          <p className="text-sm text-slate-500">共 <span className="font-semibold text-slate-900">{tutors.length}</span> 位认证家教</p>
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="relative"><Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={'搜索关键词，如“北大数学”'} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-10 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-100" />{keyword ? <button onClick={() => setKeyword("")} aria-label="清空搜索" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button> : null}</div>
          <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700"><SlidersHorizontal className="h-4 w-4" />筛选条件</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><SelectFilter label="科目" value={filters.subject} options={uniqueValues(tutors, "subjects")} onChange={updateFilter("subject")} /><SelectFilter label="年级段" value={filters.grade} options={uniqueValues(tutors, "grade_ranges")} onChange={updateFilter("grade")} /><SelectFilter label="性别" value={filters.gender} options={["男", "女"]} onChange={updateFilter("gender")} /><SelectFilter label="价格区间" value={filters.price} options={priceOptions} onChange={updateFilter("price")} /><SelectFilter label="所在区域" value={filters.area} options={uniqueValues(tutors, "service_areas")} onChange={updateFilter("area")} /><SelectFilter label="服务类型" value={filters.service} options={uniqueValues(tutors, "service_types")} onChange={updateFilter("service")} /></div>
          {(activeFilterCount || keyword) ? <div className="mt-4 flex items-center justify-between text-sm"><span className="text-slate-500">已找到 <b className="text-slate-900">{results.length}</b> 位老师</span><button onClick={() => { setFilters(initialFilters); setKeyword(""); }} className="text-sky-700 hover:text-sky-900">清空筛选</button></div> : null}
        </section>
        {loadError ? <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-8"><h2 className="font-semibold text-red-900">家教列表读取失败</h2><p className="mt-2 text-sm leading-6 text-red-700">{loadError}</p><p className="mt-2 text-xs text-red-600">请确认登录状态和 Supabase RLS 策略后刷新页面。</p></section> : results.length ? <section className="mt-6 grid gap-4 lg:grid-cols-2">{results.map((tutor) => <TutorTile key={tutor.user_id} tutor={tutor} />)}</section> : <section className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"><Search className="h-6 w-6" /></div><h2 className="mt-4 text-lg font-semibold text-slate-900">暂时没有符合条件的家教，试试放宽筛选条件</h2><button onClick={() => { setFilters(initialFilters); setKeyword(""); }} className="mt-3 text-sm font-medium text-sky-700 hover:text-sky-900">查看全部家教</button>{suggestions.length ? <div className="mx-auto mt-8 max-w-4xl border-t border-slate-100 pt-7 text-left"><h3 className="text-base font-semibold text-slate-900">相近的老师推荐</h3><div className="mt-4 grid gap-4 md:grid-cols-3">{suggestions.map((tutor) => <TutorTile key={tutor.user_id} tutor={tutor} compact />)}</div></div> : null}</section>}
      </div>
    </main>
  );
}
