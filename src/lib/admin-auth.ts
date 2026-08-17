import "server-only";

export function getAdminUserIds() {
  return [process.env.ADMIN_USER_IDS, process.env.ADMIN_REVIEWER_USER_IDS]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAdminUser(userId?: string | null) {
  if (!userId) {
    return false;
  }

  return getAdminUserIds().includes(userId);
}

export const isAdminReviewer = isAdminUser;
