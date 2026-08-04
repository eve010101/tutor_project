import Link from "next/link";
import { CheckCircle2, MessageSquareText, PhoneCall } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth";
import { MATCH_STATUS, normalizeMatchStatus, type MatchRecord } from "@/lib/matchmaking";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function MatchSuccessPage({ params }: { params: { id: string } }) {
  const matchId = Number(params.id);
  if (!Number.isInteger(matchId)) {
    notFound();
  }

  const { user, profile } = await getCurrentUserProfile();
  if (!user || !profile?.role) {
    redirect("/auth");
  }

  const supabase = createSupabaseServerClient();
  const { data: matchData } = await supabase
    .from("match_records")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();

  if (!matchData) {
    notFound();
  }

  const match = matchData as MatchRecord;
  if (normalizeMatchStatus(match.status) !== MATCH_STATUS.MATCHED) {
    notFound();
  }

  if (user.id !== match.parent_id && user.id !== match.tutor_id) {
    notFound();
  }

  const counterpartId = user.id === match.parent_id ? match.tutor_id : match.parent_id;
  const { data: counterpart } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", counterpartId)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">解锁成功</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          双方都已点感兴趣，系统已自动解锁联系方式。短信通知在接入短信服务后可直接按该记录触发。
        </p>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <PhoneCall className="h-4 w-4 text-emerald-700" />
            对方联系方式
          </div>
          <p className="mt-3 text-sm text-slate-700">称呼：{counterpart?.full_name?.trim() || "对方"}</p>
          <p className="mt-1 text-sm text-slate-700">手机号：{counterpart?.phone || "待补充"}</p>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <MessageSquareText className="h-4 w-4 text-slate-500" />
            后续提示
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            平台可在解锁一段时间后按该撮合记录发送评价短信提醒。当前版本已预留评价字段，后续可以继续加入家长信誉评分。
          </p>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={profile.role === "parent" ? "/parent/profile" : "/tutor/requests"}>返回列表</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
