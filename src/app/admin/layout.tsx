import Link from "next/link";
import { notFound } from "next/navigation";

import { isAdminUser } from "@/lib/admin-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminUser(user?.id)) {
    if (process.env.NODE_ENV === "development" && user?.id) {
      return (
        <main className="min-h-screen bg-slate-50 px-4 py-8">
          <div className="mx-auto max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h1 className="text-xl font-semibold">当前账号尚未配置为管理员</h1>
            <p className="mt-3 text-sm leading-7">
              在 `.env.local` 添加下面的配置，然后重启开发服务器：
            </p>
            <code className="mt-3 block break-all rounded-xl bg-white px-4 py-3 text-sm">
              ADMIN_USER_IDS={user.id}
            </code>
          </div>
        </main>
      );
    }

    notFound();
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="font-semibold" href="/admin/users">
            平台管理后台
          </Link>
          <nav className="flex gap-2 text-sm">
            <Link
              className="rounded-lg px-3 py-2 hover:bg-white/10"
              href="/admin/users"
            >
              用户管理
            </Link>
            <Link
              className="rounded-lg px-3 py-2 hover:bg-white/10"
              href="/admin/reviews"
            >
              家教审核
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </>
  );
}
