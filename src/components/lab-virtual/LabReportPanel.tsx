import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Lock, Send, CheckCircle2 } from "lucide-react";
import { PdfExportButton } from "@/components/PdfExportButton";
import jsPDF from "jspdf";
import { toast } from "sonner";

function sanitizePDF(text: string): string {
  const map: Record<string, string> = {
    "\u00e1": "a", "\u00e0": "a", "\u00e3": "a", "\u00e2": "a", "\u00e9": "e", "\u00ea": "e", "\u00ed": "i",
    "\u00f3": "o", "\u00f4": "o", "\u00f5": "o", "\u00fa": "u", "\u00fc": "u", "\u00e7": "c",
    "\u00c1": "A", "\u00c0": "A", "\u00c3": "A", "\u00c2": "A", "\u00c9": "E", "\u00ca": "E", "\u00cd": "I",
    "\u00d3": "O", "\u00d4": "O", "\u00d5": "O", "\u00da": "U", "\u00dc": "U", "\u00c7": "C",
    "\u2013": "-", "\u2014": "-", "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"',
    "\u2026": "...", "\u2265": ">=", "\u2264": "<=", "\u00b2": "2", "\u00b3": "3",
    "\u00b5": "u", "\u03b1": "alpha", "\u03b2": "beta", "\u0394": "Delta",
  };
  return text.replace(/[^\x00-\x7F]/g, (ch) => map[ch] ?? "");
}

interface LabReportPanelProps {
  benchTitle: string;
  isUnlocked: boolean;
  experimentSummary?: Record<string, string>;
  /** Virtual Room mode */
  isVirtualRoom?: boolean;
  /** Called when student clicks "Enviar" in VR mode */
  onVRSubmit?: (reportData: { hypothesis: string; results: string; conclusion: string }) => void;
  /** Whether VR submission was already sent */
  vrSubmitted?: boolean;
}

export function LabReportPanel({ benchTitle, isUnlocked, experimentSummary, isVirtualRoom, onVRSubmit, vrSubmitted }: LabReportPanelProps) {
  const [hypothesis, setHypothesis] = useState("");
  const [resultsText, setResultsText] = useState("");
  const [conclusion, setConclusion] = useState("");
  const [sent, setSent] = useState(false);

  const canExport = hypothesis.trim().length > 10 && resultsText.trim().length > 10 && conclusion.trim().length > 10;
  const alreadySent = sent || vrSubmitted;

  const exportPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = margin;

    doc.setFontSize(16);
    doc.text(sanitizePDF(`Relatorio - ${benchTitle}`), margin, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(sanitizePDF(`Data: ${new Date().toLocaleDateString("pt-BR")}`), margin, y);
    y += 12;

    if (experimentSummary && Object.keys(experimentSummary).length > 0) {
      doc.setFontSize(12);
      doc.text("Parametros do Experimento", margin, y);
      y += 8;
      doc.setFontSize(10);
      Object.entries(experimentSummary).forEach(([key, value]) => {
        doc.text(sanitizePDF(`${key}: ${value}`), margin + 4, y);
        y += 6;
        if (y > 270) { doc.addPage(); y = margin; }
      });
      y += 6;
    }

    const sections = [
      { title: "Hipotese", text: hypothesis },
      { title: "Principais Resultados", text: resultsText },
      { title: "Conclusao", text: conclusion },
    ];

    sections.forEach(({ title, text }) => {
      doc.setFontSize(12);
      doc.text(sanitizePDF(title), margin, y);
      y += 8;
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(sanitizePDF(text), 170);
      lines.forEach((line: string) => {
        if (y > 270) { doc.addPage(); y = margin; }
        doc.text(line, margin + 4, y);
        y += 6;
      });
      y += 6;
    });

    doc.save(sanitizePDF(`relatorio-${benchTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`));
  };

  const handleVRSubmit = () => {
    if (!onVRSubmit) return;
    onVRSubmit({ hypothesis, results: resultsText, conclusion });
    setSent(true);
    toast.success("Resultados enviados com sucesso!");
  };

  if (!isUnlocked) {
    return (
      <Card className="lg:col-span-2 relative overflow-hidden">
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-2">
          <Lock className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Complete os módulos anteriores para desbloquear o relatório</p>
        </div>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> 5. Mini-Relatório
          </CardTitle>
        </CardHeader>
        <CardContent><div className="h-40" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> 5. Mini-Relatório
          <Badge variant="outline" className="text-[10px] ml-auto">Desbloqueado</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Hipótese</label>
          <Textarea
            placeholder="O que você esperava encontrar neste experimento? Descreva sua hipótese inicial..."
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            rows={3}
            disabled={alreadySent}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Principais Resultados</label>
          <Textarea
            placeholder="Descreva os resultados mais relevantes do experimento..."
            value={resultsText}
            onChange={(e) => setResultsText(e.target.value)}
            rows={4}
            disabled={alreadySent}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Conclusão</label>
          <Textarea
            placeholder="Interprete os resultados. Sua hipótese foi confirmada? Qual a significância dos achados?"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            rows={3}
            disabled={alreadySent}
          />
        </div>

        {alreadySent ? (
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              {isVirtualRoom ? "Resultados enviados ao professor!" : "Tentativa registrada!"}
            </span>
          </div>
        ) : (
          <>
            <Button onClick={handleVRSubmit} disabled={!canExport} className="w-full bg-primary hover:bg-primary/90">
              <Send className="h-4 w-4 mr-2" />
              {isVirtualRoom ? "Enviar Resultados" : "Registrar Tentativa"}
            </Button>
            {!canExport && (
              <p className="text-xs text-muted-foreground text-center">Preencha todos os campos com pelo menos 10 caracteres para enviar</p>
            )}
          </>
        )}
        {!isVirtualRoom && (
          <PdfExportButton onExport={() => canExport && exportPDF()} label="Exportar Relatório em PDF" />
        )}
      </CardContent>
    </Card>
  );
}
