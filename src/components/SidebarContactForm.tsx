import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Send, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1, "Informe o assunto").max(200),
  message: z.string().trim().min(1, "Escreva sua mensagem").max(2000),
});

export function SidebarContactForm() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";
  const userEmail = user?.email || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: userName, email: userEmail, subject, message };
    const result = schema.safeParse(data);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message || "Dados inválidos");
      return;
    }
    setLoading(true);
    try {
      await supabase.from("contact_messages").insert([result.data as any]);
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: result.data,
      });
      if (error) throw error;
      toast.success("Mensagem enviada com sucesso!");
      setSubject("");
      setMessage("");
      setOpen(false);
    } catch {
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="border-t border-border pt-3 mt-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full"
      >
        <Mail className="h-4 w-4" />
        <span className="flex-1 text-left">Fale Conosco</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-3 pt-2 pb-1 space-y-2">
          <p className="text-[11px] text-muted-foreground truncate">
            De: {userName} ({userEmail})
          </p>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Assunto"
            required
            maxLength={200}
            className="h-8 text-xs"
          />
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Sua mensagem..."
            required
            maxLength={2000}
            rows={3}
            className="text-xs min-h-[60px]"
          />
          <Button type="submit" size="sm" className="w-full gap-1.5 h-8 text-xs" disabled={loading}>
            {loading ? "Enviando..." : <><Send className="h-3 w-3" />Enviar</>}
          </Button>
        </form>
      )}
    </div>
  );
}
