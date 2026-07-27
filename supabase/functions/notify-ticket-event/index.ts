import { Resend } from "npm:resend@6";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_NOTIFICATION_EMAIL = "srfernandesaraujo@gmail.com";

const CATEGORY_LABEL: Record<string, string> = {
  bug: "Bug",
  duvida: "Dúvida",
  financeiro: "Financeiro",
  sugestao: "Sugestão",
  outro: "Outro",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, ticketId } = await req.json();

    if (!type || !ticketId || !["new_ticket", "new_reply"].includes(type)) {
      return new Response(JSON.stringify({ error: "Missing or invalid type/ticketId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (ticketErr || !ticket) {
      return new Response(JSON.stringify({ error: "Ticket not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(ticket.user_id);
    const userEmail = authUser?.user?.email;

    if (type === "new_ticket") {
      const { data: firstMessage } = await supabase
        .from("support_ticket_messages")
        .select("message")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      const { error } = await resend.emails.send({
        from: "Suporte <onboarding@resend.dev>",
        to: [ADMIN_NOTIFICATION_EMAIL],
        subject: `[Novo Chamado] ${ticket.subject}`,
        html: `
          <h2>Novo chamado de suporte</h2>
          <p><strong>Assunto:</strong> ${ticket.subject}</p>
          <p><strong>Categoria:</strong> ${CATEGORY_LABEL[ticket.category] || ticket.category}</p>
          <p><strong>Prioridade:</strong> ${ticket.priority}</p>
          <p><strong>Usuário:</strong> ${userEmail || ticket.user_id}</p>
          <hr />
          <p>${(firstMessage?.message || "").replace(/\n/g, "<br/>")}</p>
          <p><a href="https://simulador.posologia.app/admin/tickets">Ver no painel de chamados</a></p>
        `,
      });
      if (error) console.error("Resend error (new_ticket):", error);
    } else if (type === "new_reply") {
      if (!userEmail) {
        return new Response(JSON.stringify({ skipped: true, reason: "no_user_email" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await resend.emails.send({
        from: "Suporte <onboarding@resend.dev>",
        to: [userEmail],
        subject: `[Chamado respondido] ${ticket.subject}`,
        html: `
          <h2>Seu chamado recebeu uma resposta</h2>
          <p><strong>Assunto:</strong> ${ticket.subject}</p>
          <p>A equipe de suporte respondeu ao seu chamado. Acesse a plataforma em <strong>Suporte</strong> para ver a resposta completa.</p>
          <p><a href="https://simulador.posologia.app/suporte">Ver chamado</a></p>
        `,
      });
      if (error) console.error("Resend error (new_reply):", error);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("notify-ticket-event error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
