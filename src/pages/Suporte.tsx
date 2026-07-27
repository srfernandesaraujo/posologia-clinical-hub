import { useState, useRef, useEffect } from "react";
import {
  useSupportTickets, useTicketMessages,
  type SupportTicket, type TicketCategory,
} from "@/hooks/useSupportTickets";
import { TicketAttachmentLink } from "@/components/TicketAttachmentLink";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, ArrowLeft, Paperclip, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open: { label: "Aberto", className: "bg-blue-500 text-white border-blue-500" },
  in_progress: { label: "Em Andamento", className: "bg-orange-500 text-white border-orange-500" },
  resolved: { label: "Resolvido", className: "bg-green-600 text-white border-green-600" },
  closed: { label: "Fechado", className: "bg-muted text-muted-foreground border-border" },
};

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: "bug", label: "Bug / Erro" },
  { value: "duvida", label: "Dúvida" },
  { value: "financeiro", label: "Financeiro / Assinatura" },
  { value: "sugestao", label: "Sugestão" },
  { value: "outro", label: "Outro" },
];

function TicketDetail({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useTicketMessages(ticket.id);
  const { addMessage } = useSupportTickets();
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
      toast.error("Erro ao enviar mensagem");
    }
  };

  const sb = STATUS_BADGE[ticket.status];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold truncate">{ticket.subject}</h2>
          <p className="text-xs text-muted-foreground">
            Aberto em {format(new Date(ticket.created_at), "dd MMM yyyy", { locale: ptBR })}
          </p>
        </div>
        <Badge className={`text-[10px] ${sb.className}`}>{sb.label}</Badge>
      </div>

      <div className="border border-border rounded-xl p-4 space-y-3 max-h-[50vh] overflow-y-auto bg-card">
        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          (messages || []).map((m) => (
            <div key={m.id} className={`flex ${m.sender_role === "admin" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                m.sender_role === "admin" ? "bg-muted" : "bg-primary text-primary-foreground"
              }`}>
                <p className="whitespace-pre-wrap">{m.message}</p>
                {m.attachment_url && (
                  <TicketAttachmentLink path={m.attachment_url} name={m.attachment_name} />
                )}
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
        <Textarea
          placeholder="Escreva sua resposta..."
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={3}
        />
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Paperclip className="h-3.5 w-3.5 mr-1.5" />
            {file ? file.name : "Anexar"}
          </Button>
          <Button size="sm" className="ml-auto" onClick={handleSend} disabled={addMessage.isPending || !reply.trim()}>
            {addMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Suporte() {
  const { tickets, isLoading, createTicket } = useSupportTickets();
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("duvida");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Preencha assunto e descrição");
      return;
    }
    try {
      await createTicket.mutateAsync({ subject, category, message, file });
      toast.success("Chamado aberto! Nossa equipe vai responder em breve.");
      setDialogOpen(false);
      setSubject(""); setCategory("duvida"); setMessage(""); setFile(null);
    } catch {
      toast.error("Erro ao abrir chamado");
    }
  };

  if (selected) {
    // Keep the selected ticket's status in sync with the latest list data
    const current = tickets.find((t) => t.id === selected.id) || selected;
    return (
      <div className="max-w-2xl mx-auto">
        <TicketDetail ticket={current} onBack={() => setSelected(null)} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-primary" />
            Suporte
          </h1>
          <p className="text-sm text-muted-foreground">Abra um chamado técnico e acompanhe o andamento.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Novo Chamado</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Novo Chamado</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Assunto" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Descreva o problema em detalhes..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
              <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <Button className="w-full" onClick={handleCreate} disabled={createTicket.isPending}>
                {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Abrir Chamado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Você ainda não abriu nenhum chamado.
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const sb = STATUS_BADGE[t.status];
            return (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className="w-full text-left flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Atualizado em {format(new Date(t.updated_at), "dd MMM yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${sb.className}`}>{sb.label}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
