import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSupportTickets, useTicketMessages,
  type SupportTicket, type TicketStatus, type TicketPriority,
} from "@/hooks/useSupportTickets";
import { useTicketDiagnostics } from "@/hooks/useTicketDiagnostics";
import { TicketAttachmentLink } from "@/components/TicketAttachmentLink";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Headset, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-blue-500 text-white border-blue-500" },
  in_progress: { label: "Em Andamento", className: "bg-orange-500 text-white border-orange-500" },
  resolved: { label: "Resolvido", className: "bg-green-600 text-white border-green-600" },
  closed: { label: "Fechado", className: "bg-muted text-muted-foreground border-border" },
};

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  critical: { label: "Crítica", className: "bg-red-600 text-white border-red-600" },
  high: { label: "Alta", className: "bg-orange-500 text-white border-orange-500" },
  medium: { label: "Média", className: "bg-yellow-500 text-white border-yellow-500" },
  low: { label: "Baixa", className: "bg-muted text-muted-foreground border-border" },
};

const CATEGORY_LABEL: Record<string, string> = {
  bug: "Bug / Erro",
  duvida: "Dúvida",
  financeiro: "Financeiro",
  sugestao: "Sugestão",
  outro: "Outro",
};

function useTicketUserNames(tickets: SupportTicket[]) {
  const userIds = useMemo(() => Array.from(new Set(tickets.map((t) => t.user_id))), [tickets]);
  return useQuery({
    queryKey: ["ticket-user-profiles", userIds],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((p) => { map[p.user_id] = p.full_name || p.user_id.slice(0, 8); });
      return map;
    },
    enabled: userIds.length > 0,
  });
}

function TicketConversation({ ticket }: { ticket: SupportTicket }) {
  const { data: messages, isLoading } = useTicketMessages(ticket.id);
  const { addMessage, updateTicket } = useSupportTickets();
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    try {
      await addMessage.mutateAsync({ ticket, message: reply, file });
      setReply("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      toast.error("Erro ao enviar resposta");
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select
            value={ticket.status}
            onValueChange={(v) => updateTicket.mutate({ id: ticket.id, status: v as TicketStatus })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Aberto</SelectItem>
              <SelectItem value="in_progress">Em Andamento</SelectItem>
              <SelectItem value="resolved">Resolvido</SelectItem>
              <SelectItem value="closed">Fechado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
          <Select
            value={ticket.priority}
            onValueChange={(v) => updateTicket.mutate({ id: ticket.id, priority: v as TicketPriority })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-xl p-4 space-y-3 max-h-[40vh] overflow-y-auto bg-card">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          (messages || []).map((m) => (
            <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                m.sender_role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted"
              }`}>
                <p className="whitespace-pre-wrap">{m.message}</p>
                {m.attachment_url && <TicketAttachmentLink path={m.attachment_url} name={m.attachment_name} />}
                <p className="text-[10px] opacity-70 mt-1">
                  {format(new Date(m.created_at), "dd MMM HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="space-y-2">
        <Textarea placeholder="Responder ao usuário..." value={reply} onChange={(e) => setReply(e.target.value)} rows={3} />
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-3.5 w-3.5 mr-1.5" />
            {file ? file.name : "Anexar"}
          </Button>
          <Button size="sm" className="ml-auto" onClick={handleSend} disabled={addMessage.isPending || !reply.trim()}>
            {addMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Responder
          </Button>
        </div>
      </div>
    </div>
  );
}

function TicketDiagnosticsPanel({ ticket }: { ticket: SupportTicket }) {
  const { data, isLoading } = useTicketDiagnostics(ticket.user_id);
  const snap = ticket.diagnostic_snapshot;

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Conta &amp; Plano</h3>
        <dl className="grid grid-cols-2 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Nome</dt><dd>{data?.profile?.full_name || "—"}</dd>
          <dt className="text-muted-foreground">Status da conta</dt><dd>{data?.profile?.status || "—"}</dd>
          <dt className="text-muted-foreground">Acesso ilimitado</dt><dd>{data?.profile?.has_unlimited_access ? "Sim" : "Não"}</dd>
          <dt className="text-muted-foreground">Conta criada em</dt>
          <dd>{data?.profile?.created_at ? format(new Date(data.profile.created_at), "dd MMM yyyy", { locale: ptBR }) : "—"}</dd>
          <dt className="text-muted-foreground">Plano</dt><dd>{data?.subscription?.plan || "free"}</dd>
          <dt className="text-muted-foreground">Status assinatura</dt><dd>{data?.subscription?.status || "none"}</dd>
          <dt className="text-muted-foreground">Vencimento</dt>
          <dd>{data?.subscription?.current_period_end ? format(new Date(data.subscription.current_period_end), "dd MMM yyyy", { locale: ptBR }) : "—"}</dd>
        </dl>
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Contexto técnico (na abertura do chamado)</h3>
        {snap ? (
          <dl className="grid grid-cols-2 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Navegador</dt><dd className="truncate" title={snap.userAgent}>{snap.userAgent}</dd>
            <dt className="text-muted-foreground">Rota</dt><dd>{snap.route}</dd>
            <dt className="text-muted-foreground">Tela</dt><dd>{snap.screenWidth}×{snap.screenHeight}</dd>
            <dt className="text-muted-foreground">Viewport</dt><dd>{snap.viewportWidth}×{snap.viewportHeight}</dd>
            <dt className="text-muted-foreground">Idioma</dt><dd>{snap.language}</dd>
          </dl>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhum contexto técnico capturado para este chamado.</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold mb-2">Atividade recente</h3>
        {(data?.recentActivity.length || 0) === 0 ? (
          <p className="text-xs text-muted-foreground">Sem atividade registrada.</p>
        ) : (
          <ul className="space-y-1.5">
            {data!.recentActivity.map((a, i) => (
              <li key={i} className="flex items-center justify-between text-xs">
                <span>{a.label}</span>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {format(new Date(a.created_at), "dd MMM HH:mm", { locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function AdminTickets() {
  const { tickets, isLoading } = useSupportTickets();
  const { data: userNames = {} } = useTicketUserNames(tickets);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = tickets.find((t) => t.id === selectedId) || null;

  const filtered = tickets.filter((t) => (
    (statusFilter === "all" || t.status === statusFilter)
    && (priorityFilter === "all" || t.priority === priorityFilter)
    && (search.trim() === "" || t.subject.toLowerCase().includes(search.toLowerCase()))
  ));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Headset className="h-6 w-6 text-primary" />
          Chamados de Suporte
        </h1>
        <p className="text-sm text-muted-foreground">Acompanhe e responda os chamados abertos pelos usuários.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar por assunto..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="critical">Crítica</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Nenhum chamado encontrado.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assunto</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => {
              const sb = STATUS_BADGE[t.status];
              const pb = PRIORITY_BADGE[t.priority];
              return (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelectedId(t.id)}>
                  <TableCell className="font-medium max-w-xs truncate">{t.subject}</TableCell>
                  <TableCell>{userNames[t.user_id] || "—"}</TableCell>
                  <TableCell className="text-xs">{CATEGORY_LABEL[t.category] || t.category}</TableCell>
                  <TableCell><Badge className={`text-[10px] ${sb.className}`}>{sb.label}</Badge></TableCell>
                  <TableCell><Badge className={`text-[10px] ${pb.className}`}>{pb.label}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(t.updated_at), "dd MMM HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelectedId(null); }}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="truncate pr-6">{selected.subject}</SheetTitle>
              </SheetHeader>
              <Tabs defaultValue="conversa" className="mt-4">
                <TabsList>
                  <TabsTrigger value="conversa">Conversa</TabsTrigger>
                  <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
                </TabsList>
                <TabsContent value="conversa" className="mt-4">
                  <TicketConversation ticket={selected} />
                </TabsContent>
                <TabsContent value="diagnostico" className="mt-4">
                  <TicketDiagnosticsPanel ticket={selected} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
