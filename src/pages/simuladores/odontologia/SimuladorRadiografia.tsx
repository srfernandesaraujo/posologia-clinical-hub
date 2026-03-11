import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Lock, CheckCircle2, Image, Search, FileText, AlertCircle } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";

const EXAM_TYPES = [
  { id: "periapical", label: "Radiografia Periapical", desc: "Imagem de 2-3 dentes com raízes e osso periapical" },
  { id: "panoramica", label: "Radiografia Panorâmica", desc: "Visão completa de ambas arcadas, ATM e seios maxilares" },
  { id: "interproximal", label: "Radiografia Interproximal (Bite-wing)", desc: "Coroas proximais para detecção de cáries interproximais" },
];

const CASES = [
  { id: "r1", exam: "periapical", title: "Lesão periapical em 21", structures: ["Raiz do 21", "Osso alveolar", "Lâmina dura", "Espaço do ligamento periodontal"], pathologies: [{ name: "Lesão radiolúcida periapical", type: "radiolúcida", classification: "Granuloma/Cisto periapical" }] },
  { id: "r2", exam: "panoramica", title: "Terceiro molar incluso 38", structures: ["Canal mandibular", "Forame mentual", "Seio maxilar", "Processo coronóide", "Côndilo mandibular", "Terceiro molar 38"], pathologies: [{ name: "Inclusão dentária do 38", type: "mista", classification: "Dente incluso — mesioangular" }, { name: "Folículo pericoronário alargado", type: "radiolúcida", classification: "Possível cisto dentígero" }] },
  { id: "r3", exam: "interproximal", title: "Cáries interproximais múltiplas", structures: ["Crista óssea alveolar", "Coroas dos pré-molares", "Esmalte proximal"], pathologies: [{ name: "Radiolucidez em esmalte distal do 15", type: "radiolúcida", classification: "Cárie incipiente (esmalte)" }, { name: "Radiolucidez em mesial do 16 atingindo dentina", type: "radiolúcida", classification: "Cárie em dentina" }] },
];

function PeriapicalSVG({ caseId, identifiedStructures, identifiedPathologies }: { caseId: string; identifiedStructures: Set<string>; identifiedPathologies: Set<string> }) {
  const isLesion = caseId === "r1";
  const isMolar = caseId === "r2";

  return (
    <svg viewBox="0 0 280 200" className="w-full">
      {/* Film background — dark like radiograph */}
      <rect x={0} y={0} width={280} height={200} rx={8} fill="#1a1a2e" />
      {/* Bone background */}
      <rect x={10} y={80} width={260} height={110} rx={4} fill="#2d2d44" opacity={0.8} />

      {isMolar ? (
        <>
          {/* Panoramic: Mandible curve */}
          <path d="M20 90 Q60 70 140 65 Q220 70 260 90" fill="none" stroke="#4a4a6a" strokeWidth={2} />
          {/* Canal mandibular */}
          <path d="M30 140 Q100 150 180 145 Q240 140 270 130" fill="none" stroke="#6b6b8a" strokeWidth={3} opacity={0.6} />
          {identifiedStructures.has("Canal mandibular") && <text x={150} y={158} textAnchor="middle" fontSize={7} fill="#22c55e">Canal mandibular ✓</text>}
          {/* Teeth */}
          {[60,100,140,180,220].map((x, i) => (
            <g key={i}>
              <rect x={x - 12} y={65} width={24} height={30} rx={4} fill="#c8c8e0" stroke="#8888aa" strokeWidth={0.8} />
              <rect x={x - 8} y={95} width={16} height={45} rx={3} fill="#a0a0c0" stroke="#8888aa" strokeWidth={0.6} />
            </g>
          ))}
          {/* Included 38 — tilted */}
          <g transform="rotate(-30 55 120)">
            <rect x={35} y={100} width={20} height={35} rx={4} fill="#9090b0" stroke="#fbbf24" strokeWidth={1.5} />
          </g>
          {identifiedStructures.has("Terceiro molar 38") && <text x={55} y={90} fontSize={7} fill="#22c55e">38 incluso ✓</text>}
          {/* Follicle */}
          <ellipse cx={50} cy={125} rx={18} ry={14} fill="#2a2a4a" stroke="#6b6b8a" strokeWidth={0.8} />
          {identifiedPathologies.has("Folículo pericoronário alargado") && <text x={50} y={148} textAnchor="middle" fontSize={6} fill="#ef4444">Folículo ✓</text>}
          {/* Forame mentual */}
          <circle cx={120} cy={150} r={5} fill="#1a1a2e" stroke="#6b6b8a" strokeWidth={1} />
          {identifiedStructures.has("Forame mentual") && <text x={120} y={164} textAnchor="middle" fontSize={6} fill="#22c55e">For. mentual ✓</text>}
          {/* Seio maxilar */}
          <ellipse cx={200} cy={40} rx={40} ry={20} fill="#2a2a4a" stroke="#4a4a6a" strokeWidth={1} />
          {identifiedStructures.has("Seio maxilar") && <text x={200} y={25} textAnchor="middle" fontSize={7} fill="#22c55e">Seio maxilar ✓</text>}
        </>
      ) : isLesion ? (
        <>
          {/* Single tooth periapical */}
          <rect x={110} y={20} width={60} height={40} rx={6} fill="#c8c8e0" stroke="#8888aa" strokeWidth={1} />
          <rect x={118} y={60} width={20} height={70} rx={4} fill="#a0a0c0" stroke="#8888aa" strokeWidth={0.8} />
          <rect x={142} y={60} width={20} height={65} rx={4} fill="#a0a0c0" stroke="#8888aa" strokeWidth={0.8} />
          {/* Lamina dura */}
          <path d="M115 60 L112 130 Q115 140 128 142 Q138 140 140 130 L137 60" fill="none" stroke="#7a7a9a" strokeWidth={1.5} />
          {identifiedStructures.has("Lâmina dura") && <text x={105} y={100} fontSize={6} fill="#22c55e" transform="rotate(-90 105 100)">Lâm. dura ✓</text>}
          {/* Periapical lesion */}
          <ellipse cx={128} cy={145} rx={16} ry={12} fill="#1a1a2e" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 2" />
          {identifiedPathologies.has("Lesão radiolúcida periapical") && <text x={128} y={168} textAnchor="middle" fontSize={7} fill="#ef4444">Lesão periapical ✓</text>}
          {/* PDL space */}
          {identifiedStructures.has("Espaço do ligamento periodontal") && <text x={165} y={100} fontSize={6} fill="#22c55e">LPD ✓</text>}
        </>
      ) : (
        <>
          {/* Bite-wing: crowns */}
          {[70, 120, 170, 220].map((x, i) => (
            <g key={i}>
              <rect x={x - 15} y={30} width={30} height={35} rx={5} fill="#c8c8e0" stroke="#8888aa" strokeWidth={0.8} />
              <rect x={x - 15} y={100} width={30} height={35} rx={5} fill="#c8c8e0" stroke="#8888aa" strokeWidth={0.8} />
            </g>
          ))}
          {/* Crista óssea */}
          <path d="M50 75 Q100 70 140 72 Q180 70 230 75" fill="none" stroke="#6b6b8a" strokeWidth={1.5} />
          {identifiedStructures.has("Crista óssea alveolar") && <text x={140} y={88} textAnchor="middle" fontSize={7} fill="#22c55e">Crista óssea ✓</text>}
          {/* Caries shadows */}
          <ellipse cx={100} cy={45} rx={5} ry={8} fill="#1a1a2e" opacity={0.7} />
          <ellipse cx={135} cy={42} rx={7} ry={10} fill="#1a1a2e" opacity={0.8} />
          {identifiedPathologies.has("Radiolucidez em esmalte distal do 15") && <circle cx={100} cy={45} r={8} fill="none" stroke="#ef4444" strokeWidth={1} />}
          {identifiedPathologies.has("Radiolucidez em mesial do 16 atingindo dentina") && <circle cx={135} cy={42} r={10} fill="none" stroke="#ef4444" strokeWidth={1} />}
        </>
      )}
    </svg>
  );
}

export default function SimuladorRadiografia() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedExam, setSelectedExam] = useState("");
  const [selectedCase, setSelectedCase] = useState("");
  const [identifiedStructures, setIdentifiedStructures] = useState<Set<string>>(new Set());
  const [identifiedPathologies, setIdentifiedPathologies] = useState<Set<string>>(new Set());
  const [reportText, setReportText] = useState("");

  const examType = EXAM_TYPES.find(e => e.id === selectedExam);
  const caseData = CASES.find(c => c.id === selectedCase);
  const filteredCases = CASES.filter(c => c.exam === selectedExam);

  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const toggleStructure = (s: string) => setIdentifiedStructures(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n; });
  const togglePathology = (p: string) => setIdentifiedPathologies(prev => { const n = new Set(prev); n.has(p) ? n.delete(p) : n.add(p); return n; });

  const LockedOverlay = ({ module }: { module: number }) => (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2 rounded-xl">
      <Lock className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground font-medium">Complete o módulo {module}</p>
    </div>
  );

  const structScore = caseData ? Math.round(identifiedStructures.size / caseData.structures.length * 100) : 0;
  const pathScore = caseData ? Math.round(identifiedPathologies.size / caseData.pathologies.length * 100) : 0;

  const expSummary: Record<string, string> = caseData ? {
    "Exame": examType?.label || "-",
    "Caso": caseData.title,
    "Estruturas identificadas": `${identifiedStructures.size}/${caseData.structures.length} (${structScore}%)`,
    "Patologias identificadas": `${identifiedPathologies.size}/${caseData.pathologies.length} (${pathScore}%)`,
  } : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Radiografia e Interpretação de Imagens</h1>
        <p className="text-muted-foreground">Leitura de radiografias odontológicas esquemáticas com identificação de estruturas e patologias</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" /> 1. Tipo de Exame e Caso
              {completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedExam} onValueChange={(v) => { setSelectedExam(v); setSelectedCase(""); }}>
              <SelectTrigger><SelectValue placeholder="Tipo de exame..." /></SelectTrigger>
              <SelectContent>
                {EXAM_TYPES.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {filteredCases.length > 0 && (
              <Select value={selectedCase} onValueChange={setSelectedCase}>
                <SelectTrigger><SelectValue placeholder="Selecione o caso..." /></SelectTrigger>
                <SelectContent>
                  {filteredCases.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={() => completeModule(1)} disabled={!caseData || completedModules.has(1)} className="w-full">Confirmar Seleção</Button>
          </CardContent>
        </Card>

        {/* M2 — Estruturas */}
        <Card className="relative">
          {!completedModules.has(1) && <LockedOverlay module={1} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> 2. Identificação de Estruturas
              {completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {caseData && <PeriapicalSVG caseId={caseData.id} identifiedStructures={identifiedStructures} identifiedPathologies={identifiedPathologies} />}
            {caseData && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Marque as estruturas que você identifica:</p>
                {caseData.structures.map(s => (
                  <label key={s} className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer ${identifiedStructures.has(s) ? "border-green-500 bg-green-500/10" : "border-border"}`}>
                    <input type="checkbox" checked={identifiedStructures.has(s)} onChange={() => toggleStructure(s)} className="rounded" />
                    {s}
                  </label>
                ))}
              </div>
            )}
            <Button onClick={() => completeModule(2)} disabled={identifiedStructures.size === 0 || completedModules.has(2)} className="w-full">Confirmar Estruturas</Button>
          </CardContent>
        </Card>

        {/* M3 — Patologias */}
        <Card className="relative">
          {!completedModules.has(2) && <LockedOverlay module={2} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" /> 3. Identificação de Patologias
              {completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {caseData && (
              <div className="space-y-2">
                {caseData.pathologies.map(p => (
                  <label key={p.name} className={`block p-3 rounded border cursor-pointer ${identifiedPathologies.has(p.name) ? "border-destructive bg-destructive/10" : "border-border"}`}>
                    <input type="checkbox" checked={identifiedPathologies.has(p.name)} onChange={() => togglePathology(p.name)} className="sr-only" />
                    <p className="text-sm font-medium">{p.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px]">{p.type}</Badge>
                      <Badge variant="outline" className="text-[10px]">{p.classification}</Badge>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <Button onClick={() => completeModule(3)} disabled={identifiedPathologies.size === 0 || completedModules.has(3)} className="w-full">Confirmar Patologias</Button>
          </CardContent>
        </Card>

        {/* M4 — Laudo */}
        <Card className="relative">
          {!completedModules.has(3) && <LockedOverlay module={3} />}
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> 4. Laudo Radiográfico
              {completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Redija o laudo radiográfico descrevendo: tipo de exame, estruturas visualizadas, achados patológicos e conclusão diagnóstica..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={6}
            />
            {reportText.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-center text-sm">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Estruturas</p>
                  <p className="font-bold">{structScore}%</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-xs text-muted-foreground">Patologias</p>
                  <p className="font-bold">{pathScore}%</p>
                </div>
              </div>
            )}
            <Button onClick={() => completeModule(4)} disabled={reportText.length < 20 || completedModules.has(4)} className="w-full">Finalizar Laudo</Button>
          </CardContent>
        </Card>

        <LabReportPanel benchTitle="Radiografia Odontológica" isUnlocked={completedModules.has(3)} experimentSummary={expSummary} />
      </div>
    </div>
  );
}
