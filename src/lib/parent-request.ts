import {
  BEIJING_DISTRICT_OPTIONS,
  TUTOR_AVAILABLE_TIME_GROUPS,
  TUTOR_AVAILABLE_TIME_OPTIONS,
  TUTOR_SERVICE_TYPE_OPTIONS,
  TUTOR_SUBJECT_OPTIONS,
} from "@/lib/tutor-profile-options";

export const PARENT_REQUEST_SUBJECT_OPTIONS = TUTOR_SUBJECT_OPTIONS;
export const PARENT_REQUEST_SERVICE_TYPE_OPTIONS = TUTOR_SERVICE_TYPE_OPTIONS;
export const PARENT_REQUEST_GRADE_OPTIONS = [
  "小学一年级",
  "小学二年级",
  "小学三年级",
  "小学四年级",
  "小学五年级",
  "小学六年级",
  "初一",
  "初二",
  "初三",
  "高一",
  "高二",
  "高三",
] as const;
export const PARENT_REQUEST_AREA_OPTIONS = BEIJING_DISTRICT_OPTIONS;
export const PARENT_REQUEST_TIME_GROUPS = TUTOR_AVAILABLE_TIME_GROUPS;
export const PARENT_REQUEST_TIME_OPTIONS = TUTOR_AVAILABLE_TIME_OPTIONS;
export const PARENT_REQUEST_LESSON_DURATION_OPTIONS = [
  "1小时",
  "1.5小时",
  "2小时",
] as const;
export const PARENT_REQUEST_STATUS_OPTIONS = ["招募中", "已找到"] as const;

export type ParentRequestStatus = (typeof PARENT_REQUEST_STATUS_OPTIONS)[number];

export type ParentRequestRecord = {
  id: number;
  subject: string;
  service_type?: string | null;
  grade: string;
  city?: string | null;
  area: string;
  budget_hourly?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
  study_situation?: string | null;
  preferred_time_slots?: string[] | null;
  preferred_time?: string | null;
  weekly_session_count?: number | null;
  lesson_duration?: string | null;
  extra_notes?: string | null;
  notes?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type NormalizedParentRequest = {
  id: number;
  subject: string;
  serviceType: string;
  grade: string;
  city: string;
  area: string;
  budgetHourly: number | null;
  studySituation: string;
  preferredTimeSlots: string[];
  weeklySessionCount: number | null;
  lessonDuration: string;
  extraNotes: string;
  status: ParentRequestStatus;
  createdAt: string | null;
};

const serviceTypeOptionSet = new Set<string>(PARENT_REQUEST_SERVICE_TYPE_OPTIONS);
const lessonDurationOptionSet = new Set<string>(PARENT_REQUEST_LESSON_DURATION_OPTIONS);
const timeOptionSet = new Set<string>(PARENT_REQUEST_TIME_OPTIONS);

function normalizeItems(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function filterByOptionSet(values: string[], options: ReadonlySet<string>) {
  return normalizeItems(values).filter((item) => options.has(item));
}

export function normalizeParentRequestStatus(value?: string | null): ParentRequestStatus {
  return value === "已找到" || value === "closed" || value === "matched"
    ? "已找到"
    : "招募中";
}

export function normalizeParentRequestTimeSlots(
  values?: string[] | null,
  legacyValue?: string | null
) {
  if (values?.length) {
    return filterByOptionSet(values, timeOptionSet);
  }

  const legacy = legacyValue ?? "";
  const nextValues: string[] = [];

  if (legacy.includes("工作日")) {
    if (!legacy.includes("上午") && !legacy.includes("下午") && !legacy.includes("晚上")) {
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
    if (!legacy.includes("上午") && !legacy.includes("下午") && !legacy.includes("晚上")) {
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

  return filterByOptionSet(nextValues, timeOptionSet);
}

export function normalizeParentRequest(record: ParentRequestRecord): NormalizedParentRequest {
  const serviceType = serviceTypeOptionSet.has(record.service_type ?? "")
    ? (record.service_type as string)
    : "课后辅导";
  const lessonDuration = lessonDurationOptionSet.has(record.lesson_duration ?? "")
    ? (record.lesson_duration as string)
    : "";

  return {
    id: record.id,
    subject: record.subject,
    serviceType,
    grade: record.grade,
    city: record.city?.trim() || "北京",
    area: record.area,
    budgetHourly: record.budget_hourly ?? record.budget_max ?? record.budget_min ?? null,
    studySituation: record.study_situation?.trim() ?? "",
    preferredTimeSlots: normalizeParentRequestTimeSlots(
      record.preferred_time_slots,
      record.preferred_time
    ),
    weeklySessionCount: record.weekly_session_count ?? null,
    lessonDuration,
    extraNotes: record.extra_notes?.trim() || record.notes?.trim() || "",
    status: normalizeParentRequestStatus(record.status),
    createdAt: record.created_at ?? null,
  };
}

function getDateTimestamp(value?: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortParentRequests(records: ParentRequestRecord[]) {
  return [...records].sort((left, right) => {
    const leftRank = normalizeParentRequestStatus(left.status) === "招募中" ? 0 : 1;
    const rightRank = normalizeParentRequestStatus(right.status) === "招募中" ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return getDateTimestamp(right.created_at) - getDateTimestamp(left.created_at);
  });
}
