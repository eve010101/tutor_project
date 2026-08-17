"use client";

import { type FormEvent, useMemo, useState } from "react";
import { Check, CheckCircle2, Loader2 } from "lucide-react";

import {
  PARENT_REQUEST_AREA_OPTIONS,
  PARENT_REQUEST_GRADE_OPTIONS,
  PARENT_REQUEST_LESSON_DURATION_OPTIONS,
  PARENT_REQUEST_SERVICE_TYPE_OPTIONS,
  PARENT_REQUEST_STATUS_OPTIONS,
  PARENT_REQUEST_SUBJECT_OPTIONS,
  PARENT_REQUEST_TIME_GROUPS,
  type ParentRequestStatus,
} from "@/lib/parent-request";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ParentRequestFormProps {
  city?: string | null;
}

type ParentRequestFormState = {
  subjects: string[];
  serviceTypes: string[];
  grades: string[];
  area: string;
  budgetHourly: string;
  studySituation: string;
  preferredTimeSlots: string[];
  preferredTimeNote: string;
  weeklySessionCount: string;
  lessonDuration: string;
  extraNotes: string;
  status: ParentRequestStatus;
};

type SaveMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

const DEFAULT_FORM: ParentRequestFormState = {
  subjects: [],
  serviceTypes: ["课后辅导"],
  grades: [],
  area: "",
  budgetHourly: "",
  studySituation: "",
  preferredTimeSlots: [],
  preferredTimeNote: "",
  weeklySessionCount: "",
  lessonDuration: "1.5小时",
  extraNotes: "",
  status: "招募中",
};

function SelectionButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border",
          active ? "border-white/30 bg-white/15" : "border-slate-200 bg-slate-100"
        )}
      >
        {active ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

export function ParentRequestForm({ city }: ParentRequestFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const [form, setForm] = useState<ParentRequestFormState>(DEFAULT_FORM);
  const resolvedCity = city?.trim() || "北京";

  function setField<K extends keyof ParentRequestFormState>(
    key: K,
    value: ParentRequestFormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleTimeSlot(value: string) {
    setForm((current) => ({
      ...current,
      preferredTimeSlots: current.preferredTimeSlots.includes(value)
        ? current.preferredTimeSlots.filter((item) => item !== value)
        : [...current.preferredTimeSlots, value],
    }));
  }

  function toggleMultiValue(key: "subjects" | "serviceTypes" | "grades", value: string) {
    setForm((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      return {
        ...current,
        [key]: nextValues,
      };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage({ type: "error", text: "登录状态已失效，请重新登录后再试。" });
      setSaving(false);
      return;
    }

    const budgetHourly = Number(form.budgetHourly);
    const weeklySessionCount = Number(form.weeklySessionCount);
    const studySituation = form.studySituation.trim();
    const preferredTimeNote = form.preferredTimeNote.trim();
    const extraNotes = form.extraNotes.trim();

    if (!form.subjects.length) {
      setMessage({ type: "error", text: "请至少选择一个科目。" });
      setSaving(false);
      return;
    }

    if (!form.serviceTypes.length) {
      setMessage({ type: "error", text: "请至少选择一种服务类型。" });
      setSaving(false);
      return;
    }

    if (!form.grades.length) {
      setMessage({ type: "error", text: "请至少选择一个孩子年级。" });
      setSaving(false);
      return;
    }

    if (!form.area) {
      setMessage({ type: "error", text: "请选择所在区域。" });
      setSaving(false);
      return;
    }

    if (!Number.isFinite(budgetHourly) || budgetHourly <= 0) {
      setMessage({ type: "error", text: "请填写正确的每小时预算。" });
      setSaving(false);
      return;
    }

    if (!studySituation) {
      setMessage({
        type: "error",
        text: "请填写孩子当前分数和希望提升到的目标分数。",
      });
      setSaving(false);
      return;
    }

    if (!form.preferredTimeSlots.length) {
      setMessage({ type: "error", text: "请至少选择一个希望上课时间段。" });
      setSaving(false);
      return;
    }

    if (!Number.isFinite(weeklySessionCount) || weeklySessionCount <= 0) {
      setMessage({ type: "error", text: "请填写每周课时次数。" });
      setSaving(false);
      return;
    }

    if (!form.lessonDuration) {
      setMessage({ type: "error", text: "请选择每次课时长。" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("parent_requests").insert({
      user_id: user.id,
      subject: form.subjects.join(" / "),
      service_type: form.serviceTypes.join(" / "),
      grade: form.grades.join(" / "),
      city: resolvedCity,
      area: form.area,
      budget_hourly: budgetHourly,
      budget_min: budgetHourly,
      budget_max: budgetHourly,
      study_situation: studySituation,
      preferred_time_slots: form.preferredTimeSlots,
      preferred_time: form.preferredTimeSlots.join(" / "),
      preferred_time_note: preferredTimeNote || null,
      weekly_session_count: weeklySessionCount,
      lesson_duration: form.lessonDuration,
      extra_notes: extraNotes || null,
      notes: extraNotes || null,
      status: form.status,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setSaving(false);
      return;
    }

    setForm(DEFAULT_FORM);
    setMessage({
      type: "success",
      text: "需求已发布，发布日期会自动记录到需求列表中。",
    });
    setSaving(false);
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>发布家教需求</CardTitle>
        <CardDescription>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">基础信息</h2>
              <p className="text-sm text-slate-500">
                先明确科目、服务类型、年级和区域，后续列表页会按照这些字段展示。
              </p>
            </div>

            <div className="space-y-3">
              <Label>科目</Label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PARENT_REQUEST_SUBJECT_OPTIONS.map((option) => (
                  <SelectionButton
                    active={form.subjects.includes(option)}
                    key={option}
                    label={option}
                    onClick={() => toggleMultiValue("subjects", option)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>服务类型</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {PARENT_REQUEST_SERVICE_TYPE_OPTIONS.map((option) => (
                  <SelectionButton
                    active={form.serviceTypes.includes(option)}
                    key={option}
                    label={option}
                    onClick={() => toggleMultiValue("serviceTypes", option)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>孩子年级</Label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {PARENT_REQUEST_GRADE_OPTIONS.map((option) => (
                  <SelectionButton
                    active={form.grades.includes(option)}
                    key={option}
                    label={option}
                    onClick={() => toggleMultiValue("grades", option)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-slate-500">上课城市</div>
                  <div className="text-3xl font-semibold tracking-tight text-slate-950">
                    {resolvedCity}
                  </div>
                  <p className="text-sm leading-6 text-slate-600">
                    当前需求列表按北京各区匹配，下方所在区域请选择具体城区。
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Label>所在区域</Label>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {PARENT_REQUEST_AREA_OPTIONS.map((option) => (
                    <SelectionButton
                      active={form.area === option}
                      key={option}
                      label={option}
                      onClick={() => setField("area", option)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="preferred-time-note">补充说明（可选）</Label>
              <Textarea
                id="preferred-time-note"
                placeholder="每周三晚上7-9点，周末下午均可"
                rows={3}
                value={form.preferredTimeNote}
                onChange={(event) => setField("preferredTimeNote", event.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget-hourly">预算（元 / 小时）</Label>
                <Input
                  id="budget-hourly"
                  min="1"
                  placeholder="例如：200"
                  type="number"
                  value={form.budgetHourly}
                  onChange={(event) => setField("budgetHourly", event.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label>需求状态</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PARENT_REQUEST_STATUS_OPTIONS.map((option) => (
                    <SelectionButton
                      active={form.status === option}
                      key={option}
                      label={option}
                      onClick={() => setField("status", option)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">上课安排</h2>
              <p className="text-sm text-slate-500">
              </p>
            </div>

            <div className="space-y-4">
              <Label>希望上课时间</Label>
              <div className="grid gap-4 lg:grid-cols-2">
                {PARENT_REQUEST_TIME_GROUPS.map((group) => (
                  <div
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    key={group.label}
                  >
                    <div className="mb-3 text-sm font-medium text-slate-700">
                      {group.label}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {group.options.map((option) => (
                        <SelectionButton
                          active={form.preferredTimeSlots.includes(option)}
                          key={option}
                          label={option.replace(
                            group.label === "周一至周五" ? "工作日" : "周末",
                            ""
                          )}
                          onClick={() => toggleTimeSlot(option)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weekly-session-count">每周课时次数</Label>
                <Input
                  id="weekly-session-count"
                  min="1"
                  placeholder="例如：2"
                  type="number"
                  value={form.weeklySessionCount}
                  onChange={(event) =>
                    setField("weeklySessionCount", event.target.value)
                  }
                />
              </div>

              <div className="space-y-3">
                <Label>每次课时长</Label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {PARENT_REQUEST_LESSON_DURATION_OPTIONS.map((option) => (
                    <SelectionButton
                      active={form.lessonDuration === option}
                      key={option}
                      label={option}
                      onClick={() => setField("lessonDuration", option)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">学习情况与补充说明</h2>
              <p className="text-sm text-slate-500">
                建议写清楚当前成绩、目标分数、薄弱点和偏好，方便家教快速判断哦~
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="study-situation">
                孩子学习情况（现在大约多少分，希望提高到多少分）
              </Label>
              <Textarea
                id="study-situation"
                placeholder="例如：数学目前 78 分，希望 2 个月内稳定到 90 分以上，函数和几何是薄弱项。"
                rows={4}
                value={form.studySituation}
                onChange={(event) => setField("studySituation", event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="extra-notes">补充说明</Label>
              <Textarea
                id="extra-notes"
                placeholder="例如：希望老师有耐心，能布置课后练习；若合适可长期合作。"
                rows={5}
                value={form.extraNotes}
                onChange={(event) => setField("extraNotes", event.target.value)}
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-medium text-slate-500">发布日期</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                需求提交成功后会自动生成发布日期，并展示在需求列表页中。
              </p>
            </div>
          </section>

          <Button className="w-full" disabled={saving} type="submit">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            发布需求
          </Button>

          {message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              )}
            >
              {message.text}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
