"use server";

import { revalidatePath } from "next/cache";

import { isAdminUser } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TutorReviewStatus } from "@/lib/tutor-review-status";

const allowedStatuses = new Set<TutorReviewStatus>([
  "pending",
  "approved",
  "rejected",
]);

export async function updateTutorReviewStatus(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "") as TutorReviewStatus;

  if (!userId || !allowedStatuses.has(status)) {
    throw new Error("无效的审核请求");
  }

  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!user || !isAdminUser(user.id)) {
    throw new Error("无权执行审核操作");
  }

  const adminSupabase = createSupabaseAdminClient();
  const { error } = await adminSupabase
    .from("tutor_profiles")
    .update({ status })
    .eq("user_id", userId);

  if (error) {
    console.error("[admin review] status update failed", {
      reviewerId: user?.id,
      tutorId: userId,
      status,
      code: error.code,
    });
    throw new Error("审核状态更新失败，请稍后重试");
  }

  console.info("[admin review] status updated", {
    reviewerId: user.id,
    tutorId: userId,
    status,
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/tutors");
  revalidatePath(`/tutors/${userId}`);
  revalidatePath("/tutor/profile");
}
