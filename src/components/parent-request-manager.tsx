"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Lock, PencilLine, X } from "lucide-react";

import {
  PARENT_REQUEST_AREA_OPTIONS,
  PARENT_REQUEST_GRADE_OPTIONS,
  PARENT_REQUEST_LESSON_DURATION_OPTIONS,
  PARENT_REQUEST_SERVICE_TYPE_OPTIONS,
  PARENT_REQUEST_SUBJECT_OPTIONS,
  PARENT_REQUEST_TIME_GROUPS,
  normalizeParentRequest,
  normalizeParentRequestStatus,
  sortParentRequests,
  type ParentRequestRecord,
} from "@/lib/parent-request";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ParentRequestManagerProps {
  requests: ParentRequestRecord[];
}

type RequestDraft = {
  subject: string;
  serviceType: string;
  grade: string;
  city: string;
  area: string;
  budgetHourly: string;
  studySituation: string;
  preferredTimeSlots: string[];
  preferredTimeNote: string;
  weeklySessionCount: string;
  lessonDuration: string;
  extraNotes: string;
};

type SaveMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

const parentRequestSelect =
  "id, subject, service_type, grade, city, area, budget_hourly, budget_min, budget_max, study_situation, preferred_time_slots, preferred_time, preferred_time_note, weekly_session_count, lesson_duration, extra_notes, notes, status, created_at" as const;

function createDraft(record: ParentRequestRecord): RequestDraft {
  const request = normalizeParentRequest(record);

  return {
    subject: request.subject,
    serviceType: request.serviceType,
    grade: request.grade,
    city: request.city,
    area: request.area,
    budgetHourly: request.budgetHourly ? String(request.budgetHourly) : "",
    studySituation: request.studySituation,
    preferredTimeSlots: request.preferredTimeSlots,
    preferredTimeNote: request.preferredTimeNote,
    weeklySessionCount: request.weeklySessionCount ? String(request.weeklySessionCount) : "",
    lessonDuration: request.lessonDuration,
    extraNotes: request.extraNotes,
  };
}

function validateDraft(draft: RequestDraft) {
  const budgetHourly = Number(draft.budgetHourly);
  const weeklySessionCount = Number(draft.weeklySessionCount);

  if (!draft.subject) return "请选择科目。";
  if (!draft.serviceType) return "请选择服务类型。";
  if (!draft.grade) return "请选择孩子年级。";
  if (!draft.area) return "请选择所在区域。";
  if (!Number.isFinite(budgetHourly) || budgetHourly <= 0) return "请填写正确的每小时预算。";
  if (!draft.studySituation.trim()) return "请填写孩子学习情况和目标。";
  if (!draft.preferredTimeSlots.length) return "请至少选择一个希望上课时间段。";
  if (!Number.isFinite(weeklySessionCount) || weeklySessionCount <= 0) return "请填写正确的每周课时次数。";
  if (!draft.lessonDuration) return "请选择每次课时长度。";

  return "";
}

function SelectField({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-slate-400"
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">请选择</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ParentRequestManager({ requests }: ParentRequestManagerProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = useState(() => sortParentRequests(requests));
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RequestDraft | null>(null);
  const [message, setMessage] = useState<SaveMessage>(null);

  function startEditing(record: ParentRequestRecord) {
    setEditingId(record.id);
    setDraft(createDraft(record));
    setMessage(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(null);
    setMessage(null);
  }

  function setDraftField<K extends keyof RequestDraft>(key: K, value: RequestDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function toggleTimeSlot(value: string) {
    setDraft((current) => {
      if (!current) return current;

      const preferredTimeSlots = current.preferredTimeSlots.includes(value)
        ? current.preferredTimeSlots.filter((item) => item !== value)
        : [...current.preferredTimeSlots, value];

      return { ...current, preferredTimeSlots };
    });
  }

  async function getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id ?? null;
  }

  async function markCompleted(requestId: number) {
    setBusyId(requestId);
    setMessage(null);

    const userId = await getCurrentUserId();
    if (!userId) {
      setMessage({ type: "error", text: "登录状态已失效，请重新登录后再试。" });
      setBusyId(null);
      return;
    }

    const { data, error } = await supabase
      .from("parent_requests")
      .update({ status: "已找到" })
      .eq("id", requestId)
      .eq("user_id", userId)
      .select(parentRequestSelect)
      .single();

    if (error) {
      setMessage({ type: "error", text: error.message });
      setBusyId(null);
      return;
    }

    setItems((current) =>
      sortParentRequests(
        current.map((item) => (item.id === requestId ? ((data ?? item) as ParentRequestRecord) : item))
      )
    );
    setMessage({ type: "success", text: "需求帖已标记为已找到/关闭。" });
    setBusyId(null);
  }

  async function saveDraft(event: FormEvent<HTMLFormElement>, requestId: number) {
    event.preventDefault();

    if (!draft) return;

    const validationError = validateDraft(draft);
    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setBusyId(requestId);
    setMessage(null);

    const userId = await getCurrentUserId();
    if (!userId) {
      setMessage({ type: "error", text: "登录状态已失效，请重新登录后再试。" });
      setBusyId(null);
      return;
    }

    const budgetHourly = Number(draft.budgetHourly);
    const weeklySessionCount = Number(draft.weeklySessionCount);
    const preferredTimeNote = draft.preferredTimeNote.trim();
    const extraNotes = draft.extraNotes.trim();

    const { data, error } = await supabase
      .from("parent_requests")
      .update({
        subject: draft.subject,
        service_type: draft.serviceType,
        grade: draft.grade,
        city: draft.city.trim() || "北京",
        area: draft.area,
        budget_hourly: budgetHourly,
        budget_min: budgetHourly,
        budget_max: budgetHourly,
        study_situation: draft.studySituation.trim(),
        preferred_time_slots: draft.preferredTimeSlots,
        preferred_time: draft.preferredTimeSlots.join(" / "),
        preferred_time_note: preferredTimeNote || null,
        weekly_session_count: weeklySessionCount,
        lesson_duration: draft.lessonDuration,
        extra_notes: extraNotes || null,
        notes: extraNotes || null,
      })
      .eq("id", requestId)
      .eq("user_id", userId)
      .select(parentRequestSelect)
      .single();

    if (error) {
      setMessage({ type: "error", text: error.message });
      setBusyId(null);
      return;
    }

    setItems((current) =>
      sortParentRequests(
        current.map((item) => (item.id === requestId ? ((data ?? item) as ParentRequestRecord) : item))
      )
    );
    setEditingId(null);
    setDraft(null);
    setMessage({ type: "success", text: "需求内容已更新。" });
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
        <CardDescription>每条需求都可以直接在当前页面编辑，找到家教后可标记为已完成。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((record) => {
          const request = normalizeParentRequest(record);
          const status = normalizeParentRequestStatus(record.status);
          const busy = busyId === record.id;
          const isEditing = editingId === record.id && draft;

          return (
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5" key={record.id}>
              {isEditing ? (
                <form className="space-y-5" onSubmit={(event) => saveDraft(event, record.id)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">编辑需求内容</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        修改后会直接保存到当前需求帖，不会跳转页面。
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                      {status}
                    </span>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <SelectField id={`subject-${record.id}`} label="科目" options={PARENT_REQUEST_SUBJECT_OPTIONS} value={draft.subject} onChange={(value) => setDraftField("subject", value)} />
                    <SelectField id={`service-type-${record.id}`} label="服务类型" options={PARENT_REQUEST_SERVICE_TYPE_OPTIONS} value={draft.serviceType} onChange={(value) => setDraftField("serviceType", value)} />
                    <SelectField id={`grade-${record.id}`} label="孩子年级" options={PARENT_REQUEST_GRADE_OPTIONS} value={draft.grade} onChange={(value) => setDraftField("grade", value)} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor={`city-${record.id}`}>上课城市</Label>
                      <Input id={`city-${record.id}`} value={draft.city} onChange={(event) => setDraftField("city", event.target.value)} />
                    </div>
                    <SelectField id={`area-${record.id}`} label="所在区域" options={PARENT_REQUEST_AREA_OPTIONS} value={draft.area} onChange={(value) => setDraftField("area", value)} />
                    <div className="space-y-2">
                      <Label htmlFor={`budget-${record.id}`}>预算（元 / 小时）</Label>
                      <Input id={`budget-${record.id}`} min="1" type="number" value={draft.budgetHourly} onChange={(event) => setDraftField("budgetHourly", event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`weekly-count-${record.id}`}>每周课时次数</Label>
                      <Input id={`weekly-count-${record.id}`} min="1" type="number" value={draft.weeklySessionCount} onChange={(event) => setDraftField("weeklySessionCount", event.target.value)} />
                    </div>
                  </div>

                  <SelectField id={`lesson-duration-${record.id}`} label="每次课时长度" options={PARENT_REQUEST_LESSON_DURATION_OPTIONS} value={draft.lessonDuration} onChange={(value) => setDraftField("lessonDuration", value)} />

                  <div className="space-y-3">
                    <Label>希望上课时间</Label>
                    <div className="grid gap-4 lg:grid-cols-2">
                      {PARENT_REQUEST_TIME_GROUPS.map((group) => (
                        <div className="rounded-3xl border border-slate-200 bg-white p-4" key={group.label}>
                          <div className="mb-3 text-sm font-medium text-slate-700">{group.label}</div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {group.options.map((option) => {
                              const active = draft.preferredTimeSlots.includes(option);
                              const shortLabel = option.replace(
                                group.label === "周一至周五" ? "工作日" : "周末",
                                ""
                              );

                              return (
                                <button
                                  className={cn(
                                    "rounded-2xl border px-3 py-2 text-sm transition-colors",
                                    active
                                      ? "border-slate-950 bg-slate-950 text-white"
                                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                                  )}
                                  key={option}
                                  type="button"
                                  onClick={() => toggleTimeSlot(option)}
                                >
                                  {shortLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`preferred-time-note-${record.id}`}>补充说明（可选）</Label>
                    <Textarea
                      id={`preferred-time-note-${record.id}`}
                      placeholder="每周三晚上7-9点，周末下午均可"
                      rows={3}
                      value={draft.preferredTimeNote}
                      onChange={(event) => setDraftField("preferredTimeNote", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`study-${record.id}`}>孩子学习情况和目标</Label>
                    <Textarea id={`study-${record.id}`} rows={4} value={draft.studySituation} onChange={(event) => setDraftField("studySituation", event.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`notes-${record.id}`}>补充说明</Label>
                    <Textarea id={`notes-${record.id}`} rows={4} value={draft.extraNotes} onChange={(event) => setDraftField("extraNotes", event.target.value)} />
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button disabled={busy} type="submit">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      保存修改
                    </Button>
                    <Button disabled={busy} type="button" variant="outline" onClick={cancelEditing}>
                      <X className="h-4 w-4" />
                      取消
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-4">
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
                        <span>{request.serviceType}</span>
                        <span>{request.city} {request.area}</span>
                        <span>{request.budgetHourly ? `¥${request.budgetHourly}/小时` : "预算待补充"}</span>
                        <span>{request.weeklySessionCount ? `每周 ${request.weeklySessionCount} 次` : "课时次数待补充"}</span>
                        <span>{request.lessonDuration || "课时长度待补充"}</span>
                        <span>{request.createdAt ? `发布于 ${new Date(request.createdAt).toLocaleDateString("zh-CN")}` : "发布时间待补充"}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <div className="text-xs font-medium text-slate-500">学习情况和目标</div>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {request.studySituation || "暂无学习情况说明"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3">
                        <div className="text-xs font-medium text-slate-500">上课时间与补充说明</div>
                        <p className="mt-2 text-sm leading-7 text-slate-700">
                          {request.preferredTimeSlots.length
                            ? request.preferredTimeSlots.join(" / ")
                            : "暂无上课时间"}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-slate-700">
                          {request.preferredTimeNote || "暂无时间补充说明"}
                        </p>
                        <p className="mt-1 text-sm leading-7 text-slate-700">
                          {request.extraNotes || "暂无其他补充说明"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                    <Button className="w-full lg:w-36" disabled={busy || editingId !== null} type="button" variant="outline" onClick={() => startEditing(record)}>
                      <PencilLine className="h-4 w-4" />
                      编辑
                    </Button>
                    <Button className="w-full lg:w-36" disabled={busy || status === "已找到"} type="button" variant="outline" onClick={() => markCompleted(record.id)}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      {status === "已找到" ? "已完成" : "已找到/关闭"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {message ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm",
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {message.text}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
