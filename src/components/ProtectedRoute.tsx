import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Clock, Ban } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, userStatus } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (userStatus === "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto inline-flex rounded-2xl bg-amber-500/10 p-4">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.pendingApproval")}</h1>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="text-sm text-primary hover:underline"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>
    );
  }

  if (userStatus === "inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto inline-flex rounded-2xl bg-destructive/10 p-4">
            <Ban className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.accountInactive")}</h1>
          <button
            onClick={() => { window.location.href = "/"; }}
            className="text-sm text-primary hover:underline"
          >
            {t("nav.logout")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
