import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Skull, Lock, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from "recharts";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { AIContextGenerator } from "@/components/lab-virtual/AIContextGenerator";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { LAB_SYSTEM_PROMPTS } from "@/data/labSystemPrompts";

const SUBSTANCES = [
  { id: "paracetamol", name: "Paracetamol", hillN: 3.5, ld50: 2000, ed50: 15, unit: "mg/kg", mechanism: "Hepatotoxicidade por NAPQI (metabólito reativo via CYP2E1)", clinical: "Analgésico/antipirético de venda livre" },
  { id: "digoxina", name: "Digoxina", hillN: 2.0, ld50: 25, ed50: 0.8, unit: "mg/kg", mechanism: "Inibição da Na+/K+-ATPase → arritmias cardíacas", clinical: "Glicosídeo cardíaco para IC e FA" },
  { id: "warfarina", name: "Warfarina", hillN: 1.8, ld50: 320, ed50: 5, unit: "mg/kg", mechanism: "Inibição da vitamina K epóxido redutase → hemorragia", clinical: "Anticoagulante oral" },
  { id: "litio", name: "Carbonato de Lítio", hillN: 2.5, ld50: 530, ed50: 20, unit: "mg/kg", mechanism: "Nefrotoxicidade, neurotoxicidade, hipotireoidismo", clinical: "Estabilizador de humor" },
  { id: "cafeina", name: "Cafeína", hillN: 2.2, ld50: 192, ed50: 3, unit: "mg/kg", mechanism: "Antagonismo de adenosina → arritmias, convulsões em sobredose", clinical: "Estimulante do SNC" },
  { id: "etanol", name: "Etanol", hillN: 1.5, ld50: 7060, ed50: 500, unit: "mg/kg", mechanism: "Depressão do SNC, hepatotoxicidade crônica", clinical: "Substância recreacional" },
];

const ANIMAL_MODELS = [
  { id: "rato", name: "Rato Wistar", factor: 1.0 },
  { id: "camundongo", name: "Camundongo Swiss", factor: 0.85 },
  { id: "coelho", name: "Coelho Nova Zelândia", factor: 1.2 },
];

function hillEquation(dose: number, ec50: number, n: number): number {
  if (dose <= 0) return 0;
  return (Math.pow(dose, n) / (Math.pow(ec50, n) + Math.pow(dose, n))) * 100;
}

function classifyToxicity(ld50: number) {
  if (ld50 <= 5) return { class: "1", category: "Extremamente tóxico", color: "hsl(0 72% 40%)" };
  if (ld50 <= 50) return { class: "2", category: "Altamente tóxico", color: "hsl(0 72% 51%)" };
  if (ld50 <= 500) return { class: "3", category: "Moderadamente tóxico", color: "hsl(25 95% 53%)" };
  if (ld50 <= 5000) return { class: "4", category: "Levemente tóxico", color: "hsl(45 93% 47%)" };
  return { class: "5", category: "Praticamente não tóxico", color: "hsl(142 71% 45%)" };
}

export default function BancadaToxicologia() {
  const navigate = useNavigate();
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());

  // M1
  const [substance, setSubstance] = useState("paracetamol");
  // M2
  const [nPoints, setNPoints] = useState([20]);
  const [animalModel, setAnimalModel] = useState("rato");
  // M3
  const [doseResponse, setDoseResponse] = useState<any[] | null>(null);
  // M4
  const [toxParams, setToxParams] = useState<{ ld50: number; ed50: number; ti: number; toxClass: ReturnType<typeof classifyToxicity> } | null>(null);

  const [customSubstance, setCustomSubstance] = useState<typeof SUBSTANCES[0] | null>(null);
  const allSubstances = useMemo(() => [...SUBSTANCES, ...(customSubstance ? [customSubstance] : [])], [customSubstance]);

  const sub = allSubstances.find((s) => s.id === substance) ?? SUBSTANCES[0];
  const model = ANIMAL_MODELS.find((m) => m.id === animalModel)!;

  const completeModule = (n: number) => setCompletedModules((prev) => new Set([...prev, n]));

  const confirmSubstance = () => {
    setCompletedModules(new Set([1]));
    setDoseResponse(null);
    setToxParams(null);
  };

  const administerDoses = () => {
    const adjustedLD50 = sub.ld50 * model.factor;
    const adjustedED50 = sub.ed50 * model.factor;
    const maxDose = adjustedLD50 * 3;
    const data = [];
    for (let i = 0; i <= nPoints[0]; i++) {
      const dose = (maxDose / nPoints[0]) * i;
      data.push({
        dose: parseFloat(dose.toFixed(2)),
        efeito: parseFloat(hillEquation(dose, adjustedED50, sub.hillN).toFixed(1)),
        mortalidade: parseFloat(hillEquation(dose, adjustedLD50, sub.hillN).toFixed(1)),
      });
    }
    setDoseResponse(data);
    setToxParams(null);
    completeModule(2);
  };

  const calcParams = () => {
    const adjustedLD50 = sub.ld50 * model.factor;
    const adjustedED50 = sub.ed50 * model.factor;
    const ti = adjustedLD50 / adjustedED50;
    setToxParams({ ld50: parseFloat(adjustedLD50.toFixed(1)), ed50: parseFloat(adjustedED50.toFixed(1)), ti, toxClass: classifyToxicity(adjustedLD50) });
    completeModule(3);
  };

  const LockedOverlay = ({ req }: { req: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Complete o módulo {req} para desbloquear</p>
    </div>
  );

  const ModuleBadge = ({ n }: { n: number }) => completedModules.has(n) ? <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" /> : null;

  const experimentSummary: Record<string, string> = {
    Substância: sub.name,
    Modelo: model.name,
    "Nº de doses": String(nPoints[0]),
  };
  if (toxParams) {
    experimentSummary["LD50"] = `${toxParams.ld50} ${sub.unit}`;
    experimentSummary["ED50"] = `${toxParams.ed50} ${sub.unit}`;
    experimentSummary["IT"] = toxParams.ti.toFixed(1);
    experimentSummary["Classificação"] = `${toxParams.toxClass.category} (Classe ${toxParams.toxClass.class})`;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/laboratorio-virtual")}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Skull className="h-7 w-7 text-primary" /> Bancada de Toxicologia</h1>
          <p className="text-sm text-muted-foreground">Curvas dose-resposta, LD50/ED50 e índice terapêutico</p>
        </div>
        <AdminPromptViewer
          toolSlug={LAB_SYSTEM_PROMPTS.toxicologia.slug}
          toolName={LAB_SYSTEM_PROMPTS.toxicologia.name}
          toolType="laboratory"
          prompt={LAB_SYSTEM_PROMPTS.toxicologia.prompt}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">1. Seleção da Substância <ModuleBadge n={1} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Substância</label>
              <Select value={substance} onValueChange={setSubstance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{allSubstances.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Uso clínico:</strong> {sub.clinical}</p>
              <p><strong>Mecanismo de toxicidade:</strong> {sub.mechanism}</p>
            </div>
            <Button onClick={confirmSubstance} className="w-full">Confirmar Substância</Button>
            <AIContextGenerator
              labType="toxicologia"
              onContextGenerated={(data: any) => {
                setCustomSubstance(data.substance);
                setSubstance(data.substance.id);
                setCompletedModules(new Set([1]));
                setDoseResponse(null);
                setToxParams(null);
              }}
            />
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay req={1} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">2. Desenho do Ensaio <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Modelo animal</label>
              <Select value={animalModel} onValueChange={setAnimalModel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ANIMAL_MODELS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Número de doses: {nPoints[0]}</label>
              <Slider value={nPoints} onValueChange={setNPoints} min={10} max={50} step={5} className="mt-2" />
            </div>
            <p className="text-[10px] text-muted-foreground">Fator de correção para {model.name}: ×{model.factor}</p>
            <Button onClick={administerDoses} className="w-full">Administrar Doses</Button>
          </CardContent>
        </Card>

        {/* M3 */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(2) && <LockedOverlay req={2} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">3. Curvas Dose-Resposta <ModuleBadge n={2} /></CardTitle></CardHeader>
          <CardContent>
            {!doseResponse ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Aguardando administração de doses</div>
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={doseResponse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="dose" label={{ value: `Dose (${sub.unit})`, position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis domain={[0, 100]} label={{ value: "Resposta (%)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" opacity={0.4} />
                    <Line type="monotone" dataKey="efeito" stroke="hsl(142 71% 45%)" name="Efeito Terapêutico" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="mortalidade" stroke="hsl(0 72% 51%)" name="Mortalidade" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
                <Button onClick={calcParams} className="w-full">Calcular Parâmetros Toxicológicos</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* M4 */}
        <Card className="lg:col-span-2 relative">
          {!completedModules.has(3) && <LockedOverlay req={3} />}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center">4. Parâmetros Toxicológicos <ModuleBadge n={3} /></CardTitle></CardHeader>
          <CardContent>
            {!toxParams ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Aguardando cálculo</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">LD50</p><p className="text-lg font-bold">{toxParams.ld50}</p><p className="text-[10px] text-muted-foreground">{sub.unit}</p></div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">ED50</p><p className="text-lg font-bold">{toxParams.ed50}</p><p className="text-[10px] text-muted-foreground">{sub.unit}</p></div>
                  <div className="bg-muted/50 rounded-lg p-3 text-center"><p className="text-xs text-muted-foreground">Índice Terapêutico</p><p className="text-lg font-bold">{toxParams.ti.toFixed(1)}</p><p className="text-[10px] text-muted-foreground">LD50/ED50</p></div>
                </div>
                <div className="p-3 rounded-lg border" style={{ borderColor: toxParams.toxClass.color }}>
                  <div className="flex items-center gap-2">
                    <Badge style={{ backgroundColor: toxParams.toxClass.color, color: "white" }}>Classe {toxParams.toxClass.class}</Badge>
                    <span className="text-sm font-medium">{toxParams.toxClass.category}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Classificação de Hodge & Sterner</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <strong className="text-foreground">Veredito:</strong>{" "}
                  {toxParams.ti >= 10
                    ? `${sub.name} apresenta margem de segurança ampla (IT = ${toxParams.ti.toFixed(1)}).`
                    : toxParams.ti >= 2
                    ? `${sub.name} possui margem de segurança estreita (IT = ${toxParams.ti.toFixed(1)}). Monitoramento clínico recomendado.`
                    : `${sub.name} tem índice terapêutico perigosamente baixo (IT = ${toxParams.ti.toFixed(1)}).`}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Bancada de Toxicologia" isUnlocked={completedModules.has(3)} experimentSummary={experimentSummary} />
      </div>
    </div>
  );
}
