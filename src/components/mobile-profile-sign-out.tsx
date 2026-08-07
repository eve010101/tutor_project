import { LogOut } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";

export function MobileProfileSignOut() {
  return (
    <section className="border-t border-slate-200 pt-6 md:hidden">
      <div className="mb-3 flex items-center gap-2">
        <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h2 className="text-sm font-medium text-slate-900">账号操作</h2>
      </div>
      <SignOutButton />
    </section>
  );
}
