"use client";

import Link from "next/link";
import { useState } from "react";

const routes = [
  { href: "/", label: "首页" },
  { href: "/auth", label: "登录注册页" },
  { href: "/admin/reviews", label: "审核后台页" },
  { href: "/tutors", label: "家教列表页" },
  { href: "/tutors/test-id", label: "家教详情页（测试）" },
  { href: "/tutor/profile", label: "家教个人中心页" },
  { href: "/tutor/requests", label: "家教需求列表页" },
  { href: "/parent/profile", label: "家长个人中心页" },
  { href: "/parent/request", label: "家长发布需求页" },
];

export function DevNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <nav className="fixed bottom-4 right-4 z-50 text-sm">
      {isOpen ? (
        <div className="mb-2 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <div className="px-2 py-1 text-xs font-medium text-slate-500">开发调试导航</div>
          <div className="flex flex-col">
            {routes.map((route) => (
              <Link
                className="rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100"
                href={route.href}
                key={route.href}
              >
                {route.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <button
        className="rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg hover:bg-slate-700"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {isOpen ? "关闭调试导航" : "调试导航"}
      </button>
    </nav>
  );
}
