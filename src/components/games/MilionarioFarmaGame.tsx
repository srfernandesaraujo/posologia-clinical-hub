import { useState, useCallback } from "react";
import { Stethoscope, Users, BookOpen, PhoneCall, Award, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface Question { id: number; levelName: string; question: string; options: string[]; correctIndex: number; hint: string; audienceVotes: number[]; }

const defaultQuestions: Question[] = [
  { id: 1, levelName: "Interno", question: "Durante uma anamnese, um paciente relata azia constante. Qual destes medicamentos é um Inibidor da Bomba de Prótons (IBP)?", options: ["Ibuprofeno", "Omeprazol", "Losartana", "Metformina"], correctIndex: 1, hint: "Pense no grupo dos '-prazóis'. São fármacos que atuam diretamente na célula parietal gástrica.", audienceVotes: [8, 72, 12, 8] },
  { id: 2, levelName: "Residente Júnior", question: "Qual é o termo clínico que descreve o uso simultâneo de 5 ou mais medicamentos por um único paciente?", options: ["Multiterapia", "Iatrogenia", "Polifarmácia", "Cascata Prescritiva"], correctIndex: 2, hint: "O prefixo 'poli-' vem do grego e significa 'muitos'. É um termo muito usado em geriatria.", audienceVotes: [15, 10, 65, 10] },
  { id: 3, levelName: "Residente Sênior", question: "Um paciente chega à urgência com suspeita de intoxicação severa por Paracetamol. Qual é o antídoto padrão a ser administrado?", options: ["N-acetilcisteína", "Flumazenil", "Naloxona", "Atropina"], correctIndex: 0, hint: "É a mesma substância usada como mucolítico, mas em doses muito mais altas por via intravenosa.", audienceVotes: [58, 18, 16, 8] },
  { id: 4, levelName: "Especialista", question: "Paciente em uso de Varfarina apresenta no exame laboratorial um INR de 7.5, mas sem sinais de sangramento ativo. Qual a conduta farmacoterapêutica recomendada?", options: ["Manter a dose e reavaliar em 7 dias", "Suspender Varfarina e dar Plasma Fresco", "Aumentar a dose de Varfarina", "Suspender Varfarina e administrar Vitamina K oral"], correctIndex: 3, hint: "A Vitamina K é o antagonista fisiológico da Varfarina. Se não há sangramento, a via oral é preferida.", audienceVotes: [5, 22, 3, 70] },
  { id: 5, levelName: "Chefe de Clínica", question: "Os inibidores da SGLT2 (como a Dapagliflozina) mudaram o tratamento da Diabetes e Insuficiência Cardíaca. Qual é o seu principal mecanismo de ação?", options: ["Estimulam a secreção de insulina no pâncreas", "Inibem a reabsorção de glicose no túbulo contorcido proximal", "Aumentam a sensibilidade à insulina no músculo", "Inibem a absorção de carboidratos no intestino"], correctIndex: 1, hint: "SGLT2 é o co-transportador sódio-glicose tipo 2, localizado no rim. Inibi-lo provoca glicosúria.", audienceVotes: [12, 62, 18, 8] },
];

const letters = ["A", "B", "C", "D"];

export default function MilionarioFarmaGame({ customData }: { customData?: any }) {
  const questions: Question[] = customData?.questions || defaultQuestions;

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");
  const [usedFiftyFifty, setUsedFiftyFifty] = useState(false);
  const [usedPhone, setUsedPhone] = useState(false);
  const [usedAudience, setUsedAudience] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<Set<number>>(new Set());
  const [showAudience, setShowAudience] = useState(false);

  const q = questions[qIndex];

  const restart = () => { setQIndex(0); setSelected(null); setIsRevealing(false); setRevealed(false); setGameStatus("playing"); setUsedFiftyFifty(false); setUsedPhone(false); setUsedAudience(false); setHiddenOptions(new Set()); setShowAudience(false); };

  const handleSelect = (i: number) => { if (isRevealing || revealed || selected !== null || hiddenOptions.has(i)) return; setSelected(i); };

  const handleConfirm = () => {
    if (selected === null) return;
    setIsRevealing(true); setShowAudience(false);
    setTimeout(() => {
      setRevealed(true); setIsRevealing(false);
      const correct = selected === q.correctIndex;
      setTimeout(() => {
        if (!correct) setGameStatus("lost");
        else if (qIndex === questions.length - 1) setGameStatus("won");
        else { setQIndex((i) => i + 1); setSelected(null); setRevealed(false); setHiddenOptions(new Set()); setShowAudience(false); }
      }, 2000);
    }, 2500);
  };

  const useFiftyFifty = () => { if (usedFiftyFifty) return; setUsedFiftyFifty(true); const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correctIndex); const toHide = wrong.sort(() => Math.random() - 0.5).slice(0, 2); setHiddenOptions(new Set(toHide)); };
  const usePhone = () => { if (usedPhone) return; setUsedPhone(true); toast.info(`Preceptor diz: "${q.hint}"`, { duration: 8000 }); };
  const useAudience = () => { if (usedAudience) return; setUsedAudience(true); setShowAudience(true); };

  if (gameStatus !== "playing") {
    const won = gameStatus === "won";
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className={`rounded-full p-6 ${won ? "bg-yellow-900/40" : "bg-red-900/40"}`}>{won ? <Award className="h-16 w-16 text-yellow-400" /> : <XCircle className="h-16 w-16 text-red-400" />}</div>
        <h2 className={`text-2xl font-bold ${won ? "text-yellow-400" : "text-red-400"}`}>{won ? "Parabéns, Chefe de Clínica!" : "O seu plantão terminou."}</h2>
        <p className="text-zinc-400 max-w-md">{won ? "O seu raciocínio farmacoterapêutico é impecável. Alcançou o topo da carreira hospitalar!" : "Volte a estudar as diretrizes e tente novamente. A prática leva à excelência."}</p>
        <Button onClick={restart} variant="outline" className="gap-2 border-zinc-700 text-zinc-200 hover:bg-zinc-800">Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><p className="text-sm text-zinc-400">Pergunta {qIndex + 1} / {questions.length}</p><p className="font-bold text-zinc-100 flex items-center gap-2"><Stethoscope className="h-4 w-4 text-cyan-400" />Nível: {q.levelName}</p></div>
        <div className="flex gap-2">
          <button onClick={useFiftyFifty} disabled={usedFiftyFifty || selected !== null} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${usedFiftyFifty ? "opacity-40 border-zinc-700 cursor-not-allowed" : "border-blue-500 text-blue-400 hover:bg-blue-500/20 cursor-pointer"}`} title="Revisão de Literatura (50/50)"><BookOpen className="h-4 w-4" /></button>
          <button onClick={usePhone} disabled={usedPhone || selected !== null} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${usedPhone ? "opacity-40 border-zinc-700 cursor-not-allowed" : "border-green-500 text-green-400 hover:bg-green-500/20 cursor-pointer"}`} title="Ligar para o Preceptor"><PhoneCall className="h-4 w-4" /></button>
          <button onClick={useAudience} disabled={usedAudience || selected !== null} className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${usedAudience ? "opacity-40 border-zinc-700 cursor-not-allowed" : "border-purple-500 text-purple-400 hover:bg-purple-500/20 cursor-pointer"}`} title="Reunião Clínica"><Users className="h-4 w-4" /></button>
        </div>
      </div>
      <Progress value={((qIndex) / questions.length) * 100} className="h-1.5" />
      <div className="rounded-xl border border-blue-500/40 bg-blue-950/40 backdrop-blur-sm p-6"><p className="text-zinc-100 text-lg font-medium leading-relaxed">{q.question}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {q.options.map((opt, i) => {
          if (hiddenOptions.has(i)) return <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 opacity-30 h-full" />;
          let style = "border-blue-500/30 bg-blue-950/20 text-zinc-200 hover:border-blue-400/60 cursor-pointer";
          if (selected === i && !revealed) style = "border-yellow-400 bg-yellow-500/20 text-yellow-100 animate-pulse";
          if (revealed) { if (i === q.correctIndex) style = "border-green-400 bg-green-600 text-white"; else if (i === selected) style = "border-red-400 bg-red-600 text-white"; }
          const disabled = (selected !== null && selected !== i && !revealed) || isRevealing || revealed;
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={disabled} className={`rounded-lg border-2 p-4 text-left transition-all duration-300 flex items-start gap-3 ${style} ${disabled && selected !== i ? "opacity-60 cursor-not-allowed" : ""}`}>
              <span className="shrink-0 w-8 h-8 rounded-md bg-blue-500/20 flex items-center justify-center font-bold text-sm text-blue-300">{letters[i]}</span>
              <span className="flex-1 text-sm font-medium">{opt}</span>
              {showAudience && <span className="shrink-0 text-xs font-mono text-zinc-400">{q.audienceVotes[i]}%</span>}
            </button>
          );
        })}
      </div>
      {selected !== null && !revealed && !isRevealing && (<div className="flex justify-center animate-in fade-in"><Button size="lg" onClick={handleConfirm} className="gap-2 bg-yellow-600 hover:bg-yellow-700 text-white">Confirmar Decisão Clínica</Button></div>)}
      {isRevealing && <p className="text-center text-zinc-500 animate-pulse text-sm">A verificar resposta...</p>}
    </div>
  );
}
