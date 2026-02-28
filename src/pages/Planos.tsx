import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Check, X, Crown, Zap, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const features = [
  { key: "calculators", free: "3 por dia", premium: "Ilimitadas" },
  { key: "simulators", free: false, premium: true },
  { key: "pdf", free: false, premium: true },
  { key: "virtualRooms", free: false, premium: true },
  { key: "priority", free: false, premium: true },
];

const featureLabels: Record<string, string> = {
  calculators: "Calculadoras Clínicas",
  simulators: "Simuladores Avançados",
  pdf: "Relatórios em PDF",
  virtualRooms: "Salas Virtuais Ilimitadas",
  priority: "Suporte Prioritário",
};

export default function Planos() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isPremium, subscriptionEnd, loading, startCheckout, openCustomerPortal } = useSubscription();
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("has_unlimited_access").eq("user_id", user.id).single().then(({ data }) => {
        setHasUnlimitedAccess(data?.has_unlimited_access === true);
      });
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
        setIsAdmin(!!data);
      });
    }
  }, [user]);

  const isInvitedOrAdmin = hasUnlimitedAccess || isAdmin;
  const hasFullAccess = isPremium || isInvitedOrAdmin;

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      await startCheckout();
    } catch {
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    }
  };

  const handleManage = async () => {
    try {
      await openCustomerPortal();
    } catch {
      toast.error("Erro ao abrir portal. Tente novamente.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t("plans.title")}</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          {t("plans.subtitle")}
        </p>
      </div>

      {/* Invited/Admin full access banner */}
      {isInvitedOrAdmin && (
        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 flex items-center gap-4 max-w-3xl mx-auto">
          <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
          <div>
            <h3 className="font-bold text-lg">{t("plans.fullAccess")}</h3>
            <p className="text-sm text-muted-foreground">{t("plans.fullAccessDesc")}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
        {/* Free Plan */}
        <div
          className={cn(
            "rounded-2xl border-2 p-8 flex flex-col",
            !hasFullAccess ? "border-primary bg-primary/5" : "border-border bg-card"
          )}
        >
          {!hasFullAccess && (
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 w-fit mb-4">
              {t("plans.currentPlan")}
            </span>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-2xl font-bold">{t("plans.free")}</h2>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-extrabold">R$0</span>
            <span className="text-muted-foreground">/mês</span>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {features.map((f) => (
              <li key={f.key} className="flex items-center gap-3 text-sm">
                {f.free ? (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                )}
                <span className={cn(!f.free && "text-muted-foreground/60")}>
                  {featureLabels[f.key]}
                  {typeof f.free === "string" && (
                    <span className="text-xs text-muted-foreground ml-1">({f.free})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {!hasFullAccess && (
            <Button variant="outline" disabled className="w-full">
              {t("plans.currentPlan")}
            </Button>
          )}
        </div>

        {/* Premium Plan */}
        <div
          className={cn(
            "rounded-2xl border-2 p-8 flex flex-col relative overflow-hidden",
            hasFullAccess ? "border-primary bg-primary/5" : "border-primary/50 bg-card"
          )}
        >
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-bl-lg">
            {t("plans.recommended")}
          </div>
          {hasFullAccess && (
            <span className="text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1 w-fit mb-4">
              {isInvitedOrAdmin ? t("plans.fullAccess") : t("plans.currentPlan")}
            </span>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <h2 className="text-2xl font-bold">Premium</h2>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-extrabold">R$29,90</span>
            <span className="text-muted-foreground">/mês</span>
          </div>
          <ul className="space-y-3 flex-1 mb-8">
            {features.map((f) => (
              <li key={f.key} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>
                  {featureLabels[f.key]}
                  {typeof f.premium === "string" && (
                    <span className="text-xs text-muted-foreground ml-1">({f.premium})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {loading ? (
            <Button disabled className="w-full">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t("common.loading")}
            </Button>
          ) : isInvitedOrAdmin ? (
            <Button variant="outline" disabled className="w-full">
              {t("plans.fullAccess")}
            </Button>
          ) : isPremium ? (
            <div className="space-y-2">
              <Button onClick={handleManage} variant="outline" className="w-full">
                {t("plans.manage")}
              </Button>
              <Button onClick={handleManage} variant="destructive" className="w-full">
                Cancelar Plano
              </Button>
              {subscriptionEnd && (
                <p className="text-xs text-center text-muted-foreground">
                  {t("plans.validUntil")} {new Date(subscriptionEnd).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          ) : (
            <Button onClick={handleSubscribe} className="w-full">
              <Crown className="h-4 w-4 mr-2" />
              {t("plans.subscribe")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
