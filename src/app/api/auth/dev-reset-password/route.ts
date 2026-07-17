import { NextResponse } from "next/server";

import { isSupportedPhone, normalizePhone } from "@/lib/auth-identity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface ResetBody {
  phone?: string;
  password?: string;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "生产环境下请接入短信验证码或正式找回密码流程" },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as ResetBody;
    const phone = normalizePhone(body.phone ?? "");
    const password = body.password?.trim() ?? "";

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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("phone", phone)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    if (!profile) {
      return NextResponse.json({ error: "该手机号未注册" }, { status: 404 });
    }

    const { error } = await supabase.auth.admin.updateUserById(profile.id, {
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      phone,
      role: profile.role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "重置失败，请检查服务端配置";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
