import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2, RotateCcw, MessageSquare, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown renderer for bold, headers, lists
  const lines = content.split("\n");
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return <h3 key={i} className="text-base font-bold text-foreground mt-3 mb-1">{line.slice(3)}</h3>;
        }
        if (line.startsWith("### ")) {
          return <h4 key={i} className="text-sm font-semibold text-foreground mt-2 mb-1">{line.slice(4)}</h4>;
        }
        if (line.startsWith("# ")) {
          return <h2 key={i} className="text-lg font-bold text-foreground mt-3 mb-1">{line.slice(2)}</h2>;
        }
        if (line.match(/^\d+\.\s/)) {
          const text = line.replace(/^\d+\.\s/, "");
          return <p key={i} className="ml-4 before:content-[''] text-foreground">{renderInline(line)}</p>;
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return <p key={i} className="ml-4 text-foreground">• {renderInline(line.slice(2))}</p>;
        }
        if (line.trim() === "") return <br key={i} />;
        return <p key={i} className="text-foreground">{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Bold (**text**) and inline code (`text`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function AgenteFeedback() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-start conversation
  useEffect(() => {
    if (messages.length === 0) {
      startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function startConversation() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("feedback-agent", {
        body: { messages: [] },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([{ role: "assistant", content: data.reply }]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao iniciar conversa");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("feedback-agent", {
        body: { messages: updated },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...updated, { role: "assistant", content: data.reply }]);
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar mensagem");
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleReset() {
    setMessages([]);
    setInput("");
    setTimeout(() => startConversation(), 100);
  }

  function handleCopy(content: string, idx: number) {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    toast.success("Copiado!");
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Agente de Feedback</h1>
            <p className="text-xs text-muted-foreground">Feedback estruturado com instrumentos validados</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} disabled={isLoading}>
          <RotateCcw className="h-4 w-4 mr-1" />
          Nova conversa
        </Button>
      </div>

      {/* Chat area */}
      <Card className="border border-border overflow-hidden">
        <div
          ref={scrollRef}
          className="h-[60vh] overflow-y-auto p-4 space-y-4"
        >
          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 relative group",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 border border-border"
                )}
              >
                {msg.role === "assistant" ? (
                  <>
                    <MarkdownContent content={msg.content} />
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                    >
                      {copiedIdx === idx ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted/60 border border-border rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pensando...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 bg-card">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua resposta..."
              className="min-h-[44px] max-h-[150px] resize-none"
              disabled={isLoading}
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[44px] w-[44px]"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Shift+Enter para nova linha • Enter para enviar
          </p>
        </div>
      </Card>
    </div>
  );
}
