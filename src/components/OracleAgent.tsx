import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { MessageSquare, X, Send, Loader2, Sparkles, ArrowUpRight, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "Qual calculadora usar?", message: "Preciso calcular algo para um paciente, qual calculadora devo usar?" },
  { label: "Como usar Salas Virtuais?", message: "Como funcionam as Salas Virtuais e como criar uma?" },
  { label: "Explorar simuladores", message: "Quais simuladores estão disponíveis e qual é mais indicado para ensino de farmacologia?" },
];

export function OracleAgent() {
  const { user } = useAuth();
  const location = useLocation();
  const simulatorSlug = location.pathname.match(/^\/simuladores\/([^/]+)/)?.[1];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("oracle-agent", {
        body: {
          messages: newMessages.slice(-10), // keep context manageable
          userId: user?.id,
          context: { pathname: location.pathname, simulatorSlug },
        },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data?.reply || "Desculpe, ocorreu um erro." }]);
    } catch (err: any) {
      console.error("[OracleAgent]", err);
      setMessages(prev => [...prev, { role: "assistant", content: "Desculpe, não foi possível processar sua pergunta. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, user?.id, location.pathname, simulatorSlug]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Button — sobe acima da barra de abas inferior no mobile e
          vira um botão circular (sem o rótulo) para não competir por espaço
          com o polegar do usuário. */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed z-50 flex items-center gap-2 rounded-full p-3.5 shadow-lg transition-all duration-300",
          "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 md:px-5 md:py-3",
          "bg-accent text-accent-foreground hover:opacity-90",
          open && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <Sparkles className="h-5 w-5" />
        <span className="hidden md:inline text-sm font-semibold">Fale com o Oráculo</span>
      </button>

      {/* Chat Panel — ocupa quase a tela toda no mobile (em vez da largura
          fixa de 380px, que estourava viewports de celular) e volta a ser
          um painel flutuante ancorado no canto a partir do breakpoint md. */}
      <div
        className={cn(
          "fixed z-50 flex flex-col rounded-2xl border border-border bg-card shadow-2xl transition-all duration-300 origin-bottom-right",
          "inset-x-3 top-16 bottom-[calc(4.5rem+env(safe-area-inset-bottom))]",
          "md:inset-x-auto md:top-auto md:bottom-6 md:right-6 md:w-[380px] md:h-[560px]",
          open ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-foreground">Oráculo Posologia</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <Sparkles className="h-10 w-10 text-accent" />
              <div>
                <p className="text-base font-semibold text-foreground">Olá 👋</p>
                <p className="text-sm text-muted-foreground mt-1">Como posso te ajudar hoje?</p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-4">
                {simulatorSlug && (
                  <button
                    onClick={() => sendMessage("Quero refletir sobre minha última tentativa neste simulador.")}
                    className="flex items-center gap-2 text-left px-3 py-2.5 rounded-lg border border-accent/40 bg-accent/5 hover:bg-accent/10 transition-colors text-sm text-foreground"
                  >
                    <Lightbulb className="h-4 w-4 text-accent shrink-0" />
                    <span>Refletir sobre este caso</span>
                  </button>
                )}
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.message)}
                    className="flex items-center gap-2 text-left px-3 py-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-sm text-foreground"
                  >
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                )}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:text-xs">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary rounded-xl px-3 py-2 rounded-bl-sm">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 shrink-0">
          <div className="flex items-end gap-2 bg-secondary/50 rounded-xl px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte qualquer coisa..."
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-20"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="text-accent hover:opacity-80 disabled:opacity-30 transition-opacity shrink-0 p-1"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            O Oráculo pode cometer erros. Confirme as respostas.
          </p>
        </div>
      </div>
    </>
  );
}
