import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Heart, ArrowLeft, ArrowRight, ArrowUp, Star, Trophy, RotateCcw } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Platform { x: number; y: number; w: number; h: number }
interface Collectible { id: string; x: number; y: number; w: number; h: number; type: "good" | "bad" | "question"; name: string; label: string; color: string; points: number; collected: boolean; question?: QuizQuestion }
interface QuizQuestion { question: string; options: string[]; correctIndex: number }
interface Player { x: number; y: number; w: number; h: number; vx: number; vy: number; onGround: boolean; facingRight: boolean }
interface LevelData {
  name: string;
  patient: { name: string; pa: string; comorbidity: string };
  platforms: Platform[];
  collectibles: Collectible[];
  worldWidth: number;
  explanation: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CANVAS_W = 760;
const CANVAS_H = 420;
const GRAVITY = 0.55;
const JUMP_FORCE = -10;
const MOVE_SPEED = 3.5;
const GROUND_Y = 380;
const PLAYER_W = 32;
const PLAYER_H = 40;
const BLOCK_SIZE = 40;

/* ------------------------------------------------------------------ */
/*  Quiz questions                                                     */
/* ------------------------------------------------------------------ */

const quizQuestions: QuizQuestion[] = [
  { question: "Qual é a primeira linha no tratamento da HAS segundo as diretrizes brasileiras?", options: ["Betabloqueador", "IECA ou BRA", "Alfa-bloqueador"], correctIndex: 1 },
  { question: "Por que os IECAs são preferidos em pacientes diabéticos com HAS?", options: ["São mais baratos", "Proteção renal (nefroproteção)", "Não têm efeitos adversos"], correctIndex: 1 },
  { question: "Qual anti-hipertensivo pode causar tosse seca como efeito adverso?", options: ["Losartana (BRA)", "Enalapril (IECA)", "Anlodipino (BCC)"], correctIndex: 1 },
  { question: "Qual combinação é sinérgica e recomendada na HAS estágio 2?", options: ["IECA + BRA", "IECA + Diurético tiazídico", "Betabloqueador + BCC"], correctIndex: 1 },
  { question: "Por que AINEs devem ser evitados em hipertensos?", options: ["Aumentam a PA e reduzem efeito anti-hipertensivo", "Causam hipotensão severa", "São teratogênicos"], correctIndex: 0 },
];

/* ------------------------------------------------------------------ */
/*  Level definitions                                                  */
/* ------------------------------------------------------------------ */

function buildLevels(): LevelData[] {
  return [
    {
      name: "Fase 1: Monoterapia Inicial",
      patient: { name: "Carlos, 52a", pa: "160/95 mmHg", comorbidity: "Nenhuma" },
      worldWidth: 1400,
      explanation: "BRAs como Losartana são primeira linha na HAS, especialmente em pacientes com risco de tosse por IECA.",
      platforms: [
        { x: 0, y: GROUND_Y, w: 1400, h: 40 },
        { x: 180, y: 300, w: 120, h: 20 },
        { x: 400, y: 260, w: 120, h: 20 },
        { x: 620, y: 280, w: 140, h: 20 },
        { x: 900, y: 240, w: 120, h: 20 },
        { x: 1100, y: 300, w: 160, h: 20 },
      ],
      collectibles: [
        { id: "1-1", x: 210, y: 260, w: 36, h: 36, type: "good", name: "Losartana", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "1-2", x: 440, y: 220, w: 36, h: 36, type: "good", name: "Losartana", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "1-3", x: 660, y: 240, w: 36, h: 36, type: "bad", name: "Ibuprofeno (AINE)", label: "AINE", color: "bg-red-500", points: -150, collected: false },
        { id: "1-4", x: 930, y: 200, w: 36, h: 36, type: "question", name: "?", label: "?", color: "bg-yellow-400", points: 0, collected: false, question: quizQuestions[0] },
        { id: "1-5", x: 1140, y: 260, w: 36, h: 36, type: "good", name: "Losartana", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "1-6", x: 800, y: 340, w: 36, h: 36, type: "bad", name: "Sal em excesso", label: "NaCl", color: "bg-gray-300", points: -100, collected: false },
      ],
    },
    {
      name: "Fase 2: Tosse do IECA",
      patient: { name: "Maria, 48a", pa: "155/92 mmHg", comorbidity: "Tosse seca com Enalapril" },
      worldWidth: 1500,
      explanation: "A tosse seca ocorre em 5-20% dos pacientes com IECA. A troca por BRA resolve o problema.",
      platforms: [
        { x: 0, y: GROUND_Y, w: 1500, h: 40 },
        { x: 150, y: 310, w: 100, h: 20 },
        { x: 350, y: 270, w: 130, h: 20 },
        { x: 560, y: 240, w: 100, h: 20 },
        { x: 750, y: 290, w: 140, h: 20 },
        { x: 1000, y: 250, w: 120, h: 20 },
        { x: 1250, y: 300, w: 140, h: 20 },
      ],
      collectibles: [
        { id: "2-1", x: 170, y: 270, w: 36, h: 36, type: "bad", name: "Enalapril (tosse!)", label: "ENA⚠", color: "bg-red-400", points: -150, collected: false },
        { id: "2-2", x: 380, y: 230, w: 36, h: 36, type: "good", name: "Losartana (BRA)", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "2-3", x: 580, y: 200, w: 36, h: 36, type: "question", name: "?", label: "?", color: "bg-yellow-400", points: 0, collected: false, question: quizQuestions[1] },
        { id: "2-4", x: 780, y: 250, w: 36, h: 36, type: "good", name: "Losartana (BRA)", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "2-5", x: 900, y: 340, w: 36, h: 36, type: "bad", name: "Enalapril (tosse!)", label: "ENA⚠", color: "bg-red-400", points: -150, collected: false },
        { id: "2-6", x: 1030, y: 210, w: 36, h: 36, type: "good", name: "Valsartana (BRA)", label: "VAL", color: "bg-blue-400", points: 100, collected: false },
        { id: "2-7", x: 1280, y: 260, w: 36, h: 36, type: "bad", name: "Sal em excesso", label: "NaCl", color: "bg-gray-300", points: -100, collected: false },
      ],
    },
    {
      name: "Fase 3: Crise Hipertensiva",
      patient: { name: "João, 63a", pa: "200/120 mmHg", comorbidity: "Urgência hipertensiva" },
      worldWidth: 1600,
      explanation: "Na crise hipertensiva, a redução deve ser gradual. Quedas abruptas causam hipoperfusão.",
      platforms: [
        { x: 0, y: GROUND_Y, w: 1600, h: 40 },
        { x: 120, y: 320, w: 90, h: 20 },
        { x: 280, y: 270, w: 90, h: 20 },
        { x: 440, y: 230, w: 110, h: 20 },
        { x: 620, y: 280, w: 90, h: 20 },
        { x: 800, y: 240, w: 100, h: 20 },
        { x: 980, y: 290, w: 120, h: 20 },
        { x: 1200, y: 250, w: 100, h: 20 },
        { x: 1400, y: 310, w: 120, h: 20 },
      ],
      collectibles: [
        { id: "3-1", x: 140, y: 280, w: 36, h: 36, type: "good", name: "Anlodipino (BCC)", label: "AML", color: "bg-purple-500", points: 80, collected: false },
        { id: "3-2", x: 300, y: 230, w: 36, h: 36, type: "bad", name: "Hipotensão!", label: "HIPO", color: "bg-orange-500", points: -200, collected: false },
        { id: "3-3", x: 460, y: 190, w: 36, h: 36, type: "good", name: "Enalapril (IECA)", label: "ENA", color: "bg-green-500", points: 100, collected: false },
        { id: "3-4", x: 640, y: 240, w: 36, h: 36, type: "bad", name: "Ibuprofeno (AINE)", label: "AINE", color: "bg-red-500", points: -150, collected: false },
        { id: "3-5", x: 820, y: 200, w: 36, h: 36, type: "question", name: "?", label: "?", color: "bg-yellow-400", points: 0, collected: false, question: quizQuestions[2] },
        { id: "3-6", x: 1010, y: 250, w: 36, h: 36, type: "good", name: "Losartana (BRA)", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "3-7", x: 1220, y: 210, w: 36, h: 36, type: "good", name: "HCTZ (Diurético)", label: "HCTZ", color: "bg-yellow-500", points: 80, collected: false },
        { id: "3-8", x: 1420, y: 270, w: 36, h: 36, type: "bad", name: "Sal em excesso", label: "NaCl", color: "bg-gray-300", points: -100, collected: false },
      ],
    },
    {
      name: "Fase 4: Combinação Terapêutica",
      patient: { name: "Ana, 57a", pa: "170/105 mmHg", comorbidity: "HAS estágio 2" },
      worldWidth: 1500,
      explanation: "A combinação IECA + Diurético tiazídico é sinérgica e recomendada em HAS estágio 2.",
      platforms: [
        { x: 0, y: GROUND_Y, w: 1500, h: 40 },
        { x: 160, y: 300, w: 130, h: 20 },
        { x: 380, y: 250, w: 100, h: 20 },
        { x: 560, y: 300, w: 120, h: 20 },
        { x: 760, y: 240, w: 110, h: 20 },
        { x: 960, y: 280, w: 130, h: 20 },
        { x: 1200, y: 250, w: 140, h: 20 },
      ],
      collectibles: [
        { id: "4-1", x: 190, y: 260, w: 36, h: 36, type: "good", name: "Enalapril (IECA)", label: "ENA", color: "bg-green-500", points: 100, collected: false },
        { id: "4-2", x: 400, y: 210, w: 36, h: 36, type: "good", name: "HCTZ (Diurético)", label: "HCTZ", color: "bg-yellow-500", points: 80, collected: false },
        { id: "4-3", x: 590, y: 260, w: 36, h: 36, type: "bad", name: "Ibuprofeno (AINE)", label: "AINE", color: "bg-red-500", points: -150, collected: false },
        { id: "4-4", x: 790, y: 200, w: 36, h: 36, type: "question", name: "?", label: "?", color: "bg-yellow-400", points: 0, collected: false, question: quizQuestions[3] },
        { id: "4-5", x: 990, y: 240, w: 36, h: 36, type: "good", name: "Anlodipino (BCC)", label: "AML", color: "bg-purple-500", points: 80, collected: false },
        { id: "4-6", x: 1240, y: 210, w: 36, h: 36, type: "good", name: "Losartana (BRA)", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "4-7", x: 700, y: 340, w: 36, h: 36, type: "bad", name: "Hipotensão!", label: "HIPO", color: "bg-orange-500", points: -200, collected: false },
      ],
    },
    {
      name: "Fase 5: Paciente Complexo (DM + HAS)",
      patient: { name: "Roberto, 65a", pa: "175/100 mmHg", comorbidity: "Diabetes Mellitus tipo 2" },
      worldWidth: 1700,
      explanation: "Em diabéticos hipertensos, IECAs/BRAs protegem os rins (nefroprotetores). Betabloqueadores mascaram hipoglicemia.",
      platforms: [
        { x: 0, y: GROUND_Y, w: 1700, h: 40 },
        { x: 140, y: 310, w: 100, h: 20 },
        { x: 320, y: 260, w: 110, h: 20 },
        { x: 520, y: 230, w: 100, h: 20 },
        { x: 700, y: 280, w: 120, h: 20 },
        { x: 900, y: 240, w: 100, h: 20 },
        { x: 1100, y: 290, w: 130, h: 20 },
        { x: 1350, y: 250, w: 110, h: 20 },
        { x: 1550, y: 310, w: 100, h: 20 },
      ],
      collectibles: [
        { id: "5-1", x: 160, y: 270, w: 36, h: 36, type: "good", name: "Enalapril (IECA)", label: "ENA", color: "bg-green-500", points: 100, collected: false },
        { id: "5-2", x: 340, y: 220, w: 36, h: 36, type: "bad", name: "Atenolol (BB⚠)", label: "BB⚠", color: "bg-red-500", points: -150, collected: false },
        { id: "5-3", x: 540, y: 190, w: 36, h: 36, type: "good", name: "Losartana (BRA)", label: "LOS", color: "bg-blue-500", points: 100, collected: false },
        { id: "5-4", x: 730, y: 240, w: 36, h: 36, type: "question", name: "?", label: "?", color: "bg-yellow-400", points: 0, collected: false, question: quizQuestions[4] },
        { id: "5-5", x: 920, y: 200, w: 36, h: 36, type: "good", name: "HCTZ (Diurético)", label: "HCTZ", color: "bg-yellow-500", points: 80, collected: false },
        { id: "5-6", x: 1130, y: 250, w: 36, h: 36, type: "bad", name: "Ibuprofeno (AINE)", label: "AINE", color: "bg-red-500", points: -150, collected: false },
        { id: "5-7", x: 1370, y: 210, w: 36, h: 36, type: "good", name: "Anlodipino (BCC)", label: "AML", color: "bg-purple-500", points: 80, collected: false },
        { id: "5-8", x: 1200, y: 340, w: 36, h: 36, type: "bad", name: "Sal em excesso", label: "NaCl", color: "bg-gray-300", points: -100, collected: false },
        { id: "5-9", x: 1570, y: 270, w: 36, h: 36, type: "bad", name: "Hipotensão!", label: "HIPO", color: "bg-orange-500", points: -200, collected: false },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AlexKiddHipertensaoGame({ customData }: { customData?: any }) {
  const levels = customData?.levels ? customData.levels : buildLevels();

  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [pa, setPa] = useState(180); // pressão arterial sistólica
  const [gameState, setGameState] = useState<"playing" | "quiz" | "levelComplete" | "gameOver" | "victory">("playing");
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion | null>(null);
  const [shieldTimer, setShieldTimer] = useState(0);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [player, setPlayer] = useState<Player>({ x: 60, y: GROUND_Y - PLAYER_H, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, onGround: true, facingRight: true });
  const [cameraX, setCameraX] = useState(0);
  const [starsPerLevel, setStarsPerLevel] = useState<number[]>([]);

  const keysRef = useRef<Record<string, boolean>>({});
  const animRef = useRef<number>(0);
  const playerRef = useRef(player);
  const collectiblesRef = useRef(collectibles);
  const gameStateRef = useRef(gameState);
  const scoreRef = useRef(score);
  const livesRef = useRef(lives);
  const paRef = useRef(pa);
  const shieldRef = useRef(shieldTimer);
  const cameraRef = useRef(cameraX);

  playerRef.current = player;
  collectiblesRef.current = collectibles;
  gameStateRef.current = gameState;
  scoreRef.current = score;
  livesRef.current = lives;
  paRef.current = pa;
  shieldRef.current = shieldTimer;
  cameraRef.current = cameraX;

  const level = levels[currentLevel];

  /* Load level */
  const loadLevel = useCallback((idx: number) => {
    const lv = levels[idx];
    setCollectibles(lv.collectibles.map((c: Collectible) => ({ ...c, collected: false })));
    setPlayer({ x: 60, y: GROUND_Y - PLAYER_H, w: PLAYER_W, h: PLAYER_H, vx: 0, vy: 0, onGround: true, facingRight: true });
    setCameraX(0);
    setGameState("playing");
    setCurrentQuiz(null);
  }, [levels]);

  useEffect(() => { loadLevel(currentLevel); }, [currentLevel, loadLevel]);

  /* Keyboard */
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) {
        e.preventDefault();
        keysRef.current[e.key] = true;
      }
    };
    const onUp = (e: KeyboardEvent) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  /* Rect collision */
  const collides = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  /* Game loop */
  useEffect(() => {
    if (gameState !== "playing") return;

    const tick = () => {
      const p = { ...playerRef.current };
      const keys = keysRef.current;
      const lv = levels[currentLevel];

      // horizontal movement
      if (keys["ArrowLeft"]) { p.vx = -MOVE_SPEED; p.facingRight = false; }
      else if (keys["ArrowRight"]) { p.vx = MOVE_SPEED; p.facingRight = true; }
      else { p.vx = 0; }

      // jump
      if ((keys["ArrowUp"] || keys[" "]) && p.onGround) {
        p.vy = JUMP_FORCE;
        p.onGround = false;
      }

      // gravity
      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;

      // clamp left
      if (p.x < 0) p.x = 0;
      if (p.x > lv.worldWidth - p.w) p.x = lv.worldWidth - p.w;

      // platform collision
      p.onGround = false;
      for (const plat of lv.platforms) {
        if (collides({ x: p.x, y: p.y, w: p.w, h: p.h }, plat)) {
          // landing on top
          if (p.vy > 0 && playerRef.current.y + p.h <= plat.y + p.vy + 4) {
            p.y = plat.y - p.h;
            p.vy = 0;
            p.onGround = true;
          }
          // hitting from below
          else if (p.vy < 0 && playerRef.current.y >= plat.y + plat.h - 2) {
            p.y = plat.y + plat.h;
            p.vy = 0;
          }
        }
      }

      // fall death
      if (p.y > CANVAS_H + 50) {
        const newLives = livesRef.current - 1;
        setLives(newLives);
        if (newLives <= 0) { setGameState("gameOver"); return; }
        p.x = 60; p.y = GROUND_Y - PLAYER_H; p.vy = 0; p.vx = 0; p.onGround = true;
        setCameraX(0);
      }

      // collectible collision
      const cols = [...collectiblesRef.current];
      let scoreChange = 0;
      let paChange = 0;
      let lostLife = false;
      let openQuiz: QuizQuestion | null = null;

      for (let i = 0; i < cols.length; i++) {
        if (cols[i].collected) continue;
        if (!collides(p, cols[i])) continue;

        cols[i] = { ...cols[i], collected: true };

        if (cols[i].type === "question") {
          openQuiz = cols[i].question || null;
        } else if (cols[i].type === "good") {
          scoreChange += cols[i].points;
          paChange -= 8;
        } else {
          // bad item
          if (shieldRef.current > 0) {
            // shield absorbs
          } else {
            scoreChange += cols[i].points;
            paChange += 5;
            if (cols[i].name.includes("Hipotensão")) {
              lostLife = true;
            }
          }
        }
      }

      if (scoreChange !== 0) setScore(prev => Math.max(0, prev + scoreChange));
      if (paChange !== 0) setPa(prev => Math.max(100, Math.min(220, prev + paChange)));
      if (lostLife) {
        const newLives = livesRef.current - 1;
        setLives(newLives);
        if (newLives <= 0) { setGameState("gameOver"); return; }
      }
      setCollectibles(cols);

      if (openQuiz) {
        setCurrentQuiz(openQuiz);
        setGameState("quiz");
        setPlayer(p);
        return;
      }

      // check level complete (reached end)
      if (p.x >= lv.worldWidth - 80) {
        const lvScore = scoreRef.current;
        const stars = lvScore >= 400 ? 3 : lvScore >= 200 ? 2 : 1;
        setStarsPerLevel(prev => { const n = [...prev]; n[currentLevel] = stars; return n; });
        setGameState("levelComplete");
        setPlayer(p);
        return;
      }

      // camera
      let cam = p.x - CANVAS_W / 3;
      if (cam < 0) cam = 0;
      if (cam > lv.worldWidth - CANVAS_W) cam = lv.worldWidth - CANVAS_W;
      setCameraX(cam);

      // shield countdown
      if (shieldRef.current > 0) setShieldTimer(prev => prev - 1);

      setPlayer(p);
      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameState, currentLevel, levels]);

  /* Quiz answer */
  const handleQuizAnswer = (idx: number) => {
    if (!currentQuiz) return;
    if (idx === currentQuiz.correctIndex) {
      setScore(prev => prev + 200);
      setPa(prev => Math.max(100, prev - 10));
      setShieldTimer(300); // ~5 seconds at 60fps
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) { setGameState("gameOver"); return; }
    }
    setCurrentQuiz(null);
    setGameState("playing");
  };

  /* Next level */
  const handleNextLevel = () => {
    if (currentLevel < levels.length - 1) {
      setCurrentLevel(prev => prev + 1);
    } else {
      setGameState("victory");
    }
  };

  /* Restart */
  const handleRestart = () => {
    setCurrentLevel(0);
    setScore(0);
    setLives(3);
    setPa(180);
    setStarsPerLevel([]);
    loadLevel(0);
  };

  /* Touch controls */
  const touchStart = (key: string) => { keysRef.current[key] = true; };
  const touchEnd = (key: string) => { keysRef.current[key] = false; };

  /* PA progress (invert: 180→high, 120→low target) */
  const paProgress = Math.max(0, Math.min(100, ((220 - pa) / 120) * 100));

  return (
    <div className="space-y-3">
      {/* HUD */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Heart key={i} className={`h-5 w-5 ${i < lives ? "fill-red-500 text-red-500" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <Badge variant="secondary" className="text-sm font-bold">{score} pts</Badge>
              <Badge variant="outline" className="text-xs">{level.name}</Badge>
              {shieldTimer > 0 && <Badge className="bg-cyan-500 text-white text-xs animate-pulse">🛡️ Escudo</Badge>}
            </div>
            <div className="flex items-center gap-2 min-w-[180px]">
              <span className="text-xs font-medium whitespace-nowrap">PA: {pa} mmHg</span>
              <Progress value={paProgress} className="h-3 flex-1" />
              <span className="text-xs text-muted-foreground">Meta &lt;140</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            🩺 {level.patient.name} | PA: {level.patient.pa} | {level.patient.comorbidity}
          </div>
        </CardContent>
      </Card>

      {/* Game canvas */}
      <div
        className="relative overflow-hidden rounded-xl border-2 border-border mx-auto select-none"
        style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: "100%", background: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 70%, #228B22 92%, #1a7016 100%)" }}
      >
        {/* Platforms */}
        {level.platforms.map((plat: Platform, i: number) => (
          <div
            key={`p-${i}`}
            className="absolute"
            style={{
              left: plat.x - cameraX,
              top: plat.y,
              width: plat.w,
              height: plat.h,
              background: plat.y >= GROUND_Y ? "#228B22" : "#8B4513",
              border: plat.y >= GROUND_Y ? "none" : "2px solid #654321",
              borderRadius: plat.y >= GROUND_Y ? 0 : 4,
              imageRendering: "pixelated",
            }}
          />
        ))}

        {/* Collectibles */}
        {collectibles.map((c) => {
          if (c.collected) return null;
          return (
            <div
              key={c.id}
              className={`absolute flex items-center justify-center rounded-md text-white text-[10px] font-bold shadow-md ${c.color}`}
              style={{
                left: c.x - cameraX,
                top: c.y,
                width: c.w,
                height: c.h,
                border: c.type === "question" ? "3px solid #b8860b" : c.type === "bad" ? "2px solid #991b1b" : "2px solid #1e40af",
                imageRendering: "pixelated",
                animation: c.type === "question" ? "pulse 1.5s infinite" : undefined,
              }}
            >
              {c.label}
            </div>
          );
        })}

        {/* Player */}
        <div
          className="absolute flex flex-col items-center justify-center rounded-sm"
          style={{
            left: player.x - cameraX,
            top: player.y,
            width: PLAYER_W,
            height: PLAYER_H,
            background: shieldTimer > 0 ? "linear-gradient(135deg, #00e5ff, #00b0ff)" : "linear-gradient(135deg, #f5f5dc, #deb887)",
            border: shieldTimer > 0 ? "2px solid #00e5ff" : "2px solid #8B4513",
            transform: player.facingRight ? "scaleX(1)" : "scaleX(-1)",
            imageRendering: "pixelated",
            boxShadow: shieldTimer > 0 ? "0 0 12px rgba(0,229,255,0.6)" : undefined,
            transition: "box-shadow 0.3s",
          }}
        >
          <span className="text-lg leading-none" style={{ transform: player.facingRight ? "scaleX(1)" : "scaleX(-1)" }}>🧑‍⚕️</span>
        </div>

        {/* Finish flag */}
        <div
          className="absolute flex items-center justify-center"
          style={{ left: level.worldWidth - 60 - cameraX, top: GROUND_Y - 60, width: 40, height: 60 }}
        >
          <span className="text-3xl">🏁</span>
        </div>
      </div>

      {/* Touch controls */}
      <div className="flex justify-center gap-3 md:hidden">
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 text-xl"
          onTouchStart={() => touchStart("ArrowLeft")}
          onTouchEnd={() => touchEnd("ArrowLeft")}
          onMouseDown={() => touchStart("ArrowLeft")}
          onMouseUp={() => touchEnd("ArrowLeft")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 text-xl"
          onTouchStart={() => touchStart("ArrowUp")}
          onTouchEnd={() => touchEnd("ArrowUp")}
          onMouseDown={() => touchStart("ArrowUp")}
          onMouseUp={() => touchEnd("ArrowUp")}
        >
          <ArrowUp className="h-6 w-6" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-14 w-14 text-xl"
          onTouchStart={() => touchStart("ArrowRight")}
          onTouchEnd={() => touchEnd("ArrowRight")}
          onMouseDown={() => touchStart("ArrowRight")}
          onMouseUp={() => touchEnd("ArrowRight")}
        >
          <ArrowRight className="h-6 w-6" />
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground hidden md:block">
        ⌨️ Use as setas ← → para mover e ↑ para pular
      </p>

      {/* Quiz dialog */}
      <Dialog open={gameState === "quiz"} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">❓</span> Bloco de Pergunta
            </DialogTitle>
          </DialogHeader>
          {currentQuiz && (
            <div className="space-y-4">
              <p className="font-medium">{currentQuiz.question}</p>
              <div className="space-y-2">
                {currentQuiz.options.map((opt, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleQuizAnswer(i)}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + i)})</span> {opt}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Level complete dialog */}
      <Dialog open={gameState === "levelComplete"} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-yellow-500" /> Fase Concluída!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star key={i} className={`h-8 w-8 ${i < (starsPerLevel[currentLevel] || 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
              ))}
            </div>
            <div className="text-center space-y-1">
              <p className="font-bold">{score} pontos</p>
              <p className="text-sm text-muted-foreground">PA atual: {pa} mmHg</p>
            </div>
            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <p className="text-sm font-medium">📚 Explicação Clínica</p>
                <p className="text-sm text-muted-foreground mt-1">{level.explanation}</p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button onClick={handleNextLevel} className="w-full">
              {currentLevel < levels.length - 1 ? "Próxima Fase →" : "Ver Resultado Final"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Game over dialog */}
      <Dialog open={gameState === "gameOver"} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-red-500">💔 Game Over</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-2">
            <p className="text-lg">O paciente não foi tratado adequadamente.</p>
            <p className="text-muted-foreground">Pontuação final: {score} pontos</p>
          </div>
          <DialogFooter>
            <Button onClick={handleRestart} variant="outline" className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Recomeçar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Victory dialog */}
      <Dialog open={gameState === "victory"} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🎉 Parabéns! Jogo Completo!
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-3">
            <div className="flex justify-center gap-1">
              {starsPerLevel.map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">F{i + 1}</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Star key={j} className={`h-4 w-4 ${j < s ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-2xl font-bold">{score} pontos</p>
            <p className="text-muted-foreground">PA final: {pa} mmHg {pa < 140 ? "✅ Controlada!" : "⚠️ Ainda alta"}</p>
            <div className="flex gap-2 mt-2">
              {lives > 0 && <Badge variant="secondary">+{lives * 50} bônus vidas</Badge>}
              {pa < 140 && <Badge className="bg-green-600 text-white">+100 bônus PA</Badge>}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleRestart} variant="outline" className="w-full gap-2">
              <RotateCcw className="h-4 w-4" /> Jogar Novamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
