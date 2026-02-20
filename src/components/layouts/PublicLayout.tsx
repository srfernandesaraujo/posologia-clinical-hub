import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Pill, Mail } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LoginPopover } from "@/components/LoginPopover";

export function PublicLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0F1C]">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0F1C]/80 backdrop-blur-xl">
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
      <footer className="border-t border-white/[0.06] bg-[#080C18] py-10">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="text-sm text-white/40">
            {t("common.developedBy")} <span className="text-white/60 font-medium">{t("common.author")}</span> — <span className="text-white/60 font-medium">{t("common.company")}</span>
          </p>
          <p className="text-xs text-white/25">
            © 2026 {t("common.brand")}. {t("common.footer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
