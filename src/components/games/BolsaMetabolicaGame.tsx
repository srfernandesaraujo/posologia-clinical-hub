import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Wallet, Award, Activity, Plus, ShoppingCart, AlertTriangle, Newspaper, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { GameDifficulty } from "./GameDifficultySelector";
import GameFeedbackOverlay from "./GameFeedbackOverlay";
import GameStarsResult from "./GameStarsResult";

interface Biomarker {
  id: string; name: string; value: number; target: number; unit: string; isHigherBetter: boolean; emoji: string;
}

interface Investment {
  id: string; name: string; category: "medication" | "lifestyle" | "exam"; cost: number; effects: Record<string, number>; description: string;
}

interface MarketEvent {
  id: string; title: string; description: string; effects: Record<string, number>; type: "positive" | "negative" | "neutral";
}

const allBiomarkers: Biomarker[] = [
  { id: "HbA1c", name: "Hemoglobina Glicada", value: 8.2, target: 7.0, unit: "%", isHigherBetter: false, emoji: "🩸" },
  { id: "LDL", name: "Colesterol LDL", value: 155, target: 100, unit: "mg/dL", isHigherBetter: false, emoji: "🫀" },
  { id: "HDL", name: "Colesterol HDL", value: 35, target: 40, unit: "mg/dL", isHigherBetter: true, emoji: "💛" },
  { id: "TFG", name: "Taxa Filtração Glom.", value: 72, target: 60, unit: "mL/min", isHigherBetter: true, emoji: "🫘" },
  { id: "TSH", name: "TSH", value: 6.8, target: 4.0, unit: "mUI/L", isHigherBetter: false, emoji: "🦋" },
  { id: "VitD", name: "Vitamina D", value: 18, target: 30, unit: "ng/mL", isHigherBetter: true, emoji: "☀️" },
  { id: "PCR", name: "Proteína C Reativa", value: 4.5, target: 1.0, unit: "mg/L", isHigherBetter: false, emoji: "🔥" },
  { id: "TG", name: "Triglicerídeos", value: 210, target: 150, unit: "mg/dL", isHigherBetter: false, emoji: "🧈" },
];

const investments: Investment[] = [
  { id: "metformina", name: "Metformina 850mg", category: "medication", cost: 200, effects: { HbA1c: -0.8, LDL: -5, TFG: 2 }, description: "Reduz produção hepática de glicose. Primeira linha DM2." },
  { id: "estatina", name: "Atorvastatina 20mg", category: "medication", cost: 250, effects: { LDL: -35, HDL: 3, PCR: -0.8 }, description: "Inibidor HMG-CoA redutase. Reduz LDL em ~40%." },
  { id: "levotiroxina", name: "Levotiroxina 50mcg", category: "medication", cost: 150, effects: { TSH: -2.5, LDL: -10, TG: -15 }, description: "Reposição hormonal tireoidiana. Normaliza metabolismo." },
  { id: "fibrato", name: "Fenofibrato 200mg", category: "medication", cost: 200, effects: { TG: -60, HDL: 5, LDL: -8 }, description: "Agonista PPAR-alfa. Reduz triglicerídeos em ~30%." },
  { id: "vitd", name: "Vitamina D 50.000UI/sem", category: "medication", cost: 100, effects: { VitD: 12, PCR: -0.3 }, description: "Suplementação para deficiência. Dose de ataque semanal." },
  { id: "exercicio", name: "Programa de Exercícios", category: "lifestyle", cost: 300, effects: { HbA1c: -0.5, HDL: 5, LDL: -10, TG: -20, PCR: -0.5, TFG: 3 }, description: "150min/sem aeróbico + resistência. Efeito multissistêmico." },
  { id: "dieta", name: "Dieta Mediterrânea", category: "lifestyle", cost: 250, effects: { LDL: -15, HDL: 4, TG: -25, PCR: -0.6, HbA1c: -0.3 }, description: "Rica em azeite, peixes e fibras. Reduz risco cardiovascular." },
  { id: "sono", name: "Higiene do Sono", category: "lifestyle", cost: 100, effects: { PCR: -0.4, TSH: -0.3, HbA1c: -0.2 }, description: "7-9h/noite, rotina regular. Melhora eixo metabólico." },
  { id: "checkup", name: "Check-up Trimestral", category: "exam", cost: 350, effects: { TFG: 1, PCR: -0.2 }, description: "Monitorização permite ajustes finos. Detecção precoce." },
];

const marketEvents: MarketEvent[] = [
  { id: "e1", title: "📰 Novo Estudo: SGLT2i reduz mortalidade CV", description: "O estudo EMPA-REG confirmou benefício cardiovascular e renal dos gliflozinas.", effects: { HbA1c: -0.2, TFG: 2 }, type: "positive" },
  { id: "e2", title: "⚠️ Crise de Stress no Trabalho", description: "Cortisol elevado cronicamente. Piora controle glicêmico e inflamatório.", effects: { HbA1c: 0.4, PCR: 0.8, TSH: 0.5 }, type: "negative" },
  { id: "e3", title: "📰 Recall de Lote de Estatina", description: "Lote contaminado. Paciente ficou 2 semanas sem medicação.", effects: { LDL: 15, PCR: 0.3 }, type: "negative" },
  { id: "e4", title: "🎉 Campanha de Vacinação Gripe", description: "Redução de infecções oportunistas. Melhora imunometabólica.", effects: { PCR: -0.5 }, type: "positive" },
  { id: "e5", title: "📰 Meta-análise: Vit D e imunidade", description: "Evidência crescente de benefício imunológico da suplementação.", effects: { VitD: 3, PCR: -0.2 }, type: "positive" },
  { id: "e6", title: "⚠️ Paciente viajou e abandonou dieta", description: "Férias prolongadas sem adesão terapêutica.", effects: { HbA1c: 0.3, LDL: 10, TG: 20 }, type: "negative" },
  { id: "e7", title: "📰 Guideline AHA atualizado", description: "Nova recomendação de LDL < 70 para alto risco cardiovascular.", effects: {}, type: "neutral" },
  { id: "e8", title: "⚠️ Desidratação no verão", description: "Piora temporária da função renal por hipovolemia.", effects: { TFG: -5, PCR: 0.3 }, type: "negative" },
];

const difficultyConfig: Record<GameDifficulty, { coins: number; quarters: number; bioCount: number; investPerQ: number }> = {
  academic: { coins: 3000, quarters: 4, bioCount: 4, investPerQ: 3 },
  clinical: { coins: 2000, quarters: 6, bioCount: 6, investPerQ: 2 },
  specialist: { coins: 1500, quarters: 8, bioCount: 8, investPerQ: 2 },
};

export default function BolsaMetabolicaGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"narrative" | "difficulty" | "playing" | "event" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [biomarkers, setBiomarkers] = useState<Biomarker[]>([]);
  const [coins, setCoins] = useState(0);
  const [quarter, setQuarter] = useState(1);
  const [history, setHistory] = useState<Record<string, number>[]>([]);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [currentEvent, setCurrentEvent] = useState<MarketEvent | null>(null);
  const [showInvest, setShowInvest] = useState(false);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string } | null>(null);
  const [usedEvents, setUsedEvents] = useState<string[]>([]);

  const config = difficultyConfig[difficulty];

  const startGame = () => {
    const bios = allBiomarkers.slice(0, config.bioCount).map(b => ({ ...b }));
    setBiomarkers(bios);
    setCoins(config.coins);
    setQuarter(1);
    const initial: Record<string, number> = { quarter: 0 };
    bios.forEach(b => initial[b.id] = b.value);
    setHistory([initial]);
    setPurchased([]);
    setScore(0);
    setUsedEvents([]);
    setPhase("playing");
  };

  const applyEffects = (effects: Record<string, number>, bios: Biomarker[]) => {
    return bios.map(b => {
      const delta = effects[b.id] || 0;
      return { ...b, value: Math.round((b.value + delta) * 10) / 10 };
    });
  };

  const buyInvestment = (inv: Investment) => {
    if (coins < inv.cost) { toast.error("Moedas insuficientes!"); return; }
    if (purchased.includes(inv.id)) { toast.info("Já adquirido neste trimestre."); return; }
    setCoins(c => c - inv.cost);
    setPurchased(p => [...p, inv.id]);
    setBiomarkers(prev => applyEffects(inv.effects, prev));
    setFeedback({ isCorrect: true, title: `Investimento: ${inv.name}`, explanation: inv.description, reference: "Farmacologia Clínica" });
  };

  const endQuarter = () => {
    setShowInvest(false);
    const snap: Record<string, number> = { quarter };
    biomarkers.forEach(b => snap[b.id] = b.value);
    setHistory(h => [...h, snap]);

    // Calculate score for this quarter
    let qScore = 0;
    biomarkers.forEach(b => {
      const atTarget = b.isHigherBetter ? b.value >= b.target : b.value <= b.target;
      if (atTarget) qScore += 10;
    });
    setScore(s => s + qScore);

    // Dividends
    const atTarget = biomarkers.filter(b => b.isHigherBetter ? b.value >= b.target : b.value <= b.target).length;
    const dividend = atTarget * 50;
    if (dividend > 0) {
      setCoins(c => c + dividend);
      toast.success(`Dividendos: +${dividend} moedas (${atTarget} biomarcadores na meta)`);
    }

    if (quarter >= config.quarters) {
      setPhase("result");
      return;
    }

    // Random event
    const available = marketEvents.filter(e => !usedEvents.includes(e.id));
    if (available.length > 0 && Math.random() > 0.3) {
      const ev = available[Math.floor(Math.random() * available.length)];
      setCurrentEvent(ev);
      setUsedEvents(u => [...u, ev.id]);
      setBiomarkers(prev => applyEffects(ev.effects, prev));
      setPhase("event");
    } else {
      setQuarter(q => q + 1);
      setPurchased([]);
    }
  };

  const dismissEvent = () => {
    setCurrentEvent(null);
    setQuarter(q => q + 1);
    setPurchased([]);
    setPhase("playing");
  };

  const getChange = (b: Biomarker) => {
    if (history.length < 2) return { diff: 0, favorable: true };
    const prev = history[history.length - 1]?.[b.id] ?? b.value;
    const diff = Math.round((b.value - prev) * 10) / 10;
    const favorable = b.isHigherBetter ? diff > 0 : diff < 0;
    return { diff, favorable };
  };

  const maxScore = config.quarters * config.bioCount * 10;
  const [selectedBio, setSelectedBio] = useState("HbA1c");

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Bolsa de Valores Metabólica"
        setting="Consultório de Endocrinologia — Hospital Universitário"
        patientName="Roberto Mendes"
        patientAge="58 anos, DM2, dislipidemia, hipotireoidismo subclínico"
        patientHistory="Sedentário, IMC 31. Múltiplos biomarcadores fora da meta."
        briefing="Gerencie o portfólio metabólico do paciente ao longo de vários trimestres. Invista em medicamentos, mudanças de estilo de vida e exames para trazer todos os biomarcadores para a meta. Eventos de mercado podem alterar os valores — adapte-se!"
        onStart={() => setPhase("difficulty")}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <p className="text-xs text-muted-foreground">
          {config.bioCount} biomarcadores • {config.quarters} trimestres • {config.coins} moedas
        </p>
        <Button onClick={startGame} size="lg">Abrir Pregão</Button>
      </div>
    );
  }

  if (phase === "event" && currentEvent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5 animate-in fade-in">
        <div className={`rounded-full p-5 ${currentEvent.type === "negative" ? "bg-destructive/10" : currentEvent.type === "positive" ? "bg-green-500/10" : "bg-muted"}`}>
          {currentEvent.type === "negative" ? <AlertTriangle className="h-12 w-12 text-destructive" /> : <Newspaper className="h-12 w-12 text-green-500" />}
        </div>
        <h2 className="text-lg font-bold text-foreground">{currentEvent.title}</h2>
        <p className="text-sm text-muted-foreground max-w-md">{currentEvent.description}</p>
        {Object.keys(currentEvent.effects).length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(currentEvent.effects).map(([k, v]) => (
              <Badge key={k} variant={v > 0 ? "destructive" : "secondary"} className="text-xs">
                {k}: {v > 0 ? "+" : ""}{v}
              </Badge>
            ))}
          </div>
        )}
        <Button onClick={dismissEvent}>Próximo Trimestre →</Button>
      </div>
    );
  }

  if (phase === "result") {
    const atTarget = biomarkers.filter(b => b.isHigherBetter ? b.value >= b.target : b.value <= b.target).length;
    const finalScore = score + atTarget * 15;
    return (
      <GameStarsResult
        score={finalScore}
        maxScore={maxScore + config.bioCount * 15}
        errors={config.bioCount - atTarget}
        title="Pregão Encerrado!"
        subtitle={`${atTarget}/${config.bioCount} biomarcadores atingiram a meta em ${config.quarters} trimestres. Patrimônio final: ${coins} moedas.`}
        onRestart={() => setPhase("narrative")}
      />
    );
  }

  if (feedback) {
    return (
      <GameFeedbackOverlay
        isCorrect={feedback.isCorrect}
        title={feedback.title}
        explanation={feedback.explanation}
        reference={feedback.reference}
        onContinue={() => setFeedback(null)}
      />
    );
  }

  const availableInvestments = investments.filter(inv => {
    if (purchased.includes(inv.id)) return false;
    // Only show investments relevant to current biomarkers
    return Object.keys(inv.effects).some(k => biomarkers.some(b => b.id === k));
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-xs text-muted-foreground">Trimestre {quarter} de {config.quarters}</p>
          <p className="text-2xl font-bold font-mono flex items-center gap-1">🪙 {coins.toLocaleString()}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Pontos: {score}</Badge>
          <Button onClick={() => setShowInvest(!showInvest)} size="sm" variant={showInvest ? "default" : "outline"} className="gap-1.5">
            <ShoppingCart className="h-4 w-4" /> Investir
          </Button>
        </div>
      </div>

      {/* Biomarker Ticker */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {biomarkers.map(b => {
          const { diff, favorable } = getChange(b);
          const atTarget = b.isHigherBetter ? b.value >= b.target : b.value <= b.target;
          return (
            <Card
              key={b.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedBio === b.id ? "ring-2 ring-primary" : ""} ${atTarget ? "border-green-500/30" : ""}`}
              onClick={() => setSelectedBio(b.id)}
            >
              <CardContent className="py-2 px-3 space-y-0.5">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">{b.emoji} {b.name}</p>
                <div className="flex items-end justify-between">
                  <span className="text-lg font-bold font-mono">{b.value}{b.unit === "%" ? "%" : ""}</span>
                  {diff !== 0 && (
                    <div className="flex items-center gap-0.5">
                      {favorable ? <TrendingUp className="h-3 w-3 text-green-500" /> : <TrendingDown className="h-3 w-3 text-destructive" />}
                      <span className={`text-[10px] font-mono ${favorable ? "text-green-500" : "text-destructive"}`}>
                        {diff > 0 ? "+" : ""}{diff}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">Meta: {b.isHigherBetter ? ">" : "<"} {b.target} {b.unit}</p>
                {atTarget && <Badge className="text-[8px] px-1 py-0 bg-green-500/20 text-green-500 border-0">NA META ✓</Badge>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      {history.length > 1 && (
        <Card>
          <CardHeader className="pb-0 pt-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {biomarkers.find(b => b.id === selectedBio)?.name ?? selectedBio}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="quarter" tick={{ fontSize: 10 }} tickFormatter={(v) => `T${v}`} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <ReferenceLine
                  y={biomarkers.find(b => b.id === selectedBio)?.target}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="4 4"
                  label={{ value: "Meta", fill: "hsl(var(--destructive))", fontSize: 10 }}
                />
                <defs>
                  <linearGradient id="bolsaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey={selectedBio} stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#bolsaGrad)" dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Investment Panel */}
      {showInvest && (
        <Card className="animate-in slide-in-from-top-2">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm">Investimentos Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {["medication", "lifestyle", "exam"].map(cat => {
              const items = availableInvestments.filter(i => i.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {cat === "medication" ? "💊 Medicamentos" : cat === "lifestyle" ? "🏃 Estilo de Vida" : "🔬 Exames"}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {items.map(inv => (
                      <Button
                        key={inv.id}
                        variant="outline"
                        size="sm"
                        className="justify-between text-xs h-auto py-2"
                        onClick={() => buyInvestment(inv)}
                        disabled={coins < inv.cost}
                      >
                        <span className="text-left">{inv.name}</span>
                        <Badge variant="secondary" className="text-[10px] ml-2">🪙{inv.cost}</Badge>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Portfolio Summary */}
      {purchased.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] text-muted-foreground">Investimentos deste trimestre:</span>
          {purchased.map(id => {
            const inv = investments.find(i => i.id === id);
            return <Badge key={id} variant="secondary" className="text-[10px]">{inv?.name}</Badge>;
          })}
        </div>
      )}

      <Button onClick={endQuarter} className="w-full" size="lg">
        Fechar Trimestre {quarter} →
      </Button>
    </div>
  );
}
