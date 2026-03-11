import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, CheckCircle2, Wind } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

type AuscultResult = "MV normal" | "Roncos" | "Crepitações" | "Sibilos" | "MV diminuído" | "Ausente";

const CASES = [
  { id: "c1", name: "Pós-operatório abdominal", desc: "48h PO de colecistectomia aberta, dor à inspiração profunda", auscultation: { LSD: "MV diminuído", LSE: "MV normal", LMD: "Crepitações", LID: "MV diminuído", LIE: "MV normal" } as Record<string, AuscultResult>, issue: "Atelectasia de base direita com acúmulo de secreção" },
  { id: "c2", name: "DPOC exacerbada", desc: "Homem 68a, dispneia, tosse produtiva, saturação 88%", auscultation: { LSD: "Sibilos", LSE: "Sibilos", LMD: "Roncos", LID: "Roncos", LIE: "Roncos" } as Record<string, AuscultResult>, issue: "Hiperinsuflação com secreção difusa e broncoespasmo" },
  { id: "c3", name: "Paciente intubado em UTI", desc: "72h de VM, secreção espessa amarelada, FiO2 0.6", auscultation: { LSD: "Roncos", LSE: "Crepitações", LMD: "MV diminuído", LID: "Ausente", LIE: "Crepitações" } as Record<string, AuscultResult>, issue: "Pneumonia associada à VM com atelectasia de LID" },
];

const LUNG_ZONES = [
  { id: "LSD", label: "Lobo Superior D", x: 35, y: 22 },
  { id: "LSE", label: "Lobo Superior E", x: 65, y: 22 },
  { id: "LMD", label: "Lobo Médio D", x: 35, y: 42 },
  { id: "LID", label: "Lobo Inferior D", x: 35, y: 60 },
  { id: "LIE", label: "Lobo Inferior E", x: 65, y: 55 },
];

const TECHNIQUES = [
  { id: "eltgol", name: "ELTGOL", desc: "Expiração lenta total com glote aberta em decúbito lateral" },
  { id: "huffing", name: "Huffing / TEF", desc: "Técnica de expiração forçada para remoção de secreção" },
  { id: "bag", name: "Bag squeezing", desc: "Hiperinsuflação manual com compressão torácica (intubado)" },
  { id: "rppi", name: "RPPI / IPPB", desc: "Respiração com pressão positiva intermitente" },
  { id: "vni", name: "VNI (BiPAP/CPAP)", desc: "Ventilação não-invasiva para reexpansão" },
  { id: "aspiracao", name: "Aspiração traqueal", desc: "Sistema aberto ou fechado (paciente intubado)" },
];

const AUSC_COLORS: Record<string, string> = {
  "MV normal": "#22c55e", "Roncos": "#f59e0b", "Crepitações": "#f97316", "Sibilos": "#a855f7", "MV diminuído": "#ef4444", "Ausente": "#6b7280",
};

function LungSVG({ auscultated, onZoneClick }: { auscultated: Record<string, AuscultResult | null>; onZoneClick: (id: string) => void }) {
  return (
    <svg viewBox="0 0 100 85" className="w-full max-w-[300px] mx-auto">
      <rect x={0} y={0} width={100} height={80} fill="hsl(var(--muted)/0.2)" rx={4} />
      {/* Rib cage outline */}
      <path d="M 50 8 Q 25 15, 22 40 Q 20 65, 35 72 L 45 72 Q 50 68, 50 60" fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
      <path d="M 50 8 Q 75 15, 78 40 Q 80 65, 65 72 L 55 72 Q 50 68, 50 60" fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
      {/* Trachea */}
      <line x1={50} y1={2} x2={50} y2={15} stroke="hsl(var(--foreground)/0.2)" strokeWidth={2} />
      {/* Bronchi */}
      <line x1={50} y1={15} x2={38} y2={25} stroke="hsl(var(--foreground)/0.15)" strokeWidth={1} />
      <line x1={50} y1={15} x2={62} y2={25} stroke="hsl(var(--foreground)/0.15)" strokeWidth={1} />
      {/* Diaphragm */}
      <path d="M 22 65 Q 50 55, 78 65" fill="none" stroke="hsl(var(--primary)/0.3)" strokeWidth={0.8} strokeDasharray="2 1" />
      <text x={50} y={78} textAnchor="middle" fontSize={3} fill="hsl(var(--muted-foreground))">Diafragma</text>

      {/* Zones */}
      {LUNG_ZONES.map(z => {
        const result = auscultated[z.id];
        const color = result ? AUSC_COLORS[result] : "hsl(var(--muted-foreground)/0.3)";
        return (
          <g key={z.id} onClick={() => onZoneClick(z.id)} className="cursor-pointer">
            <circle cx={z.x} cy={z.y} r={6} fill={color} opacity={0.6} stroke="hsl(var(--background))" strokeWidth={0.5} />
            <text x={z.x} y={z.y + 1} textAnchor="middle" fontSize={3} fill="white" fontWeight="bold">{result ? "🔊" : "?"}</text>
            <title>{z.label}: {result ?? "Não auscultado"}</title>
          </g>
        );
      })}
    </svg>
  );
}

export default function SimuladorRespiratorio() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [auscultated, setAuscultated] = useState<Record<string, AuscultResult | null>>({});
  const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
  const [reEvaluated, setReEvaluated] = useState(false);

  const caseData = CASES.find(c => c.id === selectedCase);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));
  const allAuscultated = LUNG_ZONES.every(z => auscultated[z.id]);

  const handleAuscultate = (id: string) => {
    if (!caseData) return;
    setAuscultated(prev => ({ ...prev, [id]: caseData.auscultation[id] }));
  };

  const reportSections = caseData ? [
    { title: "Caso", content: `${caseData.name} — ${caseData.desc}` },
    { title: "Ausculta", content: LUNG_ZONES.map(z => `${z.label}: ${auscultated[z.id] ?? "-"}`).join("\n") },
    { title: "Problema", content: caseData.issue },
    { title: "Técnicas Selecionadas", content: selectedTechniques.map(id => TECHNIQUES.find(t => t.id === id)?.name).join(", ") || "Nenhuma" },
  ] : [];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Wind className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Fisioterapia Respiratória</h1>
          <p className="text-sm text-muted-foreground">Mecânica ventilatória, ausculta e técnicas de higiene brônquica</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setAuscultated({}); setSelectedTechniques([]); setReEvaluated(false); setCompletedModules(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm bg-muted/50 p-3 rounded-lg">{caseData.desc}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar Avaliação</Button>}
          </CardContent>
        </Card>

        {/* M2 — Ausculta */}
        <Card className="relative">
          {!completedModules.has(1) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Ausculta Virtual{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Clique nos pontos do tórax para auscultar:</p>
            <div className="flex gap-2 flex-wrap text-xs">
              {Object.entries(AUSC_COLORS).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: c }} />{k}</span>
              ))}
            </div>
            <LungSVG auscultated={auscultated} onZoneClick={handleAuscultate} />
            {allAuscultated && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Ausculta</Button>}
          </CardContent>
        </Card>

        {/* M3 — Técnicas */}
        <Card className="relative">
          {!completedModules.has(2) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Seleção de Técnicas{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(2) && (
              <>
                <p className="text-sm text-muted-foreground">Baseado na ausculta, selecione as manobras:</p>
                {TECHNIQUES.map(t => (
                  <label key={t.id} className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" checked={selectedTechniques.includes(t.id)} onChange={e => setSelectedTechniques(prev => e.target.checked ? [...prev, t.id] : prev.filter(x => x !== t.id))} className="mt-1" />
                    <div className="text-sm"><p className="font-medium">{t.name}</p><p className="text-muted-foreground">{t.desc}</p></div>
                  </label>
                ))}
                {selectedTechniques.length > 0 && !completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Aplicar Técnicas</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M4 — Reavaliação */}
        <Card className="relative">
          {!completedModules.has(3) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Reavaliação{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {completedModules.has(3) && (
              <>
                {!reEvaluated ? (
                  <Button size="sm" className="w-full" onClick={() => setReEvaluated(true)}>Realizar Nova Ausculta</Button>
                ) : (
                  <>
                    <p className="text-sm font-medium text-green-600">Reavaliação pós-manobras:</p>
                    <div className="space-y-1">
                      {LUNG_ZONES.map(z => (
                        <div key={z.id} className="flex justify-between text-sm p-2 rounded bg-muted/50">
                          <span>{z.label}</span>
                          <span className="text-green-600">MV presente, melhorado</span>
                        </div>
                      ))}
                    </div>
                    {!completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => completeModule(4)}>Finalizar</Button>}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {completedModules.has(4) && <LabReportPanel title="Relatório de Fisioterapia Respiratória" sections={reportSections} />}
    </div>
  );
}
