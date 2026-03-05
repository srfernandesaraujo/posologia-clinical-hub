import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, FileText, Stethoscope, User, Flame } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import { RiskGauge } from "@/components/calculators/RiskGauge";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import jsPDF from "jspdf";

type Modo = "clinico" | "educativo";
type Tipo = "meld" | "child";

interface MeldForm {
  nomePaciente: string;
  data: string;
  creatinina: string;
  bilirrubina: string;
  inr: string;
  sodio: string;
  dialise: string;
}

const MELD_INITIAL: MeldForm = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  creatinina: "", bilirrubina: "", inr: "", sodio: "", dialise: "nao",
};

interface ChildForm {
  nomePaciente: string;
  data: string;
  bilirrubina: string;
  albumina: string;
  inr: string;
  ascite: string;
  encefalopatia: string;
}

const CHILD_INITIAL: ChildForm = {
  nomePaciente: "", data: new Date().toISOString().slice(0, 10),
  bilirrubina: "", albumina: "", inr: "", ascite: "ausente", encefalopatia: "ausente",
};

function calcMELD(cr: number, bili: number, inr: number, na: number, dialise: boolean): { meld: number; meldNa: number } {
  const crAdj = dialise ? 4 : Math.max(Math.min(cr, 4), 1);
  const biliAdj = Math.max(bili, 1);
  const inrAdj = Math.max(inr, 1);
  const meld = Math.round(10 * (0.957 * Math.log(crAdj) + 0.378 * Math.log(biliAdj) + 1.120 * Math.log(inrAdj) + 0.643));
  const meldClamped = Math.max(Math.min(meld, 40), 6);
  const naAdj = Math.max(Math.min(na, 140), 125);
  const meldNa = Math.round(meldClamped + 1.32 * (137 - naAdj) - 0.033 * meldClamped * (137 - naAdj));
  return { meld: meldClamped, meldNa: Math.max(Math.min(meldNa, 40), 6) };
}

function calcChild(bili: number, alb: number, inr: number, ascite: string, encefalopatia: string): { score: number; classe: string } {
  let pts = 0;
  // Bilirubin
  if (bili < 2) pts += 1; else if (bili <= 3) pts += 2; else pts += 3;
  // Albumin
  if (alb > 3.5) pts += 1; else if (alb >= 2.8) pts += 2; else pts += 3;
  // INR
  if (inr < 1.7) pts += 1; else if (inr <= 2.3) pts += 2; else pts += 3;
  // Ascites
  if (ascite === "ausente") pts += 1; else if (ascite === "leve") pts += 2; else pts += 3;
  // Encephalopathy
  if (encefalopatia === "ausente") pts += 1; else if (encefalopatia === "grau12") pts += 2; else pts += 3;

  const classe = pts <= 6 ? "A" : pts <= 9 ? "B" : "C";
  return { score: pts, classe };
}

export default function MeldScore() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [tipo, setTipo] = useState<Tipo>("meld");
  const [modo, setModo] = useState<Modo>("clinico");
  const [meldForm, setMeldForm] = useState(MELD_INITIAL);
  const [childForm, setChildForm] = useState(CHILD_INITIAL);
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const setM = (f: keyof MeldForm, v: string) => { setMeldForm(p => ({ ...p, [f]: v })); setResultado(null); setErro(""); };
  const setC = (f: keyof ChildForm, v: string) => { setChildForm(p => ({ ...p, [f]: v })); setResultado(null); setErro(""); };

  const calcularMeld = () => {
    if (!meldForm.creatinina || !meldForm.bilirrubina || !meldForm.inr || !meldForm.sodio) { setErro("Preencha todos os campos."); return; }
    const { meld, meldNa } = calcMELD(Number(meldForm.creatinina), Number(meldForm.bilirrubina), Number(meldForm.inr), Number(meldForm.sodio), meldForm.dialise === "sim");
    const mortalidade3m = meld < 10 ? "<2%" : meld < 20 ? "6%" : meld < 30 ? "20%" : meld < 40 ? "50-70%" : ">70%";
    setResultado({ tipo: "meld", meld, meldNa, mortalidade3m });
    saveCalculation({
      calculatorName: "MELD/MELD-Na",
      calculatorSlug: "meld-score",
      patientName: meldForm.nomePaciente || undefined,
      date: meldForm.data,
      summary: `MELD: ${meld} | MELD-Na: ${meldNa} | Mortalidade 3m: ${mortalidade3m}`,
      details: { MELD: String(meld), "MELD-Na": String(meldNa), Mortalidade: mortalidade3m },
    });
  };

  const calcularChild = () => {
    if (!childForm.bilirrubina || !childForm.albumina || !childForm.inr) { setErro("Preencha bilirrubina, albumina e INR."); return; }
    const { score, classe } = calcChild(Number(childForm.bilirrubina), Number(childForm.albumina), Number(childForm.inr), childForm.ascite, childForm.encefalopatia);
    const sobrevida = classe === "A" ? "100% em 1 ano" : classe === "B" ? "81% em 1 ano" : "45% em 1 ano";
    setResultado({ tipo: "child", score, classe, sobrevida });
    saveCalculation({
      calculatorName: "Child-Pugh",
      calculatorSlug: "meld-score",
      patientName: childForm.nomePaciente || undefined,
      date: childForm.data,
      summary: `Child-Pugh: ${score} pts – Classe ${classe} (${sobrevida})`,
      details: { Score: String(score), Classe: classe, Sobrevida: sobrevida },
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {!isEmbed && (
        <button onClick={() => navigate("/calculadoras")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar as Calculadoras
        </button>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-3"><Flame className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">MELD / MELD-Na / Child-Pugh</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Prognostico hepatico e priorizacao para transplante.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="meld-score" toolName="MELD/Child-Pugh" />
            <CalculationHistory calculatorSlug="meld-score" />
            <span className="text-muted-foreground">Modo:</span>
            <button onClick={() => setModo("clinico")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "clinico" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <Stethoscope className="h-3.5 w-3.5" /> Clinico
            </button>
            <button onClick={() => setModo("educativo")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${modo === "educativo" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              <User className="h-3.5 w-3.5" /> Educativo
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6">
            <Tabs value={tipo} onValueChange={(v) => { setTipo(v as Tipo); setResultado(null); setErro(""); }}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="meld" className="flex-1">MELD / MELD-Na</TabsTrigger>
                <TabsTrigger value="child" className="flex-1">Child-Pugh</TabsTrigger>
              </TabsList>

              <TabsContent value="meld">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={meldForm.nomePaciente} onChange={(e) => setM("nomePaciente", e.target.value)} placeholder="Opcional" /></div>
                    <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={meldForm.data} onChange={(e) => setM("data", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Creatinina (mg/dL) *</Label><Input type="number" step="0.1" value={meldForm.creatinina} onChange={(e) => setM("creatinina", e.target.value)} placeholder="Ex: 1.5" /></div>
                    <div className="space-y-1.5"><Label>Bilirrubina total (mg/dL) *</Label><Input type="number" step="0.1" value={meldForm.bilirrubina} onChange={(e) => setM("bilirrubina", e.target.value)} placeholder="Ex: 3.2" /></div>
                    <div className="space-y-1.5"><Label>INR *</Label><Input type="number" step="0.1" value={meldForm.inr} onChange={(e) => setM("inr", e.target.value)} placeholder="Ex: 1.8" /></div>
                    <div className="space-y-1.5"><Label>Sodio (mEq/L) *</Label><Input type="number" step="0.1" value={meldForm.sodio} onChange={(e) => setM("sodio", e.target.value)} placeholder="Ex: 135" /></div>
                    <div className="space-y-1.5">
                      <Label>Dialise nas ultimas 2 semanas?</Label>
                      <Select value={meldForm.dialise} onValueChange={(v) => setM("dialise", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="nao">Nao</SelectItem><SelectItem value="sim">Sim</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="child">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={childForm.nomePaciente} onChange={(e) => setC("nomePaciente", e.target.value)} placeholder="Opcional" /></div>
                    <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={childForm.data} onChange={(e) => setC("data", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Bilirrubina total (mg/dL) *</Label><Input type="number" step="0.1" value={childForm.bilirrubina} onChange={(e) => setC("bilirrubina", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>Albumina (g/dL) *</Label><Input type="number" step="0.1" value={childForm.albumina} onChange={(e) => setC("albumina", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label>INR *</Label><Input type="number" step="0.1" value={childForm.inr} onChange={(e) => setC("inr", e.target.value)} /></div>
                    <div className="space-y-1.5">
                      <Label>Ascite</Label>
                      <Select value={childForm.ascite} onValueChange={(v) => setC("ascite", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="ausente">Ausente</SelectItem><SelectItem value="leve">Leve/controlada</SelectItem><SelectItem value="moderada">Moderada/refrataria</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Encefalopatia</Label>
                      <Select value={childForm.encefalopatia} onValueChange={(v) => setC("encefalopatia", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="ausente">Ausente</SelectItem><SelectItem value="grau12">Grau I-II</SelectItem><SelectItem value="grau34">Grau III-IV</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {modo === "educativo" && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Sobre MELD e Child-Pugh</h2>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p><strong>MELD</strong> (Model for End-Stage Liver Disease): prediz mortalidade em 3 meses em cirroticos. Usado para alocacao de orgaos para transplante.</p>
                <p><strong>MELD-Na:</strong> Incorpora sodio serico, melhorando a predicao (hiponatremia = pior prognostico).</p>
                <p><strong>Child-Pugh:</strong> Classifica em A (5-6 pts), B (7-9 pts) e C (10-15 pts). Util para decisoes cirurgicas e prognostico geral.</p>
              </div>
            </div>
          )}

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={tipo === "meld" ? calcularMeld : calcularChild} className="flex-1">Calcular {tipo === "meld" ? "MELD" : "Child-Pugh"}</Button>
            <Button variant="outline" onClick={() => { setMeldForm(MELD_INITIAL); setChildForm(CHILD_INITIAL); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado?.tipo === "meld" && (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.meld >= 30 ? "border-red-500/30 bg-red-500/10" : resultado.meld >= 20 ? "border-orange-500/30 bg-orange-500/10" : resultado.meld >= 10 ? "border-yellow-500/30 bg-yellow-500/10" : "border-green-500/30 bg-green-500/10"}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <RiskGauge value={resultado.meld} maxValue={40} label={`Mortalidade 3m: ${resultado.mortalidade3m}`} unit="pts" segments={[
                  { min: 0, max: 25, color: "hsl(142 71% 45%)", label: "<10" },
                  { min: 25, max: 50, color: "hsl(38 92% 50%)", label: "10-19" },
                  { min: 50, max: 75, color: "hsl(25 90% 50%)", label: "20-29" },
                  { min: 75, max: 100, color: "hsl(0 72% 51%)", label: "30+" },
                ]} />
                <div className="mt-4 pt-4 border-t border-border/50 space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>MELD</span><span className="font-bold">{resultado.meld}</span></div>
                  <div className="flex justify-between"><span>MELD-Na</span><span className="font-bold">{resultado.meldNa}</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Interpretacao</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• MELD &lt;10: baixo risco ({`<`}2% mortalidade 3m)</li>
                  <li>• MELD 10-19: risco moderado (~6%)</li>
                  <li>• MELD 20-29: risco alto (~20%)</li>
                  <li>• MELD 30-39: risco muito alto (50-70%)</li>
                  <li>• MELD 40: mortalidade &gt;70%</li>
                </ul>
              </div>
            </>
          )}
          {resultado?.tipo === "child" && (
            <>
              <div className={`rounded-2xl border p-6 ${resultado.classe === "C" ? "border-red-500/30 bg-red-500/10" : resultado.classe === "B" ? "border-yellow-500/30 bg-yellow-500/10" : "border-green-500/30 bg-green-500/10"}`}>
                <h2 className="font-semibold mb-2 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-primary">{resultado.classe}</div>
                  <div className="text-sm text-muted-foreground mt-1">{resultado.score} pontos</div>
                  <div className="mt-2 text-sm font-medium">{resultado.sobrevida}</div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Classificacao</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• A (5-6 pts): cirrose compensada, sobrevida 100% 1 ano</li>
                  <li>• B (7-9 pts): comprometimento significativo, 81% 1 ano</li>
                  <li>• C (10-15 pts): cirrose descompensada, 45% 1 ano</li>
                </ul>
              </div>
            </>
          )}
          {resultado && (
            <>
              <ClinicalReferences references={CALCULATOR_REFERENCES["meld-score"]} />
              <RelatedCalculators currentSlug="meld-score" />
            </>
          )}
          {!resultado && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Flame className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Preencha os dados e clique em <strong>Calcular</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
