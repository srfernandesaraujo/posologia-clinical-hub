import { useState, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Coins, Flame, Pill, HeartPulse, TreePine, Home, Dumbbell, Apple, Check, Sun, Moon, AlertTriangle, Star, Zap, type LucideIcon } from "lucide-react";
import confetti from "canvas-confetti";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface Medication { id: number; name: string; time: string; dose: string; taken: boolean; reward: number; explanation: string; }
interface Building { id: number; name: string; type: string; level: number; maxLevel: number; upgradeCost: number; description: string; levelNames: string[]; }
interface RandomEvent { id: string; title: string; description: string; effect: string; coinsEffect: number; streakEffect: number; explanation: string; }

const allMedications: Medication[] = [
  { id: 1, name: "Metformina 850mg", time: "08:00", dose: "Com café da manhã", taken: false, reward: 20, explanation: "Antidiabético de 1ª linha. Tomar com alimento reduz efeitos GI." },
  { id: 2, name: "Losartana 50mg", time: "08:00", dose: "Em jejum ou com alimento", taken: false, reward: 20, explanation: "BRA anti-hipertensivo. Nefroprotetor em diabéticos." },
  { id: 3, name: "Sinvastatina 20mg", time: "22:00", dose: "À noite (HMG-CoA é mais ativa)", taken: false, reward: 20, explanation: "Estatina. Síntese de colesterol é noturna, por isso tomar à noite." },
  { id: 4, name: "AAS 100mg", time: "12:00", dose: "Após almoço", taken: false, reward: 15, explanation: "Antiplaquetário. Com alimento para reduzir irritação gástrica." },
  { id: 5, name: "Omeprazol 20mg", time: "07:30", dose: "30min antes do café", taken: false, reward: 15, explanation: "IBP. Deve ser tomado em jejum, 30 min antes da refeição." },
  { id: 6, name: "Metformina 850mg", time: "20:00", dose: "Com jantar", taken: false, reward: 20, explanation: "Segunda dose diária. Dose dividida melhora tolerância GI." },
  { id: 7, name: "Levotiroxina 50mcg", time: "06:30", dose: "Jejum absoluto, 1h antes", taken: false, reward: 25, explanation: "Hormônio tireoidiano. Jejum essencial para absorção." },
  { id: 8, name: "Insulina NPH 20UI", time: "07:00", dose: "Subcutânea, antes do café", taken: false, reward: 25, explanation: "Insulina intermediária. Agitar suavemente, não sacudir." },
  { id: 9, name: "Enalapril 10mg", time: "08:00", dose: "Manhã", taken: false, reward: 15, explanation: "IECA. Monitorar potássio e creatinina." },
  { id: 10, name: "Furosemida 40mg", time: "08:00", dose: "Pela manhã (evitar noctúria)", taken: false, reward: 15, explanation: "Diurético de alça. Tomar pela manhã para não atrapalhar o sono." },
];

const defaultBuildings: Building[] = [
  { id: 1, name: "Centro de Bem-Estar", type: "HeartPulse", level: 1, maxLevel: 5, upgradeCost: 50, description: "Cuida da saúde da comunidade.", levelNames: ["Posto Médico", "Clínica Local", "Hospital Regional", "Centro de Pesquisa", "Hospital Universitário"] },
  { id: 2, name: "Área Verde", type: "TreePine", level: 1, maxLevel: 5, upgradeCost: 30, description: "Espaço para lazer e saúde mental.", levelNames: ["Terreno Baldio", "Jardim", "Parque", "Jardim Botânico", "Reserva Ecológica"] },
  { id: 3, name: "Bairro Residencial", type: "Home", level: 1, maxLevel: 5, upgradeCost: 40, description: "Atrai novos habitantes.", levelNames: ["Acampamento", "Bairro Madeira", "Vila Tijolo", "Metrópole", "Capital da Saúde"] },
  { id: 4, name: "Centro de Treino", type: "Dumbbell", level: 1, maxLevel: 4, upgradeCost: 60, description: "Promove atividade física.", levelNames: ["Parque Calistenia", "Ginásio", "Complexo Desportivo", "Centro Olímpico"] },
  { id: 5, name: "Mercado Nutricional", type: "Apple", level: 1, maxLevel: 4, upgradeCost: 45, description: "Alimentos saudáveis.", levelNames: ["Banca de Fruta", "Mercado Bio", "Supermercado", "Centro Nutricional"] },
  { id: 6, name: "Farol da Esperança", type: "Flame", level: 1, maxLevel: 4, upgradeCost: 100, description: "Monumento à resiliência.", levelNames: ["Fogueira", "Torre Vigia", "Farol", "Farol Dourado"] },
];

const randomEvents: RandomEvent[] = [
  { id: "epidemic", title: "🦠 Surto de Dengue!", description: "A vila foi afetada por um surto de dengue. O Centro de Bem-Estar precisa de recursos.", effect: "Perde 30 moedas se Centro de Bem-Estar nível < 3", coinsEffect: -30, streakEffect: 0, explanation: "Estrutura de saúde forte (nível ≥3) protege contra impacto de epidemias." },
  { id: "stockout", title: "📦 Falta de Estoque!", description: "Houve ruptura de estoque na farmácia central. Medicamentos podem faltar.", effect: "Perde 1 dia de streak", coinsEffect: 0, streakEffect: -1, explanation: "Programação e logística farmacêutica são essenciais para continuidade do tratamento." },
  { id: "vaccination", title: "💉 Campanha de Vacinação!", description: "A prefeitura lançou campanha de vacinação. Participar gera bônus.", effect: "Ganha 40 moedas!", coinsEffect: 40, streakEffect: 0, explanation: "Campanhas de saúde pública promovem prevenção e reduzem custos com tratamento." },
  { id: "exercise", title: "🏃 Programa Esporte na Vila!", description: "Novo programa de exercícios comunitários aumenta a saúde.", effect: "Ganha 20 moedas + 1 streak", coinsEffect: 20, streakEffect: 1, explanation: "Exercício físico regular reduz risco cardiovascular, melhora controle glicêmico e saúde mental." },
  { id: "flood", title: "🌧️ Enchente na Vila!", description: "Chuvas fortes danificaram infraestrutura.", effect: "Perde 25 moedas", coinsEffect: -25, streakEffect: 0, explanation: "Desastres naturais exigem infraestrutura resiliente e plano de contingência em saúde." },
];

const iconMap: Record<string, LucideIcon> = { HeartPulse, TreePine, Home, Dumbbell, Apple, Flame };

export default function VilaSaudeGame({ customData }: { customData?: any }) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"select" | "narrative" | "playing" | "result">("select");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [dayPhase, setDayPhase] = useState<"morning" | "evening">("morning");
  const [currentDay, setCurrentDay] = useState(1);
  const [totalDays] = useState(7);

  // Select medications based on difficulty
  const medCount = difficulty === "academic" ? 4 : difficulty === "clinical" ? 7 : 10;
  const [medications, setMedications] = useState<Medication[]>([]);
  const [buildings, setBuildings] = useState<Building[]>(defaultBuildings.map(b => ({ ...b, level: 1 })));
  const [stats, setStats] = useState({ coins: 50, streak: 0, totalMedsTaken: 0, missedMeds: 0, inhabitants: 12 });
  const [activeEvent, setActiveEvent] = useState<RandomEvent | null>(null);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string } | null>(null);
  const [achievements, setAchievements] = useState<string[]>([]);

  const startGame = () => {
    const meds = allMedications.slice(0, medCount).map(m => ({ ...m, taken: false }));
    setMedications(meds);
    setBuildings(defaultBuildings.map(b => ({ ...b, level: 1 })));
    setStats({ coins: 50, streak: 0, totalMedsTaken: 0, missedMeds: 0, inhabitants: 12 });
    setCurrentDay(1);
    setDayPhase("morning");
    setActiveEvent(null);
    setFeedback(null);
    setAchievements([]);
    setPhase("playing");
  };

  const takenCount = medications.filter(m => m.taken).length;
  const progressPercent = medications.length > 0 ? (takenCount / medications.length) * 100 : 0;

  const takeMed = useCallback((id: number) => {
    const med = medications.find(m => m.id === id);
    if (!med || med.taken) return;
    setMedications(prev => prev.map(m => m.id === id ? { ...m, taken: true } : m));
    setStats(s => ({ ...s, coins: s.coins + med.reward, totalMedsTaken: s.totalMedsTaken + 1 }));
    setFeedback({ isCorrect: true, title: `${med.name} ✓`, explanation: med.explanation });
  }, [medications]);

  const upgradeBuilding = useCallback((id: number) => {
    const b = buildings.find(b => b.id === id);
    if (!b || stats.coins < b.upgradeCost || b.level >= b.maxLevel) return;
    const newLevel = b.level + 1;
    const isMax = newLevel >= b.maxLevel;
    setStats(s => ({ ...s, coins: s.coins - b.upgradeCost, inhabitants: s.inhabitants + 5 }));
    setBuildings(prev => prev.map(item => item.id === id ? { ...item, level: newLevel, upgradeCost: isMax ? item.upgradeCost : Math.round(item.upgradeCost * 1.3) } : item));
    toast({ title: "🏗️ Construção melhorada!", description: `${b.name} → Nível ${newLevel}` });
    if (isMax) confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
  }, [buildings, stats.coins, toast]);

  const advanceDay = () => {
    if (dayPhase === "morning") {
      setDayPhase("evening");
      return;
    }

    // End of day
    const untaken = medications.filter(m => !m.taken).length;
    const allTaken = untaken === 0;

    setStats(s => ({
      ...s,
      streak: allTaken ? s.streak + 1 : 0,
      missedMeds: s.missedMeds + untaken,
    }));

    if (currentDay >= totalDays) {
      setPhase("result");
      return;
    }

    // Random event (40% chance)
    if (Math.random() < 0.4) {
      const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
      setActiveEvent(event);
      setStats(s => ({
        ...s,
        coins: Math.max(0, s.coins + event.coinsEffect),
        streak: Math.max(0, s.streak + event.streakEffect),
      }));
    }

    // Reset meds for new day
    setMedications(prev => prev.map(m => ({ ...m, taken: false })));
    setCurrentDay(d => d + 1);
    setDayPhase("morning");
  };

  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">Vila da Saúde</h2>
        <p className="text-center text-muted-foreground text-sm">Construa uma vila saudável cuidando da medicação dos moradores</p>
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <div className="text-center text-sm text-muted-foreground">
          {difficulty === "academic" ? "4 medicamentos" : difficulty === "clinical" ? "7 medicamentos" : "10 medicamentos"} · {totalDays} dias · Eventos aleatórios
        </div>
        <div className="flex justify-center">
          <Button size="lg" onClick={() => setPhase("narrative")} className="gap-2">Continuar</Button>
        </div>
      </div>
    );
  }

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Vila da Saúde"
        setting="Vila Esperança — Comunidade Rural"
        patientName="Comunidade Vila Esperança"
        patientAge="12 habitantes iniciais"
        patientHistory="Uma pequena comunidade precisa de um farmacêutico dedicado. Os moradores têm doenças crônicas e dependem da adesão medicamentosa para viver bem."
        briefing="Administre os medicamentos corretamente, construa infraestrutura de saúde e enfrente eventos inesperados ao longo de 7 dias. Cada medicamento tomado no horário gera moedas para melhorar a vila!"
        icon={<Home className="h-10 w-10 text-primary" />}
        onStart={startGame}
      />
    );
  }

  if (phase === "result") {
    const maxScore = totalDays * medCount * 20;
    return (
      <GameStarsResult
        score={stats.totalMedsTaken * 20}
        maxScore={maxScore}
        errors={stats.missedMeds}
        title={stats.missedMeds === 0 ? "Vila Próspera!" : "Vila em Desenvolvimento"}
        subtitle={`${stats.inhabitants} habitantes. Streak máximo: ${stats.streak} dias. ${stats.totalMedsTaken} doses administradas.`}
        onRestart={startGame}
        onBack={() => setPhase("select")}
        details={[
          { label: "Dias jogados", value: `${currentDay}` },
          { label: "Doses tomadas", value: `${stats.totalMedsTaken}` },
          { label: "Doses perdidas", value: `${stats.missedMeds}` },
          { label: "Nível máx. construção", value: `${Math.max(...buildings.map(b => b.level))}` },
        ]}
      />
    );
  }

  // Playing
  const morningMeds = medications.filter(m => parseInt(m.time) < 14);
  const eveningMeds = medications.filter(m => parseInt(m.time) >= 14);
  const currentMeds = dayPhase === "morning" ? morningMeds : eveningMeds;

  return (
    <div className="space-y-4">
      {feedback && (
        <GameFeedbackOverlay
          isCorrect={feedback.isCorrect}
          title={feedback.title}
          explanation={feedback.explanation}
          onContinue={() => setFeedback(null)}
        />
      )}

      {activeEvent && (
        <GameFeedbackOverlay
          isCorrect={activeEvent.coinsEffect >= 0}
          title={activeEvent.title}
          explanation={`${activeEvent.description}\n\n${activeEvent.effect}\n\n${activeEvent.explanation}`}
          onContinue={() => setActiveEvent(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {dayPhase === "morning" ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-400" />}
          <h3 className="font-bold text-foreground">Dia {currentDay}/{totalDays} — {dayPhase === "morning" ? "Manhã" : "Noite"}</h3>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1"><Coins className="h-3 w-3" />{stats.coins}</Badge>
          <Badge variant="outline" className="gap-1"><Flame className="h-3 w-3" />{stats.streak} dias</Badge>
          <Badge variant="outline" className="gap-1">👥 {stats.inhabitants}</Badge>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground"><span>Medicamentos do dia</span><span>{takenCount}/{medications.length}</span></div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Medications */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Pill className="h-4 w-4 text-primary" />
            {dayPhase === "morning" ? "Medicamentos da Manhã" : "Medicamentos da Noite"}
          </h2>
          {currentMeds.length === 0 ? (
            <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Nenhum medicamento neste turno</CardContent></Card>
          ) : currentMeds.map(med => (
            <Card key={med.id} className={`transition-all ${med.taken ? "border-green-500/30 bg-green-500/5" : ""}`}>
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div>
                  <p className="font-semibold text-sm text-foreground">{med.name}</p>
                  <p className="text-xs text-muted-foreground">{med.time} · {med.dose}</p>
                </div>
                <Button
                  disabled={med.taken}
                  size="sm"
                  variant={med.taken ? "secondary" : "default"}
                  onClick={() => takeMed(med.id)}
                  className="text-xs"
                >
                  {med.taken ? <><Check className="h-3 w-3 mr-1" /> Tomado</> : `+${med.reward} 🪙`}
                </Button>
              </CardContent>
            </Card>
          ))}
          <Button onClick={advanceDay} className="w-full gap-2" variant="outline">
            {dayPhase === "morning" ? <><Moon className="h-4 w-4" /> Avançar para Noite</> : <><Sun className="h-4 w-4" /> Próximo Dia</>}
          </Button>
        </section>

        {/* Buildings */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-foreground">🏘️ Vila Esperança</h2>
          <div className="grid grid-cols-2 gap-2">
            {buildings.map(b => {
              const Icon = iconMap[b.type] ?? Home;
              const isMax = b.level >= b.maxLevel;
              const displayName = b.levelNames[b.level - 1] ?? b.name;
              return (
                <div key={b.id} className="flex flex-col items-center rounded-xl bg-card p-3 text-center border border-border transition-all hover:border-primary/30">
                  <Icon className={`${isMax ? "text-yellow-500" : b.level >= 3 ? "text-primary" : "text-muted-foreground"}`} size={b.level >= 3 ? 32 : 24} />
                  <p className="mt-1 text-xs font-bold text-foreground leading-tight">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground">Nv {b.level}/{b.maxLevel}</p>
                  {isMax ? (
                    <Badge variant="secondary" className="mt-1 text-[10px]">MAX ⭐</Badge>
                  ) : (
                    <Button size="sm" className="mt-1 text-[10px] h-6 px-2" variant="outline" disabled={stats.coins < b.upgradeCost} onClick={() => upgradeBuilding(b.id)}>
                      {b.upgradeCost} <Coins className="h-2.5 w-2.5 ml-0.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="flex justify-center">
        <Button onClick={() => setPhase("select")} variant="ghost" size="sm">Voltar ao Menu</Button>
      </div>
    </div>
  );
}
