import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Eye, Users, Hand, ArrowRightLeft } from "lucide-react";

export type GroupRole = "leader" | "observer" | "collective";

export interface GroupMemberView {
  id: string;
  name: string;
  online: boolean;
}

interface GroupRoleBannerProps {
  role: GroupRole;
  memberId: string;
  leaderId: string | null;
  leaderName: string | null;
  leaderStale: boolean;
  members: GroupMemberView[];
  onClaim?: () => void;
  onPass?: (toMemberId: string) => void;
}

// Deixa explícito, para todos os participantes do grupo, quem é o líder (único que responde)
// e quem acompanha como observador — ou que todos respondem, no modo equipe.
export default function GroupRoleBanner({
  role, memberId, leaderId, leaderName, leaderStale, members, onClaim, onPass,
}: GroupRoleBannerProps) {
  const [passing, setPassing] = useState(false);
  const others = members.filter((m) => m.id !== memberId);

  const tone =
    role === "leader"
      ? "border-primary/40 bg-primary/10"
      : role === "observer"
        ? "border-amber-500/40 bg-amber-500/10"
        : "border-emerald-500/40 bg-emerald-500/10";

  return (
    <div className={`rounded-lg border p-3 text-sm space-y-2 ${tone}`}>
      <div className="flex items-start gap-2">
        {role === "leader" && <Crown className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
        {role === "observer" && <Eye className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />}
        {role === "collective" && <Users className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />}
        <div className="min-w-0">
          {role === "leader" && (
            <>
              <p className="font-semibold">Você é o líder do grupo</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Só você marca as alternativas e avança as questões; seus colegas acompanham na tela deles em tempo real.
              </p>
            </>
          )}
          {role === "observer" && (
            <>
              <p className="font-semibold text-amber-700 dark:text-amber-400">Você é observador</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                O líder <strong>{leaderName ?? "do grupo"}</strong> marca as respostas e avança as questões. Você vê tudo
                em tempo real, pode explorar o simulador e discutir com o grupo, mas não pode responder.
              </p>
            </>
          )}
          {role === "collective" && (
            <>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Todos do grupo respondem</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cada integrante responde por conta própria e o envio leva o seu nome. Depois, discutam as respostas em grupo.
              </p>
            </>
          )}
        </div>
      </div>

      {members.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <Badge key={m.id} variant="outline" className="gap-1.5 text-xs font-normal">
              <span className={`h-1.5 w-1.5 rounded-full ${m.online ? "bg-green-500" : "bg-muted-foreground/40"}`} />
              {role !== "collective" && m.id === leaderId && <Crown className="h-3 w-3 text-primary" />}
              {m.name}
              {m.id === memberId && " (você)"}
            </Badge>
          ))}
        </div>
      )}

      {role === "observer" && leaderStale && onClaim && (
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">O líder está sem sinal há algum tempo.</p>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onClaim}>
            <Hand className="h-3.5 w-3.5" /> Assumir liderança
          </Button>
        </div>
      )}

      {role === "leader" && onPass && others.length > 0 && (
        <div className="space-y-1.5">
          {!passing ? (
            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1.5 text-xs" onClick={() => setPassing(true)}>
              <ArrowRightLeft className="h-3.5 w-3.5" /> Passar liderança
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Passar para:</span>
              {others.map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => { setPassing(false); onPass(m.id); }}
                >
                  {m.name}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setPassing(false)}>Cancelar</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
