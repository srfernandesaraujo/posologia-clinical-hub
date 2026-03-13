import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DoorOpen, Users, UserPlus, X, ArrowLeft, CheckCircle, Loader2, ClipboardList, ArrowRight } from "lucide-react";

const LAB_SLUGS = new Set([
  "farmacos", "microbiologia", "toxicologia", "farmacogenomica", "estabilidade",
  "controle-qualidade", "epidemiologia", "biotecnologia", "simulacao-realistica",
  "pericia-forense", "modelagem-molecular",
]);

const TOOL_LABELS: Record<string, string> = {
  prm: "PRM – Problemas Relacionados a Medicamentos",
  antimicrobianos: "Antimicrobianos / Stewardship",
  tdm: "TDM – Monitoramento Terapêutico",
  acompanhamento: "Acompanhamento Farmacoterapêutico",
  insulina: "Dose de Insulina",
  farmacos: "Lab: Desenvolvimento de Fármacos",
  microbiologia: "Lab: Microbiologia",
  toxicologia: "Lab: Toxicologia",
  farmacogenomica: "Lab: Farmacogenômica",
  estabilidade: "Lab: Estabilidade",
  "controle-qualidade": "Lab: Controle de Qualidade",
  epidemiologia: "Lab: Epidemiologia",
  biotecnologia: "Lab: Biotecnologia",
  "simulacao-realistica": "Lab: Simulação Realística",
  "pericia-forense": "Lab: Perícia Forense",
  "modelagem-molecular": "Lab: Modelagem Molecular",
};

function getRouteForSlug(slug: string): string {
  return LAB_SLUGS.has(slug) ? `/sala/laboratorio/${slug}` : `/sala/simulador/${slug}`;
}

export default function SalaVirtualAluno() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pinFromUrl = searchParams.get("pin") || "";

  const [pin, setPin] = useState(pinFromUrl);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"pin" | "identify" | "ready">("pin");
  const [activities, setActivities] = useState<any[]>([]);

  // Identification
  const [participantName, setParticipantName] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState<string[]>([""]);
  const [participantId, setParticipantId] = useState<string | null>(null);

  useEffect(() => {
    if (pinFromUrl) {
      joinRoom(pinFromUrl);
    }
  }, []);

  const joinRoom = async (pinValue?: string) => {
    const p = (pinValue || pin).trim();
    if (p.length !== 6) {
      toast.error("O PIN deve ter 6 dígitos");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("virtual_rooms")
      .select("*")
      .eq("pin", p)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !data) {
      setLoading(false);
      toast.error("Sala não encontrada ou inativa. Verifique o PIN.");
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setLoading(false);
      toast.error("Esta sala já expirou.");
      return;
    }

    // Check 7-day inactivity
    const { data: lastParticipant } = await supabase
      .from("room_participants")
      .select("joined_at")
      .eq("room_id", data.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastActivity = lastParticipant?.joined_at
      ? new Date(lastParticipant.joined_at)
      : new Date(data.created_at);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    if (lastActivity < sevenDaysAgo) {
      await supabase.from("virtual_rooms").update({ is_active: false }).eq("id", data.id);
      setLoading(false);
      toast.error("Esta sala foi desativada por inatividade (7 dias sem acessos).");
      return;
    }

    // Fetch room activities
    const { data: acts } = await supabase
      .from("room_activities")
      .select("*")
      .eq("room_id", data.id)
      .order("position");

    setRoom(data);
    setActivities(acts || []);
    setLoading(false);
    setStep("identify");
  };

  const addGroupMember = () => setGroupMembers([...groupMembers, ""]);
  const removeGroupMember = (i: number) => setGroupMembers(groupMembers.filter((_, idx) => idx !== i));
  const updateGroupMember = (i: number, val: string) => {
    const copy = [...groupMembers];
    copy[i] = val;
    setGroupMembers(copy);
  };

  const submitIdentification = async () => {
    const name = participantName.trim();
    if (!name) {
      toast.error("Informe o nome");
      return;
    }

    const members = isGroup ? groupMembers.map(m => m.trim()).filter(Boolean) : [];

    setLoading(true);
    const { data, error } = await supabase
      .from("room_participants")
      .insert({
        room_id: room.id,
        participant_name: name,
        is_group: isGroup,
        group_members: members,
      })
      .select("id")
      .single();
    setLoading(false);

    if (error) {
      toast.error("Erro ao entrar na sala");
      return;
    }

    setParticipantId(data.id);
    setStep("ready");
  };

  const isExam = activities.length > 1;
  const isLegacy = !isExam && room?.simulator_slug;

  const goToSimulator = () => {
    if (isLegacy) {
      sessionStorage.setItem("virtualRoom", JSON.stringify({
        roomId: room.id,
        participantId,
        caseId: room.case_id,
        simulatorSlug: room.simulator_slug,
        participantName,
      }));
      navigate(getRouteForSlug(room.simulator_slug));
    } else {
      startActivity(0);
    }
  };

  const startActivity = (index: number) => {
    const act = activities[index];
    if (!act) return;

    sessionStorage.setItem("virtualRoom", JSON.stringify({
      roomId: room.id,
      participantId,
      caseId: act.case_id,
      simulatorSlug: act.simulator_slug,
      participantName,
      activityId: act.id,
      activityIndex: index,
      totalActivities: activities.length,
      allActivities: activities.map((a: any) => ({
        id: a.id,
        simulatorSlug: a.simulator_slug,
        caseId: a.case_id,
        position: a.position,
      })),
    }));
    navigate(getRouteForSlug(act.simulator_slug));
  };

  if (step === "pin") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
              <DoorOpen className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Entrar na Sala Virtual</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Insira o PIN de 6 dígitos fornecido pelo professor</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>PIN da Sala</Label>
              <Input
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-3xl font-mono tracking-[0.5em] h-16"
                maxLength={6}
                onKeyDown={e => e.key === "Enter" && joinRoom()}
              />
            </div>
            <Button onClick={() => joinRoom()} disabled={pin.length !== 6 || loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "identify") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button variant="ghost" size="sm" onClick={() => { setStep("pin"); setRoom(null); setActivities([]); }} className="w-fit mb-2">
              <ArrowLeft className="h-4 w-4 mr-1" />Voltar
            </Button>
            <CardTitle className="text-xl">{room?.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Identifique-se para começar a atividade</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Modo Grupo</Label>
              <Switch checked={isGroup} onCheckedChange={setIsGroup} />
            </div>

            <div>
              <Label>{isGroup ? "Nome do Grupo" : "Seu Nome Completo"}</Label>
              <Input value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder={isGroup ? "Ex: Grupo A" : "Ex: Maria Silva"} />
            </div>

            {isGroup && (
              <div className="space-y-2">
                <Label>Componentes do Grupo</Label>
                {groupMembers.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input value={m} onChange={e => updateGroupMember(i, e.target.value)} placeholder={`Componente ${i + 1}`} />
                    {groupMembers.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeGroupMember(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addGroupMember}>
                  <UserPlus className="h-4 w-4 mr-1" />Adicionar Componente
                </Button>
              </div>
            )}

            <Button onClick={submitIdentification} disabled={!participantName.trim() || loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Users className="h-4 w-4 mr-2" />}
              Confirmar e Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 space-y-4 text-center">
          <div className="mx-auto inline-flex rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            {isExam ? (
              <ClipboardList className="h-10 w-10 text-green-600 dark:text-green-400" />
            ) : (
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold">
            {isExam ? "Prova de Simulação" : "Tudo pronto!"}
          </h2>
          <p className="text-muted-foreground">
            Olá, <strong>{participantName}</strong>! Você está na sala <strong>{room?.title}</strong>.
          </p>

          {isExam && (
            <div className="text-left space-y-2 bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-semibold">Atividades ({activities.length}):</p>
              {activities.map((act: any, i: number) => (
                <div key={act.id} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-xs min-w-[24px] justify-center">{i + 1}</Badge>
                  <span>{TOOL_LABELS[act.simulator_slug] || act.simulator_slug}</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-2">
                Complete cada atividade em sequência. Ao finalizar uma, você será direcionado à próxima.
              </p>
            </div>
          )}

          <Button onClick={goToSimulator} size="lg" className="w-full">
            {isExam ? (
              <>Iniciar Prova <ArrowRight className="h-4 w-4 ml-2" /></>
            ) : (
              "Iniciar Simulador"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
