import { NextResponse } from "next/server";

import {
  getAuthEmailFromPhone,
  isSupportedPhone,
  normalizePhone,
} from "@/lib/auth-identity";
import { getSupabaseProjectUrl } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/auth";

export const runtime = "nodejs";

interface RegisterBody {
  phone?: string;
  password?: string;
  role?: UserRole;
}

function maskPhone(phone: string) {
  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 5)}****${phone.slice(-4)}`;
}

function serializeUnknownError(error: unknown) {
  if (error instanceof Error) {
    const errorRecord = error as unknown as Record<string, unknown>;
    const ownProps = Object.fromEntries(
      Object.getOwnPropertyNames(error).map((key) => [
        key,
        errorRecord[key],
      ])
    );

    return {
      type: "Error",
      name: error.name,
      message: error.message,
      stack: error.stack,
      ownProps,
    };
  }

  if (typeof error === "object" && error !== null) {
    const objectError = error as Record<string, unknown>;

    return {
      type: "Object",
      ownProps: Object.fromEntries(
        Object.getOwnPropertyNames(objectError).map((key) => [key, objectError[key]])
      ),
    };
  }

  return {
    type: typeof error,
    value: error,
  };
}

function errorResponse(
  requestId: string,
  status: number,
  error: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      ok: false,
      requestId,
      error,
      details: details ?? null,
      timestamp: new Date().toISOString(),
    },
    { status }
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

    console.log("[register] incoming request", {
      requestId,
      phone: maskPhone(phone),
      role,
      email,
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
      normalizedSupabaseUrl: getSupabaseProjectUrl(),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      serviceRoleKeyPrefix:
        process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 12) ?? null,
      bodyKeys: Object.keys(body ?? {}),
    });

    if (!isSupportedPhone(phone)) {
      const details = {
        phone,
        reason: "unsupported_phone_format",
      };

      console.error("[register] invalid phone", {
        requestId,
        ...details,
      });

      return errorResponse(
        requestId,
        400,
        "请输入中国大陆手机号，例如 13800000000",
        details
      );
    }

    if (password.length < 6) {
      const details = {
        passwordLength: password.length,
        reason: "password_too_short",
      };

      console.error("[register] invalid password length", {
        requestId,
        ...details,
      });

      return errorResponse(requestId, 400, "密码至少需要 6 位", details);
    }

    const supabase = createSupabaseAdminClient();

    console.log("[register] calling auth.admin.createUser", {
      requestId,
      email,
      role,
      phone: maskPhone(phone),
    });

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
      const details = serializeUnknownError(error);

      console.error("[register] auth.admin.createUser failed", {
        requestId,
        details,
      });

      return errorResponse(
        requestId,
        400,
        error.message || "Supabase createUser failed",
        details as Record<string, unknown>
      );
    }

    if (!data.user) {
      const details = {
        reason: "missing_user_in_response",
        data,
      };

      console.error("[register] createUser returned no user", {
        requestId,
        details,
      });

      return errorResponse(requestId, 500, "Supabase 未返回用户数据", details);
    }

    console.log("[register] createUser succeeded", {
      requestId,
      userId: data.user.id,
      email: data.user.email,
      phone: maskPhone(phone),
      role,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      userId: data.user.id,
      phone,
      role,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const details = serializeUnknownError(error);

    console.error("[register] unexpected error", {
      requestId,
      details,
    });

    const message =
      error instanceof Error ? error.message : "注册失败，请检查服务端配置";

    return errorResponse(
      requestId,
      500,
      message,
      details as Record<string, unknown>
    );
  }
}
