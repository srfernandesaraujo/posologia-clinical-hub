import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Link } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "O que é o Posologia?", message: "O que é o Posologia Clinical Hub e o que ele oferece?" },
  { label: "Quanto custa?", message: "Quanto custa o plano Premium e o que está incluso?" },
  { label: "Sou professor", message: "Sou professor universitário. Como o Posologia pode me ajudar nas aulas?" },
  { label: "Sou estudante", message: "Sou estudante de saúde. O que vocês têm para mim?" },
];

export function SalesAgent() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
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

  // Auto-greet on first open
  useEffect(() => {
    if (open && !hasGreeted && messages.length === 0) {
      setHasGreeted(true);
      setMessages([{
        role: "assistant",
        content: "Olá! 👋 Sou a **Lia**, consultora do Posologia Clinical Hub. Estou aqui para te ajudar a encontrar a melhor solução para suas necessidades.\n\nVocê é **professor**, **estudante** ou **profissional de saúde**? Me conta um pouquinho e eu mostro o que temos de melhor pra você! 🎯"
      }]);
    }
  }, [open, hasGreeted, messages.length]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("sales-agent", {
        body: { messages: newMessages },
      });

      if (error) throw error;

      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      console.error("Sales agent error:", err);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Ops, tive um probleminha técnico. Pode tentar de novo? 😅"
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full p-4 shadow-2xl transition-all duration-300",
          "bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500",
          "text-white hover:scale-110 active:scale-95",
          open && "rotate-90 opacity-0 pointer-events-none"
        )}
        aria-label="Falar com consultora"
      >
        <MessageSquare className="h-6 w-6" />
        {/* Pulse indicator */}
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 animate-ping" />
        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400" />
      </button>

      {/* Chat panel */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-[#0D1220] shadow-2xl shadow-black/40 transition-all duration-300 overflow-hidden flex flex-col",
        open ? "opacity-100 translate-y-0 h-[560px] max-h-[calc(100vh-3rem)]" : "opacity-0 translate-y-4 h-0 pointer-events-none"
      )}>
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-r from-emerald-600 to-teal-700 p-4 flex items-center gap-3">
          <div className="relative">
            <div className="rounded-full bg-white/20 p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-400 border-2 border-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Lia — Consultora Posologia</p>
            <p className="text-[11px] text-white/60">Online • Tire suas dúvidas</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-emerald-600 text-white rounded-br-md"
                  : "bg-white/[0.06] text-white/85 rounded-bl-md border border-white/[0.06]"
              )}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mt-1 [&_li]:text-white/80 [&_strong]:text-emerald-300 [&_a]:text-emerald-400">
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => (
                          <Link to={href || "/"} className="text-emerald-400 underline hover:text-emerald-300" onClick={() => setOpen(false)}>
                            {children}
                          </Link>
                        )
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-white/[0.06] border border-white/[0.06] px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick actions */}
        {messages.length <= 1 && !loading && (
          <div className="shrink-0 px-4 pb-2 flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.message)}
                className="text-[11px] rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 hover:bg-emerald-500/20 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              rows={1}
              className="flex-1 resize-none rounded-xl bg-white/[0.06] border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 max-h-24"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 p-2.5 text-white transition-colors"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
