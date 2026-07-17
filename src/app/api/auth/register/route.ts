import { NextResponse } from "next/server";

import { getAuthEmailFromPhone, isSupportedPhone, normalizePhone } from "@/lib/auth-identity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/auth";

interface RegisterBody {
  phone?: string;
  password?: string;
  role?: UserRole;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;
    const phone = normalizePhone(body.phone ?? "");
    const password = body.password?.trim() ?? "";
    const role = body.role === "parent" ? "parent" : "tutor";

    if (!isSupportedPhone(phone)) {
      return NextResponse.json(
        { error: "请输入中国大陆手机号，例如 13800000000" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少需要 6 位" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const email = getAuthEmailFromPhone(phone);

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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      userId: data.user.id,
      phone,
      role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "注册失败，请检查服务端配置";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
