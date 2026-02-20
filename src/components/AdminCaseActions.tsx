import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AdminCaseActionsProps {
  caseItem: any;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: { title: string; difficulty: string }) => Promise<void>;
  onCopy: (id: string, targetSlug: string) => Promise<void>;
  availableTargets: string[];
}

const SLUG_LABELS: Record<string, string> = {
  tdm: "TDM",
  prm: "PRM",
  antimicrobianos: "Antimicrobianos",
  acompanhamento: "Acompanhamento",
  insulina: "Insulina",
};

export function AdminCaseActions({ caseItem, onDelete, onUpdate, onCopy, availableTargets }: AdminCaseActionsProps) {
  const { isAdmin } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(caseItem.title);
  const [editDifficulty, setEditDifficulty] = useState(caseItem.difficulty);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isAdmin || !caseItem.isAI) return null;

  const handleUpdate = async () => {
    await onUpdate(caseItem.id, { title: editTitle, difficulty: editDifficulty });
    setEditOpen(false);
  };

  const handleDelete = async () => {
    await onDelete(caseItem.id);
    setConfirmDelete(false);
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
          <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4 mr-2" />Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
