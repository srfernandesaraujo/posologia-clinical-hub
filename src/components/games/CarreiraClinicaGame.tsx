import { useState, useCallback } from "react";
import { Building, GraduationCap, Stethoscope, Wallet, Gavel, Dice1, Monitor, FlaskConical, Megaphone, Hospital, Syringe, Heart, DollarSign, AlertTriangle, Coffee, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface BoardSpace {
  id: number;
  name: string;
  type: "go" | "property" | "chest" | "tax" | "jail" | "free" | "go-to-jail";
  cost?: number;
  rent?: number;
  color?: string;
}

const board: BoardSpace[] = [
  { id: 0, name: "PARTIDA", type: "go" },
  { id: 1, name: "Curso de Farmacologia", type: "property", cost: 60, rent: 10, color: "bg-blue-500" },
  { id: 2, name: "Cofre Clínico", type: "chest" },
  { id: 3, name: "Especialização em Anamnese", type: "property", cost: 100, rent: 15, color: "bg-blue-500" },
  { id: 4, name: "IMPOSTO DE RENDA", type: "tax" },
  { id: 5, name: "Software de Prontuário", type: "property", cost: 150, rent: 25, color: "bg-green-500" },
  { id: 6, name: "Laboratório de Testes", type: "property", cost: 180, rent: 30, color: "bg-green-500" },
  { id: 7, name: "CONSELHO DE ÉTICA", type: "jail" },
  { id: 8, name: "Equipamento de Diagnóstico", type: "property", cost: 220, rent: 40, color: "bg-purple-500" },
  { id: 9, name: "Marketing Médico", type: "property", cost: 240, rent: 45, color: "bg-purple-500" },
  { id: 10, name: "RECESSO", type: "free" },
  { id: 11, name: "Clínica de Reabilitação", type: "property", cost: 300, rent: 60, color: "bg-purple-500" },
  { id: 12, name: "Centro de Infusão", type: "property", cost: 350, rent: 80, color: "bg-rose-500" },
  { id: 13, name: "AUDITORIA FISCAL", type: "tax" },
  { id: 14, name: "Hospital Particular", type: "property", cost: 400, rent: 100, color: "bg-rose-500" },
  { id: 15, name: "VÁ PARA O CONSELHO", type: "go-to-jail" },
];

const chestCards = [
  { text: "Processo ganho por boa documentação!", amount: 100 },
  { text: "Bónus por publicação científica!", amount: 80 },
  { text: "Reembolso de conferência!", amount: 50 },
  { text: "Multa por prescrição ilegível!", amount: -50 },
  { text: "Reparação de equipamento danificado!", amount: -80 },
  { text: "Prémio de qualidade hospitalar!", amount: 120 },
];

// Board layout: positions around a 6x6 grid border
function getBoardPosition(id: number): { row: number; col: number } {
  if (id <= 4) return { row: 4, col: 4 - id }; // bottom row, right to left
  if (id <= 8) return { row: 4 - (id - 4), col: 0 }; // left col, bottom to top
  if (id <= 12) return { row: 0, col: id - 8 }; // top row, left to right
  return { row: id - 12, col: 4 }; // right col, top to bottom
}

function SpaceCell({ space, isHere, owned }: { space: BoardSpace; isHere: boolean; owned: boolean }) {
  return (
    <div className={`relative border border-border rounded-md p-1 h-full flex flex-col items-center justify-center text-center gap-0.5 transition-all ${isHere ? "ring-2 ring-primary shadow-lg bg-primary/10" : "bg-card"}`}>
      {space.color && <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-md ${space.color}`} />}
      {isHere && <Stethoscope className="h-4 w-4 text-primary shrink-0" />}
      <span className="text-[9px] sm:text-[10px] font-semibold leading-tight line-clamp-2">{space.name}</span>
      {space.cost && <span className="text-[8px] text-muted-foreground">${space.cost}</span>}
      {owned && <Badge variant="secondary" className="text-[7px] px-1 py-0">Seu</Badge>}
    </div>
  );
}

export default function CarreiraClinicaGame() {
  const [position, setPosition] = useState(0);
  const [balance, setBalance] = useState(1500);
  const [owned, setOwned] = useState<Set<number>>(new Set());
  const [gameLog, setGameLog] = useState<string[]>(["Jogo iniciado. Saldo: $1500"]);
  const [lastDice, setLastDice] = useState<number | null>(null);
  const [buyDialog, setBuyDialog] = useState<BoardSpace | null>(null);
  const [jailTurns, setJailTurns] = useState(0);
  const [rolling, setRolling] = useState(false);

  const log = (msg: string) => setGameLog((l) => [msg, ...l].slice(0, 20));

  const rollDice = useCallback(() => {
    if (rolling) return;

    if (jailTurns > 0) {
      setJailTurns(0);
      log("Saiu do Conselho de Ética. Pode jogar no próximo turno.");
      return;
    }

    setRolling(true);
    const dice = Math.floor(Math.random() * 6) + 1;
    setLastDice(dice);

    setTimeout(() => {
      const newPos = (position + dice) % 16;
      const passedGo = newPos < position;

      let newBalance = balance;

      if (passedGo && newPos !== 0) {
        newBalance += 200;
        log("Passou pela PARTIDA: +$200");
      }

      setPosition(newPos);
      const space = board[newPos];
      log(`Dado: ${dice} → ${space.name}`);

      // Process space
      if (space.type === "go") {
        newBalance += 200;
        log("Chegou à PARTIDA: +$200");
      } else if (space.type === "property") {
        if (owned.has(space.id)) {
          // Already owned by player
          log(`${space.name} já é seu.`);
        } else {
          // Offer to buy
          setBuyDialog(space);
        }
      } else if (space.type === "chest") {
        const card = chestCards[Math.floor(Math.random() * chestCards.length)];
        newBalance += card.amount;
        log(`Cofre: ${card.text} ${card.amount > 0 ? "+" : ""}$${card.amount}`);
        toast(card.text, { description: `${card.amount > 0 ? "+" : ""}$${card.amount}` });
      } else if (space.type === "tax") {
        const tax = space.id === 4 ? 100 : 150;
        newBalance -= tax;
        log(`${space.name}: -$${tax}`);
      } else if (space.type === "jail") {
        log("Visitou o Conselho de Ética. Sem penalidade.");
      } else if (space.type === "go-to-jail") {
        setPosition(7);
        setJailTurns(1);
        log("Enviado para o Conselho de Ética! Perde 1 turno.");
      } else if (space.type === "free") {
        log("Recesso: Nada acontece. Relaxe!");
      }

      setBalance(newBalance);
      setRolling(false);
    }, 600);
  }, [position, balance, owned, jailTurns, rolling]);

  const handleBuy = () => {
    if (!buyDialog || !buyDialog.cost) return;
    if (balance >= buyDialog.cost) {
      setBalance((b) => b - buyDialog.cost!);
      setOwned((o) => new Set(o).add(buyDialog.id));
      log(`Comprou ${buyDialog.name} por $${buyDialog.cost}`);
    }
    setBuyDialog(null);
  };

  // Build 5x5 grid with only border cells
  const grid: (BoardSpace | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
  board.forEach((space) => {
    const { row, col } = getBoardPosition(space.id);
    grid[row][col] = space;
  });

  const isGameOver = balance < 0;

  return (
    <div className="space-y-4">
      {isGameOver && (
        <div className="text-center p-6 rounded-xl bg-red-100 border border-red-300">
          <h2 className="text-xl font-bold text-red-700 mb-2">Falência!</h2>
          <p className="text-red-600 text-sm">O seu consultório foi à falência. Tente novamente!</p>
          <Button className="mt-3" onClick={() => { setPosition(0); setBalance(1500); setOwned(new Set()); setGameLog(["Jogo reiniciado."]); setLastDice(null); setJailTurns(0); }}>
            Reiniciar
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Board */}
        <div className="grid grid-cols-5 grid-rows-5 gap-1 aspect-square max-w-md mx-auto w-full">
          {grid.map((row, r) =>
            row.map((space, c) => (
              <div key={`${r}-${c}`} className={space ? "" : ""}>
                {space ? (
                  <SpaceCell space={space} isHere={position === space.id} owned={owned.has(space.id)} />
                ) : (
                  <div />
                )}
              </div>
            ))
          )}
        </div>

        {/* Control Panel */}
        <div className="space-y-3">
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Saldo</span>
                <span className={`text-xl font-bold font-mono ${balance < 100 ? "text-red-600" : "text-green-600"}`}>
                  ${balance}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Último dado</span>
                <span className="text-lg font-bold">{lastDice ?? "—"}</span>
              </div>
              <Button onClick={rollDice} disabled={rolling || isGameOver} className="w-full gap-2" size="lg">
                {jailTurns > 0 ? "Sair do Conselho" : "🎲 Lançar Dados"}
              </Button>
            </CardContent>
          </Card>

          {owned.size > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs uppercase text-muted-foreground">Bens ({owned.size})</CardTitle>
              </CardHeader>
              <CardContent className="py-1 px-3 pb-3">
                <div className="flex flex-wrap gap-1">
                  {[...owned].map((id) => {
                    const s = board[id];
                    return (
                      <Badge key={id} variant="secondary" className="text-[10px]">
                        {s.name}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs uppercase text-muted-foreground">Log</CardTitle>
            </CardHeader>
            <CardContent className="py-1 px-3 pb-3">
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {gameLog.map((msg, i) => (
                    <p key={i} className={`text-xs ${i === 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{msg}</p>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Buy Dialog */}
      <Dialog open={!!buyDialog} onOpenChange={(o) => !o && setBuyDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          {buyDialog && (
            <>
              <DialogHeader>
                <DialogTitle>{buyDialog.name}</DialogTitle>
                <DialogDescription>
                  Deseja adquirir este ativo para o seu consultório por ${buyDialog.cost}?
                  <br />
                  <span className="text-xs">Renda: ${buyDialog.rent}/visita</span>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setBuyDialog(null)}>Ignorar</Button>
                <Button onClick={handleBuy} disabled={balance < (buyDialog.cost || 0)}>
                  Comprar (${buyDialog.cost})
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
