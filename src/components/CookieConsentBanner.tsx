import { useState } from "react";
import { Link } from "react-router-dom";
import { useCookieConsent, type CookieConsent } from "@/contexts/CookieConsentContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, Settings, Cookie } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

const categories: { key: keyof CookieConsent; label: string; description: string; locked?: boolean }[] = [
  { key: "essential", label: "Essenciais", description: "Autenticação, sessão e segurança. Sempre ativos.", locked: true },
  { key: "preferences", label: "Preferências", description: "Idioma, tema e configurações de exibição." },
  { key: "analytics", label: "Desempenho e Analytics", description: "Páginas visitadas, ferramentas mais usadas, tempo de uso. Dados anônimos para melhorar a plataforma." },
  { key: "marketing", label: "Marketing", description: "Origem do visitante e jornada de navegação para otimizar comunicações." },
];

export function CookieConsentBanner() {
  const { hasConsented, consent, updateConsent, acceptAll, rejectOptional, preferencesOpen, setPreferencesOpen } = useCookieConsent();
  const [draft, setDraft] = useState<CookieConsent>(consent);

  if (hasConsented && !preferencesOpen) return null;

  const handleSave = () => {
    updateConsent(draft);
    setPreferencesOpen(false);
  };

  const handleOpenPrefs = () => {
    setDraft(consent);
    setPreferencesOpen(true);
  };

  return (
    <>
      {/* Banner */}
      {!hasConsented && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-0 inset-x-0 z-[100] p-4">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl p-5 sm:p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Utilizamos cookies</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Usamos cookies para garantir o funcionamento da plataforma e, com sua permissão, para melhorar sua experiência e entender como você utiliza nossos serviços.{" "}
                  <Link to="/politica-cookies" className="text-primary hover:underline">Saiba mais</Link>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button variant="outline" size="sm" onClick={rejectOptional} className="text-xs">
                Rejeitar Opcionais
              </Button>
              <Button variant="outline" size="sm" onClick={handleOpenPrefs} className="text-xs gap-1.5">
                <Settings className="h-3.5 w-3.5" />
                Gerenciar Preferências
              </Button>
              <Button size="sm" onClick={acceptAll} className="text-xs">
                Aceitar Todos
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Controle quais categorias de cookies você deseja permitir. Cookies essenciais não podem ser desativados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {categories.map((cat) => (
              <div key={cat.key} className="flex items-start justify-between gap-4 rounded-xl border border-border bg-secondary/30 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{cat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                </div>
                <Switch
                  checked={cat.locked ? true : draft[cat.key]}
                  disabled={cat.locked}
                  onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, [cat.key]: checked }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setPreferencesOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Salvar Preferências
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
