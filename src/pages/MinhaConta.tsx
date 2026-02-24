import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { Crown, Loader2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MinhaConta() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { isPremium, subscriptionEnd, loading: subLoading, openCustomerPortal } = useSubscription();
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("has_unlimited_access")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          setHasUnlimitedAccess(data?.has_unlimited_access === true);
        });
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle()
        .then(({ data }) => {
          setIsAdmin(!!data);
        });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) setFullName(data.full_name || "");
        });
    }
  }, [user]);

  const isInvitedOrAdmin = hasUnlimitedAccess || isAdmin;
  const hasFullAccess = isPremium || isInvitedOrAdmin;

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) toast.error(t("account.error"));
    else toast.success(t("account.saved"));
  };

  const handleManagePortal = async () => {
    try {
      await openCustomerPortal();
    } catch {
      toast.error("Erro ao abrir portal de assinatura.");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-3xl font-bold mb-8">{t("account.title")}</h1>
      <div className="space-y-6 rounded-2xl border border-border bg-card p-8">
        <div className="space-y-2">
          <Label>{t("auth.email")}</Label>
          <Input value={user?.email || ""} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">{t("auth.fullName")}</Label>
          <Input
            id="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? t("account.saving") : t("account.save")}
        </Button>
      </div>

      {/* Subscription section */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-8">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5" />
          {t("account.subscription")}
        </h2>
        {subLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </div>
        ) : hasFullAccess ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1.5">
                {isInvitedOrAdmin ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {t("plans.fullAccess")}
                  </>
                ) : (
                  "Premium Ativo"
                )}
              </span>
            </div>
            {subscriptionEnd && !isInvitedOrAdmin && (
              <p className="text-sm text-muted-foreground">
                {t("plans.validUntil")} {new Date(subscriptionEnd).toLocaleDateString("pt-BR")}
              </p>
            )}
            {!isInvitedOrAdmin && (
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleManagePortal}>
                  {t("plans.manage")}
                </Button>
                <Button variant="destructive" onClick={handleManagePortal}>
                  {t("account.cancelPlan")}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("account.freePlanDesc")}
            </p>
            <Button onClick={() => navigate("/planos")}>
              <Crown className="h-4 w-4 mr-2" />
              {t("account.viewPlans")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
