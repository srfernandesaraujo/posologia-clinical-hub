import { Outlet, Link, useLocation } from "react-router-dom";
import { Pill } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Layout dedicado para o fluxo de sala virtual (/sala/*) — alunos chegam aqui
// via PIN, sem login, direto para uma atividade. Antes essas rotas dividiam o
// PublicLayout (site institucional) com Home/Login/Cadastro: herdavam um
// <main> sem padding (conteúdo do simulador colava nas bordas da tela) e um
// rodapé de marketing gigante (Criar Conta, Planos, Termos...) que não faz
// sentido no meio de uma atividade — pior ainda no celular, onde é a maior
// parte do scroll depois do simulador. Este layout troca isso por um
// cabeçalho mínimo e o mesmo espaçamento responsivo do AppLayout.
export function SalaLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-card px-4 pt-safe">
        <Link to="/" className="flex items-center gap-2">
          <Pill className="h-6 w-6 text-primary" />
          <span className="font-bold text-foreground">Posologia</span>
        </Link>
        <LanguageSwitcher />
      </header>
      <main className="flex-1 p-4 md:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
