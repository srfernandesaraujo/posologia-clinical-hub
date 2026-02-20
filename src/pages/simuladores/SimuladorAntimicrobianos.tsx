import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Sparkles, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp, Clock, Stethoscope, FlaskConical } from "lucide-react";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { AdminCaseActions } from "@/components/AdminCaseActions";

interface Antibiogram { antibiotic: string; result: "S" | "R"; mic?: string; }
interface CaseData {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; age: number; weight: number; comorbidities: string[]; allergies: string[]; vitalSigns: { bp: string; hr: string; temp: string; spo2: string } };
  day1: { clinicalDescription: string; suspectedDiagnosis: string };
  day3: { evolution: string; cultureResult: string; organism: string; antibiogram: Antibiogram[] };
  expectedDay1: { antibiotics: string[]; cultures: string[]; justification: string };
  expectedDay3: { action: string; newAntibiotic: string | null; stopAntibiotics: string[]; justification: string };
}

const ANTIBIOTICS = ["Ampicilina", "Amoxicilina", "Ceftriaxona", "Cefepima", "Ciprofloxacino", "Levofloxacino", "Meropenem", "Piperacilina/Tazobactam", "Vancomicina", "Azitromicina", "Claritromicina", "Doxiciclina", "Metronidazol", "Gentamicina", "Amicacina", "Oxacilina", "Sulfametoxazol/Trimetoprima"];
const CULTURES = ["Hemocultura", "Urocultura", "Cultura de Escarro", "Aspirado Traqueal", "Cultura de Ferida", "Líquor"];

const BUILT_IN: CaseData[] = [
  {
    title: "Caso 1: Sepse de Foco Urinário", difficulty: "Fácil",
    patient: { name: "Joana da Silva", age: 62, weight: 70, comorbidities: ["DM2"], allergies: [], vitalSigns: { bp: "100/60 mmHg", hr: "110 bpm", temp: "39.0°C", spo2: "96%" } },
    day1: { clinicalDescription: "Paciente chega à emergência com febre (39°C), calafrios, dor lombar direita intensa e disúria há 2 dias. Taquicárdica e hipotensa. Exame de urina mostra piúria maciça.", suspectedDiagnosis: "Pielonefrite Aguda complicada (Sepse de foco urinário)" },
    day3: { evolution: "Paciente afebril há 24h, clinicamente estável, aceitando bem dieta oral.", cultureResult: "Urocultura positiva", organism: "Escherichia coli", antibiogram: [{ antibiotic: "Ampicilina", result: "R" }, { antibiotic: "Ceftriaxona", result: "S", mic: "<= 1" }, { antibiotic: "Ciprofloxacino", result: "S", mic: "<= 0.5" }, { antibiotic: "Meropenem", result: "S", mic: "<= 1" }] },
    expectedDay1: { antibiotics: ["Ceftriaxona"], cultures: ["Hemocultura", "Urocultura"], justification: "Ceftriaxona IV é terapia empírica padrão para gram-negativos comunitários em pielonefrite complicada/sepse urinária." },
    expectedDay3: { action: "descalonar", newAntibiotic: "Ciprofloxacino", stopAntibiotics: ["Ceftriaxona"], justification: "Terapia sequencial IV→VO. Paciente estável, E. coli sensível a Ciprofloxacino com excelente biodisponibilidade oral e penetração urinária. Meropenem seria espectro desnecessariamente largo." },
  },
  {
    title: "Caso 2: PAC Grave", difficulty: "Médio",
    patient: { name: "Carlos Eduardo", age: 55, weight: 82, comorbidities: ["Tabagista", "DPOC leve"], allergies: [], vitalSigns: { bp: "110/70 mmHg", hr: "105 bpm", temp: "38.8°C", spo2: "88%" } },
    day1: { clinicalDescription: "Tosse produtiva purulenta, dispneia, febre e confusão mental leve. SpO2 88% em ar ambiente. RX com consolidação em lobo médio direito.", suspectedDiagnosis: "Pneumonia Adquirida na Comunidade (PAC) grave" },
    day3: { evolution: "Melhora do padrão respiratório, SpO2 95% com cateter nasal.", cultureResult: "Cultura de escarro positiva. Hemocultura negativa.", organism: "Streptococcus pneumoniae", antibiogram: [{ antibiotic: "Penicilina G", result: "S" }, { antibiotic: "Ceftriaxona", result: "S" }, { antibiotic: "Azitromicina", result: "R" }, { antibiotic: "Levofloxacino", result: "S" }] },
    expectedDay1: { antibiotics: ["Ceftriaxona", "Azitromicina"], cultures: ["Cultura de Escarro", "Hemocultura"], justification: "Terapia empírica para PAC grave cobrindo típicos (Ceftriaxona) e atípicos (Azitromicina)." },
    expectedDay3: { action: "descalonar", newAntibiotic: "Amoxicilina", stopAntibiotics: ["Azitromicina", "Ceftriaxona"], justification: "Patógeno típico isolado: suspender cobertura para atípicos. Pneumococo sensível à Penicilina permite descalonar para Amoxicilina PO." },
  },
  {
    title: "Caso 3: PAV em UTI", difficulty: "Difícil",
    patient: { name: "Roberto Alves", age: 71, weight: 75, comorbidities: ["UTI há 12 dias pós-AVC hemorrágico", "Entubado"], allergies: [], vitalSigns: { bp: "130/80 mmHg", hr: "100 bpm", temp: "39.0°C", spo2: "90% (VM)" } },
    day1: { clinicalDescription: "Novo pico febril, aumento de secreção traqueal purulenta, piora da oxigenação e leucocitose (18.000). Novo infiltrado no RX.", suspectedDiagnosis: "Pneumonia Nosocomial (PAV)" },
    day3: { evolution: "Estável, febre controlada, ainda em ventilação mecânica.", cultureResult: "Aspirado traqueal quantitativo positivo", organism: "Pseudomonas aeruginosa", antibiogram: [{ antibiotic: "Piperacilina/Tazobactam", result: "R" }, { antibiotic: "Cefepima", result: "S" }, { antibiotic: "Meropenem", result: "S" }, { antibiotic: "Vancomicina", result: "R" }] },
    expectedDay1: { antibiotics: ["Piperacilina/Tazobactam", "Vancomicina"], cultures: ["Aspirado Traqueal"], justification: "Esquema amplo espectro para PAV cobrindo Pseudomonas (Pip/Tazo) e MRSA (Vancomicina)." },
    expectedDay3: { action: "descalonar", newAntibiotic: "Cefepima", stopAntibiotics: ["Piperacilina/Tazobactam", "Vancomicina"], justification: "1) Suspender Vancomicina: não cresceu MRSA. 2) Trocar Pip/Tazo (R) por Cefepima (S). Escolher Cefepima ao invés de Meropenem guarda os carbapenêmicos como última linha." },
  },
];

export default function SimuladorAntimicrobianos() {
  const { allCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets } = useSimulatorCases("antimicrobianos", BUILT_IN);
  const { virtualRoomCase, isVirtualRoom, loading: loadingVR, goBack } = useVirtualRoomCase("antimicrobianos");
  const [screen, setScreen] = useState<"dashboard" | "day1" | "day3" | "report">("dashboard");
  const [caseIdx, setCaseIdx] = useState(0);
  const [day1Antibiotics, setDay1Antibiotics] = useState<string[]>([]);
  const [day1Cultures, setDay1Cultures] = useState<string[]>([]);
  const [day3Actions, setDay3Actions] = useState<Record<string, "manter" | "suspender" | "trocar">>({});
  const [day3NewAntibiotic, setDay3NewAntibiotic] = useState("");
  const [expandedFb, setExpandedFb] = useState<Set<string>>(new Set());
  const [vrAutoStarted, setVrAutoStarted] = useState(false);

  if (isVirtualRoom && virtualRoomCase && !vrAutoStarted && screen === "dashboard") {
    setVrAutoStarted(true);
    setScreen("day1");
  }

  const c = isVirtualRoom && virtualRoomCase ? virtualRoomCase as CaseData : (allCases[caseIdx] as CaseData | undefined);

  const start = (i: number) => {
    setCaseIdx(i); setDay1Antibiotics([]); setDay1Cultures([]); setDay3Actions({}); setDay3NewAntibiotic(""); setScreen("day1");
  };

  const toggleFb = (k: string) => setExpandedFb(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const scoreDay1 = () => {
    if (!c) return 0;
    const expected = c.expectedDay1.antibiotics.map(a => a.toLowerCase());
    const chosen = day1Antibiotics.map(a => a.toLowerCase());
    const abxMatch = expected.every(e => chosen.includes(e)) ? 1 : 0;
    const cultMatch = c.expectedDay1.cultures.every(cu => day1Cultures.includes(cu)) ? 1 : 0;
    return Math.round(((abxMatch + cultMatch) / 2) * 100);
  };

  const scoreDay3 = () => {
    if (!c) return 0;
    const stopped = Object.entries(day3Actions).filter(([, v]) => v === "suspender").map(([k]) => k);
    const expectedStop = c.expectedDay3.stopAntibiotics.map(s => s.toLowerCase());
    const stopMatch = expectedStop.every(s => stopped.map(x => x.toLowerCase()).includes(s));
    const newMatch = c.expectedDay3.newAntibiotic ? day3NewAntibiotic.toLowerCase() === c.expectedDay3.newAntibiotic.toLowerCase() : true;
    return stopMatch && newMatch ? 100 : stopMatch || newMatch ? 50 : 0;
  };

  if (loadingVR) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isVirtualRoom && screen === "dashboard") return null;

  if (screen === "dashboard") {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="mb-8"><h1 className="text-3xl font-bold mb-2">Simulador de Antimicrobial Stewardship</h1><p className="text-muted-foreground">Uso Racional de Antimicrobianos – Terapia empírica e descalonamento</p></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCases.map((cs: any, i: number) => (
            <Card key={cs.id || i} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => start(i)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={cs.difficulty === "Fácil" ? "secondary" : cs.difficulty === "Difícil" ? "destructive" : "default"}>{cs.difficulty}</Badge>
                  <div className="flex items-center gap-1">
                    {cs.isAI && <Badge variant="outline" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />IA</Badge>}
                    <AdminCaseActions caseItem={cs} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} />
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{cs.title}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{cs.patient?.name}, {cs.patient?.age} anos</p></CardContent>
            </Card>
          ))}
          <Card className="border-dashed cursor-pointer flex items-center justify-center min-h-[140px]" onClick={generateCase}>
            <div className="text-center p-6">{isGenerating ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /> : <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />}<p className="font-medium">{isGenerating ? "Gerando..." : "Gerar com IA"}</p></div>
          </Card>
        </div>
      </div>
    );
  }

  if (!c || !c.patient || !c.day1 || !c.day3 || !c.expectedDay1 || !c.expectedDay3) return null;

  // Timeline
  const Timeline = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[{ label: "Dia 1: Admissão", active: screen === "day1" }, { label: "Dia 3: Resultados", active: screen === "day3" }, { label: "Relatório", active: screen === "report" }].map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${s.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            <Clock className="h-3 w-3" />{s.label}
          </div>
          {i < 2 && <div className="w-8 h-0.5 bg-muted" />}
        </div>
      ))}
    </div>
  );

  if (screen === "day1") {
    return (
      <div className="max-w-6xl mx-auto">
        {isVirtualRoom ? <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button> : <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>}
        <Timeline />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Stethoscope className="h-4 w-4" />Ficha do Paciente – Admissão</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>{c.patient.name}</strong>, {c.patient.age} anos, {c.patient.weight}kg</p>
              {(c.patient.comorbidities ?? []).length > 0 && <p><strong>Comorbidades:</strong> {c.patient.comorbidities.join(", ")}</p>}
              {(c.patient.allergies ?? []).length > 0 && <p className="text-red-600"><strong>Alergias:</strong> {c.patient.allergies.join(", ")}</p>}
              <Separator />
              <p><strong>PA:</strong> {c.patient.vitalSigns.bp} | <strong>FC:</strong> {c.patient.vitalSigns.hr} | <strong>Temp:</strong> {c.patient.vitalSigns.temp} | <strong>SpO2:</strong> {c.patient.vitalSigns.spo2}</p>
              <Separator />
              <p className="font-medium">Quadro Clínico:</p>
              <p>{c.day1.clinicalDescription}</p>
              <Badge variant="outline" className="mt-2">{c.day1.suspectedDiagnosis}</Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Prescrição Empírica</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="font-medium">Antibióticos a iniciar:</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {ANTIBIOTICS.map(a => (
                    <div key={a} className="flex items-center space-x-2">
                      <Checkbox checked={day1Antibiotics.includes(a)} onCheckedChange={(ch) => setDay1Antibiotics(p => ch ? [...p, a] : p.filter(x => x !== a))} id={`abx-${a}`} />
                      <Label htmlFor={`abx-${a}`} className="text-sm">{a}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <Label className="font-medium">Culturas a solicitar:</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {CULTURES.map(cu => (
                    <div key={cu} className="flex items-center space-x-2">
                      <Checkbox checked={day1Cultures.includes(cu)} onCheckedChange={(ch) => setDay1Cultures(p => ch ? [...p, cu] : p.filter(x => x !== cu))} id={`cult-${cu}`} />
                      <Label htmlFor={`cult-${cu}`} className="text-sm">{cu}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={() => { setDay3Actions(Object.fromEntries(day1Antibiotics.map(a => [a, "manter" as const]))); setScreen("day3"); }} disabled={day1Antibiotics.length === 0} className="w-full mt-4">
                Avançar no Tempo (Aguardar Culturas) →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (screen === "day3") {
    return (
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" onClick={() => setScreen("day1")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar ao Dia 1</Button>
        <Timeline />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Evolução – 48-72h depois</CardTitle></CardHeader>
              <CardContent className="text-sm"><p>{c.day3.evolution}</p><p className="mt-2"><strong>Cultura:</strong> {c.day3.cultureResult}</p><p><strong>Organismo:</strong> {c.day3.organism}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FlaskConical className="h-4 w-4" />Antibiograma</CardTitle></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left py-2">Antibiótico</th><th className="text-left py-2">Resultado</th>{(c.day3.antibiogram ?? [])[0]?.mic && <th className="text-left py-2">MIC</th>}</tr></thead>
                  <tbody>
                    {(c.day3.antibiogram ?? []).map((a, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2">{a.antibiotic}</td>
                        <td className="py-2"><Badge variant={a.result === "S" ? "secondary" : "destructive"} className={a.result === "S" ? "bg-green-100 text-green-800" : ""}>{a.result === "S" ? "Sensível" : "Resistente"}</Badge></td>
                        {a.mic && <td className="py-2">{a.mic}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Conduta – Descalonamento</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Para cada antibiótico da prescrição empírica:</p>
              {day1Antibiotics.map(abx => (
                <div key={abx} className="flex items-center gap-3 p-2 rounded border">
                  <span className="font-medium text-sm flex-1">{abx}</span>
                  <Select value={day3Actions[abx] || "manter"} onValueChange={v => setDay3Actions(p => ({ ...p, [abx]: v as any }))}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manter">Manter</SelectItem>
                      <SelectItem value="suspender">Suspender</SelectItem>
                      <SelectItem value="trocar">Trocar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {Object.values(day3Actions).includes("trocar") && (
                <div>
                  <Label>Novo antibiótico:</Label>
                  <Select value={day3NewAntibiotic} onValueChange={setDay3NewAntibiotic}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{ANTIBIOTICS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={() => setScreen("report")} className="w-full mt-4">Finalizar Conduta</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Report
  const s1 = scoreDay1();
  const s3 = scoreDay3();
  return (
    <div className="max-w-4xl mx-auto">
      {isVirtualRoom ? <Button variant="ghost" onClick={goBack} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar à Home</Button> : <Button variant="ghost" onClick={() => setScreen("dashboard")} className="mb-4"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>}
      <Timeline />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card><CardContent className="pt-6 text-center"><p className="text-4xl font-bold">{s1}%</p><p className="text-muted-foreground mt-1">Score Dia 1 (Empírico)</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-4xl font-bold">{s3}%</p><p className="text-muted-foreground mt-1">Score Dia 3 (Stewardship)</p></CardContent></Card>
      </div>
      {[{ title: "Dia 1 – Terapia Empírica", key: "d1", content: <div className="text-sm space-y-2"><p><strong>Seus antibióticos:</strong> {day1Antibiotics.join(", ") || "Nenhum"}</p><p><strong>Esperado:</strong> {c.expectedDay1.antibiotics.join(", ")}</p><p><strong>Suas culturas:</strong> {day1Cultures.join(", ") || "Nenhuma"}</p><p><strong>Esperado:</strong> {c.expectedDay1.cultures.join(", ")}</p><Separator /><p>{c.expectedDay1.justification}</p></div> },
        { title: "Dia 3 – Descalonamento", key: "d3", content: <div className="text-sm space-y-2"><p><strong>Suas ações:</strong> {Object.entries(day3Actions).map(([k, v]) => `${k}: ${v}`).join("; ")}</p>{day3NewAntibiotic && <p><strong>Novo antibiótico:</strong> {day3NewAntibiotic}</p>}<Separator /><p>{c.expectedDay3.justification}</p></div> }
      ].map(fb => (
        <Card key={fb.key} className="mb-3">
          <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleFb(fb.key)}>
            <div className="flex items-center justify-between"><CardTitle className="text-base">{fb.title}</CardTitle>{expandedFb.has(fb.key) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</div>
          </CardHeader>
          {expandedFb.has(fb.key) && <CardContent>{fb.content}</CardContent>}
        </Card>
      ))}
      <div className="flex gap-3 mt-6"><Button onClick={() => start(caseIdx)}>Tentar Novamente</Button>{isVirtualRoom ? <Button variant="outline" onClick={goBack}>Voltar à Home</Button> : <Button variant="outline" onClick={() => setScreen("dashboard")}>Voltar aos Casos</Button>}</div>
    </div>
  );
}
