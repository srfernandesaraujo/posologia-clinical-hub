import { useState } from "react";
import { useCalculationHistory } from "@/hooks/useCalculationHistory";
import { CalculationHistory } from "@/components/CalculationHistory";
import { ArrowLeft, HeartPulse, User, Stethoscope } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

type Modo = "clinico" | "educativo";

function addDays(date: Date, days: number) {
  const r = new Date(date);
  r.setDate(r.getDate() + days);
  return r;
}

function diffDays(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR");
}

export default function IdadeGestacional() {
  const navigate = useNavigate();
  const isEmbed = useIsEmbed();
  const [modo, setModo] = useState<Modo>("clinico");
  const [metodo, setMetodo] = useState<"dum" | "usg">("dum");
  const [dum, setDum] = useState("");
  const [usgIG, setUsgIG] = useState(""); // semanas
  const [usgIGDias, setUsgIGDias] = useState(""); // dias
  const [dataUSG, setDataUSG] = useState("");
  const [nomePaciente, setNomePaciente] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [resultado, setResultado] = useState<any>(null);
  const [erro, setErro] = useState("");
  const { saveCalculation } = useCalculationHistory();

  const handleCalc = () => {
    const hoje = new Date(data + "T12:00:00");
    let igDias: number;
    let dpp: Date;
    let dumCalc: Date;

    if (metodo === "dum") {
      if (!dum) { setErro("Informe a DUM."); return; }
      dumCalc = new Date(dum + "T12:00:00");
      igDias = diffDays(dumCalc, hoje);
      if (igDias < 0 || igDias > 310) { setErro("DUM invalida para a data atual."); return; }
      dpp = addDays(dumCalc, 280);
    } else {
      if (!usgIG || !dataUSG) { setErro("Preencha a IG no USG e a data do exame."); return; }
      const semUSG = Number(usgIG);
      const diasUSG = Number(usgIGDias || 0);
      const igNaUSG = semUSG * 7 + diasUSG;
      const dUSG = new Date(dataUSG + "T12:00:00");
      const diasDesdeUSG = diffDays(dUSG, hoje);
      igDias = igNaUSG + diasDesdeUSG;
      dumCalc = addDays(hoje, -igDias);
      dpp = addDays(dumCalc, 280);
    }

    const semanas = Math.floor(igDias / 7);
    const dias = igDias % 7;
    const trimestre = semanas < 14 ? 1 : semanas < 28 ? 2 : 3;

    const timelineData = [
      { name: "1º Tri", semanas: 13, fill: "hsl(200 70% 50%)" },
      { name: "2º Tri", semanas: 14, fill: "hsl(142 60% 45%)" },
      { name: "3º Tri", semanas: 13, fill: "hsl(38 90% 50%)" },
    ];

    const res = { igDias, semanas, dias, trimestre, dpp, dumCalc, timelineData, igAtualSemana: semanas + dias / 7 };
    setResultado(res);
    setErro("");

    saveCalculation({
      calculatorName: "Idade Gestacional + DPP",
      calculatorSlug: "idade-gestacional",
      patientName: nomePaciente || undefined,
      date: data,
      summary: `IG: ${semanas}s ${dias}d | DPP: ${formatDate(dpp)} | ${trimestre}º trimestre`,
      details: { IG: `${semanas}s ${dias}d`, DPP: formatDate(dpp), Trimestre: trimestre, Metodo: metodo },
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
            <div className="rounded-xl bg-primary/10 p-3"><HeartPulse className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold">Idade Gestacional + DPP</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Calculo por DUM ou USG com timeline gestacional.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <ShareToolButton toolSlug="idade-gestacional" toolName="Idade Gestacional" />
            <AdminPromptViewer toolSlug="idade-gestacional" toolName="Idade Gestacional" toolType="calculator" prompt={getNativePrompt("idade-gestacional") || ""} />
            <CalculationHistory calculatorSlug="idade-gestacional" />
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
              <div className="space-y-1.5"><Label>Nome da Paciente</Label><Input value={nomePaciente} onChange={e => setNomePaciente(e.target.value)} placeholder="Opcional" /></div>
              <div className="space-y-1.5"><Label>Data de Referencia</Label><Input type="date" value={data} onChange={e => setData(e.target.value)} /></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Metodo de Calculo</h2>
            <div className="space-y-4">
              <Select value={metodo} onValueChange={v => { setMetodo(v as any); setResultado(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dum">Data da Ultima Menstruacao (DUM)</SelectItem>
                  <SelectItem value="usg">Ultrassonografia (USG)</SelectItem>
                </SelectContent>
              </Select>

              {metodo === "dum" ? (
                <div className="space-y-1.5"><Label>DUM *</Label><Input type="date" value={dum} onChange={e => { setDum(e.target.value); setResultado(null); }} /></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5"><Label>IG no USG (semanas) *</Label><Input type="number" min="0" max="42" value={usgIG} onChange={e => { setUsgIG(e.target.value); setResultado(null); }} placeholder="Ex: 12" /></div>
                  <div className="space-y-1.5"><Label>Dias</Label><Input type="number" min="0" max="6" value={usgIGDias} onChange={e => { setUsgIGDias(e.target.value); setResultado(null); }} placeholder="0-6" /></div>
                  <div className="space-y-1.5"><Label>Data do USG *</Label><Input type="date" value={dataUSG} onChange={e => { setDataUSG(e.target.value); setResultado(null); }} /></div>
                </div>
              )}
            </div>
          </div>

          {erro && <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{erro}</div>}
          <div className="flex gap-3">
            <Button onClick={handleCalc} className="flex-1">Calcular</Button>
            <Button variant="outline" onClick={() => { setDum(""); setUsgIG(""); setUsgIGDias(""); setDataUSG(""); setResultado(null); setErro(""); }}>Limpar</Button>
          </div>
        </div>

        <div className="space-y-6">
          {resultado ? (
            <>
              <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Resultado</h2>
                <p className="text-3xl font-bold">{resultado.semanas}s {resultado.dias}d</p>
                <p className="text-sm text-muted-foreground mt-1">{resultado.trimestre}º Trimestre</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p><strong>DPP:</strong> {formatDate(resultado.dpp)}</p>
                  <p><strong>DUM estimada:</strong> {formatDate(resultado.dumCalc)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Timeline Gestacional</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={resultado.timelineData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 40]} label={{ value: "Semanas", position: "insideBottom", offset: -5 }} />
                    <YAxis type="category" dataKey="name" width={50} />
                    <Tooltip formatter={(v: number) => `${v} sem`} />
                    <Bar dataKey="semanas" radius={[0, 4, 4, 0]}>
                      {resultado.timelineData.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                    <ReferenceLine x={resultado.igAtualSemana} stroke="hsl(0 72% 51%)" strokeWidth={2} label={{ value: "Atual", fill: "hsl(0 72% 51%)", fontSize: 11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {modo === "educativo" && (
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h2 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Conceitos</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• <strong>Regra de Naegele:</strong> DPP = DUM + 280 dias (40 semanas).</li>
                    <li>• O 1º trimestre vai ate 13s6d, o 2º de 14s a 27s6d, o 3º de 28s em diante.</li>
                    <li>• USG do 1º trimestre e o metodo mais preciso (±5 dias).</li>
                    <li>• A DUM pode ter erro de 2-3 semanas se ciclos irregulares.</li>
                  </ul>
                </div>
              )}

              <ClinicalReferences references={CALCULATOR_REFERENCES["idade-gestacional"]} />
              <RelatedCalculators currentSlug="idade-gestacional" />
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
              <HeartPulse className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Informe a DUM ou dados do USG para calcular.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
