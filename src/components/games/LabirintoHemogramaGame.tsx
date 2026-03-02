import { useState } from "react";
import { Droplet, ArrowRight, AlertCircle, CheckCircle2, Map, Trophy, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StoryNode {
  id: string;
  title: string;
  labData: string;
  question: string;
  options: { text: string; nextNode: string; isError: boolean }[];
}

const storyNodes: Record<string, StoryNode> = {
  root: {
    id: "root", title: "Passo 1: A Descoberta",
    labData: "Hemoglobina (Hb): 9.2 g/dL (Referência: 13-17 g/dL)",
    question: "O paciente tem anemia. Qual é o PRIMEIRO índice hematimétrico que deve avaliar para classificar esta anemia?",
    options: [
      { text: "Olhar para os Leucócitos (Série Branca)", nextNode: "", isError: true },
      { text: "Olhar para o VCM (Volume Corpuscular Médio)", nextNode: "node_vcm", isError: false },
      { text: "Pedir logo o exame de Ferro Sérico", nextNode: "", isError: true },
    ],
  },
  node_vcm: {
    id: "node_vcm", title: "Passo 2: O Tamanho da Célula",
    labData: "VCM: 72 fL (Referência: 80-100 fL). Anemia Microcítica.",
    question: "As hemácias estão pequenas. Qual é o exame laboratorial de confirmação mais indicado agora?",
    options: [
      { text: "Dosagem de Vitamina B12 e Ácido Fólico", nextNode: "", isError: true },
      { text: "Perfil de Ferro (Ferritina, TIBC)", nextNode: "node_ferro", isError: false },
      { text: "Teste de Coombs Direto", nextNode: "", isError: true },
    ],
  },
  node_ferro: {
    id: "node_ferro", title: "Passo 3: As Reservas",
    labData: "Ferritina: 5 ng/mL (Baixa). TIBC: Elevado.",
    question: "Com este perfil de ferro, qual é o diagnóstico final do labirinto?",
    options: [
      { text: "Anemia de Doença Crónica", nextNode: "", isError: true },
      { text: "Traço Talassémico", nextNode: "", isError: true },
      { text: "Anemia Ferropénica", nextNode: "victory", isError: false },
    ],
  },
};

export default function LabirintoHemogramaGame({ customData }: { customData?: any }) {
  const nodes: Record<string, StoryNode> = customData?.storyNodes || storyNodes;
  const [currentNodeId, setCurrentNodeId] = useState("root");
  const [score, setScore] = useState(100);
  const [pathHistory, setPathHistory] = useState<string[]>(["Início"]);
  const [gameStatus, setGameStatus] = useState<"playing" | "won" | "lost">("playing");

  const node = storyNodes[currentNodeId];

  const handleOption = (opt: { text: string; nextNode: string; isError: boolean }) => {
    if (opt.isError) {
      const newScore = score - 20;
      setScore(Math.max(0, newScore));
      toast.error("Raciocínio incorreto. Perdeu 20 pontos. Tente outra abordagem.");
      if (newScore <= 0) setGameStatus("lost");
      return;
    }
    if (opt.nextNode === "victory") {
      setPathHistory((p) => [...p, "Anemia Ferropénica"]);
      setGameStatus("won");
      return;
    }
    const next = storyNodes[opt.nextNode];
    if (next) {
      setCurrentNodeId(opt.nextNode);
      setPathHistory((p) => [...p, next.title]);
    }
  };

  const restart = () => { setCurrentNodeId("root"); setScore(100); setPathHistory(["Início"]); setGameStatus("playing"); };

  if (gameStatus !== "playing") {
    const won = gameStatus === "won";
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-5">
        <div className={`rounded-full p-5 ${won ? "bg-green-100" : "bg-red-100"}`}>
          {won ? <Trophy className="h-14 w-14 text-green-600" /> : <XCircle className="h-14 w-14 text-red-600" />}
        </div>
        <h2 className={`text-xl font-bold ${won ? "text-green-700" : "text-red-700"}`}>
          {won ? "Diagnóstico Correto!" : "Diagnóstico Falhou!"}
        </h2>
        {won && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {pathHistory.map((p, i) => (<span key={i} className="flex items-center gap-1">{i > 0 && <ArrowRight className="h-3 w-3" />}{p}</span>))}
          </div>
        )}
        <p className="text-muted-foreground text-sm">Pontuação: {score}/100</p>
        <Button onClick={restart} variant="outline">Reiniciar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 flex-wrap text-xs text-muted-foreground">
        <Map className="h-3 w-3" />
        {pathHistory.map((p, i) => (<span key={i} className="flex items-center gap-1">{i > 0 && <ArrowRight className="h-3 w-3" />}{p}</span>))}
      </div>
      <div className="flex justify-between items-center">
        <Badge variant="secondary">Pontuação: {score}</Badge>
      </div>

      {node && (
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg">{node.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm font-mono text-red-800 flex items-start gap-2">
                <Droplet className="h-4 w-4 shrink-0 mt-0.5" />{node.labData}
              </p>
            </div>
            <p className="text-base font-medium">{node.question}</p>
            <div className="space-y-2">
              {node.options.map((opt, i) => (
                <Button key={i} variant="outline" className="w-full justify-start text-left text-sm h-auto py-3 whitespace-normal" onClick={() => handleOption(opt)}>
                  {opt.text}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
