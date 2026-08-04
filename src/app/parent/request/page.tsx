import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { requireRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ParentRequestForm } from "@/components/parent-request-form";

export default async function ParentRequestPage() {
  const { profile } = await requireRole("parent");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_30%),linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[32px] border border-sky-100 bg-white/90 p-6 shadow-sm backdrop-blur sm:p-8">
          <p className="text-sm font-medium tracking-wide text-sky-700">家长端</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                发布家教需求
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                把科目、年级、预算、上课时间和目标分数写清楚，家教更容易快速判断是否匹配。
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/parent/profile">
                返回个人中心
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <ParentRequestForm city={profile.city} />
      </div>
    </main>
  );
}
