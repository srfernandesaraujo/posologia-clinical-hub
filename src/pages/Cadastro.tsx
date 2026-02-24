import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pill, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: "auth.pwWeak", color: "bg-destructive" };
  if (score <= 3) return { score, label: "auth.pwMedium", color: "bg-yellow-500" };
  return { score, label: "auth.pwStrong", color: "bg-green-500" };
}

export default function Cadastro() {
  const { t } = useTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const requirements = [
    { met: password.length >= 6, label: t("auth.reqMinChars") },
    { met: /[A-Z]/.test(password), label: t("auth.reqUppercase") },
    { met: /[0-9]/.test(password), label: t("auth.reqNumber") },
  ];

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("auth.accountCreated"));
      navigate("/login");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
            <Pill className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("auth.createYourAccount")}</h1>
          <p className="text-muted-foreground mt-2">{t("auth.freeAccess")}</p>
        </div>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("auth.fullName")}</Label>
            <Input id="name" placeholder={t("auth.namePlaceholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" placeholder={t("auth.minChars")} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {/* Password strength bar */}
            {password.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        i <= strength.score ? strength.color : "bg-muted"
                      )}
                    />
                  ))}
                </div>
                <p className={cn("text-xs font-medium", strength.score <= 1 ? "text-destructive" : strength.score <= 3 ? "text-yellow-600" : "text-green-600")}>
                  {t(strength.label)}
                </p>
                <ul className="space-y-1">
                  {requirements.map((req, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {req.met ? <Check className="h-3 w-3 text-green-500" /> : <X className="h-3 w-3 text-muted-foreground/50" />}
                      {req.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("auth.creatingAccount") : t("auth.createFreeAccount")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">{t("auth.login")}</Link>
        </p>
      </div>
    </div>
  );
}
