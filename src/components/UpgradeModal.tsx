import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, FileText, DoorOpen, Calculator } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: string;
}

const PREMIUM_BENEFITS = [
  { icon: Calculator, label: "Calculadoras ilimitadas" },
  { icon: Zap, label: "Simuladores avançados" },
  { icon: FileText, label: "Relatórios em PDF" },
  { icon: DoorOpen, label: "Salas virtuais ilimitadas" },
];

export function UpgradeModal({ open, onOpenChange, feature }: UpgradeModalProps) {
  const { startCheckout } = useSubscription();

  const handleUpgrade = async () => {
    try {
      await startCheckout();
      onOpenChange(false);
    } catch {
      toast.error("Erro ao iniciar checkout. Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Recurso Premium</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          {feature && (
            <p className="text-sm text-muted-foreground">
              {feature} está disponível apenas no plano <strong>Posologia Premium</strong>.
            </p>
          )}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            {PREMIUM_BENEFITS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-lg font-bold text-primary">
            R$ 29,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button onClick={handleUpgrade} className="gap-2">
            <Crown className="h-4 w-4" />
            Assinar Premium
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
