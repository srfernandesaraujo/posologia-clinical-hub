import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function MinhaConta() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

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
    </div>
  );
}
