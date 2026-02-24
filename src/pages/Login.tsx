import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Forgot password state
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setResetLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.resetLinkSent"));
      setResetOpen(false);
      setResetEmail("");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
            <Pill className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.welcomeBack")}</h1>
          <p className="text-muted-foreground mt-2">{t("auth.loginSubtitle")}</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.loggingIn") : t("auth.login")}
          </Button>
        </form>
        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              setResetEmail(email);
              setResetOpen(true);
            }}
            className="text-sm text-primary hover:underline"
          >
            {t("auth.forgotPassword")}
          </button>
          <p className="text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link to="/cadastro" className="font-medium text-primary hover:underline">{t("auth.signUp")}</Link>
          </p>
        </div>
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("auth.resetPasswordTitle")}</DialogTitle>
            <DialogDescription>{t("auth.resetPasswordDesc")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t("auth.email")}</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={resetLoading}>
              <Mail className="h-4 w-4" />
              {resetLoading ? t("auth.sendingLink") : t("auth.sendResetLink")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
