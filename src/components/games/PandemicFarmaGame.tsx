import { useState, useEffect, useCallback, useRef } from "react";
import { Shield, Bug, Coins, AlertTriangle, Heart, Zap, Clock, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface Antibiotic {
  id: string;
  name: string;
  shortName: string;
  spectrum: string[];
  cost: number;
  color: string;
  damage: number;
  range: number;
  cooldown: number;
  sideEffect: string;
  description: string;
}

interface Bacterium {
  id: string;
  name: string;
  type: string;
  hp: number;
  maxHp: number;
  speed: number;
  position: number;
  lane: number;
  resistances: string[];
  icon: string;
  reward: number;
  isAlive: boolean;
}

interface PlacedTower {
  id: string;
  antibiotic: Antibiotic;
  lane: number;
  slot: number;
  lastFired: number;
  kills: number;
}

interface Wave {
  id: number;
  bacteria: Omit<Bacterium, "id" | "position" | "isAlive">[];
  description: string;
  mechanism: string;
}

const antibiotics: Antibiotic[] = [
  { id: "amox", name: "Amoxicilina", shortName: "AMOX", spectrum: ["gram+"], cost: 50, color: "bg-blue-500", damage: 20, range: 3, cooldown: 2000, sideEffect: "Diarreia", description: "Beta-lactâmico de amplo espectro. Eficaz contra Gram+" },
  { id: "ceftri", name: "Ceftriaxona", shortName: "CEFT", spectrum: ["gram+", "gram-"], cost: 100, color: "bg-green-500", damage: 30, range: 3, cooldown: 2500, sideEffect: "Colite pseudomembranosa", description: "Cefalosporina 3ª geração. Cobre Gram+ e Gram-" },
  { id: "vanco", name: "Vancomicina", shortName: "VANC", spectrum: ["gram+", "mrsa"], cost: 150, color: "bg-purple-500", damage: 40, range: 2, cooldown: 3000, sideEffect: "Nefrotoxicidade", description: "Glicopeptídeo. Última linha contra MRSA" },
  { id: "mero", name: "Meropenem", shortName: "MERO", spectrum: ["gram+", "gram-", "anaerob"], cost: 200, color: "bg-red-500", damage: 50, range: 3, cooldown: 3500, sideEffect: "Convulsões", description: "Carbapenêmico. Amplo espectro — reservar para casos graves" },
  { id: "poli", name: "Polimixina B", shortName: "POLI", spectrum: ["gram-", "kpc"], cost: 250, color: "bg-orange-500", damage: 60, range: 2, cooldown: 4000, sideEffect: "Nefro/neurotoxicidade", description: "Último recurso contra KPC e Gram- multirresistentes" },
  { id: "metro", name: "Metronidazol", shortName: "METR", spectrum: ["anaerob"], cost: 80, color: "bg-teal-500", damage: 25, range: 3, cooldown: 2000, sideEffect: "Efeito dissulfiram", description: "Nitroimidazólico. Específico para anaeróbios e Clostridioides" },
];

const waves: Wave[] = [
  {
    id: 1, description: "Onda 1: Gram-positivos comunitários",
    mechanism: "Streptococcus e Staphylococcus sensíveis — beta-lactâmicos são primeira escolha.",
    bacteria: [
      { name: "S. pyogenes", type: "gram+", hp: 40, maxHp: 40, speed: 1, lane: 0, resistances: [], icon: "🦠", reward: 20 },
      { name: "S. aureus (MSSA)", type: "gram+", hp: 50, maxHp: 50, speed: 0.8, lane: 1, resistances: [], icon: "🦠", reward: 25 },
      { name: "S. pneumoniae", type: "gram+", hp: 45, maxHp: 45, speed: 1.2, lane: 2, resistances: [], icon: "🦠", reward: 20 },
      { name: "S. pyogenes", type: "gram+", hp: 40, maxHp: 40, speed: 1, lane: 0, resistances: [], icon: "🦠", reward: 20 },
    ],
  },
  {
    id: 2, description: "Onda 2: Gram-negativos hospitalares",
    mechanism: "E. coli e Klebsiella com produção de ESBL — cefalosporinas de 3ª geração podem falhar.",
    bacteria: [
      { name: "E. coli", type: "gram-", hp: 60, maxHp: 60, speed: 1.2, lane: 0, resistances: [], icon: "🔴", reward: 30 },
      { name: "E. coli ESBL", type: "gram-", hp: 70, maxHp: 70, speed: 0.9, lane: 1, resistances: ["ceftri"], icon: "🔴", reward: 40 },
      { name: "Klebsiella", type: "gram-", hp: 65, maxHp: 65, speed: 1, lane: 2, resistances: [], icon: "🔴", reward: 30 },
      { name: "Proteus", type: "gram-", hp: 55, maxHp: 55, speed: 1.3, lane: 1, resistances: [], icon: "🔴", reward: 25 },
      { name: "E. coli ESBL", type: "gram-", hp: 70, maxHp: 70, speed: 1, lane: 0, resistances: ["ceftri"], icon: "🔴", reward: 40 },
    ],
  },
  {
    id: 3, description: "Onda 3: MRSA e Clostridioides",
    mechanism: "MRSA exige vancomicina. Clostridioides responde a metronidazol ou vancomicina oral.",
    bacteria: [
      { name: "MRSA", type: "mrsa", hp: 90, maxHp: 90, speed: 0.7, lane: 0, resistances: ["amox", "ceftri"], icon: "💀", reward: 50 },
      { name: "MRSA", type: "mrsa", hp: 90, maxHp: 90, speed: 0.8, lane: 2, resistances: ["amox", "ceftri"], icon: "💀", reward: 50 },
      { name: "C. difficile", type: "anaerob", hp: 70, maxHp: 70, speed: 1, lane: 1, resistances: ["ceftri", "mero"], icon: "🟤", reward: 45 },
      { name: "MRSA", type: "mrsa", hp: 100, maxHp: 100, speed: 0.6, lane: 1, resistances: ["amox", "ceftri"], icon: "💀", reward: 55 },
    ],
  },
  {
    id: 4, description: "Onda 4: Biofilmes e KPC",
    mechanism: "KPC degrada carbapenêmicos. Polimixina B é último recurso. Biofilmes requerem doses altas.",
    bacteria: [
      { name: "K. pneumoniae KPC", type: "kpc", hp: 120, maxHp: 120, speed: 0.6, lane: 0, resistances: ["amox", "ceftri", "mero"], icon: "☠️", reward: 70 },
      { name: "Acinetobacter MDR", type: "gram-", hp: 100, maxHp: 100, speed: 0.7, lane: 2, resistances: ["amox", "ceftri"], icon: "☠️", reward: 60 },
      { name: "K. pneumoniae KPC", type: "kpc", hp: 130, maxHp: 130, speed: 0.5, lane: 1, resistances: ["amox", "ceftri", "mero"], icon: "☠️", reward: 75 },
      { name: "P. aeruginosa MDR", type: "gram-", hp: 110, maxHp: 110, speed: 0.8, lane: 0, resistances: ["amox"], icon: "☠️", reward: 65 },
      { name: "K. pneumoniae KPC", type: "kpc", hp: 140, maxHp: 140, speed: 0.5, lane: 2, resistances: ["amox", "ceftri", "mero"], icon: "☠️", reward: 80 },
    ],
  },
  {
    id: 5, description: "Onda Final: Superbactérias Pan-resistentes",
    mechanism: "Combinação de mecanismos: ESBL + KPC + biofilme. Exige estratégia combinada e gestão criteriosa.",
    bacteria: [
      { name: "Superbactéria α", type: "kpc", hp: 160, maxHp: 160, speed: 0.5, lane: 0, resistances: ["amox", "ceftri", "mero"], icon: "🧬", reward: 100 },
      { name: "MRSA Biofilme", type: "mrsa", hp: 130, maxHp: 130, speed: 0.6, lane: 1, resistances: ["amox", "ceftri"], icon: "🧬", reward: 80 },
      { name: "C. diff Hipervirulento", type: "anaerob", hp: 100, maxHp: 100, speed: 1, lane: 2, resistances: ["ceftri", "mero", "poli"], icon: "🧬", reward: 70 },
      { name: "Superbactéria β", type: "kpc", hp: 180, maxHp: 180, speed: 0.4, lane: 1, resistances: ["amox", "ceftri", "mero"], icon: "🧬", reward: 120 },
      { name: "A. baumannii XDR", type: "gram-", hp: 150, maxHp: 150, speed: 0.5, lane: 0, resistances: ["amox", "ceftri"], icon: "🧬", reward: 90 },
      { name: "Superbactéria γ", type: "kpc", hp: 200, maxHp: 200, speed: 0.3, lane: 2, resistances: ["amox", "ceftri", "mero"], icon: "🧬", reward: 150 },
    ],
  },
];

const LANES = 3;
const SLOTS_PER_LANE = 5;
const difficultyMultipliers: Record<GameDifficulty, { hpMult: number; speedMult: number; budgetMult: number }> = {
  academic: { hpMult: 0.7, speedMult: 0.7, budgetMult: 1.5 },
  clinical: { hpMult: 1, speedMult: 1, budgetMult: 1 },
  specialist: { hpMult: 1.4, speedMult: 1.3, budgetMult: 0.7 },
};

export default function PandemicFarmaGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"narrative" | "difficulty" | "playing" | "waveIntro" | "result">("narrative");
  const [difficulty, setDifficulty] = useState<GameDifficulty>("clinical");
  const [budget, setBudget] = useState(400);
  const [patientHP, setPatientHP] = useState(100);
  const [currentWave, setCurrentWave] = useState(0);
  const [activeBacteria, setActiveBacteria] = useState<Bacterium[]>([]);
  const [towers, setTowers] = useState<PlacedTower[]>([]);
  const [selectedAntibiotic, setSelectedAntibiotic] = useState<Antibiotic | null>(null);
  const [score, setScore] = useState(0);
  const [totalKills, setTotalKills] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string; reference?: string } | null>(null);
  const [wavesCompleted, setWavesCompleted] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const lastTickRef = useRef(Date.now());
  const towerFireTimersRef = useRef<Record<string, number>>({});

  const mult = difficultyMultipliers[difficulty];

  const startWave = useCallback((waveIndex: number) => {
    const wave = waves[waveIndex];
    if (!wave) return;
    const newBacteria: Bacterium[] = wave.bacteria.map((b, i) => ({
      ...b,
      id: `bact-${waveIndex}-${i}`,
      hp: Math.round(b.maxHp * mult.hpMult),
      maxHp: Math.round(b.maxHp * mult.hpMult),
      speed: b.speed * mult.speedMult,
      position: -(i * 15 + 10),
      isAlive: true,
    }));
    setActiveBacteria(newBacteria);
    setPhase("playing");
  }, [mult]);

  const canTowerHit = (tower: PlacedTower, bacterium: Bacterium): boolean => {
    if (tower.lane !== bacterium.lane) return false;
    const towerPos = tower.slot * 20;
    const dist = Math.abs(bacterium.position - towerPos);
    if (dist > tower.antibiotic.range * 20) return false;
    if (bacterium.resistances.includes(tower.antibiotic.id)) return false;
    const spectrumMatch = tower.antibiotic.spectrum.some(s => s === bacterium.type);
    return spectrumMatch;
  };

  // Game loop
  useEffect(() => {
    if (phase !== "playing" || isPaused) return;

    const tick = () => {
      const now = Date.now();
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;

      setActiveBacteria(prev => {
        let updated = prev.map(b => {
          if (!b.isAlive) return b;
          return { ...b, position: b.position + b.speed * dt * 20 };
        });

        // Tower firing
        setTowers(currentTowers => {
          currentTowers.forEach(tower => {
            const lastFired = towerFireTimersRef.current[tower.id] || 0;
            if (now - lastFired < tower.antibiotic.cooldown) return;

            const target = updated.find(b => b.isAlive && canTowerHit(tower, b));
            if (target) {
              towerFireTimersRef.current[tower.id] = now;
              target.hp -= tower.antibiotic.damage;
              if (target.hp <= 0) {
                target.isAlive = false;
                setScore(s => s + target.reward);
                setBudget(b => b + target.reward);
                setTotalKills(k => k + 1);
              }
            }
          });
          return currentTowers;
        });

        // Check for bacteria reaching patients (position > 100)
        updated.forEach(b => {
          if (b.isAlive && b.position >= 100) {
            b.isAlive = false;
            setPatientHP(hp => Math.max(0, hp - 20));
          }
        });

        return updated;
      });

      gameLoopRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = Date.now();
    gameLoopRef.current = requestAnimationFrame(tick);

    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [phase, isPaused, towers]);

  // Check wave completion
  useEffect(() => {
    if (phase !== "playing") return;

    if (patientHP <= 0) {
      setPhase("result");
      return;
    }

    const allDead = activeBacteria.length > 0 && activeBacteria.every(b => !b.isAlive);
    if (allDead) {
      setWavesCompleted(w => w + 1);
      const nextWave = currentWave + 1;
      if (nextWave >= waves.length) {
        setPhase("result");
      } else {
        setFeedback({
          isCorrect: true,
          title: `Onda ${currentWave + 1} eliminada!`,
          explanation: waves[currentWave].mechanism,
          reference: "ANVISA — Programa Nacional de Prevenção e Controle de IRAS",
        });
      }
    }
  }, [activeBacteria, phase, patientHP, currentWave]);

  const placeTower = (lane: number, slot: number) => {
    if (!selectedAntibiotic) return;
    if (towers.some(t => t.lane === lane && t.slot === slot)) {
      toast.error("Já há um antibiótico nesta posição!");
      return;
    }
    if (budget < selectedAntibiotic.cost) {
      toast.error("Orçamento insuficiente!");
      return;
    }

    const newTower: PlacedTower = {
      id: `tower-${Date.now()}`,
      antibiotic: selectedAntibiotic,
      lane,
      slot,
      lastFired: 0,
      kills: 0,
    };

    setTowers(prev => [...prev, newTower]);
    setBudget(prev => prev - selectedAntibiotic.cost);
    setSelectedAntibiotic(null);
  };

  const removeTower = (towerId: string) => {
    const tower = towers.find(t => t.id === towerId);
    if (tower) {
      setBudget(prev => prev + Math.floor(tower.antibiotic.cost * 0.5));
      setTowers(prev => prev.filter(t => t.id !== towerId));
      delete towerFireTimersRef.current[towerId];
    }
  };

  if (phase === "narrative") {
    return (
      <GameNarrative
        title="Pandemic Farma — Tower Defense"
        setting="Hospital Central — Comissão de Controle de Infecção Hospitalar"
        briefing="Ondas de bactérias resistentes estão invadindo o hospital. Como farmacêutico da CCIH, posicione antibióticos estrategicamente para proteger os pacientes. Cada antibiótico tem espectro, custo e efeitos adversos — escolha com sabedoria."
        patientName="Hospital Central"
        patientAge="300 leitos, 12 UTIs"
        patientHistory="Taxa de IRAS em alta. Isolados recentes de MRSA e KPC. Orçamento da CCIH limitado. Você é a última linha de defesa."
        onStart={() => setPhase("difficulty")}
        icon={<Shield className="h-10 w-10 text-primary" />}
      />
    );
  }

  if (phase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h2 className="text-xl font-bold text-foreground">Selecione a dificuldade</h2>
        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />
        <Button size="lg" onClick={() => { setBudget(Math.round(400 * mult.budgetMult)); setPhase("waveIntro"); }}>
          Iniciar Defesa
        </Button>
      </div>
    );
  }

  if (phase === "result") {
    const maxScore = waves.reduce((sum, w) => sum + w.bacteria.reduce((s, b) => s + b.reward, 0), 0);
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        title={patientHP > 0 ? "Hospital Salvo!" : "Infecção Descontrolada"}
        subtitle={patientHP > 0 ? "Você protegeu os pacientes com sucesso!" : "As bactérias venceram. Revise sua estratégia antimicrobiana."}
        onRestart={() => {
          setPhase("narrative");
          setScore(0);
          setTotalKills(0);
          setPatientHP(100);
          setCurrentWave(0);
          setTowers([]);
          setBudget(400);
          setWavesCompleted(0);
          setActiveBacteria([]);
          towerFireTimersRef.current = {};
        }}
        details={[
          { label: "Ondas completadas", value: `${wavesCompleted}/${waves.length}` },
          { label: "Bactérias eliminadas", value: String(totalKills) },
          { label: "Saúde do hospital", value: `${patientHP}%` },
          { label: "Orçamento final", value: `$${budget}` },
        ]}
      />
    );
  }

  if (phase === "waveIntro") {
    const wave = waves[currentWave];
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 animate-fade-in">
        <div className="rounded-full bg-destructive/10 p-6">
          <Bug className="h-12 w-12 text-destructive" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">{wave.description}</h2>
        <p className="text-muted-foreground max-w-md text-center">{wave.mechanism}</p>
        <div className="flex gap-2 flex-wrap justify-center">
          {wave.bacteria.map((b, i) => (
            <Badge key={i} variant="outline" className="gap-1">
              {b.icon} {b.name}
              {b.resistances.length > 0 && <span className="text-destructive ml-1">R</span>}
            </Badge>
          ))}
        </div>
        <Button size="lg" onClick={() => startWave(currentWave)} className="gap-2">
          <Shield className="h-4 w-4" /> Defender!
        </Button>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="space-y-4">
      {feedback && (
        <GameFeedbackOverlay
          isCorrect={feedback.isCorrect}
          title={feedback.title}
          explanation={feedback.explanation}
          reference={feedback.reference}
          onContinue={() => {
            setFeedback(null);
            setCurrentWave(prev => prev + 1);
            setPhase("waveIntro");
          }}
        />
      )}

      {/* Status bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Heart className="h-4 w-4 text-red-500" />
          <Progress value={patientHP} className="w-24 h-2" />
          <span className="text-xs font-medium">{patientHP}%</span>
        </div>
        <Badge variant="outline" className="gap-1"><Coins className="h-3 w-3" /> ${budget}</Badge>
        <Badge variant="outline" className="gap-1"><Target className="h-3 w-3" /> Kills: {totalKills}</Badge>
        <Badge variant="outline" className="gap-1">Onda {currentWave + 1}/{waves.length}</Badge>
        <Badge variant="secondary" className="gap-1"><Zap className="h-3 w-3" /> {score} pts</Badge>
        <Button variant="ghost" size="sm" onClick={() => setIsPaused(!isPaused)} className="ml-auto text-xs">
          {isPaused ? "▶ Retomar" : "⏸ Pausar"}
        </Button>
      </div>

      {/* Antibiotic selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {antibiotics.map(ab => {
          const canAfford = budget >= ab.cost;
          const isSelected = selectedAntibiotic?.id === ab.id;
          return (
            <button
              key={ab.id}
              onClick={() => canAfford && setSelectedAntibiotic(isSelected ? null : ab)}
              disabled={!canAfford}
              className={`flex-shrink-0 rounded-lg border-2 p-2 text-left transition-all w-28 ${
                isSelected ? "border-primary bg-primary/10" : canAfford ? "border-border hover:border-primary/50" : "border-border opacity-50"
              }`}
            >
              <div className={`w-6 h-6 rounded ${ab.color} mb-1`} />
              <p className="text-xs font-bold truncate">{ab.shortName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{ab.spectrum.join(", ")}</p>
              <p className="text-xs font-medium text-primary">${ab.cost}</p>
            </button>
          );
        })}
      </div>

      {selectedAntibiotic && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 text-sm">
            <p className="font-semibold">{selectedAntibiotic.name}</p>
            <p className="text-muted-foreground text-xs">{selectedAntibiotic.description}</p>
            <p className="text-xs text-destructive mt-1">⚠️ Efeito adverso: {selectedAntibiotic.sideEffect}</p>
            <p className="text-xs text-muted-foreground mt-1">Clique numa posição no mapa para posicionar.</p>
          </CardContent>
        </Card>
      )}

      {/* Game grid (3 lanes x 5 slots) + bacteria visualization */}
      <div className="rounded-xl border-2 border-border bg-muted/20 p-4 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">← BACTÉRIAS</span>
          <span className="text-xs font-medium text-muted-foreground">PACIENTES →</span>
        </div>

        {Array.from({ length: LANES }).map((_, lane) => {
          const laneBacteria = activeBacteria.filter(b => b.lane === lane && b.isAlive);
          const laneTowers = towers.filter(t => t.lane === lane);

          return (
            <div key={lane} className="flex items-center gap-1 h-14 relative rounded-lg bg-background/50 border border-border overflow-hidden">
              {/* Tower slots */}
              {Array.from({ length: SLOTS_PER_LANE }).map((_, slot) => {
                const tower = laneTowers.find(t => t.slot === slot);
                return (
                  <div
                    key={slot}
                    className={`w-[20%] h-full border-r border-border/30 flex items-center justify-center cursor-pointer transition-colors ${
                      selectedAntibiotic && !tower ? "hover:bg-primary/10 bg-primary/5" : ""
                    }`}
                    onClick={() => {
                      if (tower) {
                        removeTower(tower.id);
                      } else {
                        placeTower(lane, slot);
                      }
                    }}
                    title={tower ? `${tower.antibiotic.name} — clique para vender (50% reembolso)` : "Posicionar torre"}
                  >
                    {tower ? (
                      <div className={`w-8 h-8 rounded-full ${tower.antibiotic.color} flex items-center justify-center text-white text-[10px] font-bold shadow-lg animate-pulse`}>
                        {tower.antibiotic.shortName.slice(0, 2)}
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded border border-dashed border-muted-foreground/30" />
                    )}
                  </div>
                );
              })}

              {/* Bacteria moving across */}
              {laneBacteria.map(b => (
                <div
                  key={b.id}
                  className="absolute transition-all duration-200 flex flex-col items-center"
                  style={{ left: `${Math.min(Math.max(b.position, 0), 95)}%`, top: "50%", transform: "translate(-50%, -50%)" }}
                >
                  <span className="text-lg">{b.icon}</span>
                  <div className="w-8 h-1 rounded-full bg-muted mt-0.5 overflow-hidden">
                    <div className="h-full bg-destructive rounded-full transition-all" style={{ width: `${(b.hp / b.maxHp) * 100}%` }} />
                  </div>
                </div>
              ))}

              {/* Patient icon at the end */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 text-sm">🏥</div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap text-xs text-muted-foreground">
        <span>🦠 Gram+</span>
        <span>🔴 Gram-</span>
        <span>💀 MRSA</span>
        <span>☠️ KPC/MDR</span>
        <span>🟤 Anaeróbios</span>
        <span>🧬 Superbactérias</span>
      </div>
    </div>
  );
}
