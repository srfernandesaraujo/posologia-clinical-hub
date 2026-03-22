import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, Baby, User, Stethoscope } from "lucide-react";
import { ShareToolButton } from "@/components/ShareToolButton";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { ClinicalReferences, CALCULATOR_REFERENCES } from "@/components/calculators/ClinicalReferences";
import { RelatedCalculators } from "@/components/calculators/RelatedCalculators";
import { useNavigate } from "react-router-dom";
import { useIsEmbed } from "@/contexts/EmbedContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Modo = "clinico" | "educativo";

interface Droga {
  nome: string;
  doseMin: number;
  doseMax: number;
  unidade: string;
  concentracaoPadrao: number; // mg em ampola
  volumeAmpola: number; // mL
  diluicaoPadrao: string;
  indicacao: string;
}

const DROGAS: Droga[] = [
  { nome: "Dopamina", doseMin: 2, doseMax: 20, unidade: "mcg/kg/min", concentracaoPadrao: 50, volumeAmpola: 10, diluicaoPadrao: "50 mg/10 mL — diluir em SG5%", indicacao: "Choque, suporte inotropico" },
  { nome: "Dobutamina", doseMin: 2, doseMax: 20, unidade: "mcg/kg/min", concentracaoPadrao: 250, volumeAmpola: 20, diluicaoPadrao: "250 mg/20 mL — diluir em SG5%", indicacao: "IC, baixo debito cardiaco" },
  { nome: "Noradrenalina", doseMin: 0.05, doseMax: 2, unidade: "mcg/kg/min", concentracaoPadrao: 4, volumeAmpola: 4, diluicaoPadrao: "4 mg/4 mL — diluir em SG5%", indicacao: "Choque septico, vasopressor" },
  { nome: "Adrenalina", doseMin: 0.05, doseMax: 1, unidade: "mcg/kg/min", concentracaoPadrao: 1, volumeAmpola: 1, diluicaoPadrao: "1 mg/1 mL — diluir em SG5%", indicacao: "PCR, choque, broncoespasmo grave" },
  { nome: "Milrinona", doseMin: 0.25, doseMax: 0.75, unidade: "mcg/kg/min", concentracaoPadrao: 10, volumeAmpola: 10, diluicaoPadrao: "10 mg/10 mL — diluir em SG5%", indicacao: "IC, pos-operatorio cardiaco" },
  { nome: "Nitroprussiato", doseMin: 0.5, doseMax: 8, unidade: "mcg/kg/min", concentracaoPadrao: 50, volumeAmpola: 2, diluicaoPadrao: "50 mg/2 mL — fotossensivel, diluir em SG5%", indicacao: "Emergencia hipertensiva, IC" },
];

export default function DrogasVasoativasPediatricas() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [peso, setPeso] = useState("");
  const [drogaIdx, setDrogaIdx] = useState("0");
  const [dose, setDose] = useState("");
  const [concentracao, setConcentracao] = useState(""); // mg em volume total de solução
  const [volumeTotal, setVolumeTotal] = useState("50"); // mL da solução final
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<{ infusao: number; doseMcgMin: number; droga: Droga } | null>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const droga = DROGAS[Number(drogaIdx)];

  const handleCalc = () => {
    const p = Number(peso);
    const d = Number(dose);
    const c = Number(concentracao || droga.concentracaoPadrao);
    const v = Number(volumeTotal);
    if (!p || p <= 0) { setErro("Peso invalido."); return; }
    if (!d || d <= 0) { setErro("Dose invalida."); return; }
    if (c <= 0 || v <= 0) { setErro("Concentracao/volume invalidos."); return; }

    // dose (mcg/kg/min) * peso (kg) = mcg/min
    const doseMcgMin = d * p;
    // concentration: c mg in v mL → c*1000 mcg in v mL → mcg/mL = c*1000/v
    const concMcgPerMl = (c * 1000) / v;
    // mL/min = doseMcgMin / concMcgPerMl
    const mlPerMin = doseMcgMin / concMcgPerMl;
    const mlPerHour = Math.round(mlPerMin * 60 * 100) / 100;

    setResultado({ infusao: mlPerHour, doseMcgMin: Math.round(doseMcgMin * 100) / 100, droga });
    setErro("");
    saveCalculation({
      calculatorName: "Drogas Vasoativas Pediatricas",
      calculatorSlug: "drogas-vasoativas-pediatricas",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `${droga.nome}: ${mlPerHour} mL/h (${d} mcg/kg/min)`,
      details: { Droga: droga.nome, "Peso (kg)": p, "Dose (mcg/kg/min)": d, "Infusao (mL/h)": mlPerHour },
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
            <div className="rounded-xl bg-primary/10 p-3"><Baby className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Drogas Vasoativas Pediatricas</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Calculo de infusao, diluicao e faixas de dose — PALS/AHA.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="drogas-vasoativas-pediatricas" toolName="Drogas Vasoativas Pediatricas" />
            <AdminPromptViewer toolSlug="drogas-vasoativas-pediatricas" toolName="Drogas Vasoativas Ped." toolType="calculator" prompt={getNativePrompt("drogas-vasoativas-pediatricas") || ""} />
            <CalculationHistory calculatorSlug="drogas-vasoativas-pediatricas" />
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
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Identificacao</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Nome do Paciente</Label><Input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Parametros</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Peso (kg) *</Label><Input type="number" step="0.1" value={peso} onChange={e => { setPeso(e.target.value); setResultado(null); setErro(""); }} placeholder="Ex: 10" /></div>
              <div className="space-y-1.5">
                <Label>Droga *</Label>
                <Select value={drogaIdx} onValueChange={v => { setDrogaIdx(v); setDose(""); setResultado(null); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DROGAS.map((d, i) => <SelectItem key={i} value={String(i)}>{d.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Dose desejada ({droga.unidade}) *</Label><Input type="number" step="0.01" value={dose} onChange={e => { setDose(e.target.value); setResultado(null); setErro(""); }} placeholder={`${droga.doseMin} - ${droga.doseMax}`} /></div>
              <div className="space-y-1.5"><Label>Quantidade da droga na solucao (mg)</Label><Input type="number" step="0.1" value={concentracao} onChange={e => { setConcentracao(e.target.value); setResultado(null); }} placeholder={String(droga.concentracaoPadrao)} /></div>
              <div className="space-y-1.5"><Label>Volume total da solucao (mL)</Label><Input type="number" value={volumeTotal} onChange={e => { setVolumeTotal(e.target.value); setResultado(null); }} placeholder="50" /></div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong>{droga.nome}:</strong> {droga.doseMin}-{droga.doseMax} {droga.unidade} | {droga.diluicaoPadrao} | {droga.indicacao}
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}

          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular Infusao</Button>
            <Button variant="outline" onClick={() => { setPeso(""); setDose(""); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>

          {/* Reference table */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Faixas de Dose</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Droga</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Faixa</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Indicacao</th>
                  </tr>
                </thead>
                <tbody>
                  {DROGAS.map((d, i) => (
                    <tr key={i} className={`border-b border-border/50 ${Number(drogaIdx) === i ? "bg-primary/5" : ""}`}>
                      <td className="py-2 px-3 font-medium">{d.nome}</td>
                      <td className="py-2 px-3 text-muted-foreground">{d.doseMin}-{d.doseMax} {d.unidade}</td>
                      <td className="py-2 px-3 text-muted-foreground">{d.indicacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <div className="text-center py-2">
                  <div className="text-lg font-semibold text-primary">{resultado.droga.nome}</div>
                  <div className="text-4xl font-bold mt-2">{resultado.infusao}</div>
                  <div className="text-sm text-muted-foreground">mL/h</div>
                  <div className="text-sm text-muted-foreground mt-2">{resultado.doseMcgMin} mcg/min</div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Detalhes</h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• <strong>Dose:</strong> {dose} {resultado.droga.unidade}</li>
                  <li>• <strong>Peso:</strong> {peso} kg</li>
                  <li>• <strong>Concentracao:</strong> {concentracao || resultado.droga.concentracaoPadrao} mg em {volumeTotal} mL</li>
                  <li>• <strong>Velocidade:</strong> {resultado.infusao} mL/h</li>
                  {modo === "clinico" ? (
                    <>
                      <li>• Monitorar PA, FC e perfusao continuamente.</li>
                      <li>• Usar acesso venoso central quando possivel.</li>
                      <li>• Titular conforme resposta hemodinamica.</li>
                    </>
                  ) : (
                    <>
                      <li>• Drogas vasoativas sao usadas em emergencias.</li>
                      <li>• A velocidade de infusao deve ser precisa.</li>
                    </>
                  )}
                </ul>
              </div>

              <ClinicalReferences references={CALCULATOR_REFERENCES["drogas-vasoativas-pediatricas"]} />
              <RelatedCalculators currentSlug="drogas-vasoativas-pediatricas" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Baby className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Selecione a droga, peso e dose.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
