import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Copy, Store, StoreIcon, Code, Check, Save, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminCaseActionsProps {
  caseItem: any;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: { title: string; difficulty: string }) => Promise<void>;
  onCopy: (id: string, targetSlug: string) => Promise<void>;
  availableTargets: string[];
  onToggleMarketplace?: (id: string, currentValue: boolean) => Promise<void>;
}

const SLUG_LABELS: Record<string, string> = {
  tdm: "TDM",
  prm: "PRM",
  antimicrobianos: "Antimicrobianos",
  acompanhamento: "Acompanhamento",
  insulina: "Insulina",
};

export function AdminCaseActions({ caseItem, onDelete, onUpdate, onCopy, availableTargets, onToggleMarketplace }: AdminCaseActionsProps) {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(caseItem.title);
  const [editDifficulty, setEditDifficulty] = useState(caseItem.difficulty);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptEditing, setPromptEditing] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  // Show actions for: admin, or the case author (only for AI-generated cases)
  const isOwner = caseItem.created_by && user?.id === caseItem.created_by;
  if (!caseItem.isAI || (!isAdmin && !isOwner)) return null;

  const handleUpdate = async () => {
    await onUpdate(caseItem.id, { title: editTitle, difficulty: editDifficulty });
    setEditOpen(false);
  };

  const handleDelete = async () => {
    await onDelete(caseItem.id);
    setConfirmDelete(false);
  };

  const handleToggleMarketplace = async () => {
    try {
      if (onToggleMarketplace) {
        await onToggleMarketplace(caseItem.id, !!caseItem.is_marketplace);
        return;
      }

      const { error } = await supabase
        .from("simulator_cases" as any)
        .update({ is_marketplace: !caseItem.is_marketplace } as any)
        .eq("id", caseItem.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["simulator-cases"] });
      toast.success(!caseItem.is_marketplace ? "Caso publicado no Marketplace!" : "Caso removido do Marketplace");
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar Marketplace");
    }
  };

  const handleOpenPrompt = () => {
    const data = caseItem.case_data || caseItem;
    setPromptText(typeof data === "string" ? data : JSON.stringify(data, null, 2));
    setPromptEditing(false);
    setPromptOpen(true);
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(promptText);
    setPromptCopied(true);
    toast.success("Prompt copiado!");
    setTimeout(() => setPromptCopied(false), 2000);
  };

  const handleSavePrompt = async () => {
    try {
      const parsed = JSON.parse(promptText);
      const { error } = await supabase
        .from("simulator_cases" as any)
        .update({ case_data: parsed } as any)
        .eq("id", caseItem.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["simulator-cases"] });
      toast.success("Prompt do caso atualizado!");
      setPromptEditing(false);
      setPromptOpen(false);
    } catch (e: any) {
      toast.error(e.message?.includes("JSON") ? "JSON inválido" : (e.message || "Erro ao salvar"));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {isAdmin && (
            <DropdownMenuItem onClick={handleOpenPrompt}>
              <Code className="h-4 w-4 mr-2" />Ver Prompt
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => { setEditTitle(caseItem.title); setEditDifficulty(caseItem.difficulty); setEditOpen(true); }}>
            <Pencil className="h-4 w-4 mr-2" />Editar
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Copy className="h-4 w-4 mr-2" />Copiar para
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {availableTargets.map(slug => (
                <DropdownMenuItem key={slug} onClick={() => onCopy(caseItem.id, slug)}>
                  {SLUG_LABELS[slug] || slug}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleToggleMarketplace}>
            {caseItem.is_marketplace ? (
              <><StoreIcon className="h-4 w-4 mr-2" />Remover do Marketplace</>
            ) : (
              <><Store className="h-4 w-4 mr-2" />Publicar no Marketplace</>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4 mr-2" />Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Prompt Viewer Dialog */}
      <Dialog open={promptOpen} onOpenChange={(v) => { setPromptOpen(v); if (!v) setPromptEditing(false); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5 text-primary" />
              Prompt do Caso Clínico
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{caseItem.title}</p>
          </DialogHeader>
          <div className="flex gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={handleCopyPrompt} className="gap-1.5">
              {promptCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              {promptCopied ? "Copiado" : "Copiar"}
            </Button>
            {!promptEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setPromptEditing(true)} className="gap-1.5">
                <Eye className="h-4 w-4" />Editar
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleSavePrompt} className="gap-1.5 text-primary">
                <Save className="h-4 w-4" />Salvar
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {promptEditing ? (
              <Textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="min-h-[400px] font-mono text-xs leading-relaxed resize-none"
              />
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed bg-muted/50 rounded-lg p-4 border overflow-auto max-h-[60vh]">
                {promptText}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>Editar Caso Clínico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Dificuldade</label>
              <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fácil">Fácil</SelectItem>
                  <SelectItem value="Médio">Médio</SelectItem>
                  <SelectItem value="Difícil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>Excluir Caso Clínico</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tem certeza que deseja excluir "{caseItem.title}"? Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
