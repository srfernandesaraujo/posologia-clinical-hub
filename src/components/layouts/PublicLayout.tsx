import { Outlet, Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0F1C]">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#0A0F1C]/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-500/10 p-1.5">
              <Stethoscope className="h-5 w-5 text-emerald-400" />
            </div>
            <span className="text-lg font-bold text-white">MedCalc Hub</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-white/60 hover:text-white transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              Cadastre-se
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-white/[0.06] bg-[#080C18] py-10">
        <div className="container mx-auto px-4 text-center text-sm text-white/30">
          © 2026 MedCalc Hub. Ferramentas clínicas para fins educativos e de apoio à decisão.
        </div>
      </footer>
    </div>
  );
}
