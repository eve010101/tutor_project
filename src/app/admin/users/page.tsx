import { AdminDeleteUserForm } from "@/components/admin-delete-user-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminUser } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizeTutorReviewStatus } from "@/lib/tutor-review-status";

type ProfileRow = {
  id: string;
  phone?: string | null;
  role?: string | null;
  full_name?: string | null;
  city?: string | null;
  created_at?: string | null;
};

type TutorStatusRow = {
  user_id: string;
  status?: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminUsersPage() {
  const adminSupabase = createSupabaseAdminClient();
  const [{ data: authData, error: authError }, profileResult, tutorResult] =
    await Promise.all([
      adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      adminSupabase
        .from("profiles")
        .select("id, phone, role, full_name, city, created_at"),
      adminSupabase.from("tutor_profiles").select("user_id, status"),
    ]);

  if (authError || profileResult.error || tutorResult.error) {
    throw new Error("用户列表读取失败，请检查管理员服务配置");
  }

  const profileMap = new Map(
    ((profileResult.data ?? []) as ProfileRow[]).map((item) => [item.id, item]),
  );
  const tutorStatusMap = new Map(
    ((tutorResult.data ?? []) as TutorStatusRow[]).map((item) => [
      item.user_id,
      normalizeTutorReviewStatus(item.status),
    ]),
  );
  const users = authData.users
    .map((user) => ({
      id: user.id,
      email: user.email ?? null,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
      profile: profileMap.get(user.id),
      tutorStatus: tutorStatusMap.get(user.id),
      isAdmin: isAdminUser(user.id),
    }))
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section>
          <p className="text-sm font-medium text-sky-700">管理员</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-950">
            用户管理
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            共 {users.length}{" "}
            个认证账号。删除用户会同步清理其资料、需求、匹配记录和存储文件。
          </p>
        </section>

        <section className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">
                      {user.profile?.full_name?.trim() || "未填写姓名"}
                    </CardTitle>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {user.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {user.isAdmin ? (
                      <span className="rounded-full bg-violet-100 px-3 py-1 text-violet-700">
                        管理员
                      </span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      {user.profile?.role === "parent" ? "家长" : "家教"}
                    </span>
                    {user.tutorStatus ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                        审核：{user.tutorStatus}
                      </span>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-slate-500">手机号</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {user.profile?.phone || "未绑定"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">城市</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {user.profile?.city || "未填写"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">注册时间</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {dateFormatter.format(new Date(user.createdAt))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">最后登录</dt>
                    <dd className="mt-1 font-medium text-slate-900">
                      {user.lastSignInAt
                        ? dateFormatter.format(new Date(user.lastSignInAt))
                        : "尚未登录"}
                    </dd>
                  </div>
                </dl>
                {user.isAdmin ? (
                  <span className="text-xs text-slate-500">
                    管理员账号受保护
                  </span>
                ) : (
                  <AdminDeleteUserForm userId={user.id} />
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
