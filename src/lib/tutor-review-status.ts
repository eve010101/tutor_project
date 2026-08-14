export type TutorReviewStatus = "pending" | "approved" | "rejected";

export function normalizeTutorReviewStatus(
  status?: string | null,
): TutorReviewStatus {
  if (status === "approved" || status === "rejected") {
    return status;
  }

  return "pending";
}

export function getTutorReviewStatusMeta(status?: string | null) {
  const normalizedStatus = normalizeTutorReviewStatus(status);

  switch (normalizedStatus) {
    case "approved":
      return {
        value: normalizedStatus,
        label: "已通过",
        description: "资料已通过审核，当前会展示在家教列表页。",
        badgeClassName:
          "border border-emerald-200 bg-emerald-50 text-emerald-700",
        panelClassName:
          "border-emerald-200 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,1))]",
      };
    case "rejected":
      return {
        value: normalizedStatus,
        label: "未通过",
        description:
          "资料暂未通过审核。补充或修正信息并重新上传学信网 PDF 文件后，可再次进入待审核状态。",
        badgeClassName: "border border-red-200 bg-red-50 text-red-700",
        panelClassName:
          "border-red-200 bg-[linear-gradient(135deg,rgba(248,113,113,0.08),rgba(255,255,255,1))]",
      };
    case "pending":
    default:
      return {
        value: "pending" as const,
        label: "待审核",
        description: "资料已提交审核，审核通过前不会展示在家教列表页。",
        badgeClassName: "border border-amber-200 bg-amber-50 text-amber-700",
        panelClassName:
          "border-amber-200 bg-[linear-gradient(135deg,rgba(251,191,36,0.1),rgba(255,255,255,1))]",
      };
  }
}
