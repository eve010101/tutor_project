import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { redirectAuthenticatedUser } from "@/lib/auth";
import { ValuePropositionCard } from "@/components/value-proposition-card";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  await redirectAuthenticatedUser();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              燕启家教
            </div>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                连接大学生家教和有需求的家长
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600">
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth">
                  立即开始
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth">查看登录 / 注册</Link>
              </Button>
            </div>
          </div>

          <ValuePropositionCard />
        </section>
      </div>
    </main>
  );
}
