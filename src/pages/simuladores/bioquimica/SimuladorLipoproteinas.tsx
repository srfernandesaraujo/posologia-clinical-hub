import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getLipoproteinasChallenges } from "@/data/simulatorChallenges";

const SLUG = "lipoproteinas";

interface LipoCase {
  id?: string;
  title: string;
  difficulty: string;
  isAI?: boolean;
  patient: { name: string; age: number; weight: number; diagnosis: string };
  scenario: string;
  initialFatIntake: number;
  initialLPL: number;
  initialLDLReceptor: number;
  drugs: { statin: boolean; resin: boolean; ezetimibe: boolean; pcsk9i: boolean; fibrate: boolean };
  expectedLDL: [number, number];
  clinicalTip: string;
}

const BUILT_IN_CASES: LipoCase[] = [
  {
    title: "Hipercolesterolemia Familiar Heterozigótica",
    difficulty: "Difícil",
    patient: { name: "Ricardo Almeida", age: 35, weight: 78, diagnosis: "LDL-c > 250 mg/dL com xantomas tendinosos" },
    scenario: "Paciente jovem com LDL-c muito elevado e xantomas nos tendões de Aquiles. Possui mutação no gene do recetor de LDL, reduzindo a expressão a ~50%.",
    initialFatIntake: 50, initialLPL: 80, initialLDLReceptor: 50,
    drugs: { statin: true, resin: false, ezetimibe: true, pcsk9i: false, fibrate: false },
    expectedLDL: [100, 160],
    clinicalTip: "Na HF heterozigótica, a estatina aumenta a expressão dos recetores de LDL remanescentes por inibir a HMG-CoA redutase hepática, ativando SREBPs. A associação com ezetimiba reduz a absorção intestinal de colesterol.",
  },
  {
    title: "Dislipidemia Mista",
    difficulty: "Médio",
    patient: { name: "Teresa Gomes", age: 58, weight: 90, diagnosis: "LDL 180 mg/dL, TG 350 mg/dL, HDL 32 mg/dL" },
    scenario: "Paciente obesa com síndrome metabólica. A produção hepática de VLDL está aumentada pelo excesso de ácidos gordos livres.",
    initialFatIntake: 80, initialLPL: 50, initialLDLReceptor: 70,
    drugs: { statin: true, resin: false, ezetimibe: false, pcsk9i: false, fibrate: true },
    expectedLDL: [100, 140],
    clinicalTip: "Os fibratos ativam o PPARα, aumentando a expressão de LPL e a oxidação de ácidos gordos, reduzindo triglicerídeos em 30-50%. A combinação com estatina requer monitorização de miopatia.",
  },
  {
    title: "LDL Residual — Uso de iPCSK9",
    difficulty: "Difícil",
    patient: { name: "António Ferreira", age: 62, weight: 85, diagnosis: "DAC estável, LDL 95 mg/dL sob estatina máxima" },
    scenario: "Paciente com doença coronária e risco cardiovascular muito alto. Necessita LDL < 55 mg/dL. Os inibidores de PCSK9 impedem a degradação dos recetores de LDL.",
    initialFatIntake: 40, initialLPL: 80, initialLDLReceptor: 80,
    drugs: { statin: true, resin: false, ezetimibe: true, pcsk9i: true, fibrate: false },
    expectedLDL: [25, 55],
    clinicalTip: "Os iPCSK9 são anticorpos monoclonais que bloqueiam a PCSK9, impedindo a degradação lisossómica dos recetores de LDL. Resultado: aumento de ~2-3x dos recetores na superfície do hepatócito.",
  },
];

const DRUGS_INFO = [
  { key: "statin", name: "Estatina (Atorvastatina)", mechanism: "Inibe HMG-CoA redutase → ↑ recetores LDL" },
  { key: "resin", name: "Resina (Colestiramina)", mechanism: "Sequestra ácidos biliares → ↑ rec. LDL" },
  { key: "ezetimibe", name: "Ezetimiba", mechanism: "Bloqueia NPC1L1 → ↓ absorção intestinal" },
  { key: "pcsk9i", name: "Inibidor PCSK9", mechanism: "Impede degradação rec. LDL → ↑↑ reciclagem" },
  { key: "fibrate", name: "Fibrato (Fenofibrato)", mechanism: "Ativa PPARα → ↑ LPL, ↓ TG, ↑ HDL" },
];

export default function SimuladorLipoproteinas() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG);

  const [activeCase, setActiveCase] = useState<LipoCase | null>(null);
  const [fatIntake, setFatIntake] = useState(50);
  const [lplActivity, setLPLActivity] = useState(80);
  const [ldlReceptor, setLDLReceptor] = useState(80);
  const [drugs, setDrugs] = useState({ statin: false, resin: false, ezetimibe: false, pcsk9i: false, fibrate: false });
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<{ time: number; ldl: number; hdl: number; tg: number }[]>([]);
  const tickRef = useRef(0);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase.case_data as any;
      setActiveCase({
        id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.is_ai_generated,
        patient: cd.patient, scenario: cd.scenario,
        initialFatIntake: cd.initialFatIntake ?? 50, initialLPL: cd.initialLPL ?? 80, initialLDLReceptor: cd.initialLDLReceptor ?? 80,
        drugs: cd.drugs ?? { statin: false, resin: false, ezetimibe: false, pcsk9i: false, fibrate: false },
        expectedLDL: cd.expectedLDL ?? [70, 130], clinicalTip: cd.clinicalTip ?? "",
      });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) {
      setFatIntake(activeCase.initialFatIntake);
      setLPLActivity(activeCase.initialLPL);
      setLDLReceptor(activeCase.initialLDLReceptor);
      setDrugs(activeCase.drugs);
      setRunning(false); setHistory([]); tickRef.current = 0;
    }
  }, [activeCase]);

  const toggleDrug = useCallback((key: string) => {
    setDrugs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const model = useMemo(() => {
    let effectiveLPL = lplActivity;
    if (drugs.fibrate) effectiveLPL = Math.min(100, effectiveLPL * 1.5);

    let intestinalCholesterol = fatIntake * 0.4;
    if (drugs.ezetimibe) intestinalCholesterol *= 0.4;

    let hepaticSynthesis = 60;
    if (drugs.statin) hepaticSynthesis *= 0.3;

    let bileConversion = 20;
    if (drugs.resin) bileConversion = 50;

    const totalHepaticCholesterol = hepaticSynthesis + intestinalCholesterol - bileConversion;
    let vldl = Math.max(0, totalHepaticCholesterol * 0.6 + fatIntake * 0.3);
    let idl = vldl * (effectiveLPL / 100);
    let ldl = idl * 0.7;

    let effectiveReceptor = ldlReceptor;
    if (drugs.statin) effectiveReceptor = Math.min(100, effectiveReceptor * 1.4);
    if (drugs.resin) effectiveReceptor = Math.min(100, effectiveReceptor * 1.2);
    if (drugs.pcsk9i) effectiveReceptor = Math.min(100, effectiveReceptor * 2.5);

    const circulatingLDL = ldl * (1 - (effectiveReceptor / 100) * 0.8);

    let tg = fatIntake * 1.5 + vldl * 0.5;
    if (drugs.fibrate) tg *= 0.45;

    let hdl = 50;
    if (drugs.fibrate) hdl *= 1.25;
    if (tg > 150) hdl *= 0.7;

    const ldlMgDl = Math.round(40 + circulatingLDL * 2.5);
    const hdlMgDl = Math.round(hdl);
    const tgMgDl = Math.round(tg);
    const totalChol = ldlMgDl + hdlMgDl + Math.round(tgMgDl / 5);
    const risk = ldlMgDl > 160 ? "Muito Alto" : ldlMgDl > 130 ? "Alto" : ldlMgDl > 100 ? "Moderado" : ldlMgDl > 70 ? "Aceitável" : "Ótimo";

    return { chylomicrons: Math.round(fatIntake * 0.8), vldl: Math.round(vldl), idl: Math.round(idl), ldlMgDl, hdlMgDl, tgMgDl, totalChol, effectiveReceptor: Math.round(effectiveReceptor), effectiveLPL: Math.round(effectiveLPL), risk };
  }, [fatIntake, lplActivity, ldlReceptor, drugs]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      setHistory(prev => [...prev.slice(-59), { time: tickRef.current, ldl: model.ldlMgDl, hdl: model.hdlMgDl, tg: model.tgMgDl }]);
    }, 1000);
    return () => clearInterval(id);
  }, [running, model.ldlMgDl, model.hdlMgDl, model.tgMgDl]);

  const lipidData = [
    { name: "LDL-c", value: model.ldlMgDl, target: 100 },
    { name: "HDL-c", value: model.hdlMgDl, target: 50 },
    { name: "TG", value: model.tgMgDl, target: 150 },
    { name: "Total", value: model.totalChol, target: 200 },
  ];

  const transportData = [
    { name: "Quilom.", value: model.chylomicrons },
    { name: "VLDL", value: model.vldl },
    { name: "IDL", value: model.idl },
    { name: "LDL circ.", value: model.ldlMgDl },
    { name: "HDL", value: model.hdlMgDl },
  ];

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return;
    setRunning(false);
    const ldlOk = model.ldlMgDl >= activeCase.expectedLDL[0] && model.ldlMgDl <= activeCase.expectedLDL[1];
    const s = ldlOk ? 100 : Math.max(0, 100 - Math.abs(model.ldlMgDl - (activeCase.expectedLDL[0] + activeCase.expectedLDL[1]) / 2));
    submitResults({ score: Math.round(s), actions: { fatIntake, lplActivity, ldlReceptor, drugs, ldlMgDl: model.ldlMgDl } });
  }, [activeCase, model, fatIntake, lplActivity, ldlReceptor, drugs, submitted, submitResults]);

  const loadAICase = (c: any) => {
    setActiveCase({
      id: c.id, title: c.title, difficulty: c.difficulty, isAI: true,
      patient: c.patient, scenario: c.scenario,
      initialFatIntake: c.initialFatIntake ?? 50, initialLPL: c.initialLPL ?? 80, initialLDLReceptor: c.initialLDLReceptor ?? 80,
      drugs: c.drugs ?? { statin: false, resin: false, ezetimibe: false, pcsk9i: false, fibrate: false },
      expectedLDL: c.expectedLDL ?? [70, 130], clinicalTip: c.clinicalTip ?? "",
    });
  };

  if (!activeCase) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Metabolismo das Lipoproteínas</h1>
            <p className="text-muted-foreground">Transporte de colesterol, vias exógena/endógena e fármacos hipolipemiantes</p>
            <AdminPromptViewer toolSlug="sim-lipoproteinas" toolName="Metabolismo das Lipoproteínas" toolType="simulator" prompt={getNativePrompt("sim-lipoproteinas") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5 text-primary" /> Casos Clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
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
            <CardHeader><CardTitle className="text-lg">Parâmetros Fisiológicos</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2"><span>Ingestão Lipídica</span><span className="font-semibold">{fatIntake}%</span></div>
                <Slider value={[fatIntake]} onValueChange={([v]) => setFatIntake(v)} min={10} max={100} step={5} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2"><span>Atividade LPL</span><span className="font-semibold">{lplActivity}% (efetiva: {model.effectiveLPL}%)</span></div>
                <Slider value={[lplActivity]} onValueChange={([v]) => setLPLActivity(v)} min={10} max={100} step={5} />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2"><span>Expressão Rec. LDL</span><span className="font-semibold">{ldlReceptor}% (efetiva: {model.effectiveReceptor}%)</span></div>
                <Slider value={[ldlReceptor]} onValueChange={([v]) => setLDLReceptor(v)} min={10} max={100} step={5} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Fármacos Hipolipemiantes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {DRUGS_INFO.map(d => {
                const active = drugs[d.key as keyof typeof drugs];
                return (
                  <div key={d.key} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${active ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border"}`}>
                    <div>
                      <p className="text-sm font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.mechanism}</p>
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
            <CardHeader><CardTitle className="text-lg">Perfil Lipídico (mg/dL)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 text-center mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">LDL-c</p>
                  <p className={`text-2xl font-bold ${model.ldlMgDl > 130 ? "text-destructive" : "text-primary"}`}>{model.ldlMgDl}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">HDL-c</p>
                  <p className={`text-2xl font-bold ${model.hdlMgDl < 40 ? "text-destructive" : "text-primary"}`}>{model.hdlMgDl}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">TG</p>
                  <p className={`text-2xl font-bold ${model.tgMgDl > 200 ? "text-destructive" : "text-primary"}`}>{model.tgMgDl}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Risco</p>
                  <Badge variant={model.risk === "Muito Alto" || model.risk === "Alto" ? "destructive" : "secondary"}>{model.risk}</Badge>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lipidData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Bar dataKey="value" name="Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Alvo" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Transporte de Lipoproteínas</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={transportData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" name="Nível" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
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

      <SimulatorChallengeMode
        challengeSet={getLipoproteinasChallenges()}
        simulatorState={{ fatIntake, lplActivity, ldlReceptor, ...drugs }}
      />
    </div>
  );
}
