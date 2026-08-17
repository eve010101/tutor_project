import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "密码重置暂不可用，请等待短信验证码找回流程上线" },
    { status: 501 },
  );
}
