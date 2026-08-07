"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, UserRound } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

type GlobalNavigationProps = {
  role: UserRole | null;
};

function getDevelopmentPreviewRole(pathname: string): UserRole | null {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  if (pathname.startsWith("/tutor/")) {
    return "tutor";
  }

  if (pathname.startsWith("/parent/") || pathname.startsWith("/tutors")) {
    return "parent";
  }

  return null;
}

export function GlobalNavigation({ role }: GlobalNavigationProps) {
  const pathname = usePathname();
  const currentRole = role ?? getDevelopmentPreviewRole(pathname);

  if (!currentRole) {
    return null;
  }

  const homePath = currentRole === "parent" ? "/tutors" : "/tutor/requests";
  const profilePath =
    currentRole === "parent" ? "/parent/profile" : "/tutor/profile";
  const homeIsActive =
    pathname === homePath ||
    (currentRole === "parent" && pathname.startsWith("/tutors/")) ||
    (currentRole === "tutor" && pathname.startsWith("/parent/request/"));
  const profileIsActive = pathname === profilePath;

  const linkClass = (active: boolean) =>
    cn(
      "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
      active
        ? "bg-slate-100 text-slate-950"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
    );

  return (
    <>
      <header className="sticky top-0 z-40 hidden border-b border-slate-200 bg-white/95 backdrop-blur md:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link
            className="text-base font-semibold text-slate-950 transition-colors hover:text-sky-700"
            href={homePath}
          >
            北京家教信息撮合平台
          </Link>
          <nav className="flex items-center gap-1" aria-label="全局导航">
            <Link className={linkClass(homeIsActive)} href={homePath}>
              <Home className="h-4 w-4" aria-hidden="true" />
              首页
            </Link>
            <Link className={linkClass(profileIsActive)} href={profilePath}>
              <UserRound className="h-4 w-4" aria-hidden="true" />
              个人中心
            </Link>
            <SignOutButton className="ml-1" compact />
          </nav>
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur md:hidden"
        aria-label="移动端导航"
      >
        <div className="mx-auto grid h-16 max-w-md grid-cols-2">
          <Link
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              homeIsActive ? "text-sky-700" : "text-slate-500",
            )}
            href={homePath}
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            <span>首页</span>
          </Link>
          <Link
            className={cn(
              "flex min-w-0 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors",
              profileIsActive ? "text-sky-700" : "text-slate-500",
            )}
            href={profilePath}
          >
            <UserRound className="h-5 w-5" aria-hidden="true" />
            <span>个人中心</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
