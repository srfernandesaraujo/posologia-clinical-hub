import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(2000),
});

export default function Contato() {
  const { t } = useTranslation();
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
    const { error } = await supabase.from("contact_messages").insert([result.data as any]);
    setLoading(false);
    if (error) {
      toast.error(t("contact.error"));
    } else {
      toast.success(t("contact.success"));
      setForm({ name: "", email: "", subject: "", message: "" });
    }
  };

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 inline-flex rounded-2xl bg-primary/10 p-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t("contact.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("contact.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-8">
          <div className="space-y-2">
            <Label>{t("contact.name")}</Label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label>{t("contact.email")}</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label>{t("contact.subject")}</Label>
            <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder={t("contact.subjectPlaceholder")} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label>{t("contact.message")}</Label>
            <Textarea value={form.message} onChange={(e) => update("message", e.target.value)} placeholder={t("contact.messagePlaceholder")} rows={5} required maxLength={2000} />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              t("contact.sending")
            ) : (
              <><Send className="h-4 w-4" />{t("contact.send")}</>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
