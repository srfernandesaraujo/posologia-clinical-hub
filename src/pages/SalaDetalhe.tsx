import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureGating } from "@/hooks/useFeatureGating";
import { UpgradeModal } from "@/components/UpgradeModal";
import { computeCompetencyBreakdown, generateCertificateCode } from "@/lib/osceCertificate";
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
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

  // Nota final em destaque
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...scoreColor(cert.final_score));
  doc.text(`${cert.final_score}%`, cx, y + 10, { align: "center" });
  y += 18;

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
    return { count, avgScore, max, min, participants: participants.length };
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
      return { id: p.id, name: (p.participant_name || "—").slice(0, 20), score, subs: subs.length };
    }).filter(d => d.subs > 0).sort((a, b) => b.score - a.score);
  }, [participants, submissions]);

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
      <div className="space-y-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={classId ? `/turmas/${classId}` : "/salas-virtuais"}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{room.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={room.is_active ? "default" : "secondary"}>{room.is_active ? "Ativa" : "Encerrada"}</Badge>
              {isExam ? (
                <Badge variant="outline"><ClipboardList className="h-3 w-3 mr-1" />Prova · {activities.length} atividades</Badge>
              ) : room.simulator_slug ? (
                <Badge variant="outline">{SIMULATOR_LABELS[room.simulator_slug] || room.simulator_slug}</Badge>
              ) : null}
              <button onClick={copyPin} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                PIN: <span className="font-mono">{room.pin}</span> <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" /> Analytics</TabsTrigger>
          <TabsTrigger value="participants"><Users className="h-3.5 w-3.5 mr-1" /> Participantes</TabsTrigger>
          <TabsTrigger value="overview"><Info className="h-3.5 w-3.5 mr-1" /> Visão geral</TabsTrigger>
          <TabsTrigger value="config"><SettingsIcon className="h-3.5 w-3.5 mr-1" /> Configurações</TabsTrigger>
        </TabsList>

        {/* ANALYTICS — RICH VIEW */}
        <TabsContent value="analytics" className="space-y-4">
          {/* KPIs */}
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
            <StatCard label="Cadastrados" value={studentsQ.data?.length || 0} />
            <StatCard label="Ingressos" value={stats.participants} />
            <StatCard label="Submissões" value={stats.count} />
            <StatCard label="Nota média" value={`${stats.avgScore}%`} />
            <StatCard label="Maior / Menor" value={stats.count ? `${stats.max}% / ${stats.min}%` : "—"} />
          </div>

          {/* Activities for exam */}
          {isExam && (
            <Card>
              <CardHeader><CardTitle className="text-base">Atividades da prova</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(activities as any[]).map((act: any, i: number) => {
                    const actSubs = (submissions as any[]).filter((s: any) => s.activity_id === act.id);
                    const actAvg = actSubs.length ? Math.round(actSubs.reduce((a, s) => a + s.score, 0) / actSubs.length) : null;
                    return (
                      <div key={act.id} className="text-xs border border-border rounded-lg px-3 py-2 bg-muted/30">
                        <span className="font-medium">{i + 1}. {SIMULATOR_LABELS[act.simulator_slug] || act.simulator_slug}</span>
                        {act.simulator_cases?.title && (
                          <span className="text-muted-foreground ml-1">({act.simulator_cases.title})</span>
                        )}
                        {actAvg !== null && (
                          <Badge variant={actAvg >= 80 ? "secondary" : actAvg >= 50 ? "default" : "destructive"} className={`ml-2 text-xs ${actAvg >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}`}>
                            {actAvg}%
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Score distribution + ranking */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição de Scores</CardTitle></CardHeader>
              <CardContent>
                {scoreDist.length === 0 || stats.count === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Sem submissões ainda.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={scoreDist}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="count" name="Alunos" radius={[4, 4, 0, 0]}>
                        {scoreDist.map((_, i) => (
                          <Cell key={i} fill={["hsl(var(--destructive))", "hsl(var(--chart-4))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"][i]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Ranking de participantes</CardTitle></CardHeader>
              <CardContent>
                {perParticipant.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Sem submissões ainda.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, perParticipant.length * 26)}>
                    <BarChart data={perParticipant.slice(0, 20)} layout="vertical" margin={{ left: 80, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Per-participant detail with ParticipantDetail (decisions, mini-report, etc.) */}
          <Card>
            <CardHeader><CardTitle className="text-base">Análise detalhada por aluno</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(() => {
                const participantsWithSubs = (participants as any[]).filter((p: any) =>
                  (submissions as any[]).some((s: any) => s.participant_id === p.id)
                );
                if (participantsWithSubs.length === 0) {
                  return <p className="text-sm text-muted-foreground py-4 text-center">Nenhum aluno enviou ainda.</p>;
                }
                return participantsWithSubs.map((p: any) => {
                  const pSubs = (submissions as any[]).filter((s: any) => s.participant_id === p.id);
                  const pAvg = pSubs.length ? Math.round(pSubs.reduce((a, s) => a + s.score, 0) / pSubs.length) : 0;
                  const pTime = pSubs.reduce((a, s) => a + (s.time_spent_seconds || 0), 0);
                  return (
                    <div key={p.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{p.participant_name}</p>
                          {p.participant_email && <p className="text-xs text-muted-foreground">{p.participant_email}</p>}
                          {p.is_group && <p className="text-xs text-muted-foreground">Grupo: {(p.group_members as any[] || []).join(", ")}</p>}
                          <p className="text-xs text-muted-foreground">{new Date(p.joined_at).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {pTime > 0 && <span className="text-xs text-muted-foreground">{Math.floor(pTime / 60)}m{pTime % 60}s</span>}
                          <Badge variant={pAvg >= 80 ? "secondary" : pAvg >= 50 ? "default" : "destructive"} className={pAvg >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}>
                            {pAvg}%
                          </Badge>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7"
                            title="Remover este envio"
                            onClick={() => {
                              if (confirm(`Remover envio de "${p.participant_name}"? Esta ação não pode ser desfeita.`)) {
                                deleteParticipant.mutate(p.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {/* Per-activity breakdown for exams */}
                      {isExam && pSubs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(activities as any[]).map((act: any, i: number) => {
                            const actSub = pSubs.find((s: any) => s.activity_id === act.id);
                            return (
                              <span key={act.id} className={`text-xs px-2 py-0.5 rounded-full ${actSub ? (actSub.score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : actSub.score >= 50 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400") : "bg-muted text-muted-foreground"}`}>
                                {(SIMULATOR_LABELS[act.simulator_slug] || act.simulator_slug).substring(0, 5)}{i + 1}: {actSub ? `${actSub.score}%` : "—"}
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
                        <ParticipantDetail key={sub.id} submission={sub} roomSubmissions={submissions as any[]} />
                      ))}
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PARTICIPANTS */}
        <TabsContent value="participants">
          <ParticipantsList students={studentsQ.data || []} participants={participants} restricted={!!room.restricted_access} />
        </TabsContent>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {room.description && (
            <Card><CardContent className="py-4 text-sm text-muted-foreground">{room.description}</CardContent></Card>
          )}
          <Card>
            <CardContent className="py-4 text-sm space-y-1">
              <p><span className="text-muted-foreground">PIN:</span> <span className="font-mono">{room.pin}</span></p>
              <p><span className="text-muted-foreground">Criada em:</span> {new Date(room.created_at).toLocaleString("pt-BR")}</p>
              {room.expires_at && <p><span className="text-muted-foreground">Expira em:</span> {new Date(room.expires_at).toLocaleString("pt-BR")}</p>}
              <p><span className="text-muted-foreground">Acesso restrito:</span> {room.restricted_access ? "Sim" : "Não"}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardContent className="py-6 space-y-2">
              <p className="text-sm text-muted-foreground">
                A edição completa da sala (atividades, alunos, prazo) é feita na página{" "}
                <Link to="/salas-virtuais" className="underline">Salas Virtuais</Link>.
              </p>
            </CardContent>
          </Card>
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

function ParticipantsList({ students, participants, restricted }: { students: any[]; participants: any[]; restricted: boolean }) {
  const ingressByEmail = new Map<string, any>();
  participants.forEach(p => {
    if (p.participant_email) ingressByEmail.set(p.participant_email.toLowerCase(), p);
  });

  const rows: { name: string; email: string | null; registered: boolean; joined: boolean; isGroup?: boolean }[] = [];
  if (restricted) {
    students.forEach(s => {
      const email = s.email.toLowerCase();
      const p = ingressByEmail.get(email);
      rows.push({ name: s.full_name, email: s.email, registered: true, joined: !!p });
    });
    participants.forEach(p => {
      const em = (p.participant_email || "").toLowerCase();
      if (!em || !students.find(s => s.email.toLowerCase() === em)) {
        rows.push({ name: p.participant_name, email: p.participant_email, registered: false, joined: true, isGroup: p.is_group });
      }
    });
  } else {
    participants.forEach(p => rows.push({ name: p.participant_name, email: p.participant_email, registered: false, joined: true, isGroup: p.is_group }));
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Participantes</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum participante ainda.</p>
        ) : (
          <div className="border rounded-md divide-y divide-border">
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{r.name}</p>
                  {r.email && <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {r.email}</p>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {r.registered && (
                    <Badge variant="outline" className="text-[10px]">
                      <UserPlus className="h-3 w-3 mr-1" /> Cadastrado
                    </Badge>
                  )}
                  {r.joined && (
                    <Badge className="text-[10px]">
                      <UserCheck className="h-3 w-3 mr-1" /> {r.isGroup ? "Grupo ingressou" : "Ingressou"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
