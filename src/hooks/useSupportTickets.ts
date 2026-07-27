import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TicketCategory = "bug" | "duvida" | "financeiro" | "sugestao" | "outro";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "critical";

export interface DiagnosticSnapshot {
  userAgent: string;
  route: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  language: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  diagnostic_snapshot: DiagnosticSnapshot | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  message: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

const ATTACHMENTS_BUCKET = "support-attachments";

function collectDiagnosticSnapshot(): DiagnosticSnapshot {
  return {
    userAgent: navigator.userAgent,
    route: window.location.pathname,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    language: navigator.language,
    timestamp: new Date().toISOString(),
  };
}

// Bucket is private — attachment_url stores the storage object path, not a
// public URL. Resolve a viewable link on demand via getAttachmentSignedUrl.
async function uploadAttachment(userId: string, ticketId: string, file: File) {
  const path = `${userId}/${ticketId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, file);
  if (error) throw error;
  return path;
}

export async function getAttachmentSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export function useSupportTickets() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets" as any)
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SupportTicket[];
    },
    enabled: !!user,
  });

  const tickets = ticketsQuery.data || [];
  const openCount = tickets.filter((t) => t.status === "open" || t.status === "in_progress").length;

  const createTicket = useMutation({
    mutationFn: async ({
      subject, category, message, file,
    }: { subject: string; category: TicketCategory; message: string; file?: File | null }) => {
      if (!user) throw new Error("Não autenticado");

      const { data: ticket, error: ticketErr } = await supabase
        .from("support_tickets" as any)
        .insert({ user_id: user.id, subject, category, diagnostic_snapshot: collectDiagnosticSnapshot() } as any)
        .select()
        .single();
      if (ticketErr) throw ticketErr;
      const ticketRow = ticket as unknown as SupportTicket;

      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      if (file) {
        attachment_url = await uploadAttachment(user.id, ticketRow.id, file);
        attachment_name = file.name;
      }

      const { error: msgErr } = await supabase.from("support_ticket_messages" as any).insert({
        ticket_id: ticketRow.id,
        sender_id: user.id,
        sender_role: "user",
        message,
        attachment_url,
        attachment_name,
      } as any);
      if (msgErr) throw msgErr;

      supabase.functions
        .invoke("notify-ticket-event", { body: { type: "new_ticket", ticketId: ticketRow.id } })
        .catch(() => {});

      return ticketRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  const addMessage = useMutation({
    mutationFn: async ({
      ticket, message, file,
    }: { ticket: SupportTicket; message: string; file?: File | null }) => {
      if (!user) throw new Error("Não autenticado");
      const senderRole: "user" | "admin" = isAdmin ? "admin" : "user";

      let attachment_url: string | null = null;
      let attachment_name: string | null = null;
      if (file) {
        attachment_url = await uploadAttachment(ticket.user_id, ticket.id, file);
        attachment_name = file.name;
      }

      const { error: msgErr } = await supabase.from("support_ticket_messages" as any).insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: senderRole,
        message,
        attachment_url,
        attachment_name,
      } as any);
      if (msgErr) throw msgErr;

      if (senderRole === "admin" && ticket.status === "open") {
        await supabase.from("support_tickets" as any).update({ status: "in_progress" } as any).eq("id", ticket.id);
      } else if (senderRole === "user" && (ticket.status === "resolved" || ticket.status === "closed")) {
        await supabase.from("support_tickets" as any).update({ status: "open" } as any).eq("id", ticket.id);
      }

      if (senderRole === "admin") {
        supabase.functions
          .invoke("notify-ticket-event", { body: { type: "new_reply", ticketId: ticket.id } })
          .catch(() => {});
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["support-ticket-messages", variables.ticket.id] });
    },
  });

  const updateTicket = useMutation({
    mutationFn: async ({
      id, status, priority,
    }: { id: string; status?: TicketStatus; priority?: TicketPriority }) => {
      const fields: Record<string, unknown> = {};
      if (status) {
        fields.status = status;
        fields.resolved_at = status === "resolved" ? new Date().toISOString() : null;
      }
      if (priority) fields.priority = priority;
      const { error } = await supabase.from("support_tickets" as any).update(fields as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  return {
    tickets,
    openCount,
    isLoading: ticketsQuery.isLoading,
    createTicket,
    addMessage,
    updateTicket,
  };
}

export function useTicketMessages(ticketId: string | null) {
  return useQuery({
    queryKey: ["support-ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages" as any)
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TicketMessage[];
    },
    enabled: !!ticketId,
  });
}
