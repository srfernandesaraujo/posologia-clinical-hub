import { useState, useCallback, useEffect, useRef } from "react";
import { Crosshair, RotateCcw, Timer, Pause, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { type GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

type CellValue = null | 0 | 1;

interface BoardScenario {
  name: string;
  icon: string;
  board: CellValue[][];
  drugLabels: string[];
  clinicalFacts: { term: string; explanation: string; reference: string }[];
  narrative: { setting: string; patientName: string; patientAge: string; patientHistory: string; briefing: string };
}

const scenarios: BoardScenario[] = [
  {
    name: "Câncer de Mama",
    icon: "🎀",
    board: [
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
    ],
    drugLabels: ["Tamoxifeno", "Anastrozol", "Trastuzumab", "Doxorrubicina", "Ciclofosfamida", "Paclitaxel", "Capecitabina",
      "Pertuzumab", "Letrozol", "Fulvestranto", "Eribulina", "Gemcitabina", "Carboplatina", "Ado-trastuzumabe", "Abemaciclibe",
      "Palbociclibe", "Ribociclibe", "Talazoparibe", "Olaparibe", "Sacituzumabe", "Tucatinibe", "Neratinibe", "Vinorelbina",
      "Metotrexato", "5-Fluorouracil", "Bevacizumab", "Atezolizumab", "Pembrolizumab", "Exemestano", "Goserelina", "Ixabepilona", "Everolimo"],
    clinicalFacts: [
      { term: "Tamoxifeno", explanation: "Modulador seletivo do receptor de estrogênio (SERM). Bloqueia o receptor ERα no tecido mamário. Principal adjuvância em pré-menopausa com RE+.", reference: "NCCN Breast Cancer Guidelines 2024" },
      { term: "Trastuzumab", explanation: "Anticorpo monoclonal anti-HER2. Revolucionou o prognóstico de tumores HER2+. Cardiotoxicidade é o principal efeito adverso a monitorar.", reference: "Slamon DJ et al. NEJM 2001" },
      { term: "Doxorrubicina", explanation: "Antraciclina que inibe a topoisomerase II. Dose cumulativa limitada a 450-550 mg/m² pelo risco de cardiomiopatia irreversível.", reference: "Goodman & Gilman, 14ª ed." },
      { term: "Paclitaxel", explanation: "Taxano que estabiliza microtúbulos. Causa neuropatia periférica dose-dependente. Pré-medicação com corticoide obrigatória.", reference: "Rang & Dale, 9ª ed." },
      { term: "Palbociclibe", explanation: "Inibidor de CDK4/6. Associado a letrozol em 1ª linha metastática RE+/HER2-. Principal toxicidade: neutropenia.", reference: "Finn RS et al. NEJM 2016" },
    ],
    narrative: {
      setting: "Hospital Oncológico — Ambulatório de Quimioterapia",
      patientName: "Maria Helena",
      patientAge: "52 anos, pós-menopausa",
      patientHistory: "Diagnosticada com carcinoma ductal invasivo de mama, RE+, HER2-. Após mastectomia parcial, inicia terapia adjuvante. Hipertensa controlada com losartana.",
      briefing: "Cada célula tumoral contém um quimioterápico ou alvo terapêutico. Elimine as células saltando sobre elas (como no Resta 1) até restar apenas uma — a célula estaminal saudável. Ao eliminar cada célula, você aprenderá sobre o fármaco correspondente.",
    },
  },
  {
    name: "Câncer de Pulmão",
    icon: "🫁",
    board: [
      [null, null, 1, 1, 1, null, null],
      [null, 1, 1, 1, 1, 1, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [null, 1, 1, 1, 1, 1, null],
      [null, null, 1, 1, 1, null, null],
    ],
    drugLabels: ["Cisplatina", "Carboplatina", "Pembrolizumab", "Nivolumab", "Atezolizumab", "Durvalumab", "Osimertinib",
      "Erlotinib", "Gefitinib", "Crizotinib", "Alectinib", "Lorlatinib", "Sotorasib", "Adagrasib", "Docetaxel",
      "Pemetrexed", "Gemcitabina", "Vinorelbina", "Etoposídeo", "Bevacizumab", "Ramucirumab", "Dabrafenib",
      "Trametinib", "Tepotinib", "Capmatinib", "Entrectinib", "Larotrectinib", "Selpercatinib", "Pralsetinib",
      "Mobocertinib", "Amivantamab", "Trastuzumab-Deruxtecan"],
    clinicalFacts: [
      { term: "Cisplatina", explanation: "Agente alquilante à base de platina. Liga-se ao DNA formando adutos. Altamente emetogênico. Nefrotoxicidade prevenida com hiper-hidratação.", reference: "Goodman & Gilman, 14ª ed." },
      { term: "Pembrolizumab", explanation: "Anti-PD-1. Em 1ª linha com PD-L1 ≥50% em monoterapia. Efeitos imunomediados: tiroidite, pneumonite, hepatite, colite.", reference: "Reck M et al. NEJM 2016 (KEYNOTE-024)" },
      { term: "Osimertinib", explanation: "Inibidor de tirosina-quinase EGFR de 3ª geração. Ativo contra mutação T790M. Penetra barreira hematoencefálica.", reference: "Soria JC et al. NEJM 2018 (FLAURA)" },
      { term: "Alectinib", explanation: "Inibidor de ALK de 2ª geração. Superior ao crizotinib em 1ª linha. Boa penetração no SNC.", reference: "Peters S et al. NEJM 2017 (ALEX)" },
      { term: "Pemetrexed", explanation: "Antifolato multialvo. Usado em não-escamoso. Suplementação obrigatória com ácido fólico e vitamina B12.", reference: "Hanna N et al. JCO 2004" },
    ],
    narrative: {
      setting: "Centro de Oncologia Torácica — Sala de Planejamento",
      patientName: "José Carlos",
      patientAge: "67 anos, ex-tabagista 40 maços/ano",
      patientHistory: "Adenocarcinoma pulmonar estágio IIIB, EGFR wild-type, PD-L1 45%, ALK negativo. ECOG 1. DPOC leve controlada com tiotrópio.",
      briefing: "O tabuleiro representa o tumor pulmonar. Cada célula contém um fármaco usado no tratamento do câncer de pulmão. Elimine as células para aprender sobre cada terapia.",
    },
  },
  {
    name: "Câncer Colorretal",
    icon: "🔬",
    board: [
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
      [1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 0, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1],
      [null, null, 1, 1, 1, null, null],
      [null, null, 1, 1, 1, null, null],
    ],
    drugLabels: ["5-Fluorouracil", "Capecitabina", "Oxaliplatina", "Irinotecano", "Bevacizumab", "Cetuximab",
      "Panitumumab", "Regorafenib", "TAS-102", "Aflibercept", "Ramucirumab", "Pembrolizumab", "Nivolumab",
      "Ipilimumab", "Encorafenib", "Binimetinib", "Leucovorina", "Raltitrexed", "Fruquintinib", "Tucatinib",
      "Larotrectinib", "Entrectinib", "Sotorasib", "Sacituzumabe", "Dostarlimab", "Lonsurf", "Mitomicina",
      "Temozolomida", "Dabrafenib", "Trametinib", "Trastuzumab", "Pertuzumab"],
    clinicalFacts: [
      { term: "5-Fluorouracil", explanation: "Antimetabólito pirimidínico. Inibe a timidilato-sintase. Base de quase todos os esquemas colorretais (FOLFOX, FOLFIRI). Modulado pela leucovorina.", reference: "Longley DB et al. Nature Rev Cancer 2003" },
      { term: "Oxaliplatina", explanation: "Derivado de platina de 3ª geração. Componente do FOLFOX. Neuropatia periférica cumulativa é o principal limitante. Exacerbada pelo frio.", reference: "de Gramont A et al. JCO 2000" },
      { term: "Bevacizumab", explanation: "Anti-VEGF. Primeiro antiangiogênico aprovado. Riscos: hipertensão, perfuração GI, sangramento. Não usar peri-operatoriamente.", reference: "Hurwitz H et al. NEJM 2004" },
      { term: "Cetuximab", explanation: "Anti-EGFR. Apenas em RAS wild-type. Rash acneiforme correlaciona-se com resposta. Hipomagnesiemia frequente.", reference: "Cunningham D et al. NEJM 2004" },
      { term: "Pembrolizumab", explanation: "Anti-PD-1. 1ª linha em MSI-H/dMMR metastático. Respostas duradouras. Superou quimioterapia em KEYNOTE-177.", reference: "André T et al. NEJM 2020" },
    ],
    narrative: {
      setting: "Hospital Universitário — Serviço de Gastroenterologia Oncológica",
      patientName: "Antônio Ribeiro",
      patientAge: "58 anos, diabético tipo 2",
      patientHistory: "Adenocarcinoma colorretal estágio IV, metástases hepáticas. RAS wild-type, MSS. CEA elevado. Em uso de metformina e sinvastatina.",
      briefing: "O campo cirúrgico revela as células tumorais do cólon. Cada uma representa um fármaco do arsenal terapêutico colorretal. Elimine-as estrategicamente.",
    },
  },
];

function cloneBoard(b: CellValue[][]) { return b.map((row) => [...row]); }
function countCells(b: CellValue[][]) { let c = 0; for (const row of b) for (const v of row) if (v === 1) c++; return c; }
function hasValidMoves(b: CellValue[][]) {
  const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    if (b[r][c] !== 1) continue;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc, mr = r + dr / 2, mc = c + dc / 2;
      if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && b[nr][nc] === 0 && b[mr][mc] === 1) return true;
    }
  }
  return false;
}

function getCellIndex(board: CellValue[][], r: number, c: number): number {
  let idx = 0;
  for (let ri = 0; ri < 7; ri++) for (let ci = 0; ci < 7; ci++) {
    if (board[ri][ci] === null) continue;
    if (ri === r && ci === c) return idx;
    idx++;
  }
  return 0;
}

export default function ResseccaoOncologicaGame({ customData }: { customData?: any }) {
  const [phase, setPhase] = useState<"select" | "narrative" | "playing" | "feedback" | "result">("select");
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>("academic");
  const [mode, setMode] = useState<"zen" | "timed">("zen");

  const scenario = scenarios[scenarioIdx];
  const initialBoard = scenario.board;

  const [board, setBoard] = useState(() => cloneBoard(initialBoard));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [cellsLeft, setCellsLeft] = useState(() => countCells(initialBoard));
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "game_over">("playing");
  const [eliminatedDrugs, setEliminatedDrugs] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ term: string; fact: typeof scenario.clinicalFacts[0] } | null>(null);
  const [errors, setErrors] = useState(0);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Assign drug labels to cell positions
  const [cellLabels] = useState(() => {
    const labels = [...scenario.drugLabels];
    // Shuffle for variety
    for (let i = labels.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [labels[i], labels[j]] = [labels[j], labels[i]]; }
    return labels;
  });

  useEffect(() => {
    if (phase === "playing" && mode === "timed" && gameStatus === "playing") {
      timerRef.current = window.setInterval(() => setTimer(t => t + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, mode, gameStatus]);

  const startGame = () => {
    const b = cloneBoard(scenario.board);
    setBoard(b);
    setCellsLeft(countCells(scenario.board));
    setSelected(null);
    setGameStatus("playing");
    setEliminatedDrugs([]);
    setErrors(0);
    setTimer(0);
    setPhase("playing");
  };

  const restart = () => {
    startGame();
  };

  const handleClick = (r: number, c: number) => {
    if (gameStatus !== "playing" || feedback) return;
    const val = board[r][c];
    if (val === null) return;
    if (val === 1) {
      if (selected?.r === r && selected?.c === c) { setSelected(null); return; }
      setSelected({ r, c });
      return;
    }
    if (val === 0 && selected) {
      const dr = r - selected.r, dc = c - selected.c;
      if ((Math.abs(dr) === 2 && dc === 0) || (dr === 0 && Math.abs(dc) === 2)) {
        const mr = selected.r + dr / 2, mc = selected.c + dc / 2;
        if (board[mr][mc] === 1) {
          const nb = cloneBoard(board);
          nb[selected.r][selected.c] = 0;
          nb[mr][mc] = 0;
          nb[r][c] = 1;
          const jumpedIdx = getCellIndex(scenario.board, mr, mc);
          const drugName = cellLabels[jumpedIdx] || "Fármaco";
          const newLeft = cellsLeft - 1;
          setBoard(nb);
          setCellsLeft(newLeft);
          setSelected(null);
          setEliminatedDrugs(prev => [...prev, drugName]);

          // Show clinical feedback
          const fact = scenario.clinicalFacts.find(f => f.term === drugName);
          if (fact) {
            setFeedback({ term: drugName, fact });
          } else {
            // Check end
            if (newLeft === 1) { setGameStatus("won"); setPhase("result"); }
            else if (!hasValidMoves(nb)) { setGameStatus("game_over"); setPhase("result"); }
          }
        }
      }
    }
  };

  const handleFeedbackContinue = () => {
    setFeedback(null);
    if (cellsLeft === 1) { setGameStatus("won"); setPhase("result"); }
    else if (!hasValidMoves(board)) { setGameStatus("game_over"); setPhase("result"); }
  };

  // Scenario selection
  if (phase === "select") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-xl font-bold text-foreground text-center">Ressecção Oncológica: Terapia Alvo</h2>
        <p className="text-center text-muted-foreground text-sm">Selecione o tipo de tumor e a dificuldade para iniciar</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {scenarios.map((s, i) => (
            <button
              key={i}
              onClick={() => setScenarioIdx(i)}
              className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                scenarioIdx === i
                  ? "border-primary bg-primary/5 shadow-lg"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <p className="font-semibold text-foreground mt-2">{s.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.drugLabels.length} fármacos</p>
            </button>
          ))}
        </div>

        <GameDifficultySelector selected={difficulty} onChange={setDifficulty} />

        <div className="flex justify-center gap-3">
          <Button variant={mode === "zen" ? "default" : "outline"} size="sm" onClick={() => setMode("zen")} className="gap-1.5">
            <Pause className="h-3.5 w-3.5" /> Modo Zen
          </Button>
          <Button variant={mode === "timed" ? "default" : "outline"} size="sm" onClick={() => setMode("timed")} className="gap-1.5">
            <Timer className="h-3.5 w-3.5" /> Cronometrado
          </Button>
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => setPhase("narrative")} className="gap-2">
            <Play className="h-4 w-4" /> Continuar
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "narrative") {
    return (
      <GameNarrative
        title={`Ressecção Oncológica: ${scenario.name}`}
        setting={scenario.narrative.setting}
        patientName={scenario.narrative.patientName}
        patientAge={scenario.narrative.patientAge}
        patientHistory={scenario.narrative.patientHistory}
        briefing={scenario.narrative.briefing}
        difficulty={difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista"}
        icon={<Crosshair className="h-10 w-10 text-primary" />}
        onStart={startGame}
      />
    );
  }

  if (phase === "result") {
    const won = gameStatus === "won";
    const total = countCells(scenario.board);
    const eliminated = total - cellsLeft;
    return (
      <GameStarsResult
        score={won ? 100 : Math.max(0, 100 - errors * 10)}
        maxScore={100}
        errors={errors}
        timeSeconds={mode === "timed" ? timer : undefined}
        title={won ? "Ressecção Completa!" : "Terapia Interrompida"}
        subtitle={won ? "Todas as células tumorais foram eliminadas com sucesso." : "Ainda restam células tumorais isoladas. Tente uma nova abordagem."}
        onRestart={restart}
        onBack={() => setPhase("select")}
        details={[
          { label: "Cenário", value: scenario.name },
          { label: "Fármacos eliminados", value: `${eliminatedDrugs.length}` },
          { label: "Dificuldade", value: difficulty === "academic" ? "Acadêmico" : difficulty === "clinical" ? "Clínico" : "Especialista" },
        ]}
      />
    );
  }

  // Playing phase
  return (
    <div className="space-y-4">
      {feedback && (
        <GameFeedbackOverlay
          isCorrect={true}
          title={`${feedback.term} eliminado!`}
          explanation={feedback.fact.explanation}
          reference={feedback.fact.reference}
          onContinue={handleFeedbackContinue}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{scenario.icon}</span>
          <h2 className="text-lg font-bold text-foreground">{scenario.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {mode === "timed" && (
            <Badge variant="outline" className="font-mono">
              <Timer className="h-3 w-3 mr-1" />
              {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
            </Badge>
          )}
          <Badge variant={cellsLeft <= 3 ? "default" : "secondary"} className="font-mono">
            Células: {cellsLeft}
          </Badge>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 p-4 rounded-2xl bg-muted/30 backdrop-blur-sm border border-border">
          {board.map((row, r) => row.map((cell, c) => {
            if (cell === null) return <div key={`${r}-${c}`} className="w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12" />;
            const isSel = selected?.r === r && selected?.c === c;
            const isTumor = cell === 1;
            const cellIdx = getCellIndex(scenario.board, r, c);
            const label = cellLabels[cellIdx] || "";
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => handleClick(r, c)}
                className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full transition-all duration-200 focus:outline-none relative group ${
                  isTumor
                    ? isSel
                      ? "bg-destructive shadow-lg ring-2 ring-primary animate-pulse"
                      : "bg-destructive/80 hover:bg-destructive shadow-md hover:shadow-lg cursor-pointer"
                    : "bg-muted border border-border cursor-pointer hover:border-primary/50"
                }`}
                title={isTumor ? label : ""}
              >
                {isTumor && (
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {label.length > 8 ? label.slice(0, 8) + "…" : label}
                  </span>
                )}
              </button>
            );
          }))}
        </div>
      </div>

      {eliminatedDrugs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {eliminatedDrugs.slice(-6).map((d, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              <Zap className="h-2.5 w-2.5 mr-1" />
              {d}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-2">
        <Button onClick={() => setPhase("select")} variant="ghost" size="sm">Voltar</Button>
        <Button onClick={restart} variant="outline" size="sm" className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
        </Button>
      </div>
    </div>
  );
}
