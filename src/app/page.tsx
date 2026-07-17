import Link from "next/link";
import { ArrowRight, BookOpen, ShieldCheck, Sparkles, Users } from "lucide-react";

import { redirectAuthenticatedUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    title: "手机号作为登录名",
    description: "家长和家教都直接输入手机号，不需要记邮箱。",
    icon: SmartphoneFeatureIcon,
  },
  {
    title: "角色注册后自动分流",
    description: "家教进入资料页，家长进入发布需求页。",
    icon: Users,
  },
  {
    title: "密码仍由 Supabase 托管",
    description: "底层走 Email Auth，前台保持手机号体验。",
    icon: ShieldCheck,
  },
];

function SmartphoneFeatureIcon() {
  return <BookOpen className="h-4 w-4" />;
}

export default async function HomePage() {
  await redirectAuthenticatedUser();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Sparkles className="h-3.5 w-3.5" />
              北京家教信息撮合平台
            </div>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                连接大学生家教和有需求的家长
              </h1>
              <p className="max-w-xl text-base leading-7 text-slate-600">
                界面输入手机号和密码，内部映射成 Supabase 邮箱认证。这样你可以直接测试手机号注册和登录流程。
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

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>当前实现</CardTitle>
              <CardDescription>先完成可测试的手机号注册和登录。</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {features.map((feature) => {
                const Icon = feature.icon;

                return (
                  <div
                    key={feature.title}
                    className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-950">
                      <Icon />
                    </div>
                    <div>
                      <div className="font-medium text-slate-950">{feature.title}</div>
                      <div className="text-sm text-slate-500">{feature.description}</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
