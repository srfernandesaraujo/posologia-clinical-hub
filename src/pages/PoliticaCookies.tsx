import { Link } from "react-router-dom";
import { Pill, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCookieConsent } from "@/contexts/CookieConsentContext";

export default function PoliticaCookies() {
  const { openPreferences } = useCookieConsent();

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-white/80">
      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Voltar ao início
        </Link>
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-lg bg-emerald-500/10 p-2"><Pill className="h-6 w-6 text-emerald-400" /></div>
          <h1 className="text-3xl font-bold text-white">Política de Cookies</h1>
        </div>
        <p className="text-sm text-white/40 mb-10">Última atualização: 08 de março de 2026</p>

        <div className="space-y-8 text-white/60 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">1. O que são Cookies?</h2>
            <p>Cookies são pequenos arquivos de texto armazenados no seu navegador quando você visita um site. Eles permitem que o site reconheça seu dispositivo e lembre de suas preferências.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">2. Cookies que Utilizamos</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="text-white/80 font-medium mb-1">Cookies Essenciais</h3>
                <p className="text-sm">Necessários para o funcionamento da plataforma. Incluem tokens de autenticação (Supabase Auth) e preferências de sessão. Não podem ser desativados.</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="text-white/80 font-medium mb-1">Cookies de Preferências</h3>
                <p className="text-sm">Armazenam suas preferências como idioma selecionado (i18next) e tema da interface. Melhoram sua experiência de uso.</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="text-white/80 font-medium mb-1">Cookies de Desempenho / Analytics</h3>
                <p className="text-sm">Coletam informações sobre como você usa a plataforma (páginas visitadas, ferramentas mais usadas, tempo de uso) para que possamos melhorar nossos serviços. Dados agregados e anônimos.</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <h3 className="text-white/80 font-medium mb-1">Cookies de Marketing</h3>
                <p className="text-sm">Registram a origem do visitante e a jornada de navegação para otimizar comunicações e a experiência de conversão.</p>
              </div>
            </div>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">3. LocalStorage</h2>
            <p>Além de cookies, utilizamos o localStorage do navegador para armazenar: token de autenticação, preferência de idioma, suas preferências de consentimento de cookies e dados de sessão. Esses dados permanecem no seu dispositivo e podem ser apagados nas configurações do navegador.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">4. Cookies de Terceiros</h2>
            <p>Serviços integrados podem definir seus próprios cookies: (a) Supabase — autenticação e gerenciamento de sessão; (b) Stripe — processamento seguro de pagamentos.</p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">5. Gerenciamento de Cookies</h2>
            <p className="mb-4">Você pode controlar e/ou excluir cookies nas configurações do seu navegador. A desativação de cookies essenciais pode impedir o funcionamento adequado da plataforma. Para mais informações, consulte a documentação do seu navegador.</p>
            <Button onClick={openPreferences} variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              Gerenciar minhas preferências de cookies
            </Button>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white/90 mb-3">6. Contato</h2>
            <p>Dúvidas sobre esta política: <a href="mailto:sergio.araujo@ufrn.br" className="text-emerald-400 hover:underline">sergio.araujo@ufrn.br</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
