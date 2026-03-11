import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Lock, CheckCircle2, Zap } from "lucide-react";
import { LabReportPanel } from "@/components/lab-virtual/LabReportPanel";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

const CASES = [
  { id: "c1", name: "Lombalgia crônica — analgesia", objective: "analgesia", region: "lombar" },
  { id: "c2", name: "Pós-operatório LCA — fortalecimento de quadríceps", objective: "fortalecimento", region: "coxa anterior" },
  { id: "c3", name: "Entorse de tornozelo — controle de edema", objective: "edema", region: "tornozelo" },
];

const MODALITIES = [
  { id: "tens-conv", name: "TENS Convencional", freqRange: [80, 150], pulseRange: [50, 100], desc: "Portão de dor — alta frequência, baixa intensidade" },
  { id: "tens-acu", name: "TENS Acupuntura", freqRange: [2, 10], pulseRange: [150, 300], desc: "Liberação de endorfinas — baixa frequência, alta intensidade" },
  { id: "tens-burst", name: "TENS Burst", freqRange: [2, 4], pulseRange: [150, 250], desc: "Rajadas de 2 Hz com pulsos internos de 100 Hz" },
  { id: "fes", name: "FES", freqRange: [20, 50], pulseRange: [200, 400], desc: "Estimulação elétrica funcional — contração muscular" },
  { id: "russa", name: "Corrente Russa", freqRange: [2500, 2500], pulseRange: [0, 0], desc: "Corrente alternada de média frequência modulada a 50 Hz" },
  { id: "interf", name: "Interferencial", freqRange: [4000, 4100], pulseRange: [0, 0], desc: "Duas correntes cruzadas, AMF entre 1-100 Hz" },
];

function generateWaveData(freq: number, pulseWidth: number, modality: string) {
  const points = [];
  const cycles = 4;
  const samplesPerCycle = 30;
  for (let i = 0; i <= cycles * samplesPerCycle; i++) {
    const t = i / samplesPerCycle;
    let v = 0;
    const phase = t % 1;
    const dutyCycle = Math.min(pulseWidth / 1000 * freq, 0.5) || 0.3;
    if (modality === "russa") {
      v = Math.sin(2 * Math.PI * t * 5) * (phase < 0.5 ? 1 : 0);
    } else if (modality === "interf") {
      v = Math.sin(2 * Math.PI * t * 5) * Math.cos(2 * Math.PI * t * 0.3);
    } else {
      v = phase < dutyCycle ? 1 : 0;
    }
    points.push({ t: +(t).toFixed(2), v: +v.toFixed(3) });
  }
  return points;
}

function ElectrodeSVG({ region, electrodes, onPlace }: { region: string; electrodes: { a: boolean; b: boolean }; onPlace: (e: "a" | "b") => void }) {
  return (
    <svg viewBox="0 0 100 80" className="w-full max-w-[250px] mx-auto">
      <rect x={5} y={5} width={90} height={70} rx={8} fill="hsl(var(--foreground)/0.05)" stroke="hsl(var(--border))" strokeWidth={0.5} />
      <text x={50} y={15} textAnchor="middle" fontSize={4} fill="hsl(var(--muted-foreground))">{region}</text>

      {/* Electrode A */}
      <g onClick={() => onPlace("a")} className="cursor-pointer">
        <rect x={20} y={30} width={18} height={25} rx={3} fill={electrodes.a ? "hsl(var(--primary))" : "hsl(var(--muted)/0.5)"} opacity={0.7} stroke="hsl(var(--border))" strokeWidth={0.5} />
        <text x={29} y={45} textAnchor="middle" fontSize={4} fill={electrodes.a ? "white" : "hsl(var(--muted-foreground))"}>
          {electrodes.a ? "+" : "Ânodo"}
        </text>
      </g>

      {/* Electrode B */}
      <g onClick={() => onPlace("b")} className="cursor-pointer">
        <rect x={62} y={30} width={18} height={25} rx={3} fill={electrodes.b ? "hsl(var(--primary))" : "hsl(var(--muted)/0.5)"} opacity={0.7} stroke="hsl(var(--border))" strokeWidth={0.5} />
        <text x={71} y={45} textAnchor="middle" fontSize={4} fill={electrodes.b ? "white" : "hsl(var(--muted-foreground))"}>
          {electrodes.b ? "−" : "Cátodo"}
        </text>
      </g>

      {/* Connection */}
      {electrodes.a && electrodes.b && (
        <line x1={38} y1={42} x2={62} y2={42} stroke="hsl(var(--primary))" strokeWidth={0.5} strokeDasharray="2 1" />
      )}
    </svg>
  );
}

export default function SimuladorEletroterapia() {
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [selectedCase, setSelectedCase] = useState("");
  const [selectedModality, setSelectedModality] = useState("");
  const [freq, setFreq] = useState(80);
  const [pulseWidth, setPulseWidth] = useState(100);
  const [intensity, setIntensity] = useState(20);
  const [timeOn, setTimeOn] = useState(6);
  const [timeOff, setTimeOff] = useState(12);
  const [electrodes, setElectrodes] = useState({ a: false, b: false });

  const caseData = CASES.find(c => c.id === selectedCase);
  const modality = MODALITIES.find(m => m.id === selectedModality);
  const completeModule = (n: number) => setCompletedModules(prev => new Set(prev).add(n));

  const waveData = modality ? generateWaveData(freq, pulseWidth, selectedModality) : [];

  const reportSections = caseData && modality ? [
    { title: "Caso", content: `${caseData.name} — Objetivo: ${caseData.objective}` },
    { title: "Modalidade", content: `${modality.name} — ${modality.desc}` },
    { title: "Parâmetros", content: `Frequência: ${freq} Hz\nLargura de pulso: ${pulseWidth} μs\nIntensidade: ${intensity} mA\nTempo ON/OFF: ${timeOn}s / ${timeOff}s` },
    { title: "Posicionamento", content: `Eletrodos posicionados na região ${caseData.region}` },
  ] : [];

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Zap className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Eletroterapia e Parâmetros de Corrente</h1>
          <p className="text-sm text-muted-foreground">Programação de TENS, FES, corrente russa e interferencial</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* M1 */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(1) ? "default" : "secondary"}>M1</Badge>Seleção do Caso{completedModules.has(1) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCase} onValueChange={v => { setSelectedCase(v); setSelectedModality(""); setElectrodes({ a: false, b: false }); setCompletedModules(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar caso" /></SelectTrigger>
              <SelectContent>{CASES.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            {caseData && <p className="text-sm bg-muted/50 p-3 rounded-lg"><strong>Objetivo:</strong> {caseData.objective} | <strong>Região:</strong> {caseData.region}</p>}
            {caseData && !completedModules.has(1) && <Button size="sm" className="w-full" onClick={() => completeModule(1)}>Iniciar</Button>}
          </CardContent>
        </Card>

        {/* M2 */}
        <Card className="relative">
          {!completedModules.has(1) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(2) ? "default" : "secondary"}>M2</Badge>Escolha da Corrente{completedModules.has(2) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedModality} onValueChange={v => { setSelectedModality(v); const m = MODALITIES.find(x => x.id === v); if (m) { setFreq(m.freqRange[0]); setPulseWidth(m.pulseRange[0]); } }}>
              <SelectTrigger><SelectValue placeholder="Selecionar modalidade" /></SelectTrigger>
              <SelectContent>{MODALITIES.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            {modality && (
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{modality.desc}</p>
            )}
            {selectedModality && !completedModules.has(2) && <Button size="sm" className="w-full" onClick={() => completeModule(2)}>Confirmar Modalidade</Button>}
          </CardContent>
        </Card>

        {/* M3 — Parametrização */}
        <Card className="relative">
          {!completedModules.has(2) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(3) ? "default" : "secondary"}>M3</Badge>Parametrização{completedModules.has(3) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {completedModules.has(2) && modality && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Frequência: {freq} Hz</label>
                    <Slider min={modality.freqRange[0]} max={modality.freqRange[1] || modality.freqRange[0] + 1} step={1} value={[freq]} onValueChange={([v]) => setFreq(v)} />
                  </div>
                  {modality.pulseRange[1] > 0 && (
                    <div>
                      <label className="text-sm font-medium">Largura de pulso: {pulseWidth} μs</label>
                      <Slider min={modality.pulseRange[0]} max={modality.pulseRange[1]} step={10} value={[pulseWidth]} onValueChange={([v]) => setPulseWidth(v)} />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Intensidade: {intensity} mA</label>
                    <Slider min={1} max={80} step={1} value={[intensity]} onValueChange={([v]) => setIntensity(v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium">T ON: {timeOn}s</label>
                      <Slider min={2} max={15} step={1} value={[timeOn]} onValueChange={([v]) => setTimeOn(v)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">T OFF: {timeOff}s</label>
                      <Slider min={2} max={30} step={1} value={[timeOff]} onValueChange={([v]) => setTimeOff(v)} />
                    </div>
                  </div>
                </div>
                {/* Waveform */}
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={waveData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                      <XAxis dataKey="t" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[-1.2, 1.2]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" dot={false} strokeWidth={1.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                {!completedModules.has(3) && <Button size="sm" className="w-full" onClick={() => completeModule(3)}>Confirmar Parâmetros</Button>}
              </>
            )}
          </CardContent>
        </Card>

        {/* M4 — Posicionamento */}
        <Card className="relative">
          {!completedModules.has(3) && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"><Lock className="h-6 w-6 text-muted-foreground" /></div>}
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Badge variant={completedModules.has(4) ? "default" : "secondary"}>M4</Badge>Posicionamento de Eletrodos{completedModules.has(4) && <CheckCircle2 className="h-4 w-4 text-green-500" />}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {completedModules.has(3) && caseData && (
              <>
                <p className="text-sm text-muted-foreground">Clique para posicionar os eletrodos na região {caseData.region}:</p>
                <ElectrodeSVG region={caseData.region} electrodes={electrodes} onPlace={e => setElectrodes(prev => ({ ...prev, [e]: true }))} />
                {electrodes.a && electrodes.b && !completedModules.has(4) && <Button size="sm" className="w-full" onClick={() => completeModule(4)}>Confirmar Posicionamento</Button>}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <LabReportPanel benchTitle="Eletroterapia" isUnlocked={completedModules.has(4)} experimentSummary={expSummary} />
    </div>
  );
}
