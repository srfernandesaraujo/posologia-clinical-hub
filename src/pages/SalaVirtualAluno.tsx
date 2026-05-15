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
import { GAME_LABELS, isGameSlug } from "@/data/virtualRoomGames";

const LAB_PREFIX = "lab-";

const LAB_SLUGS = new Set([
  "lab-farmacos", "lab-microbiologia", "lab-toxicologia", "lab-farmacogenomica", "lab-estabilidade",
  "lab-controle-qualidade", "lab-epidemiologia", "lab-biotecnologia", "lab-simulacao-realistica",
  "lab-pericia-forense", "lab-modelagem-molecular",
]);

const LAB_ONLY_SLUGS = new Set([
  "farmacos",
  "microbiologia",
  "toxicologia",
  "controle-qualidade",
  "epidemiologia",
  "biotecnologia",
  "simulacao-realistica",
  "pericia-forense",
  "modelagem-molecular",
]);

const TOOL_LABELS: Record<string, string> = {
  prm: "PRM – Problemas Relacionados a Medicamentos",
  antimicrobianos: "Antimicrobianos / Stewardship",
  tdm: "TDM – Monitoramento Terapêutico",
  acompanhamento: "Acompanhamento Farmacoterapêutico",
  insulina: "Dose de Insulina",
  "lab-farmacos": "Lab: Desenvolvimento de Fármacos",
  "lab-microbiologia": "Lab: Microbiologia",
  "lab-toxicologia": "Lab: Toxicologia",
  "lab-farmacogenomica": "Lab: Farmacogenômica",
  "lab-estabilidade": "Lab: Estabilidade",
  "lab-controle-qualidade": "Lab: Controle de Qualidade",
  "lab-epidemiologia": "Lab: Epidemiologia",
  "lab-biotecnologia": "Lab: Biotecnologia",
  "lab-simulacao-realistica": "Lab: Simulação Realística",
  "lab-pericia-forense": "Lab: Perícia Forense",
  "lab-modelagem-molecular": "Lab: Modelagem Molecular",
  ...GAME_LABELS,
};

function getRouteForActivity(slug: string, caseId?: string | null): string {
  if (isGameSlug(slug)) {
    return `/sala/jogo/${slug}`;
  }

  if (LAB_SLUGS.has(slug)) {
    return `/sala/laboratorio/${slug.replace(LAB_PREFIX, "")}`;
  }

  if (LAB_ONLY_SLUGS.has(slug) && !caseId) {
    return `/sala/laboratorio/${slug}`;
  }

  return `/sala/simulador/${slug}`;
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
  const [participantEmail, setParticipantEmail] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState<string[]>([""]);
  const [groupEmails, setGroupEmails] = useState<string[]>([""]);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [resumeFromIndex, setResumeFromIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

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

  const addGroupMember = () => {
    setGroupMembers([...groupMembers, ""]);
    setGroupEmails([...groupEmails, ""]);
  };
  const removeGroupMember = (i: number) => {
    setGroupMembers(groupMembers.filter((_, idx) => idx !== i));
    setGroupEmails(groupEmails.filter((_, idx) => idx !== i));
  };
  const updateGroupMember = (i: number, val: string) => {
    const copy = [...groupMembers]; copy[i] = val; setGroupMembers(copy);
  };
  const updateGroupEmail = (i: number, val: string) => {
    const copy = [...groupEmails]; copy[i] = val; setGroupEmails(copy);
  };

  const submitIdentification = async () => {
    const name = participantName.trim();
    if (!name) { toast.error("Informe o nome"); return; }

    const isRestricted = !!room?.restricted_access;
    const emailRegex = /\S+@\S+\.\S+/;

    // Collect emails to validate (when restricted)
    let emailsToCheck: string[] = [];
    let primaryEmail = participantEmail.trim().toLowerCase();

    if (isRestricted) {
      if (!primaryEmail || !emailRegex.test(primaryEmail)) {
        toast.error("Informe um e-mail válido");
        return;
      }
      emailsToCheck.push(primaryEmail);
      if (isGroup) {
        const memberEmails = groupEmails.map(e => e.trim().toLowerCase()).filter(Boolean);
        const memberNames = groupMembers.map(m => m.trim()).filter(Boolean);
        if (memberNames.length === 0) {
          toast.error("Adicione ao menos um componente do grupo");
          return;
        }
        if (memberEmails.length !== memberNames.length) {
          toast.error("Informe o e-mail de TODOS os componentes do grupo");
          return;
        }
        for (const em of memberEmails) {
          if (!emailRegex.test(em)) { toast.error(`E-mail inválido: ${em}`); return; }
          if (!emailsToCheck.includes(em)) emailsToCheck.push(em);
        }
      }

      // Validate against authorized list
      setLoading(true);
      const { data: authorized, error: authErr } = await supabase
        .from("room_authorized_emails" as any)
        .select("email")
        .eq("room_id", room.id)
        .in("email", emailsToCheck);
      if (authErr) {
        setLoading(false);
        toast.error("Erro ao validar acesso");
        return;
      }
      const authorizedSet = new Set(((authorized as any[]) || []).map(a => a.email.toLowerCase()));
      const notAllowed = emailsToCheck.filter(e => !authorizedSet.has(e));
      if (notAllowed.length > 0) {
        setLoading(false);
        toast.error(`Acesso negado. E-mail(s) não autorizado(s) nesta sala: ${notAllowed.join(", ")}`);
        return;
      }
    }

    // Build members array; when restricted, store {name, email} for each member
    const memberNames = isGroup ? groupMembers.map(m => m.trim()).filter(Boolean) : [];
    const members: any[] = isGroup
      ? (isRestricted
          ? memberNames.map((n, i) => ({ name: n, email: (groupEmails[i] || "").trim().toLowerCase() }))
          : memberNames)
      : [];

    // View-only detection: individual mode entering a restricted room where the
    // student's email is part of an existing group's members. They can browse,
    // but cannot select answers in the challenge mode.
    let viewOnly = false;
    if (!isGroup && isRestricted && primaryEmail) {
      const { data: existingGroups } = await supabase
        .from("room_participants")
        .select("group_members, participant_email")
        .eq("room_id", room.id)
        .eq("is_group", true);
      const inAnyGroup = ((existingGroups as any[]) || []).some((p) => {
        if ((p.participant_email || "").toLowerCase() === primaryEmail) return true;
        const gm = p.group_members;
        if (!Array.isArray(gm)) return false;
        return gm.some((m: any) => typeof m === "object" && m?.email && m.email.toLowerCase() === primaryEmail);
      });
      viewOnly = inAnyGroup;
    }

    if (!loading) setLoading(true);
    const { data, error } = await supabase
      .from("room_participants")
      .insert({
        room_id: room.id,
        participant_name: name,
        is_group: isGroup,
        group_members: members,
        participant_email: isRestricted ? primaryEmail : null,
      } as any)
      .select("id")
      .single();
    setLoading(false);

    if (error) {
      toast.error("Erro ao entrar na sala");
      return;
    }

    setParticipantId(data.id);
    sessionStorage.setItem("vrViewOnly", viewOnly ? "true" : "false");
    if (viewOnly) {
      toast.info("Seu e-mail já está em um grupo nesta sala. Você entrará em modo somente-leitura: poderá explorar o simulador, mas não poderá responder os desafios.");
    }
    setStep("ready");
  };

  const isExam = activities.length > 1;
  const isLegacy = !isExam && room?.simulator_slug;

  const viewOnlyFlag = sessionStorage.getItem("vrViewOnly") === "true";

  const goToSimulator = () => {
    if (isLegacy) {
      const legacyAct = activities[0]; // single activity
      const nativeCaseIndex = legacyAct?.custom_challenges?.nativeCaseIndex ?? null;
      sessionStorage.setItem("virtualRoom", JSON.stringify({
        roomId: room.id,
        participantId,
        caseId: room.case_id,
        simulatorSlug: room.simulator_slug,
        participantName,
        customChallenges: legacyAct?.custom_challenges || null,
        nativeCaseIndex,
        viewOnly: viewOnlyFlag,
      }));
      navigate(getRouteForActivity(room.simulator_slug, room.case_id));
    } else {
      startActivity(0);
    }
  };

  const startActivity = (index: number) => {
    const act = activities[index];
    if (!act) return;

    const nativeCaseIndex = act.custom_challenges?.nativeCaseIndex ?? null;
    sessionStorage.setItem("virtualRoom", JSON.stringify({
      roomId: room.id,
      participantId,
      caseId: act.case_id,
      simulatorSlug: act.simulator_slug,
      participantName,
      activityId: act.id,
      activityIndex: index,
      totalActivities: activities.length,
      customChallenges: act.custom_challenges || null,
      nativeCaseIndex,
      allActivities: activities.map((a: any) => ({
        id: a.id,
        simulatorSlug: a.simulator_slug,
        caseId: a.case_id,
        position: a.position,
        customChallenges: a.custom_challenges || null,
        nativeCaseIndex: a.custom_challenges?.nativeCaseIndex ?? null,
      })),
      viewOnly: viewOnlyFlag,
    }));
    navigate(getRouteForActivity(act.simulator_slug, act.case_id));
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
            {room?.restricted_access && (
              <div className="rounded-md bg-primary/10 border border-primary/20 p-3 text-xs text-primary">
                🔒 Esta sala tem acesso restrito. Apenas alunos previamente cadastrados pelo professor podem entrar.
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Modo Grupo</Label>
              <Switch checked={isGroup} onCheckedChange={setIsGroup} />
            </div>

            <div>
              <Label>{isGroup ? "Nome do Grupo" : "Seu Nome Completo"}</Label>
              <Input value={participantName} onChange={e => setParticipantName(e.target.value)} placeholder={isGroup ? "Ex: Grupo A" : "Ex: Maria Silva"} />
            </div>

            {room?.restricted_access && (
              <div>
                <Label>{isGroup ? "Seu E-mail (líder do grupo)" : "Seu E-mail"}</Label>
                <Input
                  type="email"
                  value={participantEmail}
                  onChange={e => setParticipantEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
            )}

            {isGroup && (
              <div className="space-y-2">
                <Label>Componentes do Grupo {room?.restricted_access && "(nome + e-mail)"}</Label>
                {groupMembers.map((m, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input value={m} onChange={e => updateGroupMember(i, e.target.value)} placeholder={`Componente ${i + 1} — nome`} />
                      {groupMembers.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeGroupMember(i)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {room?.restricted_access && (
                      <Input
                        type="email"
                        value={groupEmails[i] || ""}
                        onChange={e => updateGroupEmail(i, e.target.value)}
                        placeholder={`E-mail do componente ${i + 1}`}
                      />
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
