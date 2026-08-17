import { notFound } from "next/navigation";

import { updateTutorReviewStatus } from "@/app/admin/reviews/actions";
import { isAdminReviewer } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logSupabaseQuery } from "@/lib/supabase/query-log";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getTutorReviewStatusMeta,
  normalizeTutorReviewStatus,
} from "@/lib/tutor-review-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TutorProfileReviewRow = {
  user_id: string;
  school?: string | null;
  department?: string | null;
  academic_stage?: string | null;
  gaokao_origin?: string | null;
  subjects?: string[] | null;
  service_types?: string[] | null;
  grade_ranges?: string[] | null;
  service_areas?: string[] | null;
  hourly_rate?: number | null;
  weekly_capacity?: number | null;
  tagline?: string | null;
  intro?: string | null;
  order_status?: string | null;
  status?: string | null;
  verification_image_path?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type ProfileRow = {
  id: string;
  full_name?: string | null;
  phone?: string | null;
};

type ReviewItem = TutorProfileReviewRow & {
  fullName: string;
  phone: string;
  verificationPdfUrl: string | null;
};

const tutorReviewSelect =
  "user_id, school, department, academic_stage, gaokao_origin, subjects, service_types, grade_ranges, service_areas, hourly_rate, weekly_capacity, tagline, intro, order_status, status, verification_image_path, updated_at, created_at" as const;

const profileSelect = "id, full_name, phone" as const;

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无时间";
  }

  return dateFormatter.format(new Date(value));
}

function extractStoragePath(bucket: string, pathOrUrl?: string | null) {
  if (!pathOrUrl) {
    return null;
  }

  if (!/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  try {
    const parsed = new URL(pathOrUrl);
    const patterns = [
      `/object/public/${bucket}/`,
      `/object/sign/${bucket}/`,
      `/object/authenticated/${bucket}/`,
    ];

    for (const pattern of patterns) {
      const index = parsed.pathname.indexOf(pattern);

      if (index >= 0) {
        return decodeURIComponent(
          parsed.pathname.slice(index + pattern.length),
        );
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function getSignedFileUrl(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  bucket: string,
  pathOrUrl?: string | null,
) {
  const storagePath = extractStoragePath(bucket, pathOrUrl);

  if (!storagePath) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, 30 * 60);

  if (error) {
    console.error("[admin review] failed to sign verification file", {
      code: error.name,
    });
    return null;
  }

  return data.signedUrl;
}

function joinValues(values?: string[] | null, fallback = "暂无填写") {
  return values?.length ? values.join(" / ") : fallback;
}

export default async function AdminReviewsPage() {
  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!isAdminReviewer(user?.id)) {
    if (process.env.NODE_ENV === "development" && user?.id) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Card className="border-amber-200 bg-amber-50/80">
              <CardHeader>
                <CardTitle>当前账号尚未配置为审核管理员</CardTitle>
                <CardDescription>
                  将下面的 UUID 加入 `.env.local` 的
                  `ADMIN_REVIEWER_USER_IDS`，然后重启开发服务器。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-amber-900">
                <code className="block break-all rounded-xl bg-white px-4 py-3">
                  {user.id}
                </code>
                <code className="block break-all rounded-xl bg-white px-4 py-3">
                  ADMIN_REVIEWER_USER_IDS={user.id}
                </code>
              </CardContent>
            </Card>
          </div>
        </main>
      );
    }

    notFound();
  }

  let supabase: ReturnType<typeof createSupabaseAdminClient>;

  try {
    supabase = createSupabaseAdminClient();
  } catch (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader>
              <CardTitle>审核后台不可用</CardTitle>
              <CardDescription>
                当前环境缺少 `SUPABASE_SERVICE_ROLE_KEY`，无法读取审核资料。
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-red-700">
              {error instanceof Error ? error.message : "Unknown error"}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const { data: reviewRows, error: reviewError } = await supabase
    .from("tutor_profiles")
    .select(tutorReviewSelect)
    .order("updated_at", { ascending: false });

  logSupabaseQuery("admin tutor review list", {
    data: reviewRows,
    error: reviewError,
  });

  if (reviewError) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader>
              <CardTitle>审核资料读取失败</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-red-700">
              {reviewError.message}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const reviews = (reviewRows ?? []) as TutorProfileReviewRow[];
  const userIds = reviews.map((item) => item.user_id);
  const { data: profileRows, error: profileError } = userIds.length
    ? await supabase.from("profiles").select(profileSelect).in("id", userIds)
    : { data: [], error: null };

  logSupabaseQuery("admin tutor profile identities", {
    data: profileRows,
    error: profileError,
  });

  if (profileError) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <Card className="border-red-200 bg-red-50/80">
            <CardHeader>
              <CardTitle>资料基础信息读取失败</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-red-700">
              {profileError.message}
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const profileMap = new Map(
    ((profileRows ?? []) as ProfileRow[]).map((item) => [item.id, item]),
  );

  const items: ReviewItem[] = (
    await Promise.all(
      reviews.map(async (review) => {
        const profile = profileMap.get(review.user_id);

        return {
          ...review,
          fullName: profile?.full_name?.trim() || "未填写姓名",
          phone: profile?.phone?.trim() || "未绑定手机号",
          verificationPdfUrl: await getSignedFileUrl(
            supabase,
            "tutor-verifications",
            review.verification_image_path,
          ),
        };
      }),
    )
  ).sort((left, right) => {
    const leftRank =
      normalizeTutorReviewStatus(left.status) === "pending"
        ? 0
        : normalizeTutorReviewStatus(left.status) === "rejected"
          ? 1
          : 2;
    const rightRank =
      normalizeTutorReviewStatus(right.status) === "pending"
        ? 0
        : normalizeTutorReviewStatus(right.status) === "rejected"
          ? 1
          : 2;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return (
      new Date(right.updated_at ?? right.created_at ?? 0).getTime() -
      new Date(left.updated_at ?? left.created_at ?? 0).getTime()
    );
  });

  const pendingCount = items.filter(
    (item) => normalizeTutorReviewStatus(item.status) === "pending",
  ).length;
  const approvedCount = items.filter(
    (item) => normalizeTutorReviewStatus(item.status) === "approved",
  ).length;
  const rejectedCount = items.length - pendingCount - approvedCount;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.14),_transparent_28%),linear-gradient(180deg,#fffef7_0%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-amber-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="space-y-3">
            <p className="text-sm font-medium tracking-wide text-amber-700">
              审核后台
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              家教资料审核列表
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              学信网 PDF 文件永久保存在私有存储桶。每次管理员打开本页时生成新的
              30 分钟临时链接，不影响之后继续审核。
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-amber-800">
              待审核 {pendingCount}
            </span>
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-emerald-700">
              已通过 {approvedCount}
            </span>
            <span className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-red-700">
              未通过 {rejectedCount}
            </span>
          </div>
        </section>

        {items.length ? (
          <section className="grid gap-5 xl:grid-cols-2">
            {items.map((item) => {
              const reviewMeta = getTutorReviewStatusMeta(item.status);

              return (
                <Card
                  className="overflow-hidden border-slate-200"
                  key={item.user_id}
                >
                  <CardHeader className="gap-4 border-b border-slate-100 bg-white/90 pb-5">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-xl">
                          {item.fullName}
                        </CardTitle>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${reviewMeta.badgeClassName}`}
                        >
                          {reviewMeta.label}
                        </span>
                      </div>
                      <CardDescription className="text-sm leading-6">
                        {item.phone}
                      </CardDescription>
                      <div className="text-sm leading-6 text-slate-600">
                        {[item.school, item.department, item.academic_stage]
                          .filter(Boolean)
                          .join(" · ") || "学校信息待补充"}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5 p-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium tracking-wide text-slate-500">
                          更新时间
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {formatDateTime(item.updated_at ?? item.created_at)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-xs font-medium tracking-wide text-slate-500">
                          接单状态
                        </div>
                        <div className="mt-2 text-sm font-medium text-slate-900">
                          {item.order_status || "未填写"}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-medium tracking-wide text-slate-500">
                          教授科目
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-900">
                          {joinValues(item.subjects)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-xs font-medium tracking-wide text-slate-500">
                          服务区域
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-900">
                          {joinValues(item.service_areas)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium text-slate-700">
                        学信网 PDF 文件
                      </div>
                      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
                        {item.verificationPdfUrl ? (
                          <div className="bg-white">
                            <iframe
                              className="h-80 w-full"
                              src={item.verificationPdfUrl}
                              title={`${item.fullName}学信网 PDF 文件预览`}
                            />
                            <div className="border-t border-slate-200 p-3">
                              <a
                                className="text-sm font-medium text-sky-700 hover:text-sky-800 hover:underline"
                                href={item.verificationPdfUrl}
                                rel="noreferrer"
                                target="_blank"
                              >
                                在新窗口打开或下载 PDF 文件
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                            暂无学信网 PDF 文件
                          </div>
                        )}
                      </div>
                    </div>

                    {item.tagline || item.intro ? (
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-medium tracking-wide text-slate-500">
                          个人介绍
                        </div>
                        {item.tagline ? (
                          <div className="mt-2 text-sm font-medium text-slate-900">
                            {item.tagline}
                          </div>
                        ) : null}
                        {item.intro ? (
                          <p className="mt-2 text-sm leading-7 text-slate-600">
                            {item.intro}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <form
                      action={updateTutorReviewStatus}
                      className="flex flex-wrap gap-3 border-t border-slate-100 pt-5"
                    >
                      <input name="userId" type="hidden" value={item.user_id} />
                      <Button
                        disabled={reviewMeta.value === "approved"}
                        name="status"
                        type="submit"
                        value="approved"
                      >
                        审核通过
                      </Button>
                      <Button
                        disabled={reviewMeta.value === "rejected"}
                        name="status"
                        type="submit"
                        value="rejected"
                        variant="destructive"
                      >
                        审核不通过
                      </Button>
                      <Button
                        disabled={reviewMeta.value === "pending"}
                        name="status"
                        type="submit"
                        value="pending"
                        variant="outline"
                      >
                        重新设为待审核
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        ) : (
          <Card className="border-dashed border-slate-300 bg-white/80">
            <CardHeader>
              <CardTitle>暂无审核资料</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-7 text-slate-600">
              当前数据库里还没有家教资料，或你尚未执行资料审核相关的迁移。
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
