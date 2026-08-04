"use client";

import { usePathname, useRouter } from "next/navigation";

const returnPaths: Record<string, string> = {
  "/auth": "/",
  "/admin/reviews": "/",
  "/tutors": "/",
  "/tutor/profile": "/tutor/requests",
  "/tutor/requests": "/tutor/profile",
  "/parent/profile": "/parent/request",
  "/parent/request": "/parent/profile",
};

export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const returnPath = returnPaths[pathname] ?? "/";

  return (
    <button
      className="fixed left-4 top-4 z-50 text-sm text-slate-600 hover:text-slate-950"
      onClick={() => router.push(returnPath)}
      type="button"
    >
      返回
    </button>
  );
}
