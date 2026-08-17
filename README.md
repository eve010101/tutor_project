# 北京家教信息撮合平台

基于 `Next.js 14 App Router + Supabase + Tailwind CSS + shadcn/ui` 的北京地区家教撮合平台初始化版本。

当前这版认证已经改成：

- 用户界面输入 `手机号 + 密码`
- `profiles.phone` 保存真实手机号
- Supabase Auth 底层使用 `Email + Password`
- 系统会把手机号映射成一个内部邮箱，例如 `phone-8613800000000@auth.tutor.local`

这样你可以直接做手机号注册和登录测试，不需要开启 Supabase Phone Auth。

## 已完成

- 手机号 + 密码注册
- 注册时选择角色：`家教 / 家长`
- 角色自动写入 `profiles` 表
- 手机号 + 密码登录
- 开发环境下手机号直接重置密码
- 注册完成后按角色跳转
  - 家教 -> 完善资料页
  - 家长 -> 发布需求页

## 环境变量

复制 `.env.example` 为 `.env.local`：

```bash
copy .env.example .env.local
```

填写以下变量：

```env
NEXT_PUBLIC_SUPABASE_URL=你的 Supabase Project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=你的 Supabase Publishable Key
NEXT_PUBLIC_SUPABASE_ANON_KEY=如果项目还是显示 anon key，也可以填这里
SUPABASE_SERVICE_ROLE_KEY=你的 Supabase Service Role Key
ADMIN_USER_IDS=管理员的Supabase用户UUID，多个用英文逗号分隔
```

说明：

- 登录和会话使用前端 `publishable/anon key`
- 注册和审核后台使用服务端 `SUPABASE_SERVICE_ROLE_KEY`
- 管理后台必须配置 `ADMIN_USER_IDS`；未配置时默认拒绝所有访问

## Supabase 配置

### 1. 启用 Email Auth

在 Supabase Dashboard 的 `Authentication` 中确认：

- 已开启 `Email`
- 不需要开启 `Phone`

### 2. 执行数据库 SQL

在 Supabase `SQL Editor` 中执行：

- 首次初始化： [supabase/initial_schema.sql](</C:/Users/weimi/Documents/New project/tutor-platform/supabase/initial_schema.sql>)
- 如果你之前已经执行过旧版 SQL，再额外执行： [supabase/update_phone_alias_auth.sql](</C:/Users/weimi/Documents/New project/tutor-platform/supabase/update_phone_alias_auth.sql>)

第二个 SQL 的作用是把 `auth.users -> profiles` 的触发器改成从 `user_metadata.phone` 写入手机号。

## 本地预览

在项目目录运行：

```bash
cd "C:\Users\weimi\Documents\New project\tutor-platform"
npm.cmd install
npm.cmd run dev
```

打开：

[http://localhost:3000](http://localhost:3000)

## 认证实现说明

### 注册

注册时前端把手机号发给服务端接口：

- `POST /api/auth/register`

服务端会：

1. 规范化手机号，例如 `13800000000 -> +8613800000000`
2. 把手机号映射成内部邮箱
3. 用 `supabase.auth.admin.createUser()` 创建用户
4. 设置 `email_confirm: true`
5. 把手机号和角色写到 `user_metadata`

创建完成后，前端再立即用映射邮箱调用 `signInWithPassword` 登录。

### 登录

登录页面仍然输入手机号。

前端会先把手机号映射成内部邮箱，再调用：

- `supabase.auth.signInWithPassword({ email, password })`

### 重置密码

当前“重置密码”只用于本地开发测试，不是生产方案。

- 接口：`POST /api/auth/dev-reset-password`
- 通过 `profiles.phone` 找到用户
- 服务端调用 `auth.admin.updateUserById()` 修改密码

生产环境应改成短信验证码或正式找回密码流程。

## 主要页面

- 首页： [src/app/page.tsx](</C:/Users/weimi/Documents/New project/tutor-platform/src/app/page.tsx>)
- 登录 / 注册： [src/app/auth/page.tsx](</C:/Users/weimi/Documents/New project/tutor-platform/src/app/auth/page.tsx>)
- 家教资料页： [src/app/tutor/profile/page.tsx](</C:/Users/weimi/Documents/New project/tutor-platform/src/app/tutor/profile/page.tsx>)
- 家长需求页： [src/app/parent/request/page.tsx](</C:/Users/weimi/Documents/New project/tutor-platform/src/app/parent/request/page.tsx>)

## 推送到 GitHub

```bash
cd "C:\Users\weimi\Documents\New project\tutor-platform"
git add .
git commit -m "feat: switch auth to phone alias email auth"
git branch -M main
git remote add origin 你的仓库地址
git push -u origin main
```

## 已验证

我会再运行一次：

- `npm.cmd run lint`
- `npm.cmd run build`
