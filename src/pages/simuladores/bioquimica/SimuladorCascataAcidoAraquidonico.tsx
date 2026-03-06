import { useState, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Flame } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const SLUG = "acido-araquidonico";

interface AACase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialStimulus: number;
  drugs: { aspirin: boolean; ibuprofen: boolean; celecoxib: boolean; corticosteroid: boolean; zileuton: boolean; montelukast: boolean };
  expectedPGE2: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: AACase[] = [
  {
    title: "Inflamação Aguda — AINEs",
    difficulty: "Fácil",
    patient: { name: "Carlos Santos", age: 55, weight: 82, diagnosis: "Artrite gotosa aguda" },
    scenario: "Paciente com crise de gota no primeiro metatarso. O ácido araquidónico é libertado da membrana pela fosfolipase A2 e metabolizado pela COX em prostaglandinas inflamatórias.",
    initialStimulus: 80,
    drugs: { aspirin: false, ibuprofen: true, celecoxib: false, corticosteroid: false, zileuton: false, montelukast: false },
    expectedPGE2: [10, 30],
    clinicalTip: "O ibuprofeno inibe reversivelmente a COX-1 e COX-2, reduzindo PGE2 e TXA2. Na gota, a redução de PGE2 alivia dor e inflamação. Efeitos adversos: risco GI (COX-1) e renal.",
  },
  {
    title: "Prevenção Cardiovascular — Aspirina",
    difficulty: "Médio",
    patient: { name: "Helena Duarte", age: 68, weight: 70, diagnosis: "Prevenção secundária pós-enfarte" },
    scenario: "Paciente pós-enfarte em prevenção secundária. A aspirina em dose baixa inibe irreversivelmente a COX-1 plaquetária, reduzindo TXA2 sem afetar significativamente a prostaciclina endotelial.",
    initialStimulus: 50,
    drugs: { aspirin: true, ibuprofen: false, celecoxib: false, corticosteroid: false, zileuton: false, montelukast: false },
    expectedPGE2: [30, 60],
    clinicalTip: "A aspirina acetila irreversivelmente a Ser530 da COX-1. As plaquetas, sem núcleo, não podem sintetizar nova COX-1, mantendo o efeito anti-agregante por toda a vida plaquetária (~10 dias).",
  },
  {
    title: "Asma e Leucotrienos",
    difficulty: "Difícil",
    patient: { name: "Sofia Lima", age: 25, weight: 58, diagnosis: "Asma brônquica persistente moderada" },
    scenario: "Paciente asmática com broncoconstrição e inflamação eosinofílica. Os leucotrienos (LTC4, LTD4, LTE4), produzidos pela via da 5-LOX, são potentes broncoconstritores.",
    initialStimulus: 70,
    drugs: { aspirin: false, ibuprofen: false, celecoxib: false, corticosteroid: true, zileuton: false, montelukast: true },
    expectedPGE2: [5, 20],
    clinicalTip: "Os corticosteróides inibem a fosfolipase A2 (via lipocortina), bloqueando ambas as vias COX e LOX. O montelukaste é antagonista do recetor CysLT1.",
  },
];

const DRUGS_INFO = [
  { key: "aspirin", name: "Aspirina (AAS)", target: "COX-1 irreversível" },
  { key: "ibuprofen", name: "Ibuprofeno", target: "COX-1/2 reversível" },
  { key: "celecoxib", name: "Celecoxib", target: "COX-2 seletivo" },
  { key: "corticosteroid", name: "Corticosteróide", target: "Fosfolipase A2 (↓ AA)" },
  { key: "zileuton", name: "Zileuton", target: "5-LOX (↓ leucotrienos)" },
  { key: "montelukast", name: "Montelukaste", target: "Recetor CysLT1" },
];

export default function SimuladorCascataAcidoAraquidonico() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<AACase | null>(null);
  const [stimulus, setStimulus] = useState(70);
  const [drugs, setDrugs] = useState({ aspirin: false, ibuprofen: false, celecoxib: false, corticosteroid: false, zileuton: false, montelukast: false });

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated,
        patient: cd.patient, scenario: cd.scenario, initialStimulus: cd.initialStimulus ?? 70,
        drugs: cd.drugs ?? { aspirin: false, ibuprofen: false, celecoxib: false, corticosteroid: false, zileuton: false, montelukast: false },
        expectedPGE2: cd.expectedPGE2 ?? [10, 50], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setStimulus(activeCase.initialStimulus);
      setDrugs(activeCase.drugs);
    }
  }, [activeCase]);

  const toggleDrug = useCallback((key: string) => {
    setDrugs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const model = useMemo(() => {
    let aaRelease = stimulus;
    if (drugs.corticosteroid) aaRelease *= 0.15;

    let cox1Activity = aaRelease;
    let cox2Activity = aaRelease;
    if (drugs.aspirin) { cox1Activity *= 0.05; cox2Activity *= 0.7; }
    if (drugs.ibuprofen) { cox1Activity *= 0.2; cox2Activity *= 0.25; }
    if (drugs.celecoxib) { cox2Activity *= 0.1; }

    const pge2 = (cox1Activity * 0.3 + cox2Activity * 0.7);
    const txa2 = cox1Activity * 0.8;
    const pgi2 = cox2Activity * 0.6;

    let lox5Activity = aaRelease;
    if (drugs.zileuton) lox5Activity *= 0.1;
    const ltb4 = lox5Activity * 0.5;
    const cysLTs = lox5Activity * 0.5;
    let cysLTEffect = cysLTs;
    if (drugs.montelukast) cysLTEffect *= 0.1;

    return {
      aaRelease: Math.round(aaRelease), pge2: Math.round(pge2), txa2: Math.round(txa2), pgi2: Math.round(pgi2),
      ltb4: Math.round(ltb4), cysLTs: Math.round(cysLTs), cysLTEffect: Math.round(cysLTEffect),
      inflammation: Math.round((pge2 + ltb4 + cysLTEffect) / 3),
      thrombosis: Math.round(txa2 - pgi2),
      bronchoconstriction: Math.round(cysLTEffect),
    };
  }, [stimulus, drugs]);

  const eicosanoidData = [
    { name: "PGE2", value: model.pge2 },
    { name: "TXA2", value: model.txa2 },
    { name: "PGI2", value: model.pgi2 },
    { name: "LTB4", value: model.ltb4 },
    { name: "CysLTs", value: model.cysLTs },
    { name: "Ef. CysLTs", value: model.cysLTEffect },
  ];

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    const pge2Ok = model.pge2 >= activeCase.expectedPGE2[0] && model.pge2 <= activeCase.expectedPGE2[1];
    const s = pge2Ok ? 100 : Math.max(0, 100 - Math.abs(model.pge2 - (activeCase.expectedPGE2[0] + activeCase.expectedPGE2[1]) / 2) * 2);
    submitResults({ score: Math.round(s), actions: { stimulus, drugs, pge2: model.pge2, txa2: model.txa2 } });
  }, [activeCase, model, stimulus, drugs, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario, initialStimulus: c.initialStimulus ?? 70,
      drugs: c.drugs ?? { aspirin: false, ibuprofen: false, celecoxib: false, corticosteroid: false, zileuton: false, montelukast: false },
      expectedPGE2: c.expectedPGE2 ?? [10, 50], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Cascata do Ácido Araquidónico</h1>
            <p className="text-muted-foreground">Vias COX e LOX, eicosanóides e bloqueios farmacológicos</p>
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <button key={i} onClick={() => setActiveCase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><Badge variant="outline">{c.difficulty}</Badge></div>
                <p className="text-sm text-muted-foreground">{c.patient.diagnosis}</p>
              </button>
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <button key={c.id} onClick={() => loadAICase(c)} className="w-full text-left p-4 rounded-lg border hover:border-primary/50 hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between mb-1"><span className="font-semibold">{c.title}</span><div className="flex gap-2"><Badge variant="secondary">IA</Badge><Badge variant="outline">{c.difficulty}</Badge></div></div>
                <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
              </button>
            ))}
            <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {examFeedback && <ExamFeedbackOverlay score={examFeedback.score} simulatorSlug={SLUG} caseTitle={examFeedback.caseTitle} examProgress={examProgress!} onProceed={proceedToNext} isFinalActivity={examFeedback.isFinalActivity} />}
      <ExamBanner simulatorSlug={SLUG} caseTitle={activeCase.title} examProgress={examProgress} />

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-sm"><strong>Paciente:</strong> {activeCase.patient.name}, {activeCase.patient.age} anos, {activeCase.patient.weight} kg</p>
          <p className="text-sm">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Estímulo Inflamatório</CardTitle></CardHeader>
            <CardContent>
              <div className="flex justify-between text-sm mb-2"><span>Libertação de AA pela PLA₂</span><span className="font-semibold">{stimulus}%</span></div>
              <Slider value={[stimulus]} onValueChange={([v]) => setStimulus(v)} min={0} max={100} step={5} />
              <p className="text-xs text-muted-foreground mt-1">AA disponível após bloqueio: {model.aaRelease}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Fármacos</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {DRUGS_INFO.map(d => {
                const active = drugs[d.key as keyof typeof drugs];
                return (
                  <div key={d.key} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${active ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"}`}>
                    <div>
                      <p className="text-sm font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.target}</p>
                    </div>
                    <Switch checked={active} onCheckedChange={() => toggleDrug(d.key)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Indicadores Clínicos</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Inflamação</p>
                  <p className={`text-2xl font-bold ${model.inflammation > 50 ? "text-destructive" : "text-primary"}`}>{model.inflammation}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risco Trombótico</p>
                  <p className={`text-2xl font-bold ${model.thrombosis > 30 ? "text-destructive" : "text-primary"}`}>
                    {model.thrombosis > 0 ? "+" : ""}{model.thrombosis}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Broncoconstrição</p>
                  <p className={`text-2xl font-bold ${model.bronchoconstriction > 30 ? "text-destructive" : "text-primary"}`}>{model.bronchoconstriction}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Eicosanóides Produzidos</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={eicosanoidData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="value" name="Nível (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Via Resumida</CardTitle></CardHeader>
            <CardContent>
              <div className="text-xs space-y-2 font-mono">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <span className="font-bold">Fosfolípido de Membrana</span>
                  {drugs.corticosteroid && <Badge variant="destructive" className="ml-2 text-[10px]">BLOQUEADO</Badge>}
                </div>
                <div className="text-center">↓ PLA₂ ({model.aaRelease}%)</div>
                <div className="p-2 rounded bg-primary/10 text-center font-bold">Ácido Araquidónico</div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="space-y-1">
                    <div className="text-center font-bold">Via COX</div>
                    {(drugs.aspirin || drugs.ibuprofen || drugs.celecoxib) && <Badge variant="destructive" className="text-[10px] w-full justify-center">INIBIDA</Badge>}
                    <div className="p-1 bg-muted/30 rounded text-center">PGE2: {model.pge2}%</div>
                    <div className="p-1 bg-muted/30 rounded text-center">TXA2: {model.txa2}%</div>
                    <div className="p-1 bg-muted/30 rounded text-center">PGI2: {model.pgi2}%</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-center font-bold">Via 5-LOX</div>
                    {drugs.zileuton && <Badge variant="destructive" className="text-[10px] w-full justify-center">INIBIDA</Badge>}
                    <div className="p-1 bg-muted/30 rounded text-center">LTB4: {model.ltb4}%</div>
                    <div className="p-1 bg-muted/30 rounded text-center">CysLTs: {model.cysLTs}%</div>
                    {drugs.montelukast && <Badge variant="destructive" className="text-[10px] w-full justify-center">Recetor CysLT1 bloqueado</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleFinish} disabled={submitted}>Finalizar Simulação</Button>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold text-primary mb-1">💡 Dica Clínica</p>
          <p className="text-sm">{activeCase.clinicalTip}</p>
        </CardContent>
      </Card>
    </div>
  );
}
