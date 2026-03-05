import { useState, useMemo } from "react";
import { History, Trash2, Search, X, ShieldCheck, ShieldOff, ChevronDown, ChevronUp, Clock, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCalculationHistory, type CalculationEntry } from "@/hooks/useCalculationHistory";
import { toast } from "sonner";
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip, YAxis, XAxis,
} from "recharts";

interface Props {
  calculatorSlug?: string;
}

/* ─── Extract numeric value from summary string ─── */
function extractNumericValue(summary: string): number | null {
  // Matches patterns like "12%", "12.5", "Risco: 12%", "Score: 8", "HOMA-IR: 2.5"
  const match = summary.match(/([\d]+[.,]?\d*)\s*%?/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", "."));
}

/* ─── Group entries by patient for trend analysis ─── */
function groupByPatientAndCalc(entries: CalculationEntry[]) {
  const groups = new Map<string, CalculationEntry[]>();
  for (const e of entries) {
    if (!e.patientName?.trim()) continue;
    const key = `${e.patientName.toLowerCase().trim()}::${e.calculatorSlug}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  // Only return groups with 2+ entries (need at least 2 points for a trend)
  const result: { patientName: string; calculatorName: string; calculatorSlug: string; entries: CalculationEntry[] }[] = [];
  for (const [key, items] of groups) {
    if (items.length < 2) continue;
    const sorted = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    result.push({
      patientName: sorted[0].patientName!,
      calculatorName: sorted[0].calculatorName,
      calculatorSlug: sorted[0].calculatorSlug,
      entries: sorted,
    });
  }
  return result.sort((a, b) => {
    const lastA = new Date(a.entries[a.entries.length - 1].createdAt).getTime();
    const lastB = new Date(b.entries[b.entries.length - 1].createdAt).getTime();
    return lastB - lastA;
  });
}

export function CalculationHistory({ calculatorSlug }: Props) {
  const { entries, hasConsent, grantConsent, revokeConsent, deleteEntry, clearHistory, getByCalculator } = useCalculationHistory();
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"list" | "trends">("list");

  const baseEntries = calculatorSlug ? getByCalculator(calculatorSlug) : entries;

  const filtered = baseEntries.filter(
    (e) =>
      !search ||
      e.calculatorName.toLowerCase().includes(search.toLowerCase()) ||
      e.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      e.summary.toLowerCase().includes(search.toLowerCase())
  );

  const trendGroups = useMemo(() => groupByPatientAndCalc(baseEntries), [baseEntries]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
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
            {/* Tabs: List vs Trends */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "list" | "trends")} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Registros
                </TabsTrigger>
                <TabsTrigger value="trends" className="gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Tendências
                  {trendGroups.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{trendGroups.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* ─── List Tab ─── */}
              <TabsContent value="list" className="flex-1 flex flex-col min-h-0 mt-3 space-y-2">
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
              </TabsContent>

              {/* ─── Trends Tab ─── */}
              <TabsContent value="trends" className="flex-1 overflow-y-auto min-h-0 mt-3 space-y-3">
                {trendGroups.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
                    <TrendingUp className="h-8 w-8 mx-auto opacity-30" />
                    <p>Nenhuma tendência disponível ainda.</p>
                    <p className="text-xs">Preencha o <strong>nome do paciente</strong> nos cálculos para visualizar a evolução temporal dos valores.</p>
                  </div>
                ) : (
                  trendGroups.map((group, gi) => (
                    <TrendCard key={gi} group={group} formatShortDate={formatShortDate} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Trend Card with Sparkline ─── */
function TrendCard({
  group,
  formatShortDate,
}: {
  group: { patientName: string; calculatorName: string; calculatorSlug: string; entries: CalculationEntry[] };
  formatShortDate: (iso: string) => string;
}) {
  const chartData = useMemo(() => {
    return group.entries
      .map((e) => {
        const value = extractNumericValue(e.summary);
        if (value === null) return null;
        return {
          date: formatShortDate(e.createdAt),
          fullDate: new Date(e.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }),
          value,
          summary: e.summary,
        };
      })
      .filter(Boolean) as { date: string; fullDate: string; value: number; summary: string }[];
  }, [group.entries, formatShortDate]);

  if (chartData.length < 2) return null;

  const lastValue = chartData[chartData.length - 1].value;
  const prevValue = chartData[chartData.length - 2].value;
  const delta = lastValue - prevValue;
  const deltaPercent = prevValue !== 0 ? ((delta / prevValue) * 100).toFixed(1) : "–";
  const isUp = delta > 0;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold">{group.patientName}</span>
          </div>
          <p className="text-xs text-muted-foreground">{group.calculatorName}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{lastValue}</p>
          <div className={`flex items-center gap-0.5 text-xs ${isUp ? "text-red-500" : "text-green-500"}`}>
            <TrendingUp className={`h-3 w-3 ${!isUp ? "rotate-180" : ""}`} />
            <span>{isUp ? "+" : ""}{deltaPercent}%</span>
          </div>
        </div>
      </div>

      {/* Sparkline */}
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis hide domain={["auto", "auto"]} />
            <RechartsTooltip
              contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
              formatter={(value: number, _name: string, props: any) => [
                `${value} — ${props.payload.summary}`,
                props.payload.fullDate,
              ]}
              labelFormatter={() => ""}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{chartData.length} registros</span>
        <span>{chartData[0].fullDate} → {chartData[chartData.length - 1].fullDate}</span>
      </div>
    </div>
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
