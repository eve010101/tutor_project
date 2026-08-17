"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import {
  dismissRegistrationOnboarding,
  shouldShowRegistrationOnboarding,
} from "@/lib/registration-onboarding";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/auth";
import { Button } from "@/components/ui/button";

const bannerContent: Record<
  UserRole,
  { message: string; actionLabel: string; actionHref: string }
> = {
  tutor: {
    message:
      "欢迎加入燕启家教！你可以先浏览家长需求，如果想接单，请先完善个人资料并通过学信网审核。",
    actionLabel: "去完善资料",
    actionHref: "/tutor/profile",
  },
  parent: {
    message:
      "欢迎加入燕启家教！你可以浏览家教信息，如果想发布需求让合适的老师主动联系你，请发布你的需求。",
    actionLabel: "发布需求",
    actionHref: "/parent/request",
  },
};

export function RegistrationOnboardingBanner({
  role,
  className,
}: {
  role: UserRole;
  className?: string;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [userId, setUserId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const content = bannerContent[role];

  useEffect(() => {
    let active = true;

    async function loadBannerState() {
      const { data } = await supabase.auth.getUser();
      const currentUserId = data.user?.id;

      if (
        active &&
        currentUserId &&
        shouldShowRegistrationOnboarding(currentUserId, role)
      ) {
        setUserId(currentUserId);
        setVisible(true);
      }
    }

    void loadBannerState();
    return () => {
      active = false;
    };
  }, [role, supabase]);

  if (!visible || !userId) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4 shadow-sm sm:px-5",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7 text-sky-950">{content.message}</p>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <Button asChild size="sm">
            <Link href={content.actionHref}>{content.actionLabel}</Link>
          </Button>
          <button
            type="button"
            aria-label="关闭新手引导"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-sky-700 transition hover:bg-sky-100 hover:text-sky-950"
            onClick={() => {
              dismissRegistrationOnboarding(userId, role);
              setVisible(false);
            }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
