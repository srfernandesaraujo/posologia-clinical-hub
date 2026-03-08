import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  subject: z.string().trim().min(1, "Informe o assunto").max(200),
  message: z.string().trim().min(1, "Escreva sua mensagem").max(2000),
});

export default function ContatoPublico() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
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
      toast.success("Mensagem enviada com sucesso! Retornaremos em breve.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      toast.error("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="min-h-[80vh] py-16">
      <div className="container mx-auto px-4 max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-emerald-500/10 p-4">
            <Mail className="h-8 w-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Fale Conosco</h1>
          <p className="text-white/50 mt-2">Tem dúvidas, sugestões ou precisa de ajuda? Preencha o formulário abaixo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-8">
          <div className="space-y-2">
            <Label className="text-white/70">Nome completo</Label>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Seu nome"
              required
              maxLength={100}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">E-mail</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="seu@email.com"
              required
              maxLength={255}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Assunto</Label>
            <Input
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="Sobre o que deseja falar?"
              required
              maxLength={200}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/70">Mensagem</Label>
            <Textarea
              value={form.message}
              onChange={(e) => update("message", e.target.value)}
              placeholder="Descreva sua dúvida ou sugestão..."
              rows={5}
              required
              maxLength={2000}
              className="bg-white/[0.06] border-white/10 text-white placeholder:text-white/30"
            />
          </div>
          <Button type="submit" className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 font-bold" disabled={loading}>
            {loading ? "Enviando..." : <><Send className="h-4 w-4" /> Enviar mensagem</>}
          </Button>
        </form>

        <div className="text-center mt-8">
          <p className="text-white/30 text-sm">Ainda não tem conta?</p>
          <Link to="/cadastro" className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-1">
            Criar conta gratuita <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
