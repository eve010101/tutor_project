"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Heart,
  Loader2,
  MessageSquare,
  ShieldCheck,
  UploadCloud,
  XCircle,
} from "lucide-react";

import type { UserRole } from "@/types/auth";
import {
  getInterestBlockedMessage,
  getMatchStatusLabel,
  getRejectionReasons,
  MATCH_STATUS,
  normalizeMatchStatus,
  type MatchRecord,
  type ParentSelectableRequest,
} from "@/lib/matchmaking";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

type ContactProfile = {
  fullName?: string | null;
  phone?: string | null;
};

type MatchActionsProps = {
  viewerRole: UserRole | null;
  tutorId: string;
  tutorReviewStatus?: string | null;
  tutorOrderStatus?: string | null;
  requestId?: number;
  requestOwnerId?: string;
  parentRequests?: ParentSelectableRequest[];
  existingMatch?: MatchRecord | null;
  counterpartProfile?: ContactProfile | null;
};

const MAX_PDF_SIZE = 5 * 1024 * 1024;

function getDefaultRequestId(
  requestId: number | undefined,
  parentRequests: ParentSelectableRequest[] | undefined,
  existingMatch?: MatchRecord | null,
) {
  if (existingMatch?.request_id) {
    return String(existingMatch.request_id);
  }

  if (requestId) {
    return String(requestId);
  }

  if (parentRequests?.length) {
    return String(parentRequests[0].id);
  }

  return "";
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

function formatName(name?: string | null, fallback = "对方") {
  return name?.trim() || fallback;
}

export function MatchActions({
  viewerRole,
  tutorId,
  tutorReviewStatus,
  tutorOrderStatus,
  requestId,
  requestOwnerId,
  parentRequests,
  existingMatch,
  counterpartProfile,
}: MatchActionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [match, setMatch] = useState<MatchRecord | null>(existingMatch ?? null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [reviewRating, setReviewRating] = useState("5");
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState(
    getDefaultRequestId(requestId, parentRequests, existingMatch),
  );

  const blockedMessage = viewerRole
    ? getInterestBlockedMessage({
        role: viewerRole,
        tutorOrderStatus,
        tutorReviewStatus,
      })
    : "";
  const status = normalizeMatchStatus(match?.status);
  const isTutor = viewerRole === "tutor";
  const isParent = viewerRole === "parent";
  const canReject = Boolean(match) && status !== MATCH_STATUS.REJECTED;
  const canRequestVerification =
    isParent && Boolean(match) && status !== MATCH_STATUS.REJECTED;
  const canUploadVerification =
    isTutor &&
    Boolean(match?.parent_requested_verification_at) &&
    status !== MATCH_STATUS.REJECTED;
  const rejectionReasons = viewerRole ? getRejectionReasons(viewerRole) : [];
  const matched = status === MATCH_STATUS.MATCHED;
  const selectedRequest = parentRequests?.find(
    (item) => String(item.id) === selectedRequestId,
  );

  useEffect(() => {
    setMatch(existingMatch ?? null);
  }, [existingMatch]);

  useEffect(() => {
    setSelectedRequestId(
      getDefaultRequestId(requestId, parentRequests, existingMatch),
    );
  }, [requestId, parentRequests, existingMatch]);

  async function upsertMatchRecord(payload: Partial<MatchRecord>) {
    const { data, error } = await supabase
      .from("match_records")
      .upsert(payload, { onConflict: "request_id,tutor_id" })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as MatchRecord;
  }

  async function updateMatchRecord(payload: Partial<MatchRecord>) {
    if (!match?.id) {
      throw new Error("当前还没有可操作的撮合记录。");
    }

    const { data, error } = await supabase
      .from("match_records")
      .update(payload)
      .eq("id", match.id)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as MatchRecord;
  }

  async function handleInterest() {
    if (!viewerRole) {
      setMessage("请先登录后再操作。");
      return;
    }

    if (blockedMessage) {
      setMessage(blockedMessage);
      return;
    }

    if (isParent && !selectedRequestId) {
      setMessage("请先选择一个需求帖。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("登录状态已失效，请重新登录。");
      }

      const nextRequestId = Number(selectedRequestId || requestId);
      if (!Number.isInteger(nextRequestId)) {
        throw new Error("缺少有效的需求帖。");
      }

      const nextMatch = await upsertMatchRecord({
        request_id: nextRequestId,
        parent_id: isParent ? user.id : requestOwnerId,
        tutor_id: tutorId,
        parent_interested: isParent
          ? true
          : (match?.parent_interested ?? false),
        tutor_interested: isTutor ? true : (match?.tutor_interested ?? false),
        parent_interest_at: isParent
          ? new Date().toISOString()
          : (match?.parent_interest_at ?? null),
        tutor_interest_at: isTutor
          ? new Date().toISOString()
          : (match?.tutor_interest_at ?? null),
        rejected_by: null,
        reject_reason: null,
        rejected_at: null,
      });

      setMatch(nextMatch);
      setMessage(
        normalizeMatchStatus(nextMatch.status) === MATCH_STATUS.MATCHED
          ? "双方已互相感兴趣，联系方式已解锁。"
          : "已记录你的感兴趣，等待对方回应。",
      );

      if (normalizeMatchStatus(nextMatch.status) === MATCH_STATUS.MATCHED) {
        router.push(`/matches/${nextMatch.id}/success`);
      } else {
        router.refresh();
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "操作失败，请稍后重试。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!viewerRole) {
      setMessage("请先登录后再操作。");
      return;
    }

    if (!rejectReason) {
      setMessage("请选择拒绝原因。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const nextMatch = await updateMatchRecord({
        status: MATCH_STATUS.REJECTED,
        rejected_by: viewerRole,
        reject_reason: rejectReason,
        rejected_at: new Date().toISOString(),
      });

      setMatch(nextMatch);
      setMessage(
        viewerRole === "tutor"
          ? "已拒绝该需求，请及时更新接单状态。"
          : "已拒绝该家教，拒绝原因会同步给对方。",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "提交失败，请稍后重试。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRequestVerification() {
    setSaving(true);
    setMessage("");

    try {
      const nextMatch = await updateMatchRecord({
        parent_requested_verification_at: new Date().toISOString(),
      });

      setMatch(nextMatch);
      setMessage(
        "已发送“请求查看学信网 PDF 文件”。PDF 文件仅供本次参考，平台已完成基础审核。",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "请求发送失败，请稍后重试。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadVerification() {
    if (!verificationFile) {
      setMessage("请先选择要上传的 PDF 文件。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const validationMessage = validatePdf(verificationFile);
      if (validationMessage) {
        throw new Error(validationMessage);
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("登录状态已失效，请重新登录。");
      }

      const filePath = `${user.id}/match-${match?.id}-verification`;
      const { error: uploadError } = await supabase.storage
        .from("match-verifications")
        .upload(filePath, verificationFile, {
          upsert: true,
          contentType: verificationFile.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const nextMatch = await updateMatchRecord({
        tutor_shared_verification_path: filePath,
        tutor_shared_verification_at: new Date().toISOString(),
      });

      setMatch(nextMatch);
      setVerificationFile(null);
      setMessage(
        "PDF 文件已上传。平台提示：该 PDF 文件仅供家长本次参考，平台已完成基础审核。",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "上传失败，请稍后重试。",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitReview() {
    if (!match) {
      setMessage("当前还没有可评价的撮合记录。");
      return;
    }

    if (!reviewText.trim()) {
      setMessage("请填写评价内容。");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const nextMatch = await updateMatchRecord(
        isParent
          ? {
              parent_review_rating: Number(reviewRating),
              parent_review_comment: reviewText.trim(),
              parent_review_created_at: new Date().toISOString(),
            }
          : {
              tutor_review_comment: reviewText.trim(),
              tutor_review_created_at: new Date().toISOString(),
            },
      );

      setMatch(nextMatch);
      setReviewText("");
      setMessage("评价已提交。后续可继续接短信提醒与家长信誉评分。");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "评价提交失败，请稍后重试。",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!viewerRole) {
    return <p className="text-sm text-slate-500">登录后可使用撮合功能。</p>;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">双向感兴趣</h2>
          <p className="mt-1 text-sm text-slate-500">
            {getMatchStatusLabel(match)}
          </p>
        </div>
        {matched ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            已解锁
          </span>
        ) : null}
      </div>

      {isParent && parentRequests?.length ? (
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">
            选择发起感兴趣的需求帖
          </span>
          <select
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            disabled={saving || matched}
            onChange={(event) => setSelectedRequestId(event.target.value)}
            value={selectedRequestId}
          >
            {parentRequests.map((item) => (
              <option key={item.id} value={item.id}>
                {item.subject} · {item.grade} · {item.area}
              </option>
            ))}
          </select>
          {selectedRequest ? (
            <p className="text-xs text-slate-500">
              将以“{selectedRequest.subject} / {selectedRequest.grade} /{" "}
              {selectedRequest.area}”作为本次撮合需求。
            </p>
          ) : null}
        </label>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={saving || Boolean(blockedMessage) || matched}
          onClick={handleInterest}
          size="lg"
          type="button"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className="h-4 w-4" />
          )}
          我感兴趣
        </Button>

        {canRequestVerification ? (
          <Button
            onClick={handleRequestVerification}
            type="button"
            variant="outline"
          >
            <ShieldCheck className="h-4 w-4" />
            请求查看学信网 PDF 文件
          </Button>
        ) : null}
      </div>

      {blockedMessage ? (
        <p className="text-sm text-amber-700">{blockedMessage}</p>
      ) : null}

      {match?.reject_reason ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          拒绝原因：{match.reject_reason}
        </div>
      ) : null}

      {matched ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          <p className="font-medium">联系方式已解锁</p>
          <p className="mt-1">
            联系人：{formatName(counterpartProfile?.fullName)}
          </p>
          <p>手机号：{counterpartProfile?.phone || "待补充"}</p>
          <p className="mt-2 text-xs text-emerald-700">
          </p>
        </div>
      ) : null}

      {canReject ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <XCircle className="h-4 w-4 text-slate-500" />
            拒绝并说明原因
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {rejectionReasons.map((item) => (
              <label
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  rejectReason === item
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
                key={item}
              >
                <input
                  checked={rejectReason === item}
                  className="sr-only"
                  name="reject-reason"
                  onChange={() => setRejectReason(item)}
                  type="radio"
                />
                {item}
              </label>
            ))}
          </div>
          <Button onClick={handleReject} type="button" variant="outline">
            提交拒绝
          </Button>
          {isTutor ? (
            <p className="text-xs text-slate-500">
              系统会提醒家教及时更新接单状态。
            </p>
          ) : null}
        </div>
      ) : null}

      {canUploadVerification ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <UploadCloud className="h-4 w-4 text-slate-500" />
            响应学信网 PDF 文件请求
          </div>
          <p className="text-sm text-slate-500">
            是否上传由你决定。平台提示：PDF
            文件仅供家长本次参考，平台已完成基础审核。
          </p>
          <p className="text-sm font-medium text-slate-700">
            请上传学信网PDF文件（最大5MB）
          </p>
          <input
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;

              if (!nextFile) {
                setVerificationFile(null);
                return;
              }

              const validationMessage = validatePdf(nextFile);
              if (validationMessage) {
                setMessage(validationMessage);
                setVerificationFile(null);
                event.target.value = "";
                return;
              }

              setMessage("");
              setVerificationFile(nextFile);
            }}
            type="file"
          />
          {verificationFile ? (
            <p className="break-all text-xs text-slate-500">
              已选择：{verificationFile.name}
            </p>
          ) : null}
          <Button
            onClick={handleUploadVerification}
            type="button"
            variant="outline"
          >
            上传 PDF 文件
          </Button>
        </div>
      ) : null}

      {match?.parent_requested_verification_at && !canUploadVerification ? (
        <p className="text-sm text-slate-500">
          已发送学信网 PDF 文件请求，等待家教决定是否上传。
        </p>
      ) : null}

      {matched ? (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <MessageSquare className="h-4 w-4 text-slate-500" />
            评价
          </div>
          {isParent ? (
            <label className="block space-y-2">
              <span className="text-sm text-slate-600">评分</span>
              <select
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                onChange={(event) => setReviewRating(event.target.value)}
                value={reviewRating}
              >
                {[5, 4, 3, 2, 1].map((score) => (
                  <option key={score} value={score}>
                    {score} 分
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <textarea
            className="min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            onChange={(event) => setReviewText(event.target.value)}
            placeholder={isParent ? "填写对家教的评价" : "填写对家长的评价"}
            value={reviewText}
          />
          <Button onClick={handleSubmitReview} type="button" variant="outline">
            提交评价
          </Button>
          <p className="text-xs text-slate-500">
          </p>
        </div>
      ) : null}

      {message ? <p className="text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
