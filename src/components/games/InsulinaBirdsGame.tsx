import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Star, RotateCcw, ChevronRight, Trophy, XCircle, Zap, Shield } from "lucide-react";
import GameNarrative from "./GameNarrative";
import GameDifficultySelector, { GameDifficulty } from "./GameDifficultySelector";
import GameStarsResult from "./GameStarsResult";
import GameFeedbackOverlay from "./GameFeedbackOverlay";

/* ─── Types ─── */
interface Block {
  x: number; y: number; w: number; h: number;
  type: "red" | "yellow" | "green" | "gray";
  hp: number; maxHp: number;
  label: string;
  destroyed: boolean;
}

interface Projectile {
  x: number; y: number; vx: number; vy: number;
  radius: number;
  type: "regular" | "nph" | "glargina" | "metformina";
  active: boolean;
  trail: { x: number; y: number }[];
}

interface Level {
  name: string;
  patient: { name: string; hba1c: string; profile: string };
  projectiles: Array<{ type: Projectile["type"] }>;
  blocks: Omit<Block, "destroyed">[];
  explanation: string;
}

/* ─── Constants ─── */
const CANVAS_W = 760;
const CANVAS_H = 420;
const GROUND_Y = 380;
const GRAVITY = 0.35;
const SLING_X = 80;
const SLING_Y = GROUND_Y - 40;

const DRUG_COLORS: Record<string, string> = {
  regular: "#3b82f6",
  nph: "#22c55e",
  glargina: "#a855f7",
  metformina: "#f97316",
};

const DRUG_LABELS: Record<string, string> = {
  regular: "Ins. Regular",
  nph: "Ins. NPH",
  glargina: "Ins. Glargina",
  metformina: "Metformina",
};

const BLOCK_COLORS: Record<string, { fill: string; stroke: string }> = {
  red: { fill: "#ef4444", stroke: "#b91c1c" },
  yellow: { fill: "#eab308", stroke: "#a16207" },
  green: { fill: "#22c55e", stroke: "#15803d" },
  gray: { fill: "#6b7280", stroke: "#374151" },
};

/* ─── Level definitions ─── */
const defaultLevels: Level[] = [
  {
    name: "Fase 1: DM2 Leve",
    patient: { name: "Maria S.", hba1c: "7.2%", profile: "Glicemias entre 150-200 mg/dL" },
    projectiles: [{ type: "metformina" }, { type: "metformina" }, { type: "regular" }],
    blocks: [
      { x: 480, y: GROUND_Y - 40, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "180" },
      { x: 540, y: GROUND_Y - 40, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "160" },
      { x: 510, y: GROUND_Y - 80, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "190" },
      { x: 600, y: GROUND_Y - 40, w: 50, h: 40, type: "green", hp: 2, maxHp: 2, label: "110" },
    ],
    explanation: "A Metformina é primeira linha no DM2 leve. Ela sensibiliza os tecidos à insulina sem causar hipoglicemia.",
  },
  {
    name: "Fase 2: Pós-Prandial",
    patient: { name: "João P.", hba1c: "8.5%", profile: "Glicemia pós-refeição > 250 mg/dL" },
    projectiles: [{ type: "regular" }, { type: "regular" }, { type: "nph" }],
    blocks: [
      { x: 460, y: GROUND_Y - 40, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "300" },
      { x: 520, y: GROUND_Y - 40, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "280" },
      { x: 490, y: GROUND_Y - 80, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "200" },
      { x: 580, y: GROUND_Y - 40, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "180" },
      { x: 640, y: GROUND_Y - 40, w: 50, h: 40, type: "green", hp: 2, maxHp: 2, label: "100" },
    ],
    explanation: "Insulina Regular age rápido (15-30 min) para controle pós-prandial. É a escolha para corrigir picos de glicemia após refeições.",
  },
  {
    name: "Fase 3: Resistência",
    patient: { name: "Ana R.", hba1c: "9.0%", profile: "Resistência insulínica com glicemias altas" },
    projectiles: [{ type: "metformina" }, { type: "regular" }, { type: "regular" }, { type: "nph" }],
    blocks: [
      { x: 420, y: GROUND_Y - 40, w: 50, h: 40, type: "gray", hp: 1, maxHp: 1, label: "RI" },
      { x: 480, y: GROUND_Y - 40, w: 50, h: 40, type: "gray", hp: 1, maxHp: 1, label: "RI" },
      { x: 540, y: GROUND_Y - 40, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "270" },
      { x: 450, y: GROUND_Y - 80, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "250" },
      { x: 510, y: GROUND_Y - 80, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "190" },
      { x: 600, y: GROUND_Y - 40, w: 50, h: 40, type: "green", hp: 2, maxHp: 2, label: "90" },
    ],
    explanation: "A resistência insulínica exige sensibilizadores (Metformina) antes de aumentar dose de insulina. Blocos cinzas representam essa barreira.",
  },
  {
    name: "Fase 4: Basal Noturno",
    patient: { name: "Pedro M.", hba1c: "8.8%", profile: "Glicemia de jejum elevada, noturna descontrolada" },
    projectiles: [{ type: "glargina" }, { type: "glargina" }, { type: "regular" }],
    blocks: [
      { x: 400, y: GROUND_Y - 40, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "170" },
      { x: 460, y: GROUND_Y - 40, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "240" },
      { x: 520, y: GROUND_Y - 40, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "230" },
      { x: 580, y: GROUND_Y - 40, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "180" },
      { x: 640, y: GROUND_Y - 40, w: 50, h: 40, type: "green", hp: 2, maxHp: 2, label: "95" },
      { x: 460, y: GROUND_Y - 80, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "160" },
    ],
    explanation: "Insulina basal (Glargina) cobre 24h sem picos, ideal para controle noturno e de jejum. Ela 'atravessa' — efeito prolongado e estável.",
  },
  {
    name: "Fase 5: Crise Hiperglicêmica",
    patient: { name: "Luísa F.", hba1c: "11.2%", profile: "Crise hiperglicêmica: poliúria, polidipsia, confusão" },
    projectiles: [{ type: "metformina" }, { type: "regular" }, { type: "nph" }, { type: "glargina" }],
    blocks: [
      { x: 380, y: GROUND_Y - 40, w: 50, h: 40, type: "gray", hp: 1, maxHp: 1, label: "RI" },
      { x: 440, y: GROUND_Y - 40, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "350" },
      { x: 500, y: GROUND_Y - 40, w: 50, h: 40, type: "red", hp: 3, maxHp: 3, label: "400" },
      { x: 560, y: GROUND_Y - 40, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "200" },
      { x: 620, y: GROUND_Y - 40, w: 50, h: 40, type: "green", hp: 2, maxHp: 2, label: "100" },
      { x: 440, y: GROUND_Y - 80, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "320" },
      { x: 500, y: GROUND_Y - 80, w: 50, h: 40, type: "yellow", hp: 1, maxHp: 1, label: "210" },
      { x: 470, y: GROUND_Y - 120, w: 50, h: 40, type: "red", hp: 2, maxHp: 2, label: "280" },
    ],
    explanation: "O manejo do diabetes requer combinação racional de fármacos: sensibilizadores + insulinas basais e rápidas, na sequência correta.",
  },
];

/* ─── Component ─── */
export default function InsulinaBirdsGame({ customData }: { customData?: any }) {
  const levels: Level[] = customData?.levels || defaultLevels;

  const [gamePhase, setGamePhase] = useState<"narrative" | "difficulty" | "playing" | "finalResult">("narrative");
  const [gameDifficulty, setGameDifficulty] = useState<GameDifficulty>("academic");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const [currentLevel, setCurrentLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [projIndex, setProjIndex] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>(() => levels[0].blocks.map(b => ({ ...b, destroyed: false })));
  const [projectile, setProjectile] = useState<Projectile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [phaseResult, setPhaseResult] = useState<"won" | "lost" | "complete" | null>(null);
  const [stars, setStars] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [levelFeedback, setLevelFeedback] = useState<{ isCorrect: boolean; title: string; explanation: string } | null>(null);
  const [totalErrors, setTotalErrors] = useState(0);

  // Difficulty modifiers
  const diffMod = gameDifficulty === "academic" ? { extraProj: 1, blockHpMult: 1 } : gameDifficulty === "clinical" ? { extraProj: 0, blockHpMult: 1 } : { extraProj: 0, blockHpMult: 1.5 };

  const level = levels[currentLevel];
  const projsLeft = level.projectiles.length - projIndex;
  const currentDrugType = projIndex < level.projectiles.length ? level.projectiles[projIndex].type : null;

  /* ─── Drawing ─── */
  const draw = useCallback((ctx: CanvasRenderingContext2D, proj: Projectile | null, blks: Block[], drag: { x: number; y: number } | null) => {
    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    skyGrad.addColorStop(0, "#bfdbfe");
    skyGrad.addColorStop(1, "#e0f2fe");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Ground
    ctx.fillStyle = "#4ade80";
    ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
    ctx.fillStyle = "#16a34a";
    ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);

    // Slingshot
    ctx.fillStyle = "#78350f";
    ctx.fillRect(SLING_X - 4, SLING_Y - 50, 8, 55);
    ctx.fillRect(SLING_X - 18, SLING_Y - 55, 36, 8);
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.arc(SLING_X - 14, SLING_Y - 55, 6, 0, Math.PI * 2);
    ctx.arc(SLING_X + 14, SLING_Y - 55, 6, 0, Math.PI * 2);
    ctx.fill();

    // Drag line + trajectory preview
    if (drag) {
      ctx.strokeStyle = "#a8a29e";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(SLING_X, SLING_Y - 40);
      ctx.lineTo(drag.x, drag.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Trajectory dots
      const dx = (SLING_X - drag.x) * 0.12;
      const dy = (SLING_Y - 40 - drag.y) * 0.12;
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      let px = SLING_X, py = SLING_Y - 40, pvy = dy;
      for (let i = 0; i < 20; i++) {
        px += dx;
        py += pvy;
        pvy += GRAVITY;
        if (py > GROUND_Y) break;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Blocks
    blks.forEach(b => {
      if (b.destroyed) return;
      const c = BLOCK_COLORS[b.type];
      ctx.fillStyle = c.fill;
      ctx.strokeStyle = c.stroke;
      ctx.lineWidth = 2;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);

      // HP bar
      if (b.hp < b.maxHp) {
        const barW = b.w - 8;
        const ratio = b.hp / b.maxHp;
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.fillRect(b.x + 4, b.y + b.h - 8, barW, 4);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(b.x + 4, b.y + b.h - 8, barW * ratio, 4);
      }
    });

    // Projectile
    if (proj && proj.active) {
      // Trail
      ctx.strokeStyle = DRUG_COLORS[proj.type] + "55";
      ctx.lineWidth = 3;
      if (proj.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(proj.trail[0].x, proj.trail[0].y);
        proj.trail.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }

      ctx.fillStyle = DRUG_COLORS[proj.type];
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Emoji label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const shortLabel = proj.type === "regular" ? "R" : proj.type === "nph" ? "N" : proj.type === "glargina" ? "G" : "M";
      ctx.fillText(shortLabel, proj.x, proj.y);
    }

    // Current drug indicator on sling
    if (!proj && currentDrugType) {
      ctx.fillStyle = DRUG_COLORS[currentDrugType];
      ctx.beginPath();
      ctx.arc(SLING_X, SLING_Y - 40, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const sl = currentDrugType === "regular" ? "R" : currentDrugType === "nph" ? "N" : currentDrugType === "glargina" ? "G" : "M";
      ctx.fillText(sl, SLING_X, SLING_Y - 40);
    }
  }, [currentDrugType]);

  /* ─── Redraw on state changes ─── */
  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    draw(ctx, projectile, blocks, isDragging ? dragPos : null);
  }, [draw, projectile, blocks, isDragging, dragPos]);

  /* ─── Physics loop ─── */
  const runPhysics = useCallback((proj: Projectile, blks: Block[]) => {
    const newBlocks = [...blks];
    let p = { ...proj, trail: [...proj.trail] };
    let scoreAdd = 0;

    const step = () => {
      p.vy += GRAVITY * (p.type === "nph" ? 1.5 : p.type === "glargina" ? 0.6 : 1);
      p.vx *= (p.type === "glargina" ? 0.998 : 0.999);
      p.x += p.vx;
      p.y += p.vy;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 40) p.trail.shift();

      // Ground collision
      if (p.y >= GROUND_Y - p.radius) {
        // NPH explosion
        if (p.type === "nph") {
          const explosionRadius = 80;
          newBlocks.forEach((b, i) => {
            if (b.destroyed) return;
            const cx = b.x + b.w / 2;
            const cy = b.y + b.h / 2;
            const dist = Math.sqrt((cx - p.x) ** 2 + (cy - p.y) ** 2);
            if (dist < explosionRadius) {
              newBlocks[i] = { ...b, hp: b.hp - 2, destroyed: b.hp - 2 <= 0 };
              if (newBlocks[i].destroyed) {
                scoreAdd += b.type === "red" ? 100 : b.type === "yellow" ? 50 : b.type === "green" ? -200 : 30;
              }
            }
          });
        }
        p.active = false;
        setProjectile({ ...p, active: false });
        setBlocks(newBlocks);
        setScore(s => s + scoreAdd);
        checkPhaseEnd(newBlocks, projIndex + 1, scoreAdd);
        return;
      }

      // Out of bounds
      if (p.x > CANVAS_W + 30 || p.x < -30 || p.y < -200) {
        p.active = false;
        setProjectile({ ...p, active: false });
        setBlocks(newBlocks);
        setScore(s => s + scoreAdd);
        checkPhaseEnd(newBlocks, projIndex + 1, scoreAdd);
        return;
      }

      // Block collision
      for (let i = 0; i < newBlocks.length; i++) {
        const b = newBlocks[i];
        if (b.destroyed) continue;

        const closestX = Math.max(b.x, Math.min(p.x, b.x + b.w));
        const closestY = Math.max(b.y, Math.min(p.y, b.y + b.h));
        const dist = Math.sqrt((p.x - closestX) ** 2 + (p.y - closestY) ** 2);

        if (dist < p.radius) {
          // Glargina passes through
          if (p.type === "glargina" && b.type !== "green") {
            newBlocks[i] = { ...b, hp: b.hp - 1, destroyed: b.hp - 1 <= 0 };
            if (newBlocks[i].destroyed) {
              scoreAdd += b.type === "red" ? 100 : b.type === "yellow" ? 50 : 30;
            }
            continue; // passes through
          }

          // Gray blocks only destroyed by metformina
          if (b.type === "gray" && p.type !== "metformina") {
            p.vx *= -0.3;
            p.vy *= -0.3;
          } else {
            const damage = p.type === "nph" ? 2 : 1;
            newBlocks[i] = { ...b, hp: b.hp - damage, destroyed: b.hp - damage <= 0 };
            if (newBlocks[i].destroyed) {
              scoreAdd += b.type === "red" ? 100 : b.type === "yellow" ? 50 : b.type === "green" ? -200 : 30;
            }
            p.active = false;
            setProjectile({ ...p, active: false });
            setBlocks(newBlocks);
            setScore(s => s + scoreAdd);
            checkPhaseEnd(newBlocks, projIndex + 1, scoreAdd);
            return;
          }
        }
      }

      setProjectile({ ...p });
      setBlocks([...newBlocks]);
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
  }, [projIndex]);

  /* ─── Check phase end ─── */
  const checkPhaseEnd = useCallback((blks: Block[], usedProjs: number, extraScore: number) => {
    const remaining = blks.filter(b => !b.destroyed && (b.type === "red" || b.type === "yellow"));
    const allDestroyed = remaining.length === 0;

    if (allDestroyed) {
      const bonus = Math.max(0, (level.projectiles.length - usedProjs)) * 50;
      const finalScore = score + extraScore + bonus;
      setScore(finalScore);
      const s = finalScore >= 400 ? 3 : finalScore >= 200 ? 2 : 1;
      setStars(s);
      setPhaseResult(currentLevel === levels.length - 1 ? "complete" : "won");
      setShowExplanation(true);
    } else if (usedProjs >= level.projectiles.length) {
      setStars(0);
      setPhaseResult("lost");
      setShowExplanation(true);
    }
  }, [score, level, currentLevel, levels.length]);

  /* ─── Mouse handlers ─── */
  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (projectile?.active || phaseResult || !currentDrugType) return;
    const pos = getCanvasPos(e);
    const dist = Math.sqrt((pos.x - SLING_X) ** 2 + (pos.y - (SLING_Y - 40)) ** 2);
    if (dist < 40) {
      setIsDragging(true);
      setDragPos(pos);
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setDragPos(getCanvasPos(e));
  };

  const onMouseUp = () => {
    if (!isDragging || !dragPos || !currentDrugType) return;
    setIsDragging(false);

    const dx = SLING_X - dragPos.x;
    const dy = (SLING_Y - 40) - dragPos.y;
    const power = Math.min(Math.sqrt(dx * dx + dy * dy), 150);
    const angle = Math.atan2(dy, dx);

    const speed = power * 0.12;
    const proj: Projectile = {
      x: SLING_X,
      y: SLING_Y - 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: currentDrugType === "metformina" ? 8 : currentDrugType === "nph" ? 14 : 11,
      type: currentDrugType,
      active: true,
      trail: [],
    };

    setProjectile(proj);
    setProjIndex(i => i + 1);
    setDragPos(null);
    runPhysics(proj, blocks);
  };

  /* ─── Level management ─── */
  const loadLevel = (idx: number) => {
    cancelAnimationFrame(animFrameRef.current);
    setCurrentLevel(idx);
    setBlocks(levels[idx].blocks.map(b => ({ ...b, destroyed: false })));
    setProjIndex(0);
    setProjectile(null);
    setPhaseResult(null);
    setShowExplanation(false);
    setScore(0);
    setStars(0);
    setDragPos(null);
    setIsDragging(false);
  };

  const restartLevel = () => loadLevel(currentLevel);

  const nextLevel = () => {
    setTotalScore(t => t + score);
    loadLevel(currentLevel + 1);
  };

  useEffect(() => () => cancelAnimationFrame(animFrameRef.current), []);

  /* ─── Touch support ─── */
  const onTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (projectile?.active || phaseResult || !currentDrugType) return;
    const touch = e.touches[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const pos = { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
    const dist = Math.sqrt((pos.x - SLING_X) ** 2 + (pos.y - (SLING_Y - 40)) ** 2);
    if (dist < 50) {
      setIsDragging(true);
      setDragPos(pos);
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    setDragPos({ x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY });
  };

  const onTouchEnd = () => {
    onMouseUp();
  };

  /* ─── Render ─── */
  const finalTotalScore = totalScore + score;

  if (gamePhase === "narrative") {
    return (
      <GameNarrative
        title="Insulina Birds — Controle Glicêmico"
        setting="Clínica de Endocrinologia"
        briefing="Lance insulinas e antidiabéticos contra blocos de hiperglicemia! Cada tipo de insulina tem física diferente. Blocos verdes são alvos glicêmicos — não destrua! Use estratégia para controlar a glicemia do paciente."
        onStart={() => setGamePhase("difficulty")}
      />
    );
  }

  if (gamePhase === "difficulty") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
        <GameDifficultySelector selected={gameDifficulty} onChange={setGameDifficulty} />
        <p className="text-xs text-muted-foreground">{levels.length} fases • {gameDifficulty === "academic" ? "Projétil extra" : gameDifficulty === "specialist" ? "Blocos reforçados" : "Padrão"}</p>
        <Button onClick={() => { loadLevel(0); setGamePhase("playing"); }} size="lg">Iniciar Tratamento</Button>
      </div>
    );
  }

  if (gamePhase === "finalResult") {
    return (
      <GameStarsResult
        score={totalScore + score}
        maxScore={levels.length * 500}
        errors={totalErrors}
        title="Tratamento Concluído!"
        subtitle={`Pontuação total: ${totalScore + score} em ${levels.length} fases.`}
        onRestart={() => setGamePhase("narrative")}
      />
    );
  }

  if (levelFeedback) {
    return (
      <GameFeedbackOverlay
        isCorrect={levelFeedback.isCorrect}
        title={levelFeedback.title}
        explanation={levelFeedback.explanation}
        onContinue={() => setLevelFeedback(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* HUD */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="text-xs font-semibold">
          {level.name}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Pontos: {score}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Total: {finalTotalScore}
        </Badge>
        <div className="flex gap-1">
          {level.projectiles.map((p, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[8px] font-bold text-white ${i < projIndex ? "opacity-30" : ""}`}
              style={{ backgroundColor: DRUG_COLORS[p.type], borderColor: "#00000033" }}
            >
              {p.type[0].toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Patient info */}
      <Card className="border-blue-500/20 bg-blue-950/10">
        <CardContent className="py-2 flex flex-wrap gap-4 items-center text-xs">
          <span className="font-semibold">{level.patient.name}</span>
          <span>HbA1c: <strong>{level.patient.hba1c}</strong></span>
          <span className="text-muted-foreground">{level.patient.profile}</span>
        </CardContent>
      </Card>

      {/* Drug legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(DRUG_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DRUG_COLORS[key] }} />
            <span>{label}</span>
          </div>
        ))}
        <span className="mx-2 text-muted-foreground">|</span>
        <span className="text-red-400">🔴 Alta</span>
        <span className="text-yellow-400">🟡 Moderada</span>
        <span className="text-green-400">🟢 Alvo (não destruir!)</span>
        <span className="text-zinc-400">⬜ Resistência</span>
      </div>

      {/* Canvas */}
      <div className="relative w-full" style={{ maxWidth: CANVAS_W }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="w-full rounded-lg border-2 border-border cursor-crosshair select-none"
          style={{ touchAction: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { if (isDragging) { setIsDragging(false); setDragPos(null); } }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        />
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={restartLevel}>
          <RotateCcw className="h-3.5 w-3.5" /> Reiniciar Fase
        </Button>
      </div>

      {/* Phase result dialog */}
      <Dialog open={showExplanation} onOpenChange={setShowExplanation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {phaseResult === "lost" ? (
                <><XCircle className="h-5 w-5 text-red-500" /> Fase Não Concluída</>
              ) : phaseResult === "complete" ? (
                <><Trophy className="h-5 w-5 text-yellow-500" /> Jogo Completo!</>
              ) : (
                <><Star className="h-5 w-5 text-yellow-500" /> Fase Concluída!</>
              )}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="space-y-3">
              {phaseResult !== "lost" && (
                <div className="flex gap-1 justify-center py-2">
                  {[1, 2, 3].map(s => (
                    <Star key={s} className={`h-8 w-8 ${s <= stars ? "text-yellow-400 fill-yellow-400" : "text-zinc-600"}`} />
                  ))}
                </div>
              )}
              <p className="text-sm text-center font-semibold">Pontos da fase: {score}</p>

              <Card className="bg-blue-950/20 border-blue-500/20">
                <CardContent className="py-3 text-sm">
                  <p className="font-semibold mb-1">💡 Aprendizado Clínico:</p>
                  <p className="text-muted-foreground">{level.explanation}</p>
                </CardContent>
              </Card>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => { setShowExplanation(false); restartLevel(); }}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Repetir
                </Button>
                {phaseResult === "won" && (
                  <Button size="sm" onClick={() => { setShowExplanation(false); nextLevel(); }}>
                    Próxima Fase <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                {phaseResult === "complete" && (
                  <p className="text-sm font-bold text-green-400">Pontuação total: {finalTotalScore}</p>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
