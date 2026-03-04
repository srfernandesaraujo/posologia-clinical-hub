import { useState, useMemo } from "react";
import { Link, Trophy, RotateCcw, Zap, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

interface Tile {
  id: number;
  left: string;
  right: string;
  isWild?: boolean;
  isTrap?: boolean;
  explanation?: string;
  reference?: string;
}

interface CascadeScenario {
  name: string;
  icon: string;
  tiles: Tile[];
  diseases: string[];
  drugs: string[];
  narrative: { setting: string; patientName: string; patientAge: string; patientHistory: string; briefing: string };
}

const cascadeScenarios: CascadeScenario[] = [
  {
    name: "Cascata Cardiovascular",
    icon: "❤️",
    diseases: ["Hipertensão", "Edema Periférico", "Hipocaliemia", "Irritação Gástrica", "Taquicardia Reflexa", "Disfunção Erétil", "Tosse Seca", "Bradicardia"],
    drugs: ["Amlodipina", "Furosemida", "Suplemento K+", "Omeprazol", "Atenolol", "Sildenafil", "Enalapril", "Losartana", "Hidroclorotiazida"],
    tiles: [
      { id: 1, left: "Hipertensão", right: "Amlodipina", explanation: "BCC diidropiridínico. Causa vasodilatação arteriolar. Edema maleolar é dose-dependente e NÃO responde a diuréticos.", reference: "Brunton LL. Goodman & Gilman 14ª ed." },
      { id: 2, left: "Amlodipina", right: "Edema Periférico", explanation: "Edema por vasodilatação pré-capilar. Diferente do edema cardíaco, é bilateral, vespertino e indolor.", reference: "Rang & Dale, Farmacologia 9ª ed." },
      { id: 3, left: "Edema Periférico", right: "Furosemida", explanation: "Diurético de alça. Inibe cotransportador Na+/K+/2Cl- na alça de Henle. Potente natriurese mas causa hipocaliemia.", reference: "Katzung, Farmacologia Básica e Clínica" },
      { id: 4, left: "Furosemida", right: "Hipocaliemia", explanation: "A perda de K+ pela alça de Henle pode causar arritmias, fraqueza muscular e íleo paralítico.", reference: "UpToDate: Hypokalemia 2024" },
      { id: 5, left: "Hipocaliemia", right: "Suplemento K+", explanation: "Reposição oral preferível. KCl xarope causa náusea/vômitos. Monitorar potássio sérico a cada 48h.", reference: "Brunton LL. Goodman & Gilman 14ª ed." },
      { id: 6, left: "Suplemento K+", right: "Irritação Gástrica", explanation: "KCl concentrado é cáustico para mucosa gástrica. Diluir em água e tomar com alimentos.", reference: "Micromedex DrugDex" },
      { id: 7, left: "Irritação Gástrica", right: "Omeprazol", explanation: "IBP que inibe a H+/K+-ATPase. Uso crônico associado a hipomagnesemia, fraturas e deficiência de B12.", reference: "Rang & Dale, 9ª ed." },
      { id: 8, left: "Hipertensão", right: "Enalapril", isWild: true, explanation: "IECA. Inibe conversão de Ang I em Ang II. Tosse seca em 5-20% por acúmulo de bradicinina.", reference: "ANVISA - Bula profissional" },
      { id: 9, left: "Enalapril", right: "Tosse Seca", isTrap: true, explanation: "⚠️ Cascata prescritiva! Trocar por BRA (Losartana) ao invés de adicionar antitussígeno.", reference: "Ministério da Saúde - PCDT Hipertensão" },
    ],
    narrative: {
      setting: "UBS Central — Consultório de Clínica Médica",
      patientName: "Dona Marlene",
      patientAge: "68 anos, sedentária, IMC 31",
      patientHistory: "Hipertensa há 20 anos. Iniciou amlodipina 10mg e agora apresenta edema maleolar bilateral. Seu médico anterior foi adicionando fármacos sem revisar a cascata.",
      briefing: "Conecte os dominós clínicos para revelar a cascata prescritiva. Cuidado com peças-armadilha que representam prescrições potencialmente inapropriadas!",
    },
  },
  {
    name: "Cascata Endócrina",
    icon: "🧬",
    diseases: ["Diabetes Tipo 2", "Hipoglicemia", "Ganho de Peso", "Edema", "Náusea", "Deficiência B12", "Acidose Lática", "Cetoacidose"],
    drugs: ["Metformina", "Glibenclamida", "Insulina NPH", "Semaglutida", "Pioglitazona", "Dapagliflozina", "Empagliflozina", "Sitagliptina"],
    tiles: [
      { id: 1, left: "Diabetes Tipo 2", right: "Metformina", explanation: "1ª linha universal. Reduz produção hepática de glicose. NÃO causa hipoglicemia em monoterapia. Contraindicada se TFG <30.", reference: "ADA Standards of Care 2024" },
      { id: 2, left: "Metformina", right: "Deficiência B12", explanation: "Uso crônico (>4 anos) reduz absorção ileal de B12. Monitorar níveis anualmente. Suplementar se <300 pg/mL.", reference: "de Jager J et al. BMJ 2010" },
      { id: 3, left: "Diabetes Tipo 2", right: "Glibenclamida", explanation: "Sulfonilureia de 2ª geração. Estimula secreção de insulina. Alto risco de hipoglicemia, especialmente em idosos e DRC.", reference: "SBD Guidelines 2024" },
      { id: 4, left: "Glibenclamida", right: "Hipoglicemia", explanation: "Hipoglicemia pode ser grave e prolongada. Metabólitos ativos acumulam-se na DRC. Preferir gliclazida.", reference: "Katzung, Farmacologia Básica e Clínica" },
      { id: 5, left: "Hipoglicemia", right: "Ganho de Peso", explanation: "Hipoglicemia repetida → snacking compensatório → ganho ponderal → piora da resistência insulínica. Ciclo vicioso.", reference: "Cryer PE. NEJM 2008" },
      { id: 6, left: "Diabetes Tipo 2", right: "Semaglutida", explanation: "Agonista GLP-1. Reduz peso, HbA1c e risco CV. Náusea é o efeito adverso mais comum nas primeiras semanas.", reference: "Marso SP et al. NEJM 2016 (SUSTAIN-6)" },
      { id: 7, left: "Semaglutida", right: "Náusea", explanation: "Titulação lenta reduz náusea. Iniciar 0.25mg/sem por 4 semanas. Orientar alimentação fracionada.", reference: "Bula Ozempic - Novo Nordisk" },
      { id: 8, left: "Diabetes Tipo 2", right: "Dapagliflozina", isWild: true, explanation: "Inibidor SGLT2. Benefício cardiorrenal independente de HbA1c. Risco de cetoacidose euglicêmica.", reference: "McMurray JJV et al. NEJM 2019 (DAPA-HF)" },
      { id: 9, left: "Dapagliflozina", right: "Cetoacidose", isTrap: true, explanation: "⚠️ Cetoacidose euglicêmica: suspender em jejum prolongado, cirurgias ou doenças agudas.", reference: "FDA Drug Safety Communication 2020" },
    ],
    narrative: {
      setting: "Ambulatório de Endocrinologia — Hospital Universitário",
      patientName: "Sr. Waldemar",
      patientAge: "62 anos, IMC 34, TFG 55 mL/min",
      patientHistory: "DM2 há 12 anos. HbA1c 8.9%. Em uso de metformina 2g/dia + glibenclamida 15mg/dia. Relatando episódios frequentes de hipoglicemia noturna.",
      briefing: "Mapeie a cascata de efeitos adversos dos antidiabéticos. Identifique as peças-armadilha que representam prescrições de risco!",
    },
  },
  {
    name: "Cascata Psiquiátrica",
    icon: "🧠",
    diseases: ["Depressão", "Insônia", "Ganho de Peso", "Disfunção Sexual", "Síndrome Serotoninérgica", "Xerostomia", "Constipação", "Acatisia"],
    drugs: ["Fluoxetina", "Amitriptilina", "Zolpidem", "Sertralina", "Mirtazapina", "Bupropiona", "Venlafaxina", "Quetiapina"],
    tiles: [
      { id: 1, left: "Depressão", right: "Fluoxetina", explanation: "ISRS de meia-vida longa (4-6 dias). Potente inibidor CYP2D6. Demora 2-4 semanas para efeito pleno.", reference: "Stahl SM. Psicofarmacologia 5ª ed." },
      { id: 2, left: "Fluoxetina", right: "Insônia", explanation: "ISRS pode causar insônia por ativação serotoninérgica. Tomar pela manhã. NÃO adicionar benzodiazepínico cronicamente.", reference: "Rang & Dale, 9ª ed." },
      { id: 3, left: "Insônia", right: "Zolpidem", explanation: "Hipnótico não-BZD. Agonista seletivo GABA-A (subunidade α1). Uso máximo 4 semanas. Risco de comportamentos complexos do sono.", reference: "NICE Guidelines CG191" },
      { id: 4, left: "Depressão", right: "Amitriptilina", explanation: "Tricíclico. Inibe recaptação de 5-HT e NE. Anticolinérgico potente. Evitar em idosos (Critérios de Beers).", reference: "AGS Beers Criteria 2023" },
      { id: 5, left: "Amitriptilina", right: "Xerostomia", explanation: "Efeito anticolinérgico muscarínico. Pode causar cáries, candidíase oral. Orientar saliva artificial.", reference: "Micromedex DrugDex" },
      { id: 6, left: "Amitriptilina", right: "Constipação", explanation: "Bloqueio muscarínico reduz motilidade GI. Orientar fibras, hidratação. Evitar laxantes estimulantes cronicamente.", reference: "Stahl SM. Psicofarmacologia 5ª ed." },
      { id: 7, left: "Depressão", right: "Mirtazapina", explanation: "Antidepressivo NaSSA. Bloqueia α2 pré-sinápticos, 5-HT2/3 e H1. Efeito sedativo e orexígeno.", reference: "Stahl SM. Psicofarmacologia 5ª ed." },
      { id: 8, left: "Mirtazapina", right: "Ganho de Peso", explanation: "Bloqueio H1 causa aumento de apetite. Ganho médio 2-4 kg. Pode ser vantajoso em idosos desnutridos.", reference: "Watanabe N et al. Cochrane 2011" },
      { id: 9, left: "Fluoxetina", right: "Síndrome Serotoninérgica", isTrap: true, explanation: "⚠️ Risco se associado a tramadol, IMAO ou triptanos. Tríade: agitação, clonus, hipertermia. Emergência!", reference: "Boyer EW, Shannon M. NEJM 2005" },
    ],
    narrative: {
      setting: "CAPS II — Centro de Atenção Psicossocial",
      patientName: "Juliana Souza",
      patientAge: "34 anos, professora",
      patientHistory: "Depressão moderada há 8 meses. Insônia terminal. IMC 22. Sem comorbidades. Em uso de fluoxetina 20mg/dia há 2 semanas, mas reclamando de piora da insônia.",
      briefing: "Conecte os dominós para revelar as cascatas prescritivas em psiquiatria. Atenção às interações potencialmente fatais!",
    },
  },
];

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function TileCard({ tile, onClick, hover, getColor }: { tile: Tile; onClick?: () => void; hover?: boolean; getColor: (term: string) => string }) {
  return (
    <button onClick={onClick} className={`inline-flex shrink-0 w-52 h-28 rounded-xl shadow-md border transition-all duration-200 relative overflow-hidden ${
      tile.isTrap ? "border-destructive/50 bg-destructive/5" : tile.isWild ? "border-primary/50 bg-primary/5" : "border-border bg-card"
    } ${hover ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer" : ""}`}>
      {tile.isTrap && <div className="absolute top-1 right-1"><AlertTriangle className="h-3.5 w-3.5 text-destructive" /></div>}
      {tile.isWild && <div className="absolute top-1 right-1"><Zap className="h-3.5 w-3.5 text-primary" /></div>}
      <span className={`flex-1 flex items-center justify-center text-xs font-semibold px-3 text-center leading-tight border-r border-border ${getColor(tile.left)}`}>{tile.left}</span>
      <span className={`flex-1 flex items-center justify-center text-xs font-semibold px-3 text-center leading-tight ${getColor(tile.right)}`}>{tile.right}</span>
    </button>
  );
}

export default function DominoClinicoGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"select" | "narrative" | "playing" | "result">("select");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [feedback, setFeedback] = useState<Tile | null>(null);
  const [score, setScore] = useState(0);
  const [errors, setErrors] = useState(0);

  const scenario = cascadeScenarios[scenarioIdx];

  const [boardTiles, setBoardTiles] = useState<Tile[]>([scenario.tiles[0]]);
  const [handTiles, setHandTiles] = useState<Tile[]>(() => shuffle(scenario.tiles.slice(1)));
  const [shakeId, setShakeId] = useState<number | null>(null);

  const diseases = new Set(scenario.diseases);
  const drugs = new Set(scenario.drugs);

  const getColor = (term: string) => {
    if (diseases.has(term)) return "text-destructive";
    if (drugs.has(term)) return "text-primary";
    return "text-accent-foreground";
  };

  const leftOpen = boardTiles[0].left;
  const rightOpen = boardTiles[boardTiles.length - 1].right;

  const startGame = () => {
    setBoardTiles([scenario.tiles[0]]);
    setHandTiles(shuffle(scenario.tiles.slice(1)));
    setScore(0);
    setErrors(0);
    setPhase("playing");
  };

  const restart = () => startGame();

  const playTile = (tile: Tile) => {
    let placed = false;
    if (tile.left === rightOpen) { setBoardTiles(b => [...b, tile]); placed = true; }
    else if (tile.right === rightOpen) { setBoardTiles(b => [...b, { ...tile, left: tile.right, right: tile.left }]); placed = true; }
    else if (tile.right === leftOpen) { setBoardTiles(b => [tile, ...b]); placed = true; }
    else if (tile.left === leftOpen) { setBoardTiles(b => [{ ...tile, left: tile.right, right: tile.left }, ...b]); placed = true; }

    if (placed) {
      setHandTiles(h => h.filter(t => t.id !== tile.id));
      setScore(s => s + (tile.isTrap ? 5 : tile.isWild ? 15 : 10));
      // Show feedback
      if (tile.explanation) {
        setFeedback(tile);
      } else if (handTiles.length <= 1) {
        setPhase("result");
      }
    } else {
      toast.error("Conexão clínica inválida!");
      setShakeId(tile.id);
      setErrors(e => e + 1);
      setTimeout(() => setShakeId(null), 500);
    }
  };

  const handleFeedbackContinue = () => {
    setFeedback(null);
    if (handTiles.filter(t => t.id !== feedback?.id).length === 0) {
      setPhase("result");
    }
  };

  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">Dominó Clínico: Cascatas Prescritivas</h2>
        <p className="text-center text-muted-foreground text-sm">Selecione a cascata e a dificuldade</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {cascadeScenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => setScenarioIdx(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                scenarioIdx === i ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <p className="font-semibold text-foreground mt-2">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.tiles.length} peças</p>
            </button>
          ))}
        </div>

        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setPhase("narrative")} className="gap-2">Continuar</Button>
        </div>
      </div>
    );
  }

  if (phase === "narrative") {
    return (
      <GameNarrative
        title={`Dominó Clínico: ${scenario.name}`}
        setting={scenario.narrative.setting}
        patientName={scenario.narrative.patientName}
        patientAge={scenario.narrative.patientAge}
        patientHistory={scenario.narrative.patientHistory}
        briefing={scenario.narrative.briefing}
        difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        icon={<Link className="h-10 w-10 text-primary" />}
        onStart={startGame}
      />
    );
  }

  if (phase === "result") {
    const maxScore = scenario.tiles.length * 10;
    return (
      <GameStarsResult
        score={score}
        maxScore={maxScore}
        errors={errors}
        title="Cascata Mapeada!"
        subtitle="A cadeia de efeitos adversos foi completamente documentada."
        onRestart={restart}
        onBack={() => setPhase("select")}
        details={[
          { label: "Cascata", value: scenario.name },
          { label: "Peças conectadas", value: `${boardTiles.length}` },
          { label: "Armadilhas identificadas", value: `${boardTiles.filter(t => t.isTrap).length}` },
        ]}
      />
    );
  }

  // Playing
  return (
    <div className="space-y-5">
      {feedback && (
        <GameFeedbackOverlay
          isCorrect={!feedback.isTrap}
          title={feedback.isTrap ? `⚠️ Armadilha: ${feedback.left} → ${feedback.right}` : `${feedback.left} → ${feedback.right}`}
          explanation={feedback.explanation || ""}
          reference={feedback.reference}
          tip={feedback.isTrap ? "Identifique cascatas prescritivas inapropriadas na prática clínica." : undefined}
          onContinue={handleFeedbackContinue}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span>{scenario.icon}</span>
          <h3 className="font-bold text-foreground">{scenario.name}</h3>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary">Pontos: {score}</Badge>
          <Badge variant="outline">Restantes: {handTiles.length}</Badge>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground justify-center">
        <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-primary" /> Curinga</span>
        <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-destructive" /> Armadilha</span>
      </div>

      {/* Board */}
      <div className="min-h-32 border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 flex items-center overflow-x-auto gap-1">
        {boardTiles.map((tile) => <TileCard key={tile.id} tile={tile} getColor={getColor} />)}
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground justify-center">
        <span>⬅ <strong className={getColor(leftOpen)}>{leftOpen}</strong></span>
        <span><strong className={getColor(rightOpen)}>{rightOpen}</strong> ➡</span>
      </div>

      {/* Hand */}
      <div>
        <h3 className="font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wide">Sua Mão</h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {handTiles.map((tile) => (
            <div key={tile.id} className={shakeId === tile.id ? "animate-[shake_0.3s_ease-in-out]" : ""}>
              <TileCard tile={tile} onClick={() => playTile(tile)} hover getColor={getColor} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center gap-2">
        <Button onClick={() => setPhase("select")} variant="ghost" size="sm">Voltar</Button>
        <Button onClick={restart} variant="outline" size="sm" className="gap-1.5"><RotateCcw className="h-3.5 w-3.5" /> Reiniciar</Button>
      </div>

      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`}</style>
    </div>
  );
}
