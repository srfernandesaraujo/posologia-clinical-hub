import { useState, useCallback, useEffect } from "react";
import { Crosshair, RotateCcw, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type CellValue = null | 0 | 1;

const initialBoard: CellValue[][] = [
  [null, null, 1, 1, 1, null, null],
  [null, null, 1, 1, 1, null, null],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [null, null, 1, 1, 1, null, null],
  [null, null, 1, 1, 1, null, null],
];

function cloneBoard(b: CellValue[][]) {
  return b.map((row) => [...row]);
}

function countCells(b: CellValue[][]) {
  let c = 0;
  for (const row of b) for (const v of row) if (v === 1) c++;
  return c;
}

function hasValidMoves(b: CellValue[][]) {
  const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (b[r][c] !== 1) continue;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        const mr = r + dr / 2, mc = c + dc / 2;
        if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7 && b[nr][nc] === 0 && b[mr][mc] === 1) return true;
      }
    }
  }
  return false;
}

export default function ResseccaoOncologicaGame() {
  const [board, setBoard] = useState(() => cloneBoard(initialBoard));
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(null);
  const [cellsLeft, setCellsLeft] = useState(32);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "game_over">("playing");

  const checkEnd = useCallback((b: CellValue[][], left: number) => {
    if (left === 1) { setGameStatus("won"); return; }
    if (!hasValidMoves(b)) { setGameStatus("game_over"); return; }
  }, []);

  const restart = () => {
    setBoard(cloneBoard(initialBoard));
    setSelected(null);
    setCellsLeft(32);
    setGameStatus("playing");
  };

  const handleClick = (r: number, c: number) => {
    if (gameStatus !== "playing") return;
    const val = board[r][c];
    if (val === null) return;

    // Select / reselect
    if (val === 1) {
      if (selected?.r === r && selected?.c === c) { setSelected(null); return; }
      setSelected({ r, c });
      return;
    }

    // Try jump
    if (val === 0 && selected) {
      const dr = r - selected.r, dc = c - selected.c;
      if ((Math.abs(dr) === 2 && dc === 0) || (dr === 0 && Math.abs(dc) === 2)) {
        const mr = selected.r + dr / 2, mc = selected.c + dc / 2;
        if (board[mr][mc] === 1) {
          const nb = cloneBoard(board);
          nb[selected.r][selected.c] = 0;
          nb[mr][mc] = 0;
          nb[r][c] = 1;
          const newLeft = cellsLeft - 1;
          setBoard(nb);
          setCellsLeft(newLeft);
          setSelected(null);
          checkEnd(nb, newLeft);
        }
      }
    }
  };

  // Overlay screens
  if (gameStatus !== "playing") {
    const won = gameStatus === "won";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className={`rounded-full p-6 ${won ? "bg-green-900/60" : "bg-red-900/60"}`}>
          {won ? <Trophy className="h-16 w-16 text-green-400" /> : <XCircle className="h-16 w-16 text-red-400" />}
        </div>
        <h2 className={`text-2xl font-bold ${won ? "text-green-400" : "text-red-400"}`}>
          {won ? "Procedimento Bem Sucedido!" : "Terapia Interrompida"}
        </h2>
        <p className="text-zinc-400 max-w-sm">
          {won
            ? "Apenas a célula estaminal saudável restou. Tecido regenerado."
            : "As células tumorais isolaram-se. Tente uma nova abordagem."}
        </p>
        <Button onClick={restart} variant="outline" className="gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800">
          <RotateCcw className="h-4 w-4" /> Reiniciar Tratamento
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <Crosshair className="h-5 w-5 text-cyan-400" /> Ressecção Oncológica: Terapia Alvo
          </h2>
        </div>
        <div className={`text-sm font-mono font-bold px-3 py-1 rounded-full ${cellsLeft === 1 ? "bg-green-900/60 text-green-400" : "bg-red-900/40 text-red-400"}`}>
          Células Restantes: {cellsLeft}
        </div>
      </div>

      {/* Board */}
      <div className="flex justify-center">
        <div className="grid grid-cols-7 gap-2 p-4 rounded-2xl bg-zinc-900/50 backdrop-blur-sm border border-zinc-800">
          {board.map((row, r) =>
            row.map((cell, c) => {
              if (cell === null) return <div key={`${r}-${c}`} className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14" />;

              const isSel = selected?.r === r && selected?.c === c;
              const isTumor = cell === 1;

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => handleClick(r, c)}
                  className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full transition-all duration-200 focus:outline-none ${
                    isTumor
                      ? isSel
                        ? "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.7)] ring-4 ring-cyan-400 animate-pulse"
                        : "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] hover:shadow-[0_0_16px_rgba(244,63,94,0.8)] cursor-pointer"
                      : "bg-zinc-800 border border-zinc-700 cursor-pointer hover:border-zinc-500"
                  }`}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-center">
        <Button onClick={restart} variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800">
          <RotateCcw className="h-4 w-4" /> Reiniciar Tratamento
        </Button>
      </div>
    </div>
  );
}
