import { useEffect, useMemo, useState } from "react";
import { KpiTile, ScoreDistributionCard, ActivityPerformanceCard, RankingCard, scoreTone, formatDuration, type ActivityRow } from "@/components/rooms/RoomAnalytics";
import { NATIVE_SIMULATORS } from "@/data/simulatorCatalog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader, EmptyState } from "@/components/layouts/PageHeader";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { computeCompetencyBreakdown, generateCertificateCode } from "@/lib/osceCertificate";
import { computeItemStats, computeWeightedGrade, computeGroupMedianResponseTimes, computeSpeedProfile } from "@/lib/examPsychometrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Users, BarChart3, Settings as SettingsIcon, Info, Copy, Mail,
  UserCheck, UserPlus, ClipboardList, Trash2, Award, ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { useClassStudents } from "@/hooks/useClasses";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { ParticipantDetail, SIMULATOR_LABELS } from "./Analytics";

// Paleta espelha a cor primária da marca (hsl(168 80% 42%)) convertida para RGB,
// com uma variante mais escura para texto/título (legível sobre fundo branco).
const BRAND_TEAL: [number, number, number] = [21, 193, 159];
const BRAND_TEAL_DARK: [number, number, number] = [14, 129, 106];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_200: [number, number, number] = [226, 232, 240];

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return [22, 163, 74]; // green-600
  if (score >= 50) return [217, 119, 6]; // amber-600
  return [220, 38, 38]; // red-600
}

/** Escreve texto centralizado na página, quebrando em várias linhas se necessário; devolve o y após o bloco. */
function centeredBlock(
  doc: jsPDF, text: string, y: number, pageW: number,
  opts: { fontSize: number; font?: string; style?: string; maxWidth?: number; lineHeight?: number; color?: [number, number, number] },
): number {
  const { fontSize, font = "helvetica", style = "normal", maxWidth = pageW - 60, color = SLATE_900 } = opts;
  const lineHeight = opts.lineHeight ?? fontSize * 0.42;
  doc.setFont(font, style);
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(text, maxWidth);
  lines.forEach((line: string, i: number) => doc.text(line, pageW / 2, y + i * lineHeight, { align: "center" }));
  return y + lines.length * lineHeight;
}

function gerarCertificadoPDF(cert: {
  student_name: string;
  exam_title: string;
  final_score: number;
  final_score_10?: number | null;
  competency_breakdown: { category: string; score: number; activityCount: number }[];
  integrity_flags: { tabSwitchCount?: number };
  verification_code: string;
  issued_at: string;
}) {
  const doc = new jsPDF({ orientation: "landscape" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const cx = w / 2;

  // Moldura dupla
  doc.setDrawColor(...BRAND_TEAL);
  doc.setLineWidth(1);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setLineWidth(0.3);
  doc.rect(12, 12, w - 24, h - 24);

  // Cabeçalho de marca
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_TEAL_DARK);
  doc.text("P O S O L O G I A   C L I N I C A L   H U B", cx, 24, { align: "center" });

  // Título
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...BRAND_TEAL_DARK);
  doc.text("Certificado OSCE", cx, 40, { align: "center" });

  doc.setDrawColor(...BRAND_TEAL);
  doc.setLineWidth(0.6);
  doc.line(cx - 22, 45, cx + 22, 45);

  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.setTextColor(...SLATE_500);
  doc.text("Objective Structured Clinical Examination", cx, 53, { align: "center" });

  // Corpo
  let y = 68;
  y = centeredBlock(doc, "Certificamos que", y, w, { fontSize: 11, color: SLATE_500 });
  y += 6;
  y = centeredBlock(doc, cert.student_name, y, w, { fontSize: 19, font: "times", style: "bold", lineHeight: 9, maxWidth: w - 70 });
  y += 7;
  y = centeredBlock(
    doc,
    `concluiu a prova "${cert.exam_title}" com aproveitamento em ${new Date(cert.issued_at).toLocaleDateString("pt-BR")}, obtendo nota final de`,
    y, w, { fontSize: 11.5, maxWidth: w - 90 },
  );

  // Nota final em destaque — nota ponderada (0-10) quando disponível, com o % bruto como linha secundária
  y += 6;
  if (typeof cert.final_score_10 === "number") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...scoreColor(cert.final_score));
    doc.text(`${cert.final_score_10.toFixed(1).replace(".", ",")} / 10`, cx, y + 10, { align: "center" });
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_500);
    doc.text(`(${cert.final_score}% de aproveitamento bruto)`, cx, y, { align: "center" });
    y += 9;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...scoreColor(cert.final_score));
    doc.text(`${cert.final_score}%`, cx, y + 10, { align: "center" });
    y += 18;
  }

  // Tabela de desempenho por competência
  if (cert.competency_breakdown.length > 0) {
    const tableW = 150;
    const tx = cx - tableW / 2;
    const rowH = 7;
    let ty = y + 4;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE_500);
    doc.text("DESEMPENHO POR COMPETÊNCIA", cx, ty, { align: "center" });
    ty += 5;

    doc.setDrawColor(...SLATE_200);
    doc.setLineWidth(0.2);
    doc.setFontSize(9.5);
    cert.competency_breakdown.forEach((c, i) => {
      const rowY = ty + i * rowH;
      if (i % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(tx, rowY, tableW, rowH, "F");
      }
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE_900);
      doc.text(c.category, tx + 4, rowY + rowH / 2 + 1.5);
      doc.text(`${c.activityCount} estação${c.activityCount > 1 ? "ões" : ""}`, tx + tableW - 32, rowY + rowH / 2 + 1.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...scoreColor(c.score));
      doc.text(`${c.score}%`, tx + tableW - 4, rowY + rowH / 2 + 1.5, { align: "right" });
      doc.line(tx, rowY + rowH, tx + tableW, rowY + rowH);
    });
    y = ty + cert.competency_breakdown.length * rowH + 6;
  }

  // Sinal de integridade
  const tabSwitches = cert.integrity_flags?.tabSwitchCount ?? 0;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.text(
    tabSwitches > 0
      ? `Sinal de integridade: ${tabSwitches} evento(s) de perda de foco/tela-cheia registrados durante a prova.`
      : "Sinal de integridade: nenhum evento de perda de foco registrado durante a prova.",
    cx, y, { align: "center" },
  );

  // Rodapé: verificação
  const footerY = h - 18;
  doc.setDrawColor(...SLATE_200);
  doc.setLineWidth(0.2);
  doc.line(20, footerY - 6, w - 20, footerY - 6);
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_500);
  doc.text(`Código de verificação: ${cert.verification_code}`, 20, footerY);
  doc.text(`Verifique em simulador.posologia.app/verificar-certificado/${cert.verification_code}`, 20, footerY + 5);
  doc.text(`Emitido em ${new Date(cert.issued_at).toLocaleDateString("pt-BR")}`, w - 20, footerY, { align: "right" });

  doc.save(`certificado-osce-${cert.student_name.trim().replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

export default function SalaDetalhe() {
  const { classId, roomId } = useParams<{ classId: string; roomId: string }>();
  const [searchParams] = useSearchParams();
  const focusParticipantId = searchParams.get("focus");
  const qc = useQueryClient();

  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase.from("virtual_rooms").select("*").eq("id", roomId!).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["room-participants", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_participants").select("*").eq("room_id", roomId!).order("joined_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["room-submissions", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase.from("room_submissions").select("*").eq("room_id", roomId!).order("submitted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["room-activities", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("room_activities")
        .select("*, simulator_cases(title)")
        .eq("room_id", roomId!)
        .order("position");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: certificates = [] } = useQuery({
    queryKey: ["osce-certificates", roomId],
    enabled: !!roomId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("osce_certificates").select("*").eq("room_id", roomId!);
      if (error) throw error;
      return data || [];
    },
  });

  const { list: studentsQ } = useClassStudents(classId);
  const { user } = useAuth();
  const { isPremium, upgradeOpen, setUpgradeOpen, upgradeFeature, showUpgrade } = useFeatureGating();

  const certificateByParticipant = useMemo(() => {
    const map = new Map<string, any>();
    (certificates as any[]).forEach((c) => map.set(c.participant_id, c));
    return map;
  }, [certificates]);

  const issueCertificate = useMutation({
    mutationFn: async (participant: any) => {
      if (!isPremium) {
        showUpgrade("Certificados OSCE");
        throw new Error("__upgrade_required__");
      }
      const pSubs = (submissions as any[]).filter((s) => s.participant_id === participant.id);
      const finalScore = pSubs.length ? Math.round(pSubs.reduce((a, s) => a + (s.score || 0), 0) / pSubs.length) : 0;
      const breakdown = computeCompetencyBreakdown(activities as any, pSubs);
      const tabSwitchCount = pSubs.reduce((a, s) => a + (s.tab_switch_count || 0), 0);

      // Dossiê psicométrico: nota ponderada (0-10) por dificuldade/discriminação recalculadas
      // nesta sala, uma vez por atividade de desafio que o participante completou.
      const itemAnalysis: Record<string, any> = {};
      let grade10Sum = 0;
      let grade10Count = 0;
      for (const sub of pSubs) {
        if (sub.actions?.type !== "challenge_results") continue;
        const subQuestions = sub.actions.questions || [];
        if (subQuestions.length === 0) continue;
        const itemStats = computeItemStats(submissions as any[], sub.activity_id ?? null);
        const weightedGrade = computeWeightedGrade(subQuestions, itemStats);
        const groupMedians = computeGroupMedianResponseTimes(submissions as any[], sub.activity_id ?? null);
        const speedProfile = computeSpeedProfile(subQuestions, groupMedians);
        itemAnalysis[sub.activity_id || "default"] = {
          itemStats: Object.fromEntries(itemStats),
          weightedGrade,
          speedProfile,
        };
        grade10Sum += weightedGrade.grade10;
        grade10Count += 1;
      }
      const finalScore10 = grade10Count > 0 ? Math.round((grade10Sum / grade10Count) * 10) / 10 : null;

      const { data, error } = await (supabase as any)
        .from("osce_certificates")
        .upsert(
          {
            room_id: roomId,
            participant_id: participant.id,
            verification_code: generateCertificateCode(),
            student_name: participant.participant_name,
            exam_title: room?.title || "Prova",
            final_score: finalScore,
            final_score_10: finalScore10,
            item_analysis: itemAnalysis as any,
            competency_breakdown: breakdown as any,
            integrity_flags: { tabSwitchCount } as any,
            issued_by: user!.id,
            issued_at: new Date().toISOString(),
            revoked_at: null,
          },
          { onConflict: "room_id,participant_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (cert) => {
      qc.invalidateQueries({ queryKey: ["osce-certificates", roomId] });
      gerarCertificadoPDF(cert as any);
      toast.success("Certificado emitido");
    },
    onError: (e: any) => {
      if (e.message !== "__upgrade_required__") toast.error(e.message);
    },
  });

  const revokeCertificate = useMutation({
    mutationFn: async (certId: string) => {
      const { error } = await (supabase as any).from("osce_certificates").update({ revoked_at: new Date().toISOString() }).eq("id", certId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["osce-certificates", roomId] });
      toast.success("Certificado revogado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteParticipant = useMutation({
    mutationFn: async (pid: string) => {
      await supabase.from("room_submissions").delete().eq("participant_id", pid);
      const { error } = await supabase.from("room_participants").delete().eq("id", pid);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["room-participants", roomId] });
      qc.invalidateQueries({ queryKey: ["room-submissions", roomId] });
      toast.success("Envio removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const subs = submissions as any[];
    const count = subs.length;
    const avgScore = count ? Math.round(subs.reduce((a, s) => a + (s.score || 0), 0) / count) : 0;
    const max = count ? Math.max(...subs.map((s: any) => s.score || 0)) : 0;
    const min = count ? Math.min(...subs.map((s: any) => s.score || 0)) : 0;
    const avgTime = count ? subs.reduce((a: number, s: any) => a + (s.time_spent_seconds || 0), 0) / count : 0;
    return { count, avgScore, max, min, avgTime, participants: participants.length };
  }, [submissions, participants]);

  const isExam = activities.length > 0;

  // Score distribution
  const scoreDist = useMemo(() => {
    const subs = submissions as any[];
    if (!subs.length) return [];
    return [
      { range: "0-39%", count: subs.filter((s: any) => s.score < 40).length },
      { range: "40-59%", count: subs.filter((s: any) => s.score >= 40 && s.score < 60).length },
      { range: "60-79%", count: subs.filter((s: any) => s.score >= 60 && s.score < 80).length },
      { range: "80-100%", count: subs.filter((s: any) => s.score >= 80).length },
    ];
  }, [submissions]);

  // Per-participant ranking
  const perParticipant = useMemo(() => {
    const map = new Map<string, any[]>();
    (submissions as any[]).forEach(s => {
      const arr = map.get(s.participant_id) || [];
      arr.push(s);
      map.set(s.participant_id, arr);
    });
    return (participants as any[]).map(p => {
      const subs = map.get(p.id) || [];
      const score = subs.length ? Math.round(subs.reduce((a, s) => a + (s.score || 0), 0) / subs.length) : 0;
      return { id: p.id, name: p.participant_name || "—", score, subs: subs.length };
    }).filter(d => d.subs > 0).sort((a, b) => b.score - a.score);
  }, [participants, submissions]);

  useEffect(() => {
    if (!focusParticipantId || (participants as any[]).length === 0) return;
    const el = document.getElementById(`participant-${focusParticipantId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusParticipantId, participants]);

  const [studentQuery, setStudentQuery] = useState("");
  const [studentSort, setStudentSort] = useState<"score-desc" | "score-asc" | "name" | "recent">("score-desc");
  const [onlyAtRisk, setOnlyAtRisk] = useState(false);

  const participantsWithSubs = useMemo(
    () => (participants as any[]).filter((p: any) => (submissions as any[]).some((s: any) => s.participant_id === p.id)),
    [participants, submissions],
  );
  const studentRows = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    const rows = participantsWithSubs.map((p: any) => {
      const pSubs = (submissions as any[]).filter((s: any) => s.participant_id === p.id);
      const pAvg = pSubs.length ? Math.round(pSubs.reduce((a, s) => a + (s.score || 0), 0) / pSubs.length) : 0;
      const pTime = pSubs.reduce((a, s) => a + (s.time_spent_seconds || 0), 0);
      return { p, pSubs, pAvg, pTime };
    })
      .filter((r) => !q || String(r.p.participant_name || "").toLowerCase().includes(q) || String(r.p.participant_email || "").toLowerCase().includes(q))
      .filter((r) => !onlyAtRisk || r.pAvg < 60);
    rows.sort((a, b) => studentSort === "score-desc" ? b.pAvg - a.pAvg
      : studentSort === "score-asc" ? a.pAvg - b.pAvg
      : studentSort === "name" ? String(a.p.participant_name).localeCompare(String(b.p.participant_name), "pt-BR")
      : new Date(b.p.joined_at).getTime() - new Date(a.p.joined_at).getTime());
    return rows;
  }, [participantsWithSubs, submissions, studentQuery, studentSort, onlyAtRisk]);

  const toolLabel = (slug: string) => SIMULATOR_LABELS[slug] || NATIVE_SIMULATORS.find((s) => s.slug === slug)?.name || slug;
  const activityRows: ActivityRow[] = useMemo(() => (activities as any[]).map((act: any, i: number) => {
    const actSubs = (submissions as any[]).filter((s: any) => s.activity_id === act.id);
    return {
      id: act.id,
      index: i,
      label: toolLabel(act.simulator_slug),
      caseTitle: act.simulator_cases?.title ?? null,
      avg: actSubs.length ? Math.round(actSubs.reduce((a, s) => a + (s.score || 0), 0) / actSubs.length) : null,
      count: actSubs.length,
    };
  }), [activities, submissions]);

  const copyPin = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.pin);
    toast.success("PIN copiado");
  };

  if (!room) {
    return <div className="container mx-auto py-8"><p className="text-muted-foreground">Carregando…</p></div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
      <PageHeader
        backTo={classId ? `/turmas/${classId}` : "/salas-virtuais"}
        title={room.title}
        className="mb-0"
        badges={<>
          <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Encerrada"}</Badge>
          {isExam ? (
            <Badge variant="outline"><ClipboardList className="h-3 w-3 mr-1" />Prova · {activities.length} atividades</Badge>
          ) : room.simulator_slug ? (
            <Badge variant="outline">{SIMULATOR_LABELS[room.simulator_slug] || room.simulator_slug}</Badge>
          ) : null}
          <button onClick={copyPin} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            PIN: <span className="font-mono">{room.pin}</span> <Copy className="h-3 w-3" />
          </button>
        </>}
      />

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="participants"><Users className="h-3.5 w-3.5 mr-1" /> Participantes</TabsTrigger>
          <TabsTrigger value="overview"><Info className="h-3.5 w-3.5 mr-1" /> Visão geral</TabsTrigger>
          <TabsTrigger value="config"><SettingsIcon className="h-3.5 w-3.5 mr-1" /> Configurações</TabsTrigger>
        </TabsList>

        {/* ANALYTICS — RICH VIEW */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Indicadores */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile icon={<Users />} label="Participação" value={stats.participants} sub={`${studentsQ.data?.length || 0} cadastrados · ${perParticipant.length} enviaram`} />
            <KpiTile icon={<ClipboardList />} label="Envios" value={stats.count} sub={isExam ? `${activities.length} atividades na prova` : "resultados recebidos"} />
            <KpiTile
              icon={<BarChart3 />}
              label="Nota média"
              value={stats.count ? `${stats.avgScore}%` : "—"}
              valueClassName={stats.count ? scoreTone(stats.avgScore).text : undefined}
              sub={stats.count ? `menor ${stats.min}% · maior ${stats.max}%` : "sem envios"}
            />
            <KpiTile icon={<Clock />} label="Tempo médio" value={formatDuration(stats.avgTime)} sub="por envio" />
          </div>

          {/* Desempenho */}
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <ScoreDistributionCard scores={(submissions as any[]).map((s: any) => s.score || 0)} />
            </div>
            <div className="lg:col-span-3">
              {isExam ? (
                <ActivityPerformanceCard rows={activityRows} />
              ) : (
                <RankingCard rows={perParticipant} onSelect={(id) => document.getElementById(`participant-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} />
              )}
            </div>
          </div>
          {isExam && (
            <RankingCard rows={perParticipant} onSelect={(id) => document.getElementById(`participant-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} />
          )}

          {/* Análise por aluno */}
          <section className="rounded-xl border border-border bg-card">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Análise por aluno <span className="tabular-nums">{studentRows.length}</span></h3>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={studentQuery} onChange={(e) => setStudentQuery(e.target.value)} placeholder="Buscar aluno ou e-mail…" className="h-8 w-56 pl-8 text-sm" />
                </div>
                <Select value={studentSort} onValueChange={(v) => setStudentSort(v as any)}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score-desc">Maior nota</SelectItem>
                    <SelectItem value="score-asc">Menor nota</SelectItem>
                    <SelectItem value="name">Nome (A–Z)</SelectItem>
                    <SelectItem value="recent">Mais recentes</SelectItem>
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  aria-pressed={onlyAtRisk}
                  onClick={() => setOnlyAtRisk((v) => !v)}
                  className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", onlyAtRisk ? "border-status-warn/50 bg-status-warn/10 text-status-warn" : "border-border text-muted-foreground hover:text-foreground")}
                >
                  Abaixo de 60%
                </button>
              </div>
            </header>
            <div className="space-y-2 p-3">
              {studentRows.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{participantsWithSubs.length === 0 ? "Nenhum aluno enviou ainda." : "Nenhum aluno com esse filtro."}</p>
              ) : studentRows.map(({ p, pSubs, pAvg, pTime }) => {
                const isFocused = p.id === focusParticipantId;
                const tone = scoreTone(pAvg);
                const initials = String(p.participant_name || "?").trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");
                return (
                  <div key={p.id} id={`participant-${p.id}`} className={cn("rounded-xl border p-4 transition-colors", isFocused ? "border-primary ring-2 ring-primary/40" : "border-border")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">{initials}</span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{p.participant_name}</p>
                          {p.participant_email && <p className="truncate text-xs text-muted-foreground">{p.participant_email}</p>}
                          {p.is_group && <p className="text-xs text-muted-foreground">Grupo: {(p.group_members as any[] || []).map((m: any) => typeof m === "string" ? m : (m?.name || m?.email)).join(", ")}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(p.joined_at).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {pTime > 0 && <span className="font-mono text-xs tabular-nums text-muted-foreground">{formatDuration(pTime)}</span>}
                        <span className={cn("rounded-full border px-2.5 py-0.5 font-mono text-sm font-semibold tabular-nums", tone.soft)}>{pAvg}%</span>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          aria-label="Remover este envio"
                          onClick={() => {
                            if (confirm(`Remover envio de "${p.participant_name}"? Esta ação não pode ser desfeita.`)) {
                              deleteParticipant.mutate(p.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    {isExam && pSubs.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(activities as any[]).map((act: any, i: number) => {
                          const actSub = pSubs.find((s: any) => s.activity_id === act.id);
                          return (
                            <span key={act.id} className={cn("rounded-full border px-2 py-0.5 text-xs", actSub ? scoreTone(actSub.score).soft : "border-border bg-muted text-muted-foreground")}>
                              {i + 1}. {toolLabel(act.simulator_slug)}: <strong className="font-mono">{actSub ? `${actSub.score}%` : "—"}</strong>
                            </span>
                          );
                        })}
                      </div>
                    )}
                      {/* Certificado OSCE — só quando a prova está completa para este aluno */}
                      {isExam && activities.length > 0 && pSubs.length >= activities.length && (() => {
                        const cert = certificateByParticipant.get(p.id);
                        return (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            {cert && !cert.revoked_at ? (
                              <>
                                <Badge variant="outline" className="text-xs">
                                  <Award className="h-3 w-3 mr-1" /> Certificado emitido
                                </Badge>
                                <Button
                                  variant="ghost" size="sm" className="h-7 text-xs"
                                  onClick={() => gerarCertificadoPDF(cert)}
                                >
                                  Baixar PDF
                                </Button>
                                <Button
                                  variant="ghost" size="sm" className="h-7 text-xs text-destructive"
                                  onClick={() => {
                                    if (confirm(`Revogar o certificado de "${p.participant_name}"?`)) {
                                      revokeCertificate.mutate(cert.id);
                                    }
                                  }}
                                >
                                  <ShieldOff className="h-3 w-3 mr-1" /> Revogar
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline" size="sm" className="h-7 text-xs"
                                disabled={issueCertificate.isPending}
                                onClick={() => issueCertificate.mutate(p)}
                              >
                                <Award className="h-3 w-3 mr-1" /> Emitir certificado
                              </Button>
                            )}
                          </div>
                        );
                      })()}
                      {pSubs.map((sub: any) => (
                        <div key={sub.id}>
                          {sub.actions?.member?.name && (
                            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Enviado por <strong className="text-foreground">{sub.actions.member.name}</strong>
                              {sub.actions.member.id?.includes("@") && <span>({sub.actions.member.id})</span>}
                              {sub.actions.groupMode === "leader" && <span>· líder</span>}
                            </p>
                          )}
                          <ParticipantDetail submission={sub} roomSubmissions={submissions as any[]} isPremium={isPremium} onShowUpgrade={showUpgrade} forceOpen={isFocused} />
                        </div>
                      ))}
                    </div>
                );
              })}
            </div>
          </section>
        </TabsContent>

        {/* PARTICIPANTS */}
        <TabsContent value="participants">
          <ParticipantsList students={studentsQ.data || []} participants={participants} restricted={!!room.restricted_access} activities={activities as any[]} />
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {room.description && (
            <section className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">{room.description}</section>
          )}
          <section className="rounded-xl border border-border bg-card">
            <header className="border-b border-border px-4 py-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Dados da sala</h3>
            </header>
            <dl className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">PIN</dt><dd className="mt-0.5 font-mono text-lg font-semibold tracking-widest text-primary">{room.pin}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Situação</dt><dd className="mt-0.5 text-sm font-medium">{room.is_active ? "Ativa" : "Encerrada"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Criada em</dt><dd className="mt-0.5 text-sm">{new Date(room.created_at).toLocaleString("pt-BR")}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Expira em</dt><dd className="mt-0.5 text-sm">{room.expires_at ? new Date(room.expires_at).toLocaleString("pt-BR") : "Sem prazo"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Acesso restrito</dt><dd className="mt-0.5 text-sm">{room.restricted_access ? "Sim, só alunos cadastrados" : "Não, qualquer pessoa com o PIN"}</dd></div>
              {room.restricted_access && (
                <div><dt className="text-xs text-muted-foreground">Respostas no grupo</dt><dd className="mt-0.5 text-sm">{(room as any).group_mode === "collective" ? "Todos respondem (estilo TBL)" : "Líder responde, demais observam"}</dd></div>
              )}
            </dl>
          </section>
          {isExam && (
            <section className="rounded-xl border border-border bg-card">
              <header className="border-b border-border px-4 py-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Atividades da prova <span className="tabular-nums">{activities.length}</span></h3>
              </header>
              <ol className="divide-y divide-border">
                {(activities as any[]).map((act: any, i: number) => (
                  <li key={act.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{toolLabel(act.simulator_slug)}</span>
                      {act.simulator_cases?.title && <span className="block truncate text-xs text-muted-foreground">{act.simulator_cases.title}</span>}
                    </span>
                    {act.group_label?.trim() && <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">{act.group_label}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </TabsContent>

        <TabsContent value="config">
          <section className="max-w-2xl rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold">Editar esta sala</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A edição completa da sala (atividades, alunos, prazo, acesso) é feita em Salas Virtuais, pelo menu da sala.
            </p>
            <Button asChild className="mt-4"><Link to="/salas-virtuais"><SettingsIcon className="mr-2 h-4 w-4" />Abrir Salas Virtuais</Link></Button>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

function normalizeStudentName(s: string) {
  return (s || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function ParticipantsList({ students, participants, restricted, activities = [] }: { students: any[]; participants: any[]; restricted: boolean; activities?: any[] }) {
  const activitiesById = new Map((activities || []).map((a, i) => [a.id, { ...a, index: i }]));
  const activityCaseLabel = (activityId?: string | null) => {
    if (!activityId) return null;
    const act = activitiesById.get(activityId);
    if (!act) return null;
    const groupLabel = act.group_label?.trim() || `Grupo ${act.index + 1}`;
    const caseTitle = act.simulator_cases?.title;
    const toolLabel = SIMULATOR_LABELS[act.simulator_slug] || act.simulator_slug;
    return `${groupLabel} · ${toolLabel}${caseTitle ? ` (${caseTitle})` : ""}`;
  };

  // Casa por e-mail OU nome normalizado (sem acento/caixa) — o líder pode errar o
  // e-mail de um componente ao digitar, mas o nome quase sempre bate com o cadastro.
  const findStudent = (name?: string | null, email?: string | null) => {
    if (!restricted) return null;
    const e = (email || "").toLowerCase();
    if (e) {
      const byEmail = students.find((s) => (s.email || "").toLowerCase() === e);
      if (byEmail) return byEmail;
    }
    if (name) {
      return students.find((s) => normalizeStudentName(s.full_name) === normalizeStudentName(name)) || null;
    }
    return null;
  };

  const groups = participants.filter((p) => p.is_group);
  const solos = participants.filter((p) => !p.is_group);

  const matchedEmails = new Set<string>();
  const markMatched = (name?: string | null, email?: string | null) => {
    const match = findStudent(name, email);
    if (match?.email) matchedEmails.add(match.email.toLowerCase());
  };
  groups.forEach((p) => {
    markMatched(null, p.participant_email);
    (p.group_members as any[] || []).forEach((m: any) => {
      const name = typeof m === "string" ? m : m?.name;
      const email = typeof m === "string" ? null : m?.email;
      markMatched(name, email);
    });
  });
  solos.forEach((p) => markMatched(p.participant_name, p.participant_email));

  const pendingStudents = restricted ? students.filter((s) => !matchedEmails.has((s.email || "").toLowerCase())) : [];
  const hasAny = groups.length > 0 || solos.length > 0 || pendingStudents.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Participantes</CardTitle>
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1"><strong className="tabular-nums">{groups.length}</strong> grupos</span>
          <span className="rounded-full bg-secondary px-2.5 py-1"><strong className="tabular-nums">{solos.length}</strong> individuais</span>
          {restricted && <span className="rounded-full bg-status-warn/10 px-2.5 py-1 text-status-warn"><strong className="tabular-nums">{pendingStudents.length}</strong> aguardando ingresso</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAny ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum participante ainda.</p>
        ) : (
          <>
            {groups.map((p) => {
              const leaderMatch = findStudent(null, p.participant_email);
              const members = (p.group_members as any[] || []);
              return (
                <div key={p.id} className="border rounded-md overflow-hidden">
                  <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2 flex-wrap">
                    <p className="font-semibold text-sm flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {p.participant_name}</p>
                    <div className="flex items-center gap-1.5">
                      {activityCaseLabel(p.assigned_activity_id) && (
                        <Badge variant="outline" className="text-[10px]">{activityCaseLabel(p.assigned_activity_id)}</Badge>
                      )}
                      <Badge className="text-[10px]"><UserCheck className="h-3 w-3 mr-1" /> Grupo ingressou</Badge>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    <div className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{leaderMatch?.full_name || p.participant_email || "Líder"}</p>
                        {p.participant_email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {p.participant_email}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">líder</span>
                        {leaderMatch && (
                          <Badge variant="outline" className="text-[10px]">
                            <UserPlus className="h-3 w-3 mr-1" /> Cadastrado
                          </Badge>
                        )}
                        <Badge className="text-[10px]"><UserCheck className="h-3 w-3 mr-1" /> Ingressou</Badge>
                      </div>
                    </div>
                    {members.map((m: any, i: number) => {
                      const name = typeof m === "string" ? m : (m?.name || "");
                      const email = typeof m === "string" ? null : m?.email;
                      const memberMatch = findStudent(name, email);
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{name}</p>
                            {email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {email}</p>}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {memberMatch && (
                              <Badge variant="outline" className="text-[10px]">
                                <UserPlus className="h-3 w-3 mr-1" /> Cadastrado
                              </Badge>
                            )}
                            <Badge className="text-[10px]"><UserCheck className="h-3 w-3 mr-1" /> Ingressou</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {solos.map((p) => {
              const match = findStudent(p.participant_name, p.participant_email);
              return (
                <div key={p.id} className="border rounded-md divide-y divide-border">
                  <div className="flex items-center justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{p.participant_name}</p>
                      {p.participant_email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {p.participant_email}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {match && (
                        <Badge variant="outline" className="text-[10px]">
                          <UserPlus className="h-3 w-3 mr-1" /> Cadastrado
                        </Badge>
                      )}
                      <Badge className="text-[10px]"><UserCheck className="h-3 w-3 mr-1" /> Ingressou</Badge>
                    </div>
                  </div>
                </div>
              );
            })}

            {pendingStudents.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Cadastrados aguardando ingresso ({pendingStudents.length})</p>
                <div className="border rounded-md divide-y divide-border">
                  {pendingStudents.map((s) => (
                    <div key={s.email} className="flex items-center justify-between gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{s.full_name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {s.email}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        <UserPlus className="h-3 w-3 mr-1" /> Cadastrado
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
