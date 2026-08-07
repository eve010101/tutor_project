import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DevNavigation } from "@/components/dev-navigation";
import { GlobalNavigation } from "@/components/global-navigation";
import { SiteFooter } from "@/components/site-footer";
import { getCurrentUserProfile } from "@/lib/auth";
import type { UserRole } from "@/types/auth";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "北京家教撮合平台",
  description: "连接北京地区大学生家教和有需求的家长",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, profile } = await getCurrentUserProfile();
  const role: UserRole | null =
    user && (profile?.role === "tutor" || profile?.role === "parent")
      ? profile.role
      : null;

  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-white text-slate-950 antialiased`}>
        <GlobalNavigation role={role} />
        <div
          className={role || process.env.NODE_ENV === "development" ? "pb-16 md:pb-0" : undefined}
        >
          {children}
          <SiteFooter />
        </div>
        <DevNavigation />
      </body>
    </html>
  );
}
