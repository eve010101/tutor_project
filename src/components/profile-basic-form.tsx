"use client";

import { type FormEvent, useMemo, useState } from "react";
import { CheckCircle2, Loader2, MapPin, User2 } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SaveMessage =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

interface ProfileBasicFormProps {
  profile: {
    full_name?: string | null;
    city?: string | null;
    bio?: string | null;
  };
  title?: string;
  description?: string;
}

export function ProfileBasicForm({
  profile,
  title = "修改个人资料",
  description = "更新家长姓名、所在城市和孩子情况介绍，这些基础信息会用于后续匹配和展示。",
}: ProfileBasicFormProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<SaveMessage>(null);
  const [form, setForm] = useState({
    fullName: profile.full_name ?? "",
    city: profile.city ?? "北京",
    bio: profile.bio ?? "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage({ type: "error", text: "登录状态已失效，请重新登录后再试。" });
      setSaving(false);
      return;
    }

    const fullName = form.fullName.trim();
    const city = form.city.trim();
    const bio = form.bio.trim();

    if (!fullName) {
      setMessage({ type: "error", text: "请填写家长姓名。" });
      setSaving(false);
      return;
    }

    if (!city) {
      setMessage({ type: "error", text: "请填写所在城市。" });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        city,
        bio: bio || null,
      })
      .eq("id", user.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
      setSaving(false);
      return;
    }

    setMessage({ type: "success", text: "个人资料已更新。" });
    setSaving(false);
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">家长姓名</Label>
              <div className="relative">
                <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  id="profile-full-name"
                  placeholder="请输入真实姓名，仅用于平台留存，不会对外展示。"
                  value={form.fullName}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-city">所在城市</Label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  id="profile-city"
                  placeholder="例如：北京"
                  value={form.city}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, city: event.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-bio">学生情况介绍</Label>
            <Textarea
              id="profile-bio"
              placeholder="补充孩子的成绩情况、想通过补习提升的痛点、对老师的需求。详细的学生情况介绍更利于匹配哦！"
              rows={5}
              value={form.bio}
              onChange={(event) =>
                setForm((current) => ({ ...current, bio: event.target.value }))
              }
            />
          </div>

          <Button className="w-full" disabled={saving} type="submit">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            保存资料
          </Button>

          {message ? (
            <div
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm",
                message.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-700"
              )}
            >
              {message.text}
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
