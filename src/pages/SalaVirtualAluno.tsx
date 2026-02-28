import { useState, useEffect, useRef } from "react";
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
import { DoorOpen, Users, UserPlus, X, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

export default function SalaVirtualAluno() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pinFromUrl = searchParams.get("pin") || "";

  const [pin, setPin] = useState(pinFromUrl);
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"pin" | "identify" | "ready">(pinFromUrl ? "pin" : "pin");

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
    setLoading(false);

    if (error || !data) {
      toast.error("Sala não encontrada ou inativa. Verifique o PIN.");
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast.error("Esta sala já expirou.");
      return;
    }

    // Check 7-day inactivity: get most recent participant join
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
      // Auto-deactivate
      await supabase.from("virtual_rooms").update({ is_active: false }).eq("id", data.id);
      toast.error("Esta sala foi desativada por inatividade (7 dias sem acessos).");
      return;
    }

    setRoom(data);
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

  const goToSimulator = () => {
    // Store room context in sessionStorage for the simulator to use
    sessionStorage.setItem("virtualRoom", JSON.stringify({
      roomId: room.id,
      participantId,
      caseId: room.case_id,
      simulatorSlug: room.simulator_slug,
      participantName,
    }));
    navigate(`/sala/simulador/${room.simulator_slug}`);
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
            <Button variant="ghost" size="sm" onClick={() => { setStep("pin"); setRoom(null); }} className="w-fit mb-2">
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
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 space-y-4">
          <div className="mx-auto inline-flex rounded-full bg-green-100 p-4 dark:bg-green-900/30">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold">Tudo pronto!</h2>
          <p className="text-muted-foreground">
            Olá, <strong>{participantName}</strong>! Você está na sala <strong>{room?.title}</strong>.
          </p>
          <Button onClick={goToSimulator} size="lg" className="w-full">
            Iniciar Simulador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
