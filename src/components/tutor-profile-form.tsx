"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, CheckCircle2, Loader2, UploadCloud } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  getTutorReviewStatusMeta,
  normalizeTutorReviewStatus,
  type TutorReviewStatus,
} from "@/lib/tutor-review-status";
import {
  BEIJING_DISTRICT_OPTIONS,
  TUTOR_AVAILABLE_TIME_GROUPS,
  TUTOR_AVAILABLE_TIME_OPTIONS,
  TUTOR_GENDER_OPTIONS,
  TUTOR_GRADE_RANGE_OPTIONS,
  TUTOR_ORDER_STATUS_OPTIONS,
  TUTOR_SERVICE_TYPE_OPTIONS,
  TUTOR_SUBJECT_OPTIONS,
} from "@/lib/tutor-profile-options";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface TutorProfileFormProps {
  profile: {
    full_name?: string | null;
    bio?: string | null;
  };
  tutorProfile?: {
    gender?: string | null;
    school?: string | null;
    department?: string | null;
    academic_stage?: string | null;
    gaokao_origin?: string | null;
    subjects?: string[] | null;
    service_types?: string[] | null;
    grade_ranges?: string[] | null;
    grade?: string | null;
    service_areas?: string[] | null;
    service_area?: string | null;
    hourly_rate?: number | null;
    available_time_slots?: string[] | null;
    available_time_note?: string | null;
    intro?: string | null;
    weekly_capacity?: number | null;
    tagline?: string | null;
    order_status?: string | null;
    status?: string | null;
    verification_image_path?: string | null;
    available_days?: string | null;
  } | null;
}

type TutorProfileFormState = {
  fullName: string;
  gender: string;
  school: string;
  department: string;
  academicStage: string;
  gaokaoOrigin: string;
  subjects: string[];
  serviceTypes: string[];
  gradeRanges: string[];
  hourlyRate: string;
  serviceAreas: string[];
  availableTimeSlots: string[];
  availableTimeNote: string;
  weeklyCapacity: string;
  tagline: string;
  intro: string;
  orderStatus: string;
  verificationImagePath: string;
};

type MultiValueField =
  | "subjects"
  | "serviceTypes"
  | "gradeRanges"
  | "serviceAreas"
  | "availableTimeSlots";

type SaveMessage = {
  type: "success" | "error";
  text: string;
} | null;

const MAX_PDF_SIZE = 5 * 1024 * 1024;

function normalizeItems(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function filterByOptions(values: string[], options: readonly string[]) {
  const optionSet = new Set(options);
  return normalizeItems(values).filter((item) => optionSet.has(item));
}

function parseLegacyList(value?: string | null) {
  return normalizeItems((value ?? "").split(/[、，,/\s]+/));
}

function normalizeGradeRanges(
  values?: string[] | null,
  legacyValue?: string | null,
) {
  if (values?.length) {
    return filterByOptions(values, TUTOR_GRADE_RANGE_OPTIONS);
  }

  const nextValues: string[] = [];
  const legacy = legacyValue ?? "";

  if (legacy.includes("小学")) {
    nextValues.push("小学各年级");
  }
  if (legacy.includes("初")) {
    nextValues.push("初一初二初三");
  }
  if (legacy.includes("高")) {
    nextValues.push("高一高二高三");
  }

  return filterByOptions(nextValues, TUTOR_GRADE_RANGE_OPTIONS);
}

function normalizeAvailableTimeSlots(
  values?: string[] | null,
  legacyValue?: string | null,
) {
  if (values?.length) {
    return filterByOptions(values, TUTOR_AVAILABLE_TIME_OPTIONS);
  }

  const nextValues: string[] = [];
  const legacy = legacyValue ?? "";

  if (legacy.includes("工作日")) {
    if (
      !legacy.includes("上午") &&
      !legacy.includes("下午") &&
      !legacy.includes("晚上")
    ) {
      nextValues.push("工作日上午", "工作日下午", "工作日晚上");
    } else {
      if (legacy.includes("工作日上午") || legacy.includes("工作日早")) {
        nextValues.push("工作日上午");
      }
      if (legacy.includes("工作日下午")) {
        nextValues.push("工作日下午");
      }
      if (legacy.includes("工作日晚上") || legacy.includes("工作日晚")) {
        nextValues.push("工作日晚上");
      }
    }
  }

  if (legacy.includes("周末")) {
    if (
      !legacy.includes("上午") &&
      !legacy.includes("下午") &&
      !legacy.includes("晚上")
    ) {
      nextValues.push("周末上午", "周末下午", "周末晚上");
    } else {
      if (legacy.includes("周末上午")) {
        nextValues.push("周末上午");
      }
      if (legacy.includes("周末下午")) {
        nextValues.push("周末下午");
      }
      if (legacy.includes("周末晚上") || legacy.includes("周末晚")) {
        nextValues.push("周末晚上");
      }
    }
  }

  return filterByOptions(nextValues, TUTOR_AVAILABLE_TIME_OPTIONS);
}

function normalizeServiceAreas(
  values?: string[] | null,
  legacyValue?: string | null,
) {
  if (values?.length) {
    return filterByOptions(values, BEIJING_DISTRICT_OPTIONS);
  }

  return filterByOptions(
    parseLegacyList(legacyValue),
    BEIJING_DISTRICT_OPTIONS,
  );
}

function validatePdf(file: File) {
  if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    return "仅支持上传 PDF 文件。";
  }

  if (file.size > MAX_PDF_SIZE) {
    return "PDF 文件大小不能超过 5MB。";
  }

  return null;
}

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
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
      )}
      onClick={onClick}
      type="button"
    >
      <span>{label}</span>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border",
          active
            ? "border-white/30 bg-white/15"
            : "border-slate-200 bg-slate-100",
        )}
      >
        {active ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
    </button>
  );
}

export function TutorProfileForm({
  profile,
  tutorProfile,
}: TutorProfileFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const verificationInputRef = useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const [reviewStatus, setReviewStatus] = useState<TutorReviewStatus>(
    normalizeTutorReviewStatus(tutorProfile?.status),
  );
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [verificationObjectUrl, setVerificationObjectUrl] = useState<
    string | null
  >(null);
  const [verificationSignedUrl, setVerificationSignedUrl] = useState<
    string | null
  >(null);
  const [form, setForm] = useState<TutorProfileFormState>({
    fullName: profile.full_name ?? "",
    gender: tutorProfile?.gender ?? "",
    school: tutorProfile?.school ?? "",
    department: tutorProfile?.department ?? "",
    academicStage: tutorProfile?.academic_stage ?? "",
    gaokaoOrigin: tutorProfile?.gaokao_origin ?? "",
    subjects: filterByOptions(
      tutorProfile?.subjects ?? [],
      TUTOR_SUBJECT_OPTIONS,
    ),
    serviceTypes: filterByOptions(
      tutorProfile?.service_types ?? [],
      TUTOR_SERVICE_TYPE_OPTIONS,
    ),
    gradeRanges: normalizeGradeRanges(
      tutorProfile?.grade_ranges,
      tutorProfile?.grade,
    ),
    hourlyRate: tutorProfile?.hourly_rate
      ? String(tutorProfile.hourly_rate)
      : "",
    serviceAreas: normalizeServiceAreas(
      tutorProfile?.service_areas,
      tutorProfile?.service_area,
    ),
    availableTimeSlots: normalizeAvailableTimeSlots(
      tutorProfile?.available_time_slots,
      tutorProfile?.available_days,
    ),
    availableTimeNote: tutorProfile?.available_time_note ?? "",
    weeklyCapacity: tutorProfile?.weekly_capacity
      ? String(tutorProfile.weekly_capacity)
      : "",
    tagline: tutorProfile?.tagline ?? "",
    intro: tutorProfile?.intro ?? profile.bio ?? "",
    orderStatus: tutorProfile?.order_status ?? "接单中",
    verificationImagePath: tutorProfile?.verification_image_path ?? "",
  });

  useEffect(() => {
    if (!verificationFile) {
      setVerificationObjectUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(verificationFile);
    setVerificationObjectUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [verificationFile]);

  useEffect(() => {
    if (!form.verificationImagePath || verificationFile) {
      setVerificationSignedUrl(null);
      return;
    }

    let cancelled = false;

    async function loadSignedUrl() {
      const { data, error } = await supabase.storage
        .from("tutor-verifications")
        .createSignedUrl(form.verificationImagePath, 60 * 60);

      if (cancelled) {
        return;
      }

      if (error) {
        setVerificationSignedUrl(null);
        return;
      }

      setVerificationSignedUrl(data.signedUrl);
    }

    void loadSignedUrl();

    return () => {
      cancelled = true;
    };
  }, [form.verificationImagePath, supabase, verificationFile]);

  const verificationPreviewUrl = verificationObjectUrl ?? verificationSignedUrl;
  const reviewMeta = getTutorReviewStatusMeta(reviewStatus);

  function setField<K extends keyof TutorProfileFormState>(
    key: K,
    value: TutorProfileFormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function toggleMultiValue(key: MultiValueField, value: string) {
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

  function handleVerificationSelection(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    const validationMessage = validatePdf(nextFile);

    if (validationMessage) {
      setMessage({ type: "error", text: validationMessage });
      event.target.value = "";
      return;
    }

    setMessage(null);
    setVerificationFile(nextFile);
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

    const fullName = form.fullName.trim();
    const school = form.school.trim();
    const department = form.department.trim();
    const academicStage = form.academicStage.trim();
    const gaokaoOrigin = form.gaokaoOrigin.trim();
    const tagline = form.tagline.trim();
    const intro = form.intro.trim();
    const hourlyRate = Number(form.hourlyRate);
    const weeklyCapacity = Number(form.weeklyCapacity);

    if (!fullName) {
      setMessage({ type: "error", text: "请填写姓名。" });
      setSaving(false);
      return;
    }

    if (!form.gender) {
      setMessage({ type: "error", text: "请选择性别。" });
      setSaving(false);
      return;
    }

    if (!school || !department || !academicStage || !gaokaoOrigin) {
      setMessage({
        type: "error",
        text: "请完整填写学校、院系、年级和高考来源地。",
      });
      setSaving(false);
      return;
    }

    if (!form.subjects.length) {
      setMessage({ type: "error", text: "请至少选择一个教授科目。" });
      setSaving(false);
      return;
    }

    if (!form.serviceTypes.length) {
      setMessage({ type: "error", text: "请至少选择一种服务类型。" });
      setSaving(false);
      return;
    }

    if (!form.gradeRanges.length) {
      setMessage({ type: "error", text: "请至少选择一个辅导年级范围。" });
      setSaving(false);
      return;
    }

    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      setMessage({ type: "error", text: "请填写正确的小时收费。" });
      setSaving(false);
      return;
    }

    if (!form.serviceAreas.length) {
      setMessage({ type: "error", text: "请至少选择一个可上课区域。" });
      setSaving(false);
      return;
    }

    if (!form.availableTimeSlots.length) {
      setMessage({ type: "error", text: "请至少选择一个可上课时间段。" });
      setSaving(false);
      return;
    }

    if (!Number.isFinite(weeklyCapacity) || weeklyCapacity <= 0) {
      setMessage({ type: "error", text: "请填写每周可接受课时次数。" });
      setSaving(false);
      return;
    }

    if (!tagline) {
      setMessage({ type: "error", text: "请填写一句话介绍。" });
      setSaving(false);
      return;
    }

    if (!intro) {
      setMessage({ type: "error", text: "请填写完整自我介绍。" });
      setSaving(false);
      return;
    }

    if (!form.orderStatus) {
      setMessage({ type: "error", text: "请选择接单状态。" });
      setSaving(false);
      return;
    }

    if (!form.verificationImagePath && !verificationFile) {
      setMessage({
        type: "error",
        text: "请上传学信网 PDF 文件，供平台审核。",
      });
      setSaving(false);
      return;
    }

    let verificationImagePath = form.verificationImagePath;

    let nextReviewStatus = reviewStatus;

    if (verificationFile) {
      const verificationPath = `${user.id}/verification`;
      const { error: verificationError } = await supabase.storage
        .from("tutor-verifications")
        .upload(verificationPath, verificationFile, {
          upsert: true,
          contentType: verificationFile.type,
        });

      if (verificationError) {
        setMessage({ type: "error", text: verificationError.message });
        setSaving(false);
        return;
      }

      verificationImagePath = verificationPath;
      nextReviewStatus = "pending";
    }

    const [profileResult, tutorResult] = await Promise.all([
      supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio: intro || null,
        })
        .eq("id", user.id),
      supabase.from("tutor_profiles").upsert(
        {
          user_id: user.id,
          gender: form.gender,
          school,
          department,
          academic_stage: academicStage,
          gaokao_origin: gaokaoOrigin,
          subjects: form.subjects,
          service_types: form.serviceTypes,
          grade_ranges: form.gradeRanges,
          grade: form.gradeRanges.join(" / ") || null,
          service_areas: form.serviceAreas,
          service_area: form.serviceAreas.join(" / ") || null,
          hourly_rate: hourlyRate,
          available_time_slots: form.availableTimeSlots,
          available_days: form.availableTimeSlots.join(" / ") || null,
          available_time_note: form.availableTimeNote.trim() || null,
          weekly_capacity: weeklyCapacity,
          tagline,
          intro,
          order_status: form.orderStatus,
          status: nextReviewStatus,
          verification_image_path: verificationImagePath || null,
        },
        { onConflict: "user_id" },
      ),
    ]);

    if (profileResult.error) {
      setMessage({ type: "error", text: profileResult.error.message });
      setSaving(false);
      return;
    }

    if (tutorResult.error) {
      setMessage({ type: "error", text: tutorResult.error.message });
      setSaving(false);
      return;
    }

    setForm((current) => ({
      ...current,
      verificationImagePath,
      fullName,
      school,
      department,
      academicStage,
      gaokaoOrigin,
      tagline,
      intro,
    }));
    setReviewStatus(nextReviewStatus);
    setVerificationFile(null);
    setMessage({
      type: "success",
      text:
        nextReviewStatus === "pending"
          ? "资料已保存，当前状态为待审核，审核通过后会出现在家教列表页。"
          : nextReviewStatus === "approved"
            ? "资料已保存，当前审核状态保持为已通过。"
            : "资料已保存，请根据审核意见调整后重新提交。",
    });
    setSaving(false);
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>家教资料表</CardTitle>
        <CardDescription>
          资料将用于平台审核和后续接单展示。上传学信网 PDF
          文件后，可直接保存在当前账号下。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "mb-6 rounded-[28px] border p-5 sm:p-6",
            reviewMeta.panelClassName,
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-500">审核状态</p>
              <div className="text-2xl font-semibold text-slate-950">
                {reviewMeta.label}
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                {reviewMeta.description}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex w-fit rounded-full px-4 py-2 text-sm font-medium",
                reviewMeta.badgeClassName,
              )}
            >
              {reviewMeta.label}
            </span>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">基础信息</h2>
              <p className="text-sm text-slate-500">
                姓名仅平台可见，不对外展示全名。
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="full-name">姓名</Label>
                  <Input
                    id="full-name"
                    placeholder="请输入真实姓名"
                    value={form.fullName}
                    onChange={(event) =>
                      setField("fullName", event.target.value)
                    }
                  />
                  <p className="text-xs text-slate-500">
                    仅平台留存，不对家长展示全名。
                  </p>
                </div>

                <div className="space-y-3 sm:col-span-2">
                  <Label>性别</Label>
                  <RadioGroup
                    className="grid gap-3 sm:grid-cols-2"
                    onValueChange={(value) => setField("gender", value)}
                    value={form.gender}
                  >
                    {TUTOR_GENDER_OPTIONS.map((option, index) => {
                      const inputId = `gender-${index}`;

                      return (
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                            form.gender === option
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                          )}
                          htmlFor={inputId}
                          key={option}
                        >
                          <RadioGroupItem
                            className={cn(
                              form.gender === option
                                ? "border-white/40 text-white"
                                : "border-slate-300 text-slate-950",
                            )}
                            id={inputId}
                            value={option}
                          />
                          <span className="text-sm font-medium">{option}</span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school">学校</Label>
                  <Input
                    id="school"
                    placeholder="例如：北京大学"
                    value={form.school}
                    onChange={(event) => setField("school", event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">院系</Label>
                  <Input
                    id="department"
                    placeholder="例如：信息科学技术学院"
                    value={form.department}
                    onChange={(event) =>
                      setField("department", event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academic-stage">现在大几 / 研几</Label>
                  <Input
                    id="academic-stage"
                    placeholder="例如：大三 / 研二"
                    value={form.academicStage}
                    onChange={(event) =>
                      setField("academicStage", event.target.value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gaokao-origin">高考来源地</Label>
                  <Input
                    id="gaokao-origin"
                    placeholder="例如：山东省"
                    value={form.gaokaoOrigin}
                    onChange={(event) =>
                      setField("gaokaoOrigin", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">授课设置</h2>
              <p className="text-sm text-slate-500">
                服务类型、授课年级、区域和时间会直接影响后续需求匹配结果。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="available-time-note">补充说明（可选）</Label>
              <Textarea
                id="available-time-note"
                placeholder="每周三晚上7-9点，周末下午均可"
                rows={3}
                value={form.availableTimeNote}
                onChange={(event) =>
                  setField("availableTimeNote", event.target.value)
                }
              />
            </div>

            <div className="space-y-3">
              <Label>教授科目</Label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {TUTOR_SUBJECT_OPTIONS.map((option) => (
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
                {TUTOR_SERVICE_TYPE_OPTIONS.map((option) => (
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
              <Label>辅导年级范围</Label>
              <div className="grid gap-3 md:grid-cols-3">
                {TUTOR_GRADE_RANGE_OPTIONS.map((option) => (
                  <SelectionButton
                    active={form.gradeRanges.includes(option)}
                    key={option}
                    label={option}
                    onClick={() => toggleMultiValue("gradeRanges", option)}
                  />
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hourly-rate">收费（元 / 小时）</Label>
                <Input
                  id="hourly-rate"
                  min="1"
                  placeholder="例如：180"
                  type="number"
                  value={form.hourlyRate}
                  onChange={(event) =>
                    setField("hourlyRate", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly-capacity">每周可接受课时次数</Label>
                <Input
                  id="weekly-capacity"
                  min="1"
                  placeholder="例如：6"
                  type="number"
                  value={form.weeklyCapacity}
                  onChange={(event) =>
                    setField("weeklyCapacity", event.target.value)
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>可上课区域</Label>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {BEIJING_DISTRICT_OPTIONS.map((option) => (
                  <SelectionButton
                    active={form.serviceAreas.includes(option)}
                    key={option}
                    label={option}
                    onClick={() => toggleMultiValue("serviceAreas", option)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Label>可上课时间</Label>
              <div className="grid gap-4 lg:grid-cols-2">
                {TUTOR_AVAILABLE_TIME_GROUPS.map((group) => (
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
                          active={form.availableTimeSlots.includes(option)}
                          key={option}
                          label={option.replace(
                            group.label === "周一至周五" ? "工作日" : "周末",
                            "",
                          )}
                          onClick={() =>
                            toggleMultiValue("availableTimeSlots", option)
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>接单状态</Label>
              <RadioGroup
                className="grid gap-3 sm:grid-cols-2"
                onValueChange={(value) => setField("orderStatus", value)}
                value={form.orderStatus}
              >
                {TUTOR_ORDER_STATUS_OPTIONS.map((option, index) => {
                  const inputId = `order-status-${index}`;

                  return (
                    <label
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                        form.orderStatus === option
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                      )}
                      htmlFor={inputId}
                      key={option}
                    >
                      <RadioGroupItem
                        className={cn(
                          form.orderStatus === option
                            ? "border-white/40 text-white"
                            : "border-slate-300 text-slate-950",
                        )}
                        id={inputId}
                        value={option}
                      />
                      <span className="text-sm font-medium">{option}</span>
                    </label>
                  );
                })}
              </RadioGroup>
            </div>
          </section>

          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">个人介绍</h2>
              <p className="text-sm text-slate-500">
                一句话介绍用于列表摘要，完整介绍建议包含成绩、经验、风格和可辅导方向。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline">一句话介绍</Label>
              <Input
                id="tagline"
                maxLength={40}
                placeholder="例如：北大数院大三，专注高中数学拔高与提分"
                value={form.tagline}
                onChange={(event) => setField("tagline", event.target.value)}
              />
              <p className="text-xs text-slate-500">
                建议控制在 40 字以内，便于列表场景展示。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="intro">完整自我介绍</Label>
              <Textarea
                id="intro"
                placeholder="请介绍你的学校背景、成绩表现、教学风格、辅导经验和适合的学生类型。"
                rows={7}
                value={form.intro}
                onChange={(event) => setField("intro", event.target.value)}
              />
            </div>
          </section>

          <section className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-950">平台审核</h2>
              <p className="text-sm text-slate-500">
                学信网 PDF 文件仅用于平台审核，不会对家长展示。重新上传 PDF
                文件并保存后，审核状态会回到待审核。
              </p>
            </div>

            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
                <div className="min-h-[220px] overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  {verificationPreviewUrl ? (
                    <iframe
                      className="h-[320px] w-full"
                      src={verificationPreviewUrl}
                      title="学信网 PDF 文件预览"
                    />
                  ) : (
                    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
                      <UploadCloud className="h-8 w-8" />
                      <span className="text-sm">
                        请上传学信网PDF文件（最大5MB）
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Label>学信网 PDF 文件</Label>
                  <p className="text-sm leading-6 text-slate-600">
                    请上传学信网PDF文件（最大5MB）
                  </p>
                  <p className="text-xs leading-5 text-slate-500">
                    PDF
                    文件应包含学校和在读信息，当前仅平台审核可见，家长端不会展示。
                  </p>
                  <input
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={handleVerificationSelection}
                    ref={verificationInputRef}
                    type="file"
                  />
                  <Button
                    onClick={() => verificationInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {verificationPreviewUrl
                      ? "重新上传 PDF 文件"
                      : "上传学信网 PDF 文件"}
                  </Button>
                  {verificationFile ? (
                    <p className="break-all text-xs text-slate-500">
                      已选择：{verificationFile.name}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </section>

          <Button className="w-full" disabled={saving} type="submit">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            保存资料
          </Button>

          {message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700",
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
