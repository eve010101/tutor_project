"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  KeyRound,
  Smartphone,
} from "lucide-react";

import { getAuthEmailFromPhone, isSupportedPhone, normalizePhone } from "@/lib/auth-identity";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { logSupabaseQuery } from "@/lib/supabase/query-log";
import { markRegistrationOnboardingPending } from "@/lib/registration-onboarding";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";
import { ValuePropositionCard } from "@/components/value-proposition-card";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type AuthMode = "login" | "register" | "reset";
type NoticeTone = "idle" | "error" | "success";

function getRolePath(role?: string | null) {
  return role === "parent" ? "/parent/profile" : "/tutor/profile";
}

function getLoginPath(role?: string | null) {
  return role === "parent" ? "/tutors" : "/tutor/requests";
}

function maskPhone(phone: string) {
  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 5)}****${phone.slice(-4)}`;
}

export function AuthPanel() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [busy, setBusy] = useState(false);
  const [tone, setTone] = useState<NoticeTone>("idle");
  const [notice, setNotice] = useState("");

  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerPhone, setRegisterPhone] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerRole, setRegisterRole] = useState<UserRole>("tutor");

  const [resetPhone, setResetPhone] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  function setFeedback(nextTone: NoticeTone, nextNotice: string) {
    setTone(nextTone);
    setNotice(nextNotice);
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phone = normalizePhone(registerPhone);
    if (!isSupportedPhone(phone)) {
      setFeedback("error", "请输入中国大陆手机号，例如 13800000000");
      return;
    }

    if (registerPassword.length < 6) {
      setFeedback("error", "密码至少需要 6 位");
      return;
    }

    setBusy(true);
    setFeedback("idle", "");

    try {
      console.log("[register] submit", {
        phone: maskPhone(phone),
        role: registerRole,
      });

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone,
          password: registerPassword,
          role: registerRole,
        }),
      });

      const rawText = await response.text();
      let result: {
        ok?: boolean;
        error?: string;
        requestId?: string;
        details?: unknown;
        timestamp?: string;
      } = {};

      try {
        result = rawText ? (JSON.parse(rawText) as { error?: string }) : {};
      } catch (parseError) {
        console.error("[register] failed to parse response JSON", {
          parseError,
          rawText,
        });
      }

      console.log("[register] api response", {
        status: response.status,
        ok: response.ok,
        rawText,
        result,
      });

      if (!response.ok) {
        console.error("[register] api returned error", {
          status: response.status,
          requestId: result.requestId,
          result,
        });
        setFeedback("error", result.error ?? "注册失败");
        setBusy(false);
        return;
      }

      const email = getAuthEmailFromPhone(phone);
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password: registerPassword,
      });

      if (error) {
        console.error("[register] signInWithPassword after register failed", {
          message: error.message,
          name: error.name,
          status: error.status,
        });
        setFeedback("error", error.message);
        setBusy(false);
        return;
      }

      console.log("[register] completed successfully", {
        phone: maskPhone(phone),
        role: registerRole,
      });

      setFeedback("success", "注册成功，正在跳转...");
      setBusy(false);
      markRegistrationOnboardingPending(signInData.user.id, registerRole);
      router.replace(getLoginPath(registerRole));
      router.refresh();
    } catch (error) {
      console.error("[register] unexpected client error", error);
      setFeedback("error", error instanceof Error ? error.message : "注册失败");
      setBusy(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phone = normalizePhone(loginPhone);
    if (!isSupportedPhone(phone)) {
      setFeedback("error", "请输入中国大陆手机号，例如 13800000000");
      return;
    }

    if (!loginPassword) {
      setFeedback("error", "请输入密码");
      return;
    }

    setBusy(true);
    setFeedback("idle", "");

    const email = getAuthEmailFromPhone(phone);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });

    if (error) {
      setFeedback("error", error.message);
      setBusy(false);
      return;
    }

    const profileResult = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    const { data: profile, error: profileError } = logSupabaseQuery(
      "login role profile",
      profileResult
    );

    if (profileError) {
      setFeedback("error", `登录成功，但读取用户角色失败：${profileError.message}`);
      setBusy(false);
      return;
    }

    setFeedback("success", "登录成功，正在跳转...");
    setBusy(false);
    router.replace(getLoginPath(profile?.role ?? (data.user.user_metadata?.role as string)));
    router.refresh();
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const phone = normalizePhone(resetPhone);
    if (!isSupportedPhone(phone)) {
      setFeedback("error", "请输入中国大陆手机号，例如 13800000000");
      return;
    }

    if (resetPassword.length < 6) {
      setFeedback("error", "新密码至少需要 6 位");
      return;
    }

    setBusy(true);
    setFeedback("idle", "");

    const response = await fetch("/api/auth/dev-reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone,
        password: resetPassword,
      }),
    });

    const result = (await response.json()) as { error?: string; role?: string };

    if (!response.ok) {
      setFeedback("error", result.error ?? "重置失败");
      setBusy(false);
      return;
    }

    const email = getAuthEmailFromPhone(phone);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: resetPassword,
    });

    if (error) {
      setFeedback("success", "密码已重置，请返回登录页测试");
      setMode("login");
      setBusy(false);
      return;
    }

    setFeedback("success", "密码已重置，正在跳转...");
    setBusy(false);
    router.replace(getRolePath(result.role));
    router.refresh();
  }

  const noticeClass =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <ValuePropositionCard className="hidden lg:block" />

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Smartphone className="h-4 w-4" />
            手机号登录
          </div>
          <CardTitle className="text-2xl">注册 / 登录</CardTitle>
          <CardDescription>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
            {([
              ["login", "登录"],
              ["register", "注册"],
              ["reset", "重置密码"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setFeedback("idle", "");
                }}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium transition",
                  mode === key
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {notice ? (
            <div
              className={cn(
                "flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm",
                noticeClass
              )}
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}

          {mode === "login" ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="login-phone">手机号</Label>
                <Input
                  id="login-phone"
                  inputMode="tel"
                  placeholder="13800000000"
                  value={loginPhone}
                  onChange={(event) => setLoginPhone(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">密码</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="请输入密码"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy} type="submit">
                登录
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : null}

          {mode === "register" ? (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="space-y-2">
                <Label htmlFor="register-phone">手机号</Label>
                <Input
                  id="register-phone"
                  inputMode="tel"
                  placeholder="13800000000"
                  value={registerPhone}
                  onChange={(event) => setRegisterPhone(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">密码</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="至少 6 位"
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>选择角色</Label>
                <RadioGroup
                  value={registerRole}
                  onValueChange={(value) => setRegisterRole(value as UserRole)}
                  className="grid grid-cols-2 gap-3"
                >
                  {[
                    ["tutor", "家教"],
                    ["parent", "家长"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm hover:bg-slate-50"
                    >
                      <div>
                        <div className="font-medium text-slate-950">{label}</div>
                        <div className="text-xs text-slate-500">
                          {value === "tutor" ? "注册后完善教学资料" : "注册后发布家教需求"}
                        </div>
                      </div>
                      <RadioGroupItem value={value} />
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <Button className="w-full" disabled={busy} type="submit">
                注册并继续
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : null}

          {mode === "reset" ? (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <Label htmlFor="reset-phone">手机号</Label>
                <Input
                  id="reset-phone"
                  inputMode="tel"
                  placeholder="13800000000"
                  value={resetPhone}
                  onChange={(event) => setResetPhone(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-password">新密码</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="开发环境直接重置"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy} type="submit" variant="outline">
                重置密码
                <KeyRound className="h-4 w-4" />
              </Button>
              <p className="text-xs leading-6 text-slate-500">
                当前“重置密码”仅用于本地开发测试。生产环境仍应接入短信验证码或正式找回密码流程。
              </p>
            </form>
          ) : null}

          <p className="text-xs leading-6 text-slate-500">
            只支持中国大陆手机号。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
