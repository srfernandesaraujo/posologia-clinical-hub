import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pill, Mail } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LoginPopover } from "@/components/LoginPopover";
import { useCookieAnalytics } from "@/hooks/useCookieAnalytics";

export function PublicLayout() {
  const { t } = useTranslation();
  useCookieAnalytics();

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0F1C]">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0F1C]/80 backdrop-blur-xl pt-safe">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <Pill className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-white">Posologia Clinical Hub</span>
          </Link>
          <nav className="flex items-center gap-3">
            <LanguageSwitcher className="[&_button]:border-white/10 [&_svg]:text-white/40" />
            <Link to="/contato" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2">
              <Mail className="h-4 w-4" />
              {t("nav.contact")}
            </Link>
            <LoginPopover />
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/[0.06] bg-[#080C18] py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div>
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <div className="rounded-lg bg-emerald-500/10 p-1.5">
                  <Pill className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="text-base font-bold text-white">Posologia Clinical Hub</span>
              </Link>
              <p className="text-sm text-white/40 leading-relaxed">
                Ferramentas clínicas inteligentes para profissionais de saúde, educadores e pesquisadores.
              </p>
            </div>

            {/* Produto */}
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-4">Produto</h4>
              <ul className="space-y-2.5">
                <li><Link to="/cadastro" className="text-sm text-white/40 hover:text-white/70 transition-colors">Criar Conta</Link></li>
                <li><Link to="/login" className="text-sm text-white/40 hover:text-white/70 transition-colors">Entrar</Link></li>
                <li><Link to="/planos" className="text-sm text-white/40 hover:text-white/70 transition-colors">Planos</Link></li>
                <li><Link to="/vitrine" className="text-sm text-white/40 hover:text-white/70 transition-colors">Ferramentas</Link></li>
              </ul>
            </div>

            {/* Recursos */}
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-4">Recursos</h4>
              <ul className="space-y-2.5">
                <li><Link to="/docs" className="text-sm text-white/40 hover:text-white/70 transition-colors">Documentação</Link></li>
                <li><Link to="/contato" className="text-sm text-white/40 hover:text-white/70 transition-colors">Contato</Link></li>
                <li><a href="/#sala-virtual" className="text-sm text-white/40 hover:text-white/70 transition-colors">Salas Virtuais</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white/80 mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><Link to="/termos-de-servico" className="text-sm text-white/40 hover:text-white/70 transition-colors">Termos de Serviço</Link></li>
                <li><Link to="/politica-privacidade" className="text-sm text-white/40 hover:text-white/70 transition-colors">Política de Privacidade</Link></li>
                <li><Link to="/politica-cookies" className="text-sm text-white/40 hover:text-white/70 transition-colors">Política de Cookies</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-6 text-center">
            <p className="text-xs text-white/25">
              © 2026 Posologia Clinical Hub. Todos os direitos reservados. — Desenvolvido por Sérgio Araújo. Posologia Produções
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
