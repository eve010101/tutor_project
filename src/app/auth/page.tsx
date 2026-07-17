import { AuthPanel } from "@/components/auth-panel";
import { redirectAuthenticatedUser } from "@/lib/auth";

export default async function AuthPage() {
  await redirectAuthenticatedUser();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl items-center">
        <div className="w-full">
          <AuthPanel />
        </div>
      </div>
    </main>
  );
}
