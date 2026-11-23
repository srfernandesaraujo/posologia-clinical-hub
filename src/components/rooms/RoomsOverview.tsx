import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3, Calendar, ChevronDown, ClipboardList, Copy, Cpu, DoorOpen, EyeOff, FlaskConical, Gamepad2,
  Lock, MoreHorizontal, Pencil, RotateCcw, Search, Trash2, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/layouts/PageHeader";
import { cn } from "@/lib/utils";

// Visão geral das salas virtuais do professor (plano de redesign): o que está
// acontecendo agora fica em destaque; o histórico vai agrupado por turma, em
// linhas compactas, com seleção para excluir várias de uma vez.

export type RoomKind = "exam" | "lab" | "game" | "sim";
export interface RoomStats { participants: number; submitted: number; lastJoin?: string }

interface Props {
  rooms: any[];
  stats: Record<string, RoomStats>;
  classNameById: Record<string, string>;
  describe: (room: any) => { kind: RoomKind; label: string };
  analyticsHref: (room: any) => string;
  onEdit: (room: any) => void;
  onDeactivate: (room: any) => void;
  onReactivate: (room: any) => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[]) => void;
  onParticipants: (room: any) => void;
  onCopyPin: (pin: string) => void;
}

function isLive(room: any) {
  return !!room.is_active && (!room.expires_at || new Date(room.expires_at) > new Date());
}

function timeAgo(iso?: string) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d < 30 ? `há ${d} d` : new Date(iso).toLocaleDateString("pt-BR");
}

function KindIcon({ kind }: { kind: RoomKind }) {
  const Icon = kind === "exam" ? ClipboardList : kind === "lab" ? FlaskConical : kind === "game" ? Gamepad2 : Cpu;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}

export function RoomsOverview(p: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "exam" | "practice">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () => p.rooms
      .filter((r) => filter === "all" || (filter === "exam" ? !r.simulator_slug : !!r.simulator_slug))
      .filter((r) => !q || String(r.title || "").toLowerCase().includes(q) || String(r.pin || "").includes(q)),
    [p.rooms, filter, q],
  );
  const live = visible.filter(isLive);
  const history = visible.filter((r) => !isLive(r));

  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of history) {
      const key = r.class_id ? (p.classNameById[r.class_id] || "Turma") : "Sem turma";
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].sort((a, b) => (a[0] === "Sem turma" ? 1 : b[0] === "Sem turma" ? -1 : a[0].localeCompare(b[0])));
  }, [history, p.classNameById]);

  const toggleOne = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleMany = (ids: string[], on: boolean) => setSelected((s) => { const n = new Set(s); ids.forEach((id) => (on ? n.add(id) : n.delete(id))); return n; });

  const menu = (room: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ações da sala"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => p.onEdit(room)}><Pencil className="mr-2 h-4 w-4" />Editar sala</DropdownMenuItem>
        <DropdownMenuItem onClick={() => p.onParticipants(room)}><Users className="mr-2 h-4 w-4" />Participantes</DropdownMenuItem>
        {room.is_active ? (
          <DropdownMenuItem onClick={() => p.onDeactivate(room)}><EyeOff className="mr-2 h-4 w-4" />Encerrar sala</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => p.onReactivate(room)}><RotateCcw className="mr-2 h-4 w-4" />Reativar</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setSelected(new Set([room.id])); setConfirmOpen(true); }}>
          <Trash2 className="mr-2 h-4 w-4" />Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const total = p.rooms.length;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título ou PIN…" className="pl-9" />
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Tipo de sala">
          {([["all", "Todas", total], ["practice", "Prática", p.rooms.filter((r) => !!r.simulator_slug).length], ["exam", "Provas", p.rooms.filter((r) => !r.simulator_slug).length]] as const).map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", filter === key ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}
            >
              {label} <span className="ml-1 tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Ativas agora */}
      <section className="space-y-3" aria-labelledby="rooms-live">
        <h2 id="rooms-live" className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          <span className={cn("h-2 w-2 rounded-full", live.length ? "bg-status-ok shadow-[0_0_8px_hsl(var(--status-ok))]" : "bg-muted-foreground/40")} />
          Ativas agora <span className="tabular-nums">{live.length}</span>
        </h2>
        {live.length === 0 ? (
          <EmptyState icon={<DoorOpen />} className="py-8" title="Nenhuma sala ativa" description="Crie uma sala nova ou reative uma do histórico." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {live.map((room) => {
              const d = p.describe(room);
              const st = p.stats[room.id];
              const last = timeAgo(st?.lastJoin);
              return (
                <Card key={room.id} className="flex flex-col gap-4 border-status-ok/30 bg-card p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-status-ok/40 px-2 py-0.5 font-semibold text-status-ok"><span className="h-1.5 w-1.5 rounded-full bg-status-ok" />Ativa</span>
                      {d.kind === "exam" && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5"><ClipboardList className="h-3 w-3" />Prova</span>}
                      {room.restricted_access && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5"><Lock className="h-3 w-3" />Restrita</span>}
                    </div>
                    <div className="-mr-2 -mt-2">{menu(room)}</div>
                  </div>
                  <div>
                    <h3 className="line-clamp-2 font-semibold leading-snug">{room.title}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><KindIcon kind={d.kind} /> {d.label}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => p.onCopyPin(room.pin)}
                    aria-label={"Copiar PIN " + room.pin}
                    className="group flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">PIN</span>
                    <code className="font-mono text-3xl font-bold tracking-[0.25em] text-primary">{room.pin}</code>
                    <Copy className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </button>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-mono text-xl font-semibold tabular-nums leading-none">{st?.participants ?? 0}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">entraram{last ? ` · último ${last}` : ""}</p>
                    </div>
                    <div>
                      <p className="font-mono text-xl font-semibold tabular-nums leading-none">{st?.submitted ?? 0}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">enviaram resultado</p>
                    </div>
                  </div>
                  {room.expires_at && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" />Expira em {new Date(room.expires_at).toLocaleDateString("pt-BR")}</p>}
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => p.onParticipants(room)}><Users className="mr-2 h-4 w-4" />Participantes</Button>
                    <Button size="sm" asChild><Link to={p.analyticsHref(room)}><BarChart3 className="mr-2 h-4 w-4" />Analytics</Link></Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Histórico */}
      <section className="space-y-3" aria-labelledby="rooms-history">
        <h2 id="rooms-history" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Histórico <span className="tabular-nums">{history.length}</span>
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{q || filter !== "all" ? "Nenhuma sala encontrada com esse filtro." : "Salas encerradas ou expiradas aparecem aqui."}</p>
        ) : (
          <div className="space-y-3">
            {groups.map(([name, list], gi) => {
              const ids = list.map((r) => r.id);
              const allOn = ids.every((id) => selected.has(id));
              const someOn = !allOn && ids.some((id) => selected.has(id));
              return (
                <Collapsible key={name} defaultOpen={!!q || (gi === 0 && groups.length === 1)} className="rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      checked={allOn ? true : someOn ? "indeterminate" : false}
                      onCheckedChange={(v) => toggleMany(ids, v === true)}
                      aria-label={`Selecionar todas de ${name}`}
                    />
                    <CollapsibleTrigger className="group flex flex-1 items-center justify-between gap-2 text-left">
                      <span className="font-medium">{name} <span className="ml-1 text-sm font-normal tabular-nums text-muted-foreground">{list.length}</span></span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <ul className="divide-y divide-border border-t border-border">
                      {list.map((room) => {
                        const d = p.describe(room);
                        const st = p.stats[room.id];
                        const expired = room.is_active && room.expires_at && new Date(room.expires_at) <= new Date();
                        return (
                          <li key={room.id} className="flex items-center gap-3 px-4 py-2.5">
                            <Checkbox checked={selected.has(room.id)} onCheckedChange={() => toggleOne(room.id)} aria-label={`Selecionar ${room.title}`} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{room.title}</p>
                              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><KindIcon kind={d.kind} />{d.kind === "exam" ? "Prova" : d.label}</span>
                                <span>{expired ? "Expirada" : "Encerrada"} · criada em {new Date(room.created_at).toLocaleDateString("pt-BR")}</span>
                                <span className="tabular-nums">{st?.participants ?? 0} alunos · {st?.submitted ?? 0} envios</span>
                              </p>
                            </div>
                            <button type="button" onClick={() => p.onCopyPin(room.pin)} aria-label={"Copiar PIN " + room.pin} className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-xs tracking-widest text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex">
                              {room.pin}<Copy className="h-3 w-3" />
                            </button>
                            <Button variant="ghost" size="sm" asChild className="hidden md:inline-flex"><Link to={p.analyticsHref(room)}><BarChart3 className="mr-1.5 h-4 w-4" />Analytics</Link></Button>
                            {menu(room)}
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </section>

      {selected.size > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur">
          <span className="text-sm"><strong className="tabular-nums">{selected.size}</strong> {selected.size === 1 ? "sala selecionada" : "salas selecionadas"}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Limpar</Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}><Trash2 className="mr-1.5 h-4 w-4" />Excluir</Button>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selected.size} {selected.size === 1 ? "sala" : "salas"}?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é permanente: os alunos que entraram, os envios e as notas dessas salas deixam de existir e não podem ser recuperados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (selected.size === 1) setSelected(new Set()); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { const ids = [...selected]; setSelected(new Set()); ids.length === 1 ? p.onDelete(ids[0]) : p.onDeleteMany(ids); }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
