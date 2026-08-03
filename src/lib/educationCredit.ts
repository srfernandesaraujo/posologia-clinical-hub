import jsPDF from "jspdf";

export interface EducationCredit {
  id: string;
  user_id: string;
  student_name: string;
  track_category: string;
  mastery_pct: number;
  distinct_simulators: number;
  credit_hours: number;
  verification_code: string;
  issued_at: string;
  revoked_at: string | null;
}

/** Mesmo espírito de gerarCertificadoPDF (SalaDetalhe.tsx, item 10) — PDF client-side via jsPDF. */
export function generateEducationCreditPDF(credit: EducationCredit) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 22;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Certificado de Trilha de Estudos — Posologia", w / 2, y, { align: "center" });
  y += 14;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Aluno(a): ${credit.student_name}`, 14, y); y += 7;
  doc.text(`Trilha: ${credit.track_category}`, 14, y); y += 7;
  doc.text(`Data: ${new Date(credit.issued_at).toLocaleDateString("pt-BR")}`, 14, y); y += 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`Carga horária: ${credit.credit_hours}h`, 14, y); y += 10;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Maestria: ${credit.mastery_pct}% (${credit.distinct_simulators} simuladores distintos concluídos)`, 14, y);
  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const disclaimer =
    "Este certificado atesta a conclusão de uma trilha de estudos na plataforma Posologia Clinical Hub. " +
    "O reconhecimento como crédito de educação continuada perante conselhos profissionais (CFF, CRF, CFM) " +
    "depende de trâmite institucional próprio, não coberto por este documento.";
  const disclaimerLines = doc.splitTextToSize(disclaimer, w - 28);
  doc.text(disclaimerLines, 14, y);
  y += disclaimerLines.length * 5 + 6;
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.text(`Código de verificação: ${credit.verification_code}`, 14, y); y += 5;
  doc.text(`Verifique em: simulador.posologia.app/verificar-credito/${credit.verification_code}`, 14, y);
  doc.save(`credito-educacao-continuada-${credit.track_category.trim().replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
