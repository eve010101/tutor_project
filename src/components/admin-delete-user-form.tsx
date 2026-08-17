"use client";

import { useState } from "react";

import { deletePlatformUser } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminDeleteUserForm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const expected = `DELETE ${userId}`;

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        type="button"
        variant="destructive"
      >
        删除用户
      </Button>
    );
  }

  return (
    <form
      action={deletePlatformUser}
      className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-3"
    >
      <input name="userId" type="hidden" value={userId} />
      <p className="text-xs leading-5 text-red-800">
        此操作不可恢复。请输入
        <code className="mx-1 break-all font-semibold">{expected}</code>
        确认删除。
      </p>
      <Input
        autoComplete="off"
        name="confirmation"
        placeholder={expected}
        required
      />
      <div className="flex gap-2">
        <Button size="sm" type="submit" variant="destructive">
          永久删除
        </Button>
        <Button
          onClick={() => setOpen(false)}
          size="sm"
          type="button"
          variant="outline"
        >
          取消
        </Button>
      </div>
    </form>
  );
}
