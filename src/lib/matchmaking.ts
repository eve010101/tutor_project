import type { UserRole } from "@/types/auth";

export const MATCH_STATUS = {
  PENDING: "pending",
  MATCHED: "matched",
  REJECTED: "rejected",
} as const;

export type MatchStatus = (typeof MATCH_STATUS)[keyof typeof MATCH_STATUS];

export const TUTOR_REJECTION_REASONS = [
  "暂不接单",
  "时间不合适",
  "地点太远",
  "预算不合适",
] as const;

export const PARENT_REJECTION_REASONS = [
  "已找到合适老师",
  "时间不合适",
  "地点太远",
  "预算不合适",
] as const;

export type MatchRecord = {
  id: number;
  request_id: number;
  parent_id: string;
  tutor_id: string;
  status: string | null;
  parent_interested: boolean | null;
  tutor_interested: boolean | null;
  parent_interest_at?: string | null;
  tutor_interest_at?: string | null;
  contact_unlocked_at?: string | null;
  rejected_by?: string | null;
  reject_reason?: string | null;
  rejected_at?: string | null;
  parent_requested_verification_at?: string | null;
  tutor_shared_verification_path?: string | null;
  tutor_shared_verification_at?: string | null;
  review_reminder_at?: string | null;
  parent_review_rating?: number | null;
  parent_review_comment?: string | null;
  parent_review_created_at?: string | null;
  tutor_review_comment?: string | null;
  tutor_review_created_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ParentSelectableRequest = {
  id: number;
  subject: string;
  subjects?: string[];
  grade: string;
  grades?: string[];
  area: string;
  status?: string | null;
};

export function normalizeMatchStatus(status?: string | null): MatchStatus {
  if (status === MATCH_STATUS.MATCHED) {
    return MATCH_STATUS.MATCHED;
  }

  if (status === MATCH_STATUS.REJECTED) {
    return MATCH_STATUS.REJECTED;
  }

  return MATCH_STATUS.PENDING;
}

export function getRejectionReasons(role: UserRole) {
  return role === "tutor" ? TUTOR_REJECTION_REASONS : PARENT_REJECTION_REASONS;
}

export function getInterestBlockedMessage(args: {
  role: UserRole;
  tutorOrderStatus?: string | null;
  tutorReviewStatus?: string | null;
}) {
  if (args.role === "tutor" && args.tutorReviewStatus === "pending") {
    return "您尚未通过审核，请耐心等待哦~";
  }

  if (args.role === "tutor" && args.tutorOrderStatus === "暂不接单") {
    return "当前已设置为暂不接单，暂时不能发起感兴趣。";
  }

  return "";
}

export function getMatchStatusLabel(record?: MatchRecord | null) {
  const status = normalizeMatchStatus(record?.status);

  if (status === MATCH_STATUS.MATCHED) {
    return "已解锁联系方式";
  }

  if (status === MATCH_STATUS.REJECTED) {
    return "已拒绝";
  }

  if (record?.parent_interested || record?.tutor_interested) {
    return "等待对方回应";
  }

  return "尚未发起";
}
