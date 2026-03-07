import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Code, Copy, Check, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface AdminPromptViewerProps {
  toolSlug: string;
  toolName: string;
  toolType: "calculator" | "simulator" | "game";
  prompt: string;
  onSave?: (newPrompt: string) => void;
}

export default function AdminPromptViewer({ toolSlug, toolName, toolType, prompt, onSave }: AdminPromptViewerProps) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState(prompt);
  const [copied, setCopied] = useState(false);

  if (!isAdmin) return null;

  const typeLabels: Record<string, string> = {
    calculator: "Calculadora",
    simulator: "Simulador",
    game: "Jogo Clínico",
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(editing ? editedPrompt : prompt);
    setCopied(true);
    toast.success("Prompt copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave?.(editedPrompt);
    setEditing(false);
    toast.success("Prompt atualizado!");
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setEditing(false);
      setEditedPrompt(prompt);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/10">
          <Code className="h-4 w-4" />
          System Prompt
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Code className="h-5 w-5 text-primary" />
            System Prompt
            <Badge variant="secondary" className="text-xs">
              {typeLabels[toolType]}
            </Badge>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{toolName} ({toolSlug})</p>
        </DialogHeader>

        <div className="flex gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
          {!editing ? (
            <Button variant="ghost" size="sm" onClick={() => { setEditing(true); setEditedPrompt(prompt); }} className="gap-1.5">
              <Eye className="h-4 w-4" />
              Editar
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleSave} className="gap-1.5 text-green-600">
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          {editing ? (
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="min-h-[400px] font-mono text-xs leading-relaxed resize-none"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed bg-muted/50 rounded-lg p-4 border overflow-auto max-h-[60vh]">
              {prompt}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
