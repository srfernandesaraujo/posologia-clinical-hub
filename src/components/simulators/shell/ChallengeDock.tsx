import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GripHorizontal, Minus, PanelRight, PictureInPicture2, Target, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Modo Desafio "ao lado" ou em janela flutuante (pedido do professor: o aluno
// precisa mexer no simulador e ler as questões ao mesmo tempo).
//
// Ponto delicado: trocar de modo NÃO pode reiniciar o desafio (o aluno estaria
// na questão 3 e voltaria para a 1). Por isso o desafio é renderizado uma única
// vez, por portal, num nó de DOM estável; o que muda é só ONDE esse nó é
// pendurado (área lateral, janela ou gaveta). Mover o nó não desmonta o React.

export type ChallengeMode = "side" | "float";

const MODE_KEY = "posologia-sim-challenge-mode-v1";
const WINDOW_KEY = "posologia-sim-challenge-window-v2";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sem armazenamento: vale só para esta visita */
  }
}

export function useChallengeMode() {
  const [mode, setModeState] = useState<ChallengeMode>(() => readJson<ChallengeMode>(MODE_KEY, "side"));
  const setMode = useCallback((m: ChallengeMode) => {
    setModeState(m);
    writeJson(MODE_KEY, m);
  }, []);
  return [mode, setMode] as const;
}

/**
 * Renderiza `content` uma vez num nó estável e devolve:
 *  - `portal`: precisa ser colocado em qualquer lugar do JSX (sempre montado);
 *  - `slotRef`: callback ref para o elemento onde o conteúdo deve aparecer agora.
 */
export function useMovableContent(content: ReactNode) {
  // Nó criado uma vez por montagem (useState com inicializador = estável entre renders).
  const [host] = useState<HTMLDivElement | null>(() => {
    if (typeof document === "undefined") return null;
    const el = document.createElement("div");
    el.className = "space-y-4";
    return el;
  });
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const slotRef = useCallback((el: HTMLElement | null) => setSlot(el), []);

  useLayoutEffect(() => {
    if (host && slot && host.parentElement !== slot) slot.appendChild(host);
  }, [host, slot]);

  const portal = content && host ? createPortal(content, host) : null;
  return { portal, slotRef };
}

interface WindowBox { x: number; y: number; w: number; h: number }

function defaultBox(): WindowBox {
  const w = Math.min(460, window.innerWidth - 48);
  const h = Math.min(620, window.innerHeight - 140);
  // À esquerda da coluna da conduta (360px + margens), para não cobrir a
  // prescrição que o aluno precisa mexer enquanto lê a questão.
  return { x: Math.max(8, window.innerWidth - w - 420), y: Math.max(72, window.innerHeight - h - 88), w, h };
}

function clampBox(b: WindowBox): WindowBox {
  const w = Math.min(Math.max(b.w, 320), window.innerWidth - 16);
  const h = Math.min(Math.max(b.h, 240), window.innerHeight - 16);
  const x = Math.min(Math.max(b.x, 8), window.innerWidth - w - 8);
  const y = Math.min(Math.max(b.y, 8), window.innerHeight - h - 8);
  return { x, y, w, h };
}

interface DockProps {
  slotRef: (el: HTMLElement | null) => void;
  onDock: () => void;
  title?: string;
}

/** Janela flutuante não-modal: arrastável pelo título, redimensionável pelo canto, minimizável. */
export function FloatingChallengeWindow({ slotRef, onDock, title = "Modo Desafio" }: DockProps) {
  const [box, setBox] = useState<WindowBox>(() => clampBox(readJson<WindowBox | null>(WINDOW_KEY, null) ?? defaultBox()));
  const [minimized, setMinimized] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => writeJson(WINDOW_KEY, box), [box]);

  // Mantém a janela dentro da tela quando o navegador muda de tamanho.
  useEffect(() => {
    const onResize = () => setBox((b) => clampBox(b));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // O redimensionamento é o nativo do CSS (canto inferior direito); aqui só guardamos o tamanho.
  useEffect(() => {
    const el = frameRef.current;
    if (!el || minimized) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setBox((b) => (Math.abs(b.w - r.width) > 1 || Math.abs(b.h - r.height) > 1 ? clampBox({ ...b, w: r.width, h: r.height }) : b));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minimized]);

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { dx: e.clientX - box.x, dy: e.clientY - box.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    // Calcula AGORA: o atualizador do setState roda depois, quando o ponteiro
    // pode já ter sido solto (drag.current = null) — isso derrubava a página.
    const x = e.clientX - d.dx;
    const y = e.clientY - d.dy;
    setBox((b) => clampBox({ ...b, x, y }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <>
      {minimized && (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="fixed bottom-[84px] right-6 z-40 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-popover/95 px-4 py-2.5 text-sm font-semibold shadow-2xl shadow-black/50 backdrop-blur-xl transition-colors hover:border-primary"
        >
          <Target className="h-4 w-4 text-primary" /> Abrir desafio
        </button>
      )}
      <div
        ref={frameRef}
        role="dialog"
        aria-modal="false"
        aria-label={title}
        className={cn(
          "fixed z-40 flex flex-col overflow-hidden rounded-xl border border-primary/30 bg-popover/95 shadow-2xl shadow-black/60 backdrop-blur-xl [resize:both]",
          minimized && "hidden",
        )}
        style={{ left: box.x, top: box.y, width: box.w, height: box.h, minWidth: 320, minHeight: 240 }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="flex shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-border bg-card/80 px-3 py-2 active:cursor-grabbing"
          title="Arraste para mover"
        >
          <GripHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
          <button
            type="button"
            onClick={onDock}
            title="Fixar ao lado do simulador"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <PanelRight className="h-3.5 w-3.5" /> Ao lado
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            title="Minimizar"
            aria-label="Minimizar desafio"
            className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
        <div ref={slotRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" />
      </div>
    </>
  );
}

/** No celular/tablet em pé: gaveta que sobe da base, a meia altura ou expandida. */
export function ChallengeBottomSheet({ slotRef, onDock, title = "Modo Desafio" }: DockProps) {
  const [size, setSize] = useState<"min" | "half" | "full">("half");
  const height = size === "full" ? "85dvh" : size === "half" ? "50dvh" : "auto";
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className="fixed inset-x-0 z-40 flex flex-col rounded-t-2xl border-t border-primary/30 bg-popover/97 shadow-[0_-20px_40px_-10px_rgba(0,0,0,0.6)] backdrop-blur-xl"
      style={{ bottom: "calc(4rem + env(safe-area-inset-bottom))", height }}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-1.5">
        <button
          type="button"
          onClick={() => setSize(size === "min" ? "half" : "min")}
          className="flex flex-1 flex-col items-start gap-1"
          aria-label={size === "min" ? "Abrir desafio" : "Recolher desafio"}
        >
          <span className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/40" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</span>
        </button>
        {size !== "min" && (
          <button
            type="button"
            onClick={() => setSize(size === "full" ? "half" : "full")}
            aria-label={size === "full" ? "Reduzir" : "Expandir"}
            className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
          >
            {size === "full" ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onDock}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
        >
          <PanelRight className="h-3.5 w-3.5" /> Na página
        </button>
      </div>
      <div ref={slotRef} className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3", size === "min" && "hidden")} />
    </div>
  );
}

/** Barra fina acima do desafio no modo "ao lado", com o botão para soltar em janela. */
export function DockedChallengeBar({ onUndock, label = "Modo Desafio" }: { onUndock: () => void; label?: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={onUndock}
        title="Abrir o desafio numa janela flutuante e deixar o simulador com a tela toda"
        className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <PictureInPicture2 className="h-3.5 w-3.5" /> Janela flutuante
      </button>
    </div>
  );
}
