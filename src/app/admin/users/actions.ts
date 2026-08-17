"use server";

import { revalidatePath } from "next/cache";

import { isAdminUser } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const sessionSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();

  if (!user || !isAdminUser(user.id)) {
    throw new Error("无权执行管理员操作");
  }

  return user;
}

async function removeUserFolder(
  bucket: string,
  userId: string,
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
) {
  const { data, error } = await adminSupabase.storage
    .from(bucket)
    .list(userId, { limit: 1000 });

  if (error) {
    console.error("[admin users] failed to list user files", {
      bucket,
      userId,
      code: error.name,
    });
    throw new Error("读取用户文件失败，已停止删除用户");
  }

  const paths = (data ?? [])
    .filter((item) => item.name && item.id)
    .map((item) => `${userId}/${item.name}`);

  if (!paths.length) {
    return;
  }

  const { error: removeError } = await adminSupabase.storage
    .from(bucket)
    .remove(paths);

  if (removeError) {
    console.error("[admin users] failed to remove user files", {
      bucket,
      userId,
      code: removeError.name,
    });
    throw new Error("删除用户文件失败，已停止删除用户");
  }
}

export async function deletePlatformUser(formData: FormData) {
  const admin = await requireAdmin();
  const targetUserId = String(formData.get("userId") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!targetUserId || confirmation !== `DELETE ${targetUserId}`) {
    throw new Error("删除确认文字不正确");
  }

  if (targetUserId === admin.id) {
    throw new Error("管理员不能删除自己的账号");
  }

  if (isAdminUser(targetUserId)) {
    throw new Error("不能在后台删除管理员账号，请先从管理员白名单移除");
  }

  const adminSupabase = createSupabaseAdminClient();

  for (const bucket of [
    "profile-avatars",
    "tutor-verifications",
    "match-verifications",
  ]) {
    await removeUserFolder(bucket, targetUserId, adminSupabase);
  }

  const { error } = await adminSupabase.auth.admin.deleteUser(targetUserId);

  if (error) {
    console.error("[admin users] auth user deletion failed", {
      adminId: admin.id,
      targetUserId,
      status: error.status,
    });
    throw new Error("删除用户失败，请稍后重试");
  }

  console.warn("[admin users] user permanently deleted", {
    adminId: admin.id,
    targetUserId,
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin/reviews");
  revalidatePath("/tutors");
}
