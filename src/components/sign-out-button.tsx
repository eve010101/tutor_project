"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  className?: string;
  compact?: boolean;
};

export function SignOutButton({
  className,
  compact = false,
}: SignOutButtonProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSignOut() {
    setIsSigningOut(true);
    setErrorMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage("退出失败，请稍后重试");
      setIsSigningOut(false);
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <button
        className={cn(
          "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !compact && "w-full border border-slate-200 bg-white",
        )}
        disabled={isSigningOut}
        onClick={handleSignOut}
        type="button"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {isSigningOut ? "正在退出..." : "退出登录"}
      </button>
      {errorMessage ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
