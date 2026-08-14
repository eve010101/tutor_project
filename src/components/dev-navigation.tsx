"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useMemo, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";

type RouteRole = UserRole | "public";

type DevRoute = {
  href: string;
  label: string;
  role: RouteRole;
};

const routes: DevRoute[] = [
  { href: "/", label: "首页", role: "public" },
  { href: "/auth", label: "登录注册页", role: "public" },
  { href: "/admin/reviews", label: "审核后台页", role: "public" },
  { href: "/tutors", label: "家教列表页", role: "public" },
  { href: "/tutors/test-id", label: "家教详情页（测试）", role: "public" },
  { href: "/tutor/profile", label: "家教个人中心页", role: "tutor" },
  { href: "/tutor/requests", label: "家长需求列表页", role: "tutor" },
  { href: "/parent/profile", label: "家长个人中心页", role: "parent" },
  { href: "/parent/request", label: "家长发布需求页", role: "parent" },
];

const roleLabels: Record<UserRole, string> = {
  tutor: "家教",
  parent: "家长",
};

type DevNavigationProps = {
  isAuthenticated: boolean;
  role: string | null;
};

export function DevNavigation({ isAuthenticated, role }: DevNavigationProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  const currentRole = role === "tutor" || role === "parent" ? role : null;

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  async function switchAccount() {
    setIsSigningOut(true);
    setSignOutError("");
    const { error } = await supabase.auth.signOut();

    if (error) {
      setSignOutError("退出失败，请刷新后重试");
      setIsSigningOut(false);
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  return (
    <nav className="fixed bottom-20 right-4 z-[100] text-sm md:bottom-4">
      {isOpen ? (
        <div className="mb-2 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between gap-3 px-2 py-1">
            <div className="text-xs font-medium text-slate-500">开发调试导航</div>
            <div className="text-xs text-slate-400">
              {currentRole ? `当前：${roleLabels[currentRole]}` : "当前：未登录"}
            </div>
          </div>
          <div className="mt-1 flex flex-col">
            {routes.map((route) => (
              <Link
                className="flex items-center justify-between rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"
                href={route.href}
                key={route.href}
                onClick={() => setIsOpen(false)}
              >
                <span>{route.label}</span>
                {route.role !== "public" ? (
                  <span className="text-[11px] text-slate-400">{roleLabels[route.role]}</span>
                ) : null}
              </Link>
            ))}
          </div>
          <div className="mt-2 border-t border-slate-100 pt-2">
            {isAuthenticated ? (
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                disabled={isSigningOut}
                onClick={switchAccount}
                type="button"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isSigningOut ? "正在退出..." : "退出并切换账号"}
              </button>
            ) : (
              <Link
                className="block rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"
                href="/auth"
                onClick={() => setIsOpen(false)}
              >
                登录 / 注册
              </Link>
            )}
            {signOutError ? (
              <p className="px-2 pt-1 text-xs text-red-600">{signOutError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      <button
        aria-expanded={isOpen}
        className={cn(
          "rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-slate-700",
          isOpen && "bg-slate-700"
        )}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {isOpen ? "关闭调试导航" : "调试导航"}
      </button>
    </nav>
  );
}
