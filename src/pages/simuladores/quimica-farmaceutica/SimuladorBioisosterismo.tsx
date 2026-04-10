import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Loader2, FlaskConical, Eye } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSimulatorCases } from "@/hooks/useSimulatorCases";
import { useVirtualRoomCase } from "@/hooks/useVirtualRoomCase";
import { NativeCaseCard } from "@/components/NativeCaseCard";
import { AICaseCard } from "@/components/AICaseCard";
import { ExamBanner } from "@/components/ExamBanner";
import { ExamFeedbackOverlay } from "@/components/ExamFeedbackOverlay";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import SimulatorChallengeMode from "@/components/simulators/SimulatorChallengeMode";
import AdminPromptViewer from "@/components/AdminPromptViewer";
import { getNativePrompt } from "@/data/nativeSystemPrompts";
import { getChallengesBySlug } from "@/data/simulatorChallenges";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildSimulatorDecisions, type SimDecision } from "@/lib/buildSimulatorDecisions";

const SLUG = "bioisosterismo";

const GROUPS = [
  { id: "cooh", name: "-COOH (Carboxila)", pKa: 4.2, logP: -0.5, stability: 40, absorption: 50 },
  { id: "oh", name: "-OH (Hidroxila)", pKa: 10.0, logP: -1.0, stability: 60, absorption: 55 },
  { id: "ester", name: "-COOR (Éster)", pKa: 14, logP: 1.5, stability: 30, absorption: 80 },
  { id: "amide", name: "-CONH₂ (Amida)", pKa: 15, logP: -0.8, stability: 70, absorption: 45 },
  { id: "sulfonamide", name: "-SO₂NH₂ (Sulfonamida)", pKa: 10.5, logP: -0.3, stability: 80, absorption: 55 },
];

const BIOISOSTERES: Record<string, Array<{ id: string; name: string; type: string; pKa: number; logP: number; stability: number; absorption: number }>> = {
  cooh: [
    { id: "tetrazole", name: "Tetrazol", type: "Não-clássico", pKa: 4.9, logP: 0.5, stability: 75, absorption: 70 },
    { id: "acylsulfonamide", name: "Acilsulfonamida", type: "Não-clássico", pKa: 4.5, logP: 0.2, stability: 80, absorption: 65 },
    { id: "phosphonate", name: "Fosfonato", type: "Clássico", pKa: 2.0, logP: -1.0, stability: 60, absorption: 40 },
  ],
  oh: [
    { id: "nh2", name: "-NH₂ (Amina)", type: "Clássico", pKa: 10.5, logP: -0.8, stability: 50, absorption: 60 },
    { id: "sh", name: "-SH (Tiol)", type: "Clássico", pKa: 8.5, logP: 0.2, stability: 35, absorption: 55 },
    { id: "nhso2", name: "-NHSO₂R", type: "Não-clássico", pKa: 9.0, logP: 0.5, stability: 70, absorption: 65 },
  ],
  ester: [
    { id: "amide_bio", name: "Amida", type: "Clássico", pKa: 15, logP: -0.5, stability: 85, absorption: 50 },
    { id: "oxadiazole", name: "1,2,4-Oxadiazol", type: "Não-clássico", pKa: 14, logP: 1.0, stability: 90, absorption: 70 },
    { id: "retro_ester", name: "Éster inverso", type: "Clássico", pKa: 14, logP: 1.3, stability: 35, absorption: 75 },
  ],
  amide: [
    { id: "ester_bio", name: "Éster", type: "Clássico", pKa: 14, logP: 1.5, stability: 30, absorption: 80 },
    { id: "sulfonamide_bio", name: "Sulfonamida", type: "Não-clássico", pKa: 10, logP: -0.3, stability: 80, absorption: 55 },
    { id: "triazole", name: "1,2,3-Triazol", type: "Não-clássico", pKa: 14, logP: 0.5, stability: 90, absorption: 65 },
  ],
  sulfonamide: [
    { id: "carbamate", name: "Carbamato", type: "Não-clássico", pKa: 12, logP: 0.5, stability: 50, absorption: 60 },
    { id: "urea", name: "Ureia", type: "Clássico", pKa: 14, logP: -1.0, stability: 75, absorption: 40 },
    { id: "reverse_sulfonamide", name: "Sulfonamida reversa", type: "Clássico", pKa: 11, logP: -0.1, stability: 85, absorption: 50 },
  ],
};

interface BioCase {
  id?: string; title: string; difficulty: string; isAI?: boolean;
  patient: { name: string; drug: string };
  scenario: string; initialGroup: string; initialBioisostere: string;
  bestBioisostere: string; clinicalTip: string;
}

const BUILT_IN_CASES: BioCase[] = [
  {
    title: "Losartan vs Valsartan – Tetrazol como Bioisóstero",
    difficulty: "Fácil",
    patient: { name: "BRA-II Design", drug: "Antagonistas AT1" },
    scenario: "O losartan usa um grupo tetrazol como bioisóstero de -COOH para manter a interação iônica com o receptor AT1, mas com melhor absorção oral e estabilidade metabólica. Compare as propriedades.",
    initialGroup: "cooh", initialBioisostere: "tetrazole",
    bestBioisostere: "tetrazole",
    clinicalTip: "O tetrazol (pKa ≈ 4.9) mimetiza o -COOH (pKa ≈ 4.2) em ionização, mas é 10× mais lipofílico, melhorando a absorção oral do losartan.",
  },
  {
    title: "Celecoxibe – Sulfonamida vs Ester/Amida",
    difficulty: "Médio",
    patient: { name: "COX-2 Project", drug: "Inibidores COX-2" },
    scenario: "O celecoxibe possui uma sulfonamida que confere seletividade COX-2. Compare com bioisósteros para entender por que a sulfonamida é essencial para a seletividade.",
    initialGroup: "sulfonamide", initialBioisostere: "carbamate",
    bestBioisostere: "reverse_sulfonamide",
    clinicalTip: "A sulfonamida do celecoxibe interage com uma bolsa lateral da COX-2 (ausente na COX-1), conferindo seletividade >300×.",
  },
  {
    title: "Pró-fármaco – Éster vs Amida na Estabilidade",
    difficulty: "Difícil",
    patient: { name: "Prodrug Design", drug: "Pró-fármaco ester" },
    scenario: "Ésteres são facilmente hidrolisados por esterases plasmáticas (pró-fármacos). Compare com amidas e oxadiazóis para modular a taxa de ativação.",
    initialGroup: "ester", initialBioisostere: "amide_bio",
    bestBioisostere: "oxadiazole",
    clinicalTip: "Oxadiazóis são bioisósteros de ésteres resistentes à hidrólise enzimática, úteis quando se deseja estabilidade em vez de ativação de pró-fármaco.",
  },
];

export default function SimuladorBioisosterismo() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRoom = location.pathname.startsWith("/sala");
  const { allCases: aiCases, generateCase, isGenerating, deleteCase, updateCase, copyCase, availableTargets, toggleCaseMarketplace } = useSimulatorCases(SLUG, []);
  const { virtualRoomCase, isVirtualRoom, examProgress, examFeedback, proceedToNext, submitResults, submitted } = useVirtualRoomCase(SLUG, BUILT_IN_CASES);

  const [activeCase, setActiveCase] = useState<BioCase | null>(null);
  const [groupId, setGroupId] = useState("cooh");
  const [bioId, setBioId] = useState("tetrazole");
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [showFeedbackVR, setShowFeedbackVR] = useState(false);

  useEffect(() => {
    if (virtualRoomCase) {
      const cd = virtualRoomCase as any;
      setActiveCase({ id: virtualRoomCase.id, title: virtualRoomCase.title, difficulty: virtualRoomCase.difficulty, isAI: virtualRoomCase.isAI, patient: cd.patient, scenario: cd.scenario, initialGroup: cd.initialGroup ?? "cooh", initialBioisostere: cd.initialBioisostere ?? "tetrazole", bestBioisostere: cd.bestBioisostere ?? "tetrazole", clinicalTip: cd.clinicalTip ?? "" });
    }
  }, [virtualRoomCase]);

  useEffect(() => {
    if (activeCase) { setGroupId(activeCase.initialGroup); setBioId(activeCase.initialBioisostere); }
  }, [activeCase]);

  const originalGroup = GROUPS.find(g => g.id === groupId)!;
  const bios = BIOISOSTERES[groupId] || [];
  const selectedBio = bios.find(b => b.id === bioId) || bios[0];

  useEffect(() => { if (bios.length && !bios.find(b => b.id === bioId)) setBioId(bios[0].id); }, [groupId]);

  const comparisonData = useMemo(() => {
    if (!selectedBio) return [];
    return [
      { property: "pKa", original: originalGroup.pKa, bioisostere: selectedBio.pKa },
      { property: "logP", original: originalGroup.logP, bioisostere: selectedBio.logP },
      { property: "Estabilidade", original: originalGroup.stability, bioisostere: selectedBio.stability },
      { property: "Absorção", original: originalGroup.absorption, bioisostere: selectedBio.absorption },
    ];
  }, [originalGroup, selectedBio]);

  const handleFinish = useCallback(() => {
    if (!activeCase || submitted) return 0;
    const ok = bioId === activeCase.bestBioisostere;
    const s = ok ? 100 : 40;
    submitResults({ score: s, actions: { groupId, bioId } });
    return s;
  }, [activeCase, bioId, groupId, submitted, submitResults]);

  useEffect(() => {
    if (isVirtualRoom && challengeCompleted && !submitted && activeCase) {
      handleFinish();
      const cs = sessionStorage.getItem("challengeScore");
      if (cs) setLastScore(Number(cs));
    }
  }, [challengeCompleted]);

  useEffect(() => {
    if (isVirtualRoom && submitted) {
      const timer = setTimeout(() => navigate("/"), 15000);
      return () => clearTimeout(timer);
    }
  }, [isVirtualRoom, submitted, navigate]);

  const loadAICase = (c: any) => setActiveCase({ id: c.id, title: c.title, difficulty: c.difficulty, isAI: true, patient: c.patient, scenario: c.scenario, initialGroup: c.initialGroup ?? "cooh", initialBioisostere: c.initialBioisostere ?? "tetrazole", bestBioisostere: c.bestBioisostere ?? "tetrazole", clinicalTip: c.clinicalTip ?? "" });

  if (!activeCase) {
    if (isVirtualRoom) return <div className="p-8 text-center text-muted-foreground">Carregando caso da sala virtual...</div>;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(isRoom ? "/sala" : "/simuladores")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Isosteria e Bioisosterismo</h1>
            <p className="text-muted-foreground">Compare grupos funcionais e seus bioisósteros em propriedades moleculares.</p>
            <AdminPromptViewer toolSlug="sim-bioisosterismo" toolName="Bioisosterismo" toolType="simulator" prompt={getNativePrompt("sim-bioisosterismo") || ""} />
          </div>
        </div>
        <ExamBanner simulatorSlug={SLUG} examProgress={examProgress} />
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Casos de Estudo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {BUILT_IN_CASES.map((c, i) => (
              <NativeCaseCard key={i} caseItem={c} onClick={() => setActiveCase(c)} />
            ))}
            {aiCases.filter((c: any) => c.isAI).map((c: any) => (
              <AICaseCard key={c.id} caseItem={c} onClick={() => loadAICase(c)} onDelete={deleteCase} onUpdate={updateCase} onCopy={copyCase} availableTargets={availableTargets} onToggleMarketplace={toggleCaseMarketplace} />
            ))}
            {!isVirtualRoom && <Button onClick={() => generateCase()} disabled={isGenerating} className="w-full gap-2 mt-2">{isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar Caso com IA</Button>}
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
        <Button variant="ghost" size="icon" onClick={() => isVirtualRoom ? navigate("/") : setActiveCase(null)}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-bold">{activeCase.title}</h2>
        <Badge variant="outline">{activeCase.difficulty}</Badge>
      </div>
      <Card><CardContent className="pt-4"><p className="text-sm text-muted-foreground">{activeCase.scenario}</p></CardContent></Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Seleção de Grupos</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Grupo Funcional Original</label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{GROUPS.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Bioisóstero</label>
              <Select value={bioId} onValueChange={setBioId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{bios.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.type})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {selectedBio && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">Tipo</p><p className="text-sm font-bold">{selectedBio.type}</p></div>
                <div className="p-3 rounded-lg bg-muted text-center"><p className="text-xs text-muted-foreground">ΔlogP</p><p className="text-sm font-bold">{(selectedBio.logP - originalGroup.logP).toFixed(1)}</p></div>
              </div>
            )}
            {isVirtualRoom && submitted && !showFeedbackVR && (
              <Button onClick={() => setShowFeedbackVR(true)} variant="outline" className="w-full gap-2"><Eye className="h-4 w-4" /> Mostrar Resultados</Button>
            )}
            {isVirtualRoom && showFeedbackVR && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                <div className={`text-3xl font-bold ${lastScore >= 80 ? "text-green-600" : lastScore >= 50 ? "text-yellow-600" : "text-destructive"}`}>{lastScore}%</div>
                <p className="text-sm text-muted-foreground">{lastScore >= 80 ? "🏆 Excelente!" : lastScore >= 50 ? "📈 Bom, pode melhorar" : "⚠️ Revise os conceitos"}</p>
                <p className="text-xs text-muted-foreground">Redirecionando em 15s...</p>
              </div>
            )}
            {!isVirtualRoom && <Button variant="outline" onClick={() => handleFinish()} disabled={submitted} className="w-full">Finalizar Caso</Button>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Comparação de Propriedades</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" label={{ value: "Valor", position: "insideBottom", offset: -5 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="property" width={100} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="original" name="Original" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                <Bar dataKey="bioisostere" name="Bioisóstero" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/5"><CardContent className="pt-4"><p className="text-sm font-semibold mb-1">💡 Dica</p><p className="text-sm text-muted-foreground">{activeCase.clinicalTip}</p></CardContent></Card>
      <SimulatorChallengeMode challengeSet={getChallengesBySlug(SLUG)} simulatorState={{ groupId, bioId }} onComplete={(score) => { setChallengeCompleted(true); setLastScore(score); }} />
    </div>
  );
}
