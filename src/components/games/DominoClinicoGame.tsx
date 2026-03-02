import { useState, useMemo } from "react";
import { Link, AlertCircle, Pill, Activity, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Tile { id: number; left: string; right: string; }

const defaultTiles: Tile[] = [
  { id: 1, left: "Hipertensão", right: "Amlodipina" },
  { id: 2, left: "Amlodipina", right: "Edema Periférico" },
  { id: 3, left: "Edema Periférico", right: "Furosemida" },
  { id: 4, left: "Furosemida", right: "Hipocaliemia" },
  { id: 5, left: "Hipocaliemia", right: "Suplemento de Potássio" },
  { id: 6, left: "Suplemento de Potássio", right: "Irritação Gástrica" },
  { id: 7, left: "Irritação Gástrica", right: "Omeprazol" },
];

const defaultDiseases = new Set(["Hipertensão", "Edema Periférico", "Hipocaliemia", "Irritação Gástrica"]);
const defaultDrugs = new Set(["Amlodipina", "Furosemida", "Suplemento de Potássio", "Omeprazol"]);

function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function TileCard({ tile, onClick, hover, getColor }: { tile: Tile; onClick?: () => void; hover?: boolean; getColor: (term: string) => string }) {
  return (
    <button onClick={onClick} className={`inline-flex shrink-0 w-48 h-24 bg-white rounded-lg shadow-md border border-border divide-x divide-border transition-all duration-200 ${hover ? "hover:shadow-xl hover:-translate-y-2 cursor-pointer" : ""}`}>
      <span className={`flex-1 flex items-center justify-center text-xs font-semibold px-2 text-center leading-tight ${getColor(tile.left)}`}>{tile.left}</span>
      <span className={`flex-1 flex items-center justify-center text-xs font-semibold px-2 text-center leading-tight ${getColor(tile.right)}`}>{tile.right}</span>
    </button>
  );
}

export default function DominoClinicoGame({ customData }: { customData?: any }) {
  const allTiles: Tile[] = customData?.tiles || defaultTiles;
  const diseases = customData?.diseases ? new Set(customData.diseases) : defaultDiseases;
  const drugs = customData?.drugs ? new Set(customData.drugs) : defaultDrugs;

  const getColor = (term: string) => {
    if (diseases.has(term)) return "text-rose-600";
    if (drugs.has(term)) return "text-blue-600";
    return "text-amber-600";
  };

  const [boardTiles, setBoardTiles] = useState<Tile[]>([allTiles[0]]);
  const [handTiles, setHandTiles] = useState<Tile[]>(() => shuffle(allTiles.slice(1)));
  const [shakeId, setShakeId] = useState<number | null>(null);

  const leftOpen = boardTiles[0].left;
  const rightOpen = boardTiles[boardTiles.length - 1].right;

  const playTile = (tile: Tile) => {
    if (tile.left === rightOpen) { setBoardTiles((b) => [...b, tile]); setHandTiles((h) => h.filter((t) => t.id !== tile.id)); return; }
    if (tile.right === rightOpen) { setBoardTiles((b) => [...b, { ...tile, left: tile.right, right: tile.left }]); setHandTiles((h) => h.filter((t) => t.id !== tile.id)); return; }
    if (tile.right === leftOpen) { setBoardTiles((b) => [tile, ...b]); setHandTiles((h) => h.filter((t) => t.id !== tile.id)); return; }
    if (tile.left === leftOpen) { setBoardTiles((b) => [{ ...tile, left: tile.right, right: tile.left }, ...b]); setHandTiles((h) => h.filter((t) => t.id !== tile.id)); return; }
    toast.error("Conexão clínica inválida. Este fármaco não se liga a este sintoma.");
    setShakeId(tile.id); setTimeout(() => setShakeId(null), 500);
  };

  const restart = () => { setBoardTiles([allTiles[0]]); setHandTiles(shuffle(allTiles.slice(1))); };

  if (handTiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
        <div className="rounded-full bg-green-100 p-6"><Trophy className="h-14 w-14 text-green-600" /></div>
        <h2 className="text-2xl font-bold text-green-700">Cascata Prescritiva Mapeada!</h2>
        <p className="text-muted-foreground max-w-lg">Excelente revisão de histórico! A cadeia de efeitos adversos foi completamente documentada.</p>
        <Button onClick={restart} variant="outline" className="gap-2">Jogar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-muted-foreground text-sm flex items-center gap-1"><Link className="h-4 w-4" /> Conecte o fármaco à sua indicação ou ao seu efeito adverso.</p>
        <span className="text-sm font-mono font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">Peças restantes: {handTiles.length}</span>
      </div>
      <div className="min-h-32 border-2 border-dashed border-muted-foreground/20 rounded-xl p-4 flex items-center overflow-x-auto gap-1">
        {boardTiles.map((tile) => <TileCard key={tile.id} tile={tile} getColor={getColor} />)}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground justify-center">
        <span>⬅ Ponta esquerda: <strong className={getColor(leftOpen)}>{leftOpen}</strong></span>
        <span>Ponta direita: <strong className={getColor(rightOpen)}>{rightOpen}</strong> ➡</span>
      </div>
      <div>
        <h3 className="font-semibold mb-3 text-muted-foreground text-sm uppercase tracking-wide">A Sua Mão</h3>
        <div className="flex flex-wrap gap-3 justify-center">
          {handTiles.map((tile) => (
            <div key={tile.id} className={shakeId === tile.id ? "animate-[shake_0.3s_ease-in-out]" : ""}><TileCard tile={tile} onClick={() => playTile(tile)} hover getColor={getColor} /></div>
          ))}
        </div>
      </div>
      <style>{`@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }`}</style>
    </div>
  );
}
