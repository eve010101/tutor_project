import { NextResponse } from "next/server";

import {
  getAuthEmailFromPhone,
  isSupportedPhone,
  normalizePhone,
} from "@/lib/auth-identity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/auth";

export const runtime = "nodejs";

interface RegisterBody {
  phone?: string;
  password?: string;
  role?: UserRole;
}

function errorResponse(requestId: string, status: number, error: string) {
  return NextResponse.json(
    {
      ok: false,
      requestId,
      error,
      timestamp: new Date().toISOString(),
    },
    { status },
  );
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const body = (await request.json()) as RegisterBody;
    const phone = normalizePhone(body.phone ?? "");
    const password = body.password?.trim() ?? "";
    const role = body.role === "parent" ? "parent" : "tutor";
    const email = getAuthEmailFromPhone(phone);

    if (!isSupportedPhone(phone)) {
      return errorResponse(
        requestId,
        400,
        "请输入中国大陆手机号，例如 13800000000",
      );
    }

    if (password.length < 6) {
      return errorResponse(requestId, 400, "密码至少需要 6 位");
    }

    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        phone,
        role,
        auth_mode: "phone_alias",
      },
    });

    if (error) {
      console.error("[register] auth.admin.createUser failed", {
        requestId,
        code: error.code,
        status: error.status,
      });

      return errorResponse(requestId, 400, "注册失败，该手机号可能已注册");
    }

    if (!data.user) {
      console.error("[register] createUser returned no user", { requestId });
      return errorResponse(requestId, 500, "注册失败，请稍后重试");
    }

    return NextResponse.json({
      ok: true,
      requestId,
      role,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[register] unexpected error", {
      requestId,
      name: error instanceof Error ? error.name : "UnknownError",
    });

    return errorResponse(requestId, 500, "注册失败，请稍后重试");
  }
}
