import { useState, useMemo } from "react";
import { FlaskConical, Pill, Leaf, AlertTriangle, CheckCircle, Star, X, Beaker, Clock, BookOpen, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";

interface InventoryItem { id: string; name: string; type: "Pill" | "Leaf" | "Food" | "Supplement"; category: string; shelf: string; mechanism?: string; }
interface InteractionResult { type: "danger" | "caution" | "safe"; title: string; description: string; mechanism: string; clinicalConduct: string; reference: string; points: number; severity: string; }

const allItems: InventoryItem[] = [
  // Medicamentos
  { id: "M1", name: "Varfarina", type: "Pill", category: "Anticoagulante", shelf: "Medicamentos", mechanism: "Inibe VKOR (vitamina K epóxido redutase)" },
  { id: "M2", name: "Omeprazol", type: "Pill", category: "IBP", shelf: "Medicamentos", mechanism: "Inibe H+/K+-ATPase e CYP2C19" },
  { id: "M3", name: "Clopidogrel", type: "Pill", category: "Antiagregante", shelf: "Medicamentos", mechanism: "Pró-fármaco ativado por CYP2C19" },
  { id: "M4", name: "Ibuprofeno", type: "Pill", category: "AINE", shelf: "Medicamentos", mechanism: "Inibe COX-1/2 não seletivo" },
  { id: "M5", name: "Fluoxetina", type: "Pill", category: "ISRS", shelf: "Medicamentos", mechanism: "Inibe recaptação 5-HT e CYP2D6" },
  { id: "M6", name: "Tramadol", type: "Pill", category: "Opioide atípico", shelf: "Medicamentos", mechanism: "Agonista µ + inibe recaptação 5-HT/NE" },
  { id: "M7", name: "Metformina", type: "Pill", category: "Antidiabético", shelf: "Medicamentos", mechanism: "Reduz produção hepática de glicose" },
  { id: "M8", name: "Sinvastatina", type: "Pill", category: "Estatina", shelf: "Medicamentos", mechanism: "Inibe HMG-CoA redutase, metabolizada CYP3A4" },
  { id: "M9", name: "Amiodarona", type: "Pill", category: "Antiarrítmico", shelf: "Medicamentos", mechanism: "Classe III + inibe CYP3A4, CYP2D6, P-gp" },
  { id: "M10", name: "Lítio", type: "Pill", category: "Estabilizador", shelf: "Medicamentos", mechanism: "Modula inositol e GSK-3β" },
  // Alimentos
  { id: "A1", name: "Espinafre", type: "Food", category: "Rico em Vitamina K", shelf: "Alimentos" },
  { id: "A2", name: "Toranja (Grapefruit)", type: "Food", category: "Inibidor CYP3A4", shelf: "Alimentos" },
  { id: "A3", name: "Queijo Curado", type: "Food", category: "Rico em Tiramina", shelf: "Alimentos" },
  { id: "A4", name: "Leite e Derivados", type: "Food", category: "Rico em Cálcio", shelf: "Alimentos" },
  // Fitoterápicos
  { id: "F1", name: "Ginkgo Biloba", type: "Leaf", category: "Antiagregante", shelf: "Fitoterápicos" },
  { id: "F2", name: "Erva de São João", type: "Leaf", category: "Indutor CYP3A4/P-gp", shelf: "Fitoterápicos" },
  { id: "F3", name: "Kava-Kava", type: "Leaf", category: "Hepatotóxico", shelf: "Fitoterápicos" },
  { id: "F4", name: "Valeriana", type: "Leaf", category: "Sedativo", shelf: "Fitoterápicos" },
  // Suplementos
  { id: "S1", name: "Cálcio + Vit D", type: "Supplement", category: "Mineral", shelf: "Suplementos" },
  { id: "S2", name: "Ferro Elementar", type: "Supplement", category: "Mineral", shelf: "Suplementos" },
  { id: "S3", name: "Ômega 3", type: "Supplement", category: "Ácido graxo", shelf: "Suplementos" },
];

const interactions: Record<string, InteractionResult> = {
  "A1-M1": { type: "danger", title: "Vitamina K × Varfarina", description: "Vitamina K do espinafre antagoniza a varfarina.", mechanism: "Competição direta pela enzima VKOR. Vitamina K é cofator da carboxilação dos fatores II, VII, IX, X.", clinicalConduct: "Manter dieta CONSTANTE em vitamina K. Não proibir, mas evitar variações bruscas.", reference: "Holbrook AM et al. Arch Intern Med 2005", points: 50, severity: "Grave" },
  "M2-M3": { type: "danger", title: "Omeprazol × Clopidogrel", description: "Omeprazol inibe CYP2C19, impedindo ativação do clopidogrel.", mechanism: "CYP2C19 é a principal enzima que converte clopidogrel em metabólito ativo. IBPs competem pelo mesmo CYP.", clinicalConduct: "Trocar omeprazol por pantoprazol (menor inibição CYP2C19). Separar horários NÃO resolve.", reference: "Bhatt DL et al. NEJM 2010 (COGENT)", points: 75, severity: "Grave" },
  "F1-M4": { type: "danger", title: "Ginkgo Biloba × Ibuprofeno", description: "Ambos afetam hemostasia. Risco de sangramento grave.", mechanism: "Ginkgo inibe PAF (fator ativador de plaquetas). AINE inibe COX-1/tromboxano. Efeito aditivo na hemostasia.", clinicalConduct: "Suspender ginkgo se AINE necessário. Evitar associação.", reference: "Bent S et al. J Gen Intern Med 2005", points: 50, severity: "Grave" },
  "M5-M6": { type: "danger", title: "Fluoxetina × Tramadol", description: "Risco de Síndrome Serotoninérgica — EMERGÊNCIA!", mechanism: "Ambos aumentam serotonina sináptica. Fluoxetina também inibe CYP2D6, reduzindo metabolismo do tramadol.", clinicalConduct: "CONTRAINDICAÇÃO. Tríade: agitação + clonus + hipertermia. Se ocorrer, suspender ambos + ciproeptadina.", reference: "Boyer EW, Shannon M. NEJM 2005", points: 100, severity: "Potencialmente Fatal" },
  "A2-M8": { type: "danger", title: "Toranja × Sinvastatina", description: "Toranja inibe CYP3A4 intestinal, multiplicando nível sérico da estatina.", mechanism: "Furanocumarinas da toranja destroem CYP3A4 intestinal irreversivelmente. Efeito dura 72h após ingestão.", clinicalConduct: "EVITAR toranja com sinvastatina e lovastatina. Atorvastatina tem menor risco. Rosuvastatina é segura.", reference: "Bailey DG et al. CMAJ 2013", points: 60, severity: "Grave" },
  "F2-M1": { type: "danger", title: "Erva de São João × Varfarina", description: "ESJ induz CYP3A4/2C9 e P-gp, reduzindo drasticamente o efeito da varfarina.", mechanism: "Hiperforina da ESJ ativa PXR (receptor pregnano X), induzindo enzimas CYP e transportador P-gp.", clinicalConduct: "CONTRAINDICAÇÃO com qualquer fármaco de janela estreita. Efeito persiste 2 semanas após suspensão.", reference: "Henderson L et al. Br J Clin Pharmacol 2002", points: 75, severity: "Grave" },
  "M9-M8": { type: "danger", title: "Amiodarona × Sinvastatina", description: "Amiodarona inibe CYP3A4, elevando nível de sinvastatina → rabdomiólise.", mechanism: "Amiodarona é potente inibidor de CYP3A4. Sinvastatina é substrato CYP3A4.", clinicalConduct: "Dose máxima de sinvastatina com amiodarona: 20mg/dia. Preferir pravastatina ou rosuvastatina.", reference: "FDA Drug Safety Communication 2011", points: 70, severity: "Grave" },
  "M4-M10": { type: "danger", title: "Ibuprofeno × Lítio", description: "AINEs reduzem excreção renal de lítio → intoxicação.", mechanism: "AINEs inibem prostaglandinas renais, reduzindo TFG e reabsorção de sódio. Lítio é reabsorvido junto com sódio.", clinicalConduct: "Evitar AINEs em pacientes com lítio. Se necessário, monitorar litemia em 5-7 dias. Preferir paracetamol.", reference: "Finley PR. J Clin Pharmacol 2016", points: 60, severity: "Grave" },
  "M1-M4": { type: "danger", title: "Varfarina × Ibuprofeno", description: "AINE + anticoagulante = risco hemorrágico muito elevado.", mechanism: "Ibuprofeno inibe COX-1 plaquetária + desloca varfarina da albumina + lesão direta da mucosa GI.", clinicalConduct: "EVITAR. Se analgesia necessária, usar paracetamol ≤2g/dia. Se AINE imprescindível, associar IBP.", reference: "Lanas A et al. Lancet 2007", points: 65, severity: "Grave" },
  "S2-M7": { type: "caution", title: "Ferro × Metformina", description: "Metformina reduz absorção de vitamina B12, não ferro. Mas ferro reduz absorção de metformina.", mechanism: "Ferro forma complexos com metformina no TGI, reduzindo sua biodisponibilidade.", clinicalConduct: "Separar administração em pelo menos 2 horas.", reference: "UpToDate: Drug interactions 2024", points: 30, severity: "Moderada" },
  "M1-S3": { type: "caution", title: "Varfarina × Ômega 3", description: "Ômega 3 em doses altas pode potencializar anticoagulação.", mechanism: "EPA/DHA em doses >3g/dia reduzem agregação plaquetária e podem deslocar varfarina de proteínas.", clinicalConduct: "Em doses habituais (1g/dia) o risco é mínimo. Monitorar INR se doses >3g/dia.", reference: "Bays HE. Am J Cardiol 2007", points: 25, severity: "Leve" },
};

const shelves = ["Medicamentos", "Alimentos", "Fitoterápicos", "Suplementos"];

const TypeIcon = ({ type }: { type: string }) => {
  if (type === "Pill") return <Pill className="h-4 w-4" />;
  if (type === "Leaf") return <Leaf className="h-4 w-4" />;
  if (type === "Food") return <span className="text-sm">🍽️</span>;
  return <span className="text-sm">💊</span>;
};

function getItemStyle(type: string) {
  if (type === "Pill") return "bg-primary/10 text-primary border-primary/20";
  if (type === "Leaf") return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
  if (type === "Food") return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
  return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
}

interface ChallengePatient {
  name: string;
  age: string;
  medications: string[];
  question: string;
  dangerPairs: string[];
}

const challengePatients: ChallengePatient[] = [
  {
    name: "Maria, 74 anos",
    age: "Fibrilação atrial + artrose + depressão",
    medications: ["Varfarina", "Ibuprofeno", "Fluoxetina", "Omeprazol"],
    question: "Identifique TODAS as interações perigosas nesta prescrição",
    dangerPairs: ["M1-M4"],
  },
  {
    name: "João, 55 anos",
    age: "Pós-stent coronário + DRGE",
    medications: ["Clopidogrel", "Omeprazol", "Sinvastatina", "Ômega 3"],
    question: "Quais interações comprometem a eficácia do tratamento?",
    dangerPairs: ["M2-M3"],
  },
];

export default function LaboratorioInteracoesGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"select" | "narrative" | "lab" | "challenge" | "encyclopedia" | "result">("select");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [score, setScore] = useState(0);
  const [lastResult, setLastResult] = useState<InteractionResult | null>(null);
  const [discoveredKeys, setDiscoveredKeys] = useState<Set<string>>(new Set());
  const [activeShelf, setActiveShelf] = useState("Medicamentos");

  const totalDangerInteractions = Object.keys(interactions).filter(k => interactions[k].type === "danger").length;
  const discoveredDanger = [...discoveredKeys].filter(k => interactions[k]?.type === "danger").length;

  const handleSelectItem = (item: InventoryItem) => {
    if (selectedItems.length >= 2 || selectedItems.some(s => s.id === item.id)) return;
    setSelectedItems(prev => [...prev, item]);
  };
  const handleRemoveSlot = (index: number) => setSelectedItems(prev => prev.filter((_, i) => i !== index));

  const handleMix = () => {
    if (selectedItems.length !== 2) return;
    const key = [selectedItems[0].id, selectedItems[1].id].sort().join("-");
    const result = interactions[key] || { type: "safe" as const, title: "Combinação Segura", description: "Não há interações clinicamente significativas documentadas entre estas substâncias.", mechanism: "Sem mecanismo de interação conhecido.", clinicalConduct: "Podem ser usadas concomitantemente com segurança.", reference: "Micromedex DrugDex 2024", points: 5, severity: "Nenhuma" };
    const isNew = !discoveredKeys.has(key);
    setLastResult(result);
    if (isNew) { setScore(s => s + result.points); setDiscoveredKeys(prev => new Set(prev).add(key)); }
  };

  const handleClear = () => { setLastResult(null); setSelectedItems([]); };

  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">Laboratório de Interações</h2>
        <p className="text-center text-muted-foreground text-sm">{allItems.length} substâncias · {totalDangerInteractions} interações perigosas para descobrir</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
          <button onClick={() => { setPhase("narrative"); }} className="p-4 rounded-xl border-2 border-primary bg-primary/5 text-center">
            <FlaskConical className="h-8 w-8 text-primary mx-auto" />
            <p className="font-semibold text-foreground mt-2">Laboratório Livre</p>
            <p className="text-xs text-muted-foreground">Misture substâncias livremente</p>
          </button>
          <button onClick={() => setPhase("challenge")} className="p-4 rounded-xl border-2 border-border hover:border-primary/50 text-center transition-all">
            <Clock className="h-8 w-8 text-primary mx-auto" />
            <p className="font-semibold text-foreground mt-2">Modo Desafio</p>
            <p className="text-xs text-muted-foreground">Pacientes polimedicados</p>
          </button>
          <button onClick={() => setPhase("encyclopedia")} className="p-4 rounded-xl border-2 border-border hover:border-primary/50 text-center transition-all">
            <BookOpen className="h-8 w-8 text-primary mx-auto" />
            <p className="font-semibold text-foreground mt-2">Enciclopédia</p>
            <p className="text-xs text-muted-foreground">{discoveredKeys.size} descobertas</p>
          </button>
        </div>

        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
      </div>
    );
  }

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Laboratório de Interações Farmacológicas"
        setting="Laboratório de Farmacologia Clínica — Universidade"
        briefing="Misture substâncias na bancada para descobrir interações medicamentosas. Explore medicamentos, alimentos, fitoterápicos e suplementos para encontrar todas as interações perigosas."
        difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        icon={<FlaskConical className="h-10 w-10 text-primary" />}
        onStart={() => setPhase("lab")}
      />
    );
  }

  if (phase === "encyclopedia") {
    const discovered = [...discoveredKeys].map(key => ({ key, ...interactions[key] })).filter(Boolean);
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">📖 Enciclopédia de Interações</h2>
          <Button variant="ghost" size="sm" onClick={() => setPhase("select")}>Voltar</Button>
        </div>
        <p className="text-sm text-muted-foreground">{discovered.length} interações descobertas</p>
        {discovered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma interação descoberta ainda. Vá ao Laboratório para começar!</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {discovered.map((d, i) => (
              <Card key={i} className={d.type === "danger" ? "border-destructive/30" : d.type === "caution" ? "border-yellow-500/30" : "border-green-500/30"}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {d.type === "danger" ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                    <h3 className="font-semibold text-foreground text-sm">{d.title}</h3>
                    <Badge variant={d.type === "danger" ? "destructive" : "secondary"} className="text-xs">{d.severity}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground"><strong>Mecanismo:</strong> {d.mechanism}</p>
                  <p className="text-xs text-muted-foreground"><strong>Conduta:</strong> {d.clinicalConduct}</p>
                  <p className="text-xs text-muted-foreground italic">Ref: {d.reference}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (phase === "challenge") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">🏥 Modo Desafio: Pacientes Polimedicados</h2>
          <Button variant="ghost" size="sm" onClick={() => setPhase("select")}>Voltar</Button>
        </div>
        <p className="text-sm text-muted-foreground">Analise as prescrições e identifique todas as interações perigosas.</p>
        {challengePatients.map((patient, pi) => (
          <Card key={pi}>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-bold text-foreground">{patient.name}</h3>
              <p className="text-xs text-muted-foreground">{patient.age}</p>
              <div className="flex flex-wrap gap-1.5">
                {patient.medications.map((med, mi) => (
                  <Badge key={mi} variant="outline">{med}</Badge>
                ))}
              </div>
              <p className="text-sm font-medium text-foreground">{patient.question}</p>
              <Button size="sm" onClick={() => { setPhase("lab"); }} className="gap-1.5">
                <Search className="h-3.5 w-3.5" /> Investigar no Laboratório
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Lab mode
  const shelfItems = allItems.filter(i => i.shelf === activeShelf);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-foreground">Laboratório</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Descobertas: {discoveredDanger}/{totalDangerInteractions}</Badge>
          <Badge variant="outline" className="gap-1"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{score}</Badge>
          <Button variant="ghost" size="sm" onClick={() => setPhase("select")}>Menu</Button>
        </div>
      </div>

      {/* Mixer */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[0, 1].map(idx => (
              <div key={idx}>
                {selectedItems[idx] ? (
                  <div className={`relative w-36 h-24 rounded-xl flex flex-col items-center justify-center gap-1 border ${getItemStyle(selectedItems[idx].type)}`}>
                    <button onClick={() => handleRemoveSlot(idx)} className="absolute top-1 right-1 rounded-full p-0.5 hover:bg-foreground/10"><X className="h-3.5 w-3.5" /></button>
                    <TypeIcon type={selectedItems[idx].type} />
                    <p className="font-semibold text-xs">{selectedItems[idx].name}</p>
                    <p className="text-[10px] opacity-75">{selectedItems[idx].category}</p>
                  </div>
                ) : (
                  <div className="w-36 h-24 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs">Selecione</div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-4">
            <Button disabled={selectedItems.length !== 2} onClick={handleMix} className="gap-2">
              <FlaskConical className="h-4 w-4" /> MISTURAR
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Shelves */}
      <Tabs value={activeShelf} onValueChange={setActiveShelf}>
        <TabsList className="w-full grid grid-cols-4">
          {shelves.map(s => (
            <TabsTrigger key={s} value={s} className="text-xs">{s}</TabsTrigger>
          ))}
        </TabsList>
        {shelves.map(shelf => (
          <TabsContent key={shelf} value={shelf}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allItems.filter(i => i.shelf === shelf).map(item => {
                const isSelected = selectedItems.some(s => s.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    disabled={isSelected || selectedItems.length >= 2}
                    className={`flex items-center gap-2 rounded-lg p-3 text-left transition-all border ${getItemStyle(item.type)} ${
                      isSelected ? "opacity-40 cursor-not-allowed" : "hover:shadow-md cursor-pointer hover:scale-[1.02]"
                    }`}
                  >
                    <TypeIcon type={item.type} />
                    <div>
                      <p className="font-semibold text-xs">{item.name}</p>
                      <p className="text-[10px] opacity-75">{item.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Result Dialog */}
      <Dialog open={!!lastResult} onOpenChange={(open) => !open && handleClear()}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          {lastResult && (
            <>
              <DialogHeader>
                <div className="flex justify-center mb-3">
                  {lastResult.type === "danger" ? (
                    <div className="rounded-full bg-destructive/10 p-4"><AlertTriangle className="h-10 w-10 text-destructive" /></div>
                  ) : lastResult.type === "caution" ? (
                    <div className="rounded-full bg-yellow-500/10 p-4"><AlertTriangle className="h-10 w-10 text-yellow-500" /></div>
                  ) : (
                    <div className="rounded-full bg-green-500/10 p-4"><CheckCircle className="h-10 w-10 text-green-500" /></div>
                  )}
                </div>
                <DialogTitle className="text-center text-lg">{lastResult.title}</DialogTitle>
                <Badge variant={lastResult.type === "danger" ? "destructive" : "secondary"} className="mx-auto">{lastResult.severity}</Badge>
              </DialogHeader>

              <div className="space-y-3 mt-4">
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm text-foreground">{lastResult.description}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 border border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Mecanismo Farmacológico</p>
                  <p className="text-sm text-foreground">{lastResult.mechanism}</p>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                  <p className="text-xs font-semibold text-primary mb-1">Conduta Clínica</p>
                  <p className="text-sm text-foreground">{lastResult.clinicalConduct}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">Ref: {lastResult.reference}</p>
              </div>

              <DialogFooter className="mt-4 sm:justify-center">
                <Badge variant="secondary">+{lastResult.points} pontos</Badge>
                <Button onClick={handleClear}>Limpar Bancada</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
