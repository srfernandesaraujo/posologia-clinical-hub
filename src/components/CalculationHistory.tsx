import { useState } from "react";
import { History, Trash2, Search, X, ShieldCheck, ShieldOff, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCalculationHistory, type CalculationEntry } from "@/hooks/useCalculationHistory";
import { toast } from "sonner";

interface Props {
  calculatorSlug?: string; // if provided, filter to this calculator only
}

export function CalculationHistory({ calculatorSlug }: Props) {
  const { entries, hasConsent, grantConsent, revokeConsent, deleteEntry, clearHistory, getByCalculator } = useCalculationHistory();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = (calculatorSlug ? getByCalculator(calculatorSlug) : entries).filter(
    (e) =>
      !search ||
      e.calculatorName.toLowerCase().includes(search.toLowerCase()) ||
      e.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      e.summary.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <History className="h-4 w-4" />
          Histórico
          {hasConsent && entries.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{calculatorSlug ? getByCalculator(calculatorSlug).length : entries.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Histórico de Cálculos
          </DialogTitle>
        </DialogHeader>

        {/* Consent */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2">
            {hasConsent ? <ShieldCheck className="h-4 w-4 text-green-500" /> : <ShieldOff className="h-4 w-4 text-muted-foreground" />}
            <Label htmlFor="consent" className="text-sm cursor-pointer">
              {hasConsent ? "Histórico ativado (dados locais)" : "Ativar histórico local"}
            </Label>
          </div>
          <Switch
            id="consent"
            checked={hasConsent}
            onCheckedChange={(checked) => {
              if (checked) {
                grantConsent();
                toast.success("Histórico ativado! Dados salvos apenas no seu dispositivo.");
              } else {
                revokeConsent();
                toast.info("Histórico desativado e dados removidos.");
              }
            }}
          />
        </div>

        {!hasConsent && (
          <div className="text-sm text-muted-foreground text-center py-6 space-y-2">
            <p>O histórico salva seus cálculos <strong>localmente no navegador</strong>.</p>
            <p>Nenhum dado é enviado para servidores. Ative acima para começar.</p>
          </div>
        )}

        {hasConsent && (
          <>
            {/* Search and clear */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente ou cálculo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              {entries.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => {
                    clearHistory();
                    toast.info("Histórico limpo.");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Limpar
                </Button>
              )}
            </div>

            {/* Entries */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {search ? "Nenhum resultado encontrado." : "Nenhum cálculo salvo ainda."}
                </p>
              )}
              {filtered.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  expanded={expandedId === entry.id}
                  onToggle={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  onDelete={() => {
                    deleteEntry(entry.id);
                    toast.info("Registro removido.");
                  }}
                  formatDate={formatDate}
                  showCalcName={!calculatorSlug}
                />
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EntryCard({
  entry,
  expanded,
  onToggle,
  onDelete,
  formatDate,
  showCalcName,
}: {
  entry: CalculationEntry;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  formatDate: (iso: string) => string;
  showCalcName: boolean;
}) {
  return (
    <div className="border rounded-lg p-3 space-y-1.5 hover:bg-muted/20 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <button onClick={onToggle} className="flex-1 text-left space-y-0.5">
          {showCalcName && <p className="text-xs font-medium text-primary">{entry.calculatorName}</p>}
          <p className="text-sm font-semibold">{entry.summary}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDate(entry.createdAt)}
            {entry.patientName && (
              <>
                <span>•</span>
                <span>{entry.patientName}</span>
              </>
            )}
          </div>
        </button>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onToggle} className="p-1 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="pt-2 border-t space-y-1">
          {Object.entries(entry.details).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{key}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Consent Banner: use at the top of any calculator ─── */
export function HistoryConsentBanner() {
  const { hasConsent, grantConsent } = useCalculationHistory();
  const [dismissed, setDismissed] = useState(false);

  if (hasConsent || dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary shrink-0" />
        <span>Deseja salvar seus cálculos localmente para revisitar depois?</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>Não</Button>
        <Button size="sm" onClick={grantConsent}>Ativar</Button>
      </div>
    </div>
  );
}
