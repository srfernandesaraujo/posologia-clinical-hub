import { useState, useEffect, useCallback } from "react";
import { FileText, Monitor, Lock, BookOpen, Key, Clock, Package, Trophy, XCircle, Eye, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  name: string;
}

export default function PlantaoNoturnoGame({ customData }: { customData?: any }) {
  const puzzleData = customData || null;
  const [timeLeft, setTimeLeft] = useState(600);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [gameStatus, setGameStatus] = useState<"playing" | "escaped" | "timeout">("playing");
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());

  // Modals
  const [showProntuario, setShowProntuario] = useState(false);
  const [showBook, setShowBook] = useState(false);
  const [showComputer, setShowComputer] = useState(false);
  const [showSafe, setShowSafe] = useState(false);
  const [computerPassword, setComputerPassword] = useState("");
  const [safeCode, setSafeCode] = useState("");
  const [computerUnlocked, setComputerUnlocked] = useState(false);

  // Timer
  useEffect(() => {
    if (gameStatus !== "playing") return;
    if (timeLeft <= 0) { setGameStatus("timeout"); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, gameStatus]);

  const addInventory = (item: InventoryItem) => {
    if (!inventory.some((i) => i.id === item.id)) {
      setInventory((prev) => [...prev, item]);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleComputerSubmit = () => {
    if (computerPassword.toUpperCase().trim() === "NALOXONA") {
      setComputerUnlocked(true);
      setUnlocked((p) => new Set(p).add("computer"));
      addInventory({ id: "code-hint", name: "Código parcial: 420" });
      toast.success("Acesso concedido!");
    } else {
      toast.error("Senha incorreta. Tente novamente.");
    }
  };

  const handleSafeSubmit = () => {
    if (safeCode === "0420") {
      setGameStatus("escaped");
    } else {
      toast.error("Acesso Negado. Código Inválido. -30 segundos!");
      setTimeLeft((t) => Math.max(0, t - 30));
      setSafeCode("");
    }
  };

  const handleReadProntuario = () => {
    setShowProntuario(true);
    if (!unlocked.has("prontuario")) {
      setUnlocked((p) => new Set(p).add("prontuario"));
      addInventory({ id: "pista-clinica", name: "Pista: Overdose opioide" });
    }
  };

  const handleReadBook = () => {
    setShowBook(true);
    if (!unlocked.has("book")) {
      setUnlocked((p) => new Set(p).add("book"));
      addInventory({ id: "pista-bioquimica", name: "Pista: Meia-vida 4h, 2000mg" });
    }
  };

  // End screens
  if (gameStatus !== "playing") {
    const won = gameStatus === "escaped";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className={`rounded-full p-6 ${won ? "bg-green-900/40" : "bg-red-900/40"}`}>
          {won ? <Trophy className="h-16 w-16 text-green-400" /> : <XCircle className="h-16 w-16 text-red-400" />}
        </div>
        <h2 className={`text-2xl font-bold ${won ? "text-green-400" : "text-red-400"}`}>
          {won ? "Cofre Aberto! Antídoto Administrado!" : "O tempo acabou."}
        </h2>
        <p className="text-zinc-400 max-w-md">
          {won
            ? "Parabéns pelo raciocínio clínico brilhante sob pressão. O paciente foi salvo."
            : "O paciente não resistiu. Falha no plantão. Tente novamente."}
        </p>
        <Button onClick={() => { setTimeLeft(600); setInventory([]); setGameStatus("playing"); setUnlocked(new Set()); setComputerUnlocked(false); setComputerPassword(""); setSafeCode(""); }} variant="outline" className="border-zinc-700 text-zinc-200 hover:bg-zinc-800">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">Emergência na UTI — Encontre o Antídoto</h2>
        <div className={`flex items-center gap-2 font-mono text-lg font-bold px-3 py-1 rounded-full ${timeLeft < 60 ? "bg-red-900/50 text-red-400 animate-pulse" : "bg-zinc-800 text-zinc-200"}`}>
          <Clock className="h-4 w-4" />
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Room */}
      <div className="relative w-full h-[420px] sm:h-[500px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
        style={{ background: "radial-gradient(circle at 50% 40%, rgba(30,40,60,0.8) 0%, rgba(9,9,11,1) 70%)" }}
      >
        {/* Room label */}
        <p className="absolute top-3 left-4 text-zinc-600 text-xs uppercase tracking-widest">UTI — Ala Norte</p>

        {/* Prontuário */}
        <button onClick={handleReadProntuario}
          className="absolute top-[30%] left-[10%] flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className={`p-3 rounded-lg transition-all group-hover:scale-110 group-hover:shadow-lg ${unlocked.has("prontuario") ? "bg-green-900/40 shadow-green-500/20" : "bg-zinc-800 hover:bg-zinc-700"}`}>
            <FileText className={`h-8 w-8 ${unlocked.has("prontuario") ? "text-green-400" : "text-zinc-400"}`} />
          </div>
          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Prontuário</span>
        </button>

        {/* Book */}
        <button onClick={handleReadBook}
          className="absolute top-[15%] right-[15%] flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className={`p-3 rounded-lg transition-all group-hover:scale-110 ${unlocked.has("book") ? "bg-blue-900/40 shadow-blue-500/20" : "bg-zinc-800 hover:bg-zinc-700"}`}>
            <BookOpen className={`h-8 w-8 ${unlocked.has("book") ? "text-blue-400" : "text-zinc-400"}`} />
          </div>
          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Livro de Bioquímica</span>
        </button>

        {/* Computer */}
        <button onClick={() => setShowComputer(true)}
          className="absolute bottom-[25%] left-[40%] flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className={`p-3 rounded-lg transition-all group-hover:scale-110 ${computerUnlocked ? "bg-cyan-900/40 shadow-cyan-500/20" : "bg-zinc-800 hover:bg-zinc-700"}`}>
            <Monitor className={`h-8 w-8 ${computerUnlocked ? "text-cyan-400" : "text-zinc-400"}`} />
          </div>
          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Computador</span>
        </button>

        {/* Safe */}
        <button onClick={() => setShowSafe(true)}
          className="absolute top-[45%] right-[8%] flex flex-col items-center gap-1 group cursor-pointer"
        >
          <div className="p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-yellow-500/10">
            <Lock className="h-10 w-10 text-yellow-500" />
          </div>
          <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300">Cofre</span>
        </button>

        {/* Hint */}
        <div className="absolute bottom-3 left-4 flex items-center gap-1 text-zinc-700 text-[10px]">
          <Lightbulb className="h-3 w-3" /> Clique nos objetos para investigar
        </div>
      </div>

      {/* Inventory */}
      <div className="h-20 bg-zinc-900/50 border border-zinc-800 rounded-lg flex items-center px-4 gap-3 overflow-x-auto">
        <span className="text-zinc-600 text-xs uppercase tracking-wide shrink-0">Inventário:</span>
        {inventory.length === 0 && <span className="text-zinc-700 text-xs">Vazio</span>}
        {inventory.map((item) => (
          <Badge key={item.id} variant="secondary" className="shrink-0 text-xs bg-zinc-800 text-zinc-300 border-zinc-700">
            {item.name}
          </Badge>
        ))}
      </div>

      {/* Prontuário Modal */}
      <Dialog open={showProntuario} onOpenChange={setShowProntuario}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-green-400" /> Prontuário do Paciente</DialogTitle>
          </DialogHeader>
          <div className="bg-zinc-800 rounded-lg p-4 text-sm leading-relaxed text-zinc-300 font-mono">
            "Paciente deu entrada com <strong className="text-yellow-400">miose pontiforme</strong>, <strong className="text-yellow-400">depressão respiratória</strong> e <strong className="text-yellow-400">cianose</strong>. Suspeita de <strong className="text-red-400">overdose de opioides</strong>."
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProntuario(false)} className="border-zinc-700 text-zinc-300">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Modal */}
      <Dialog open={showBook} onOpenChange={setShowBook}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-400" /> Livro de Bioquímica</DialogTitle>
          </DialogHeader>
          <div className="bg-zinc-800 rounded-lg p-4 text-sm leading-relaxed text-zinc-300">
            "O antídoto reverte a ligação aos <strong className="text-cyan-400">recetores Mu</strong> em segundos. Lembre-se: A meia-vida do fármaco X é de <strong className="text-yellow-400">4 horas</strong>. O frasco padrão tem <strong className="text-yellow-400">2000mg</strong>."
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBook(false)} className="border-zinc-700 text-zinc-300">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Computer Modal */}
      <Dialog open={showComputer} onOpenChange={setShowComputer}>
        <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Monitor className="h-5 w-5 text-cyan-400" /> Terminal Clínico</DialogTitle>
          </DialogHeader>
          {computerUnlocked ? (
            <div className="bg-zinc-800 rounded-lg p-4 text-sm text-green-400 font-mono">
              <p>ACESSO CONCEDIDO</p>
              <p className="mt-2 text-zinc-300">Código da primeira parte do cofre: <strong className="text-yellow-400">O valor da meia-vida (em horas) seguido dos dois primeiros dígitos da dose do frasco.</strong></p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">O computador pede uma senha. Qual é o antídoto para overdose de opioides?</p>
              <Input
                value={computerPassword}
                onChange={(e) => setComputerPassword(e.target.value)}
                placeholder="Digite a senha..."
                className="bg-zinc-800 border-zinc-700 text-zinc-200"
                onKeyDown={(e) => e.key === "Enter" && handleComputerSubmit()}
              />
              <Button onClick={handleComputerSubmit} className="w-full">Desbloquear</Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowComputer(false)} className="border-zinc-700 text-zinc-300">Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Safe Modal */}
      <Dialog open={showSafe} onOpenChange={setShowSafe}>
        <DialogContent className="sm:max-w-sm bg-zinc-900 border-zinc-700 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-yellow-500" /> Cofre do Antídoto</DialogTitle>
            <DialogDescription className="text-zinc-400">Introduza o código de 4 dígitos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={safeCode}
              onChange={(e) => setSafeCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="0000"
              maxLength={4}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 text-center text-2xl tracking-[0.5em] font-mono"
              onKeyDown={(e) => e.key === "Enter" && safeCode.length === 4 && handleSafeSubmit()}
            />
            <Button onClick={handleSafeSubmit} disabled={safeCode.length !== 4} className="w-full">
              Abrir Cofre
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
