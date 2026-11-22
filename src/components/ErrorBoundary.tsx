import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, LayoutDashboard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * "page": cartão centralizado para a área de conteúdo de um layout (com
   * "Tentar de novo" e "Voltar ao Painel").
   * "inline": aviso compacto para um trecho da tela (ex.: Modo Desafio), para
   * que a falha fique contida e o resto da página continue utilizável.
   */
  variant?: "page" | "inline";
  /** Mensagem do aviso compacto (variante "inline"). */
  inlineMessage?: string;
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Contém exceções de render dos filhos. Sem isso, qualquer erro num componente
 * derruba a árvore inteira e o React deixa a tela em branco. Para resetar ao
 * trocar de rota, use `key={location.pathname}` no ponto de uso.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Erro de renderização capturado:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const { variant = "page", inlineMessage, className } = this.props;

    if (variant === "inline") {
      return (
        <div
          role="alert"
          className={cn(
            "flex items-start gap-3 rounded-xl border border-status-crit/40 bg-card p-4 text-sm",
            className,
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-status-crit" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="font-medium text-foreground">
              {inlineMessage ?? "Esta parte da tela encontrou um erro — recarregue a página."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={this.reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Tentar de novo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
                Recarregar a página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div role="alert" className={cn("mx-auto max-w-xl py-10", className)}>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-status-crit/30 bg-status-crit/10">
              <AlertTriangle className="h-5 w-5 text-status-crit" aria-hidden />
            </span>
            <h2 className="font-display text-lg font-semibold text-foreground">Algo deu errado nesta tela</h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Um erro inesperado impediu que esta página fosse exibida. O restante do app continua funcionando:
            você pode tentar de novo ou voltar ao Painel.
          </p>
          {error.message && (
            <p className="mt-3 break-words rounded-md border border-border bg-background/40 px-3 py-2 font-mono text-xs text-muted-foreground">
              {error.message}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={this.reset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Tentar de novo
            </Button>
            <Button variant="outline" asChild>
              {/* Link comum (recarga completa): descarta qualquer estado corrompido. */}
              <a href="/dashboard">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Voltar ao Painel
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
