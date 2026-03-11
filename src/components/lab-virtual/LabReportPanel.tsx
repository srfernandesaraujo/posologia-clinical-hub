import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Lock } from "lucide-react";
import jsPDF from "jspdf";

function sanitizePDF(text: string): string {
  const map: Record<string, string> = {
    á: "a", à: "a", ã: "a", â: "a", é: "e", ê: "e", í: "i", ó: "o", ô: "o", õ: "o", ú: "u", ü: "u",
    ç: "c", Á: "A", À: "A", Ã: "A", Â: "A", É: "E", Ê: "E", Í: "I", Ó: "O", Ô: "O", Õ: "O", Ú: "U", Ü: "U", Ç: "C",
    "–": "-", "—": "-", "'": "'", "'": "'", """: '"', """: '"', "…": "...", "≥": ">=", "≤": "<=", "²": "2", "³": "3",
    µ: "u", α: "alpha", β: "beta", Δ: "Delta",
  };
  return text.replace(/[^\x00-\x7F]/g, (ch) => map[ch] ?? "");
}

interface LabReportPanelProps {
  benchTitle: string;
  isUnlocked: boolean;
  experimentSummary?: Record<string, string>;
}

export function LabReportPanel({ benchTitle, isUnlocked, experimentSummary }: LabReportPanelProps) {
  const [hypothesis, setHypothesis] = useState("");
  const [resultsText, setResultsText] = useState("");
  const [conclusion, setConclusion] = useState("");

  const canExport = hypothesis.trim().length > 10 && resultsText.trim().length > 10 && conclusion.trim().length > 10;

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
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Principais Resultados</label>
          <Textarea
            placeholder="Descreva os resultados mais relevantes do experimento..."
            value={resultsText}
            onChange={(e) => setResultsText(e.target.value)}
            rows={4}
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Conclusão</label>
          <Textarea
            placeholder="Interprete os resultados. Sua hipótese foi confirmada? Qual a significância dos achados?"
            value={conclusion}
            onChange={(e) => setConclusion(e.target.value)}
            rows={3}
          />
        </div>
        <Button onClick={exportPDF} disabled={!canExport} className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório em PDF
        </Button>
        {!canExport && (
          <p className="text-xs text-muted-foreground text-center">Preencha todos os campos com pelo menos 10 caracteres para exportar</p>
        )}
      </CardContent>
    </Card>
  );
}
