import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Sparkles, Loader2, Heart } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

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
    scenario: "Paciente jovem com LDL-c muito elevado e xantomas nos tendões de Aquiles. Possui mutação no gene do recetor de LDL, reduzindo a expressão a ~50%. Observe o efeito da estatina na up-regulation dos recetores remanescentes.",
    initialFatIntake: 50, initialLPL: 80, initialLDLReceptor: 50,
    drugs: { statin: true, resin: false, ezetimibe: true, pcsk9i: false, fibrate: false },
    expectedLDL: [100, 160],
    clinicalTip: "Na HF heterozigótica, a estatina aumenta a expressão dos recetores de LDL remanescentes (~50%) por inibir a HMG-CoA redutase hepática, ativando SREBPs. A associação com ezetimiba reduz a absorção intestinal de colesterol.",
  },
  {
    title: "Dislipidemia Mista",
    difficulty: "Médio",
    patient: { name: "Teresa Gomes", age: 58, weight: 90, diagnosis: "LDL 180 mg/dL, TG 350 mg/dL, HDL 32 mg/dL" },
    scenario: "Paciente obesa com síndrome metabólica. A produção hepática de VLDL está aumentada pelo excesso de ácidos gordos livres. Os triglicerídeos elevados reduzem a eficiência da LPL.",
    initialFatIntake: 80, initialLPL: 50, initialLDLReceptor: 70,
    drugs: { statin: true, resin: false, ezetimibe: false, pcsk9i: false, fibrate: true },
    expectedLDL: [100, 140],
    clinicalTip: "Os fibratos ativam o PPARα, aumentando a expressão de LPL e a oxidação de ácidos gordos, reduzindo triglicerídeos em 30-50%. A combinação com estatina requer monitorização de miopatia (especialmente gemfibrozil).",
  },
  {
    title: "LDL Residual com Estatina — Uso de iPCSK9",
    difficulty: "Difícil",
    patient: { name: "António Ferreira", age: 62, weight: 85, diagnosis: "Doença coronária estável, LDL 95 mg/dL sob estatina máxima" },
    scenario: "Paciente com DAC e risco cardiovascular muito alto. Necessita LDL < 55 mg/dL. Os inibidores de PCSK9 (evolocumab, alirocumab) impedem a degradação dos recetores de LDL, aumentando a sua reciclagem.",
    initialFatIntake: 40, initialLPL: 80, initialLDLReceptor: 80,
    drugs: { statin: true, resin: false, ezetimibe: true, pcsk9i: true, fibrate: false },
    expectedLDL: [25, 55],
    clinicalTip: "Os iPCSK9 são anticorpos monoclonais que bloqueiam a PCSK9, impedindo a degradação lisossómica dos recetores de LDL. Resultado: aumento de ~2-3x dos recetores na superfície do hepatócito, com redução de LDL-c de 50-60% adicional.",
  },
];

const DRUGS_INFO = [
  { key: "statin", name: "Estatina (Atorvastatina)", mechanism: "Inibe HMG-CoA redutase → ↑ recetores LDL" },
  { key: "resin", name: "Resina (Colestiramina)", mechanism: "Sequestra ácidos biliares → ↑ conversão colesterol → ↑ rec. LDL" },
  { key: "ezetimibe", name: "Ezetimiba", mechanism: "Bloqueia NPC1L1 → ↓ absorção intestinal de colesterol" },
  { key: "pcsk9i", name: "Inibidor PCSK9", mechanism: "Impede degradação rec. LDL → ↑↑ reciclagem" },
  { key: "fibrate", name: "Fibrato (Fenofibrato)", mechanism: "Ativa PPARα → ↑ LPL, ↓ TG, ↑ HDL" },
];

export default function SimuladorLipoproteinas() {
  const navigate = useNavigate();
  const location = useLocation();
  const isVirtualRoom = location.pathname.startsWith("/sala/");
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases(SLUG, BUILT_IN_CASES);
  const { roomCase, isExamMode, examTimeLeft, handleFinishExam, showFeedback, feedback, closeFeedback, startExam } = useVirtualRoomCase(SLUG, allCases);

  const [selectedCase, setSelectedCase] = useState<LipoCase | null>(null);
  const [fatIntake, setFatIntake] = useState(50);
  const [lplActivity, setLPLActivity] = useState(80);
  const [ldlReceptor, setLDLReceptor] = useState(80);
  const [drugs, setDrugs] = useState({ statin: false, resin: false, ezetimibe: false, pcsk9i: false, fibrate: false });

  const handleSelectCase = useCallback((c: LipoCase) => {
    setSelectedCase(c);
    setFatIntake(c.initialFatIntake);
    setLPLActivity(c.initialLPL);
    setLDLReceptor(c.initialLDLReceptor);
    setDrugs(c.drugs);
  }, []);

  const toggleDrug = useCallback((key: string) => {
    setDrugs(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));
  }, []);

  const model = useMemo(() => {
    // Exogenous pathway: dietary fat → chylomicrons
    let chylomicrons = fatIntake * 0.8;
    let effectiveLPL = lplActivity;
    if (drugs.fibrate) effectiveLPL = Math.min(100, effectiveLPL * 1.5);
    let chyloRemnants = chylomicrons * (1 - effectiveLPL / 100);

    // Intestinal cholesterol absorption
    let intestinalCholesterol = fatIntake * 0.4;
    if (drugs.ezetimibe) intestinalCholesterol *= 0.4;

    // Hepatic cholesterol synthesis
    let hepaticSynthesis = 60;
    if (drugs.statin) hepaticSynthesis *= 0.3;

    // Bile acid sequestration → more cholesterol used for bile
    let bileConversion = 20;
    if (drugs.resin) bileConversion = 50;

    const totalHepaticCholesterol = hepaticSynthesis + intestinalCholesterol - bileConversion;

    // VLDL production
    let vldl = Math.max(0, totalHepaticCholesterol * 0.6 + fatIntake * 0.3);
    
    // VLDL → IDL → LDL (via LPL)
    let idl = vldl * (effectiveLPL / 100);
    let ldl = idl * 0.7;

    // LDL clearance by receptors
    let effectiveReceptor = ldlReceptor;
    if (drugs.statin) effectiveReceptor = Math.min(100, effectiveReceptor * 1.4);
    if (drugs.resin) effectiveReceptor = Math.min(100, effectiveReceptor * 1.2);
    if (drugs.pcsk9i) effectiveReceptor = Math.min(100, effectiveReceptor * 2.5);

    const ldlClearance = effectiveReceptor / 100;
    const circulatingLDL = ldl * (1 - ldlClearance * 0.8);

    // TG and HDL
    let tg = fatIntake * 1.5 + vldl * 0.5;
    if (drugs.fibrate) tg *= 0.45;
    
    let hdl = 50;
    if (drugs.fibrate) hdl *= 1.25;
    if (tg > 150) hdl *= 0.7; // TG-HDL inverse relationship

    // Convert to approximate mg/dL
    const ldlMgDl = Math.round(40 + circulatingLDL * 2.5);
    const hdlMgDl = Math.round(hdl);
    const tgMgDl = Math.round(tg);
    const totalChol = ldlMgDl + hdlMgDl + Math.round(tgMgDl / 5);

    const risk = ldlMgDl > 160 ? "Muito Alto" : ldlMgDl > 130 ? "Alto" : ldlMgDl > 100 ? "Moderado" : ldlMgDl > 70 ? "Aceitável" : "Ótimo";

    return {
      chylomicrons: Math.round(chylomicrons),
      vldl: Math.round(vldl),
      idl: Math.round(idl),
      ldlMgDl, hdlMgDl, tgMgDl, totalChol,
      effectiveReceptor: Math.round(effectiveReceptor),
      effectiveLPL: Math.round(effectiveLPL),
      risk,
    };
  }, [fatIntake, lplActivity, ldlReceptor, drugs]);

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

  if (!selectedCase && !roomCase) {
    return (
      <div className="space-y-6 p-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isVirtualRoom ? "/sala" : "/simuladores")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Metabolismo das Lipoproteínas</h1>
            <p className="text-muted-foreground">Transporte de colesterol, vias exógena/endógena e fármacos hipolipemiantes</p>
          </div>
        </div>

        {!isVirtualRoom && (
          <div className="flex gap-2">
            <Button onClick={generateCase} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Gerar Caso com IA
            </Button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allCases.map((c: any, i: number) => (
            <Card key={c.id || i} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleSelectCase(c)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{c.title}</CardTitle>
                  <div className="flex gap-1">
                    <Badge variant={c.difficulty === "Difícil" ? "destructive" : c.difficulty === "Médio" ? "default" : "secondary"}>{c.difficulty}</Badge>
                    {c.isAI && <Badge variant="outline"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{c.scenario?.substring(0, 100)}...</p>
                {c.isAI && <AdminCaseActions caseItem={c} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeCase = roomCase || selectedCase!;

  return (
    <div className="space-y-6 p-4 max-w-7xl mx-auto">
      {isExamMode && <ExamBanner timeLeft={examTimeLeft} onFinish={handleFinishExam} />}
      {showFeedback && <ExamFeedbackOverlay feedback={feedback} onClose={closeFeedback} />}

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => roomCase ? navigate("/sala") : setSelectedCase(null)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" /> {activeCase.title}
          </h1>
          <p className="text-sm text-muted-foreground">{activeCase.patient?.name} — {activeCase.patient?.diagnosis}</p>
        </div>
        <Badge variant={activeCase.difficulty === "Difícil" ? "destructive" : "default"}>{activeCase.difficulty}</Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <p className="text-sm">{activeCase.scenario}</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parâmetros Fisiológicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Ingestão Lipídica</span><span className="font-semibold">{fatIntake}%</span></div>
                <Slider value={[fatIntake]} onValueChange={([v]) => setFatIntake(v)} min={10} max={100} step={5} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Atividade LPL</span><span className="font-semibold">{lplActivity}% (efetiva: {model.effectiveLPL}%)</span></div>
                <Slider value={[lplActivity]} onValueChange={([v]) => setLPLActivity(v)} min={10} max={100} step={5} />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Expressão Rec. LDL</span><span className="font-semibold">{ldlReceptor}% (efetiva: {model.effectiveReceptor}%)</span></div>
                <Slider value={[ldlReceptor]} onValueChange={([v]) => setLDLReceptor(v)} min={10} max={100} step={5} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fármacos Hipolipemiantes</CardTitle>
            </CardHeader>
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

        {/* Results */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Perfil Lipídico (mg/dL)</CardTitle>
            </CardHeader>
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
                  <p className="text-xs text-muted-foreground">Risco CV</p>
                  <Badge variant={model.risk === "Muito Alto" || model.risk === "Alto" ? "destructive" : "secondary"}>{model.risk}</Badge>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lipidData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Atual" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="target" name="Alvo" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.3} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Transporte de Lipoproteínas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={transportData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" name="Nível" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
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
