import { useState } from "react";
import { Link } from "react-router-dom";
import { useClasses } from "@/hooks/useClasses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, GraduationCap, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function Turmas() {
  const { user } = useAuth();
  const { list, create } = useClasses();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", semester: "" });

  // counts (rooms + students) — single batched queries
  const { data: rooms = [] } = useQuery({
    queryKey: ["classes-rooms-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("virtual_rooms")
        .select("id, class_id")
        .eq("created_by", user!.id);
      if (error) throw error;
      return data || [];
    },
  });
  const { data: students = [] } = useQuery({
    queryKey: ["classes-students-count", user?.id],
    enabled: !!user && (list.data?.length ?? 0) > 0,
    queryFn: async () => {
      const ids = (list.data || []).map(c => c.id);
      if (!ids.length) return [];
      const { data, error } = await (supabase as any)
        .from("class_students")
        .select("id, class_id")
        .in("class_id", ids);
      if (error) throw error;
      return data || [];
    },
  });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await create.mutateAsync(form);
    setForm({ name: "", description: "", semester: "" });
    setOpen(false);
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" /> Turmas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize seus alunos em turmas e crie salas virtuais vinculadas a cada turma.
            Os analytics ficam disponíveis dentro de cada sala.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nova turma</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova turma</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome*</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Farmacologia 2026.1 — T01" />
              </div>
              <div>
                <Label>Semestre</Label>
                <Input value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} placeholder="2026.1" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={create.isPending || !form.name.trim()}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {list.isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (list.data?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Você ainda não tem turmas. Crie sua primeira turma para começar.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {list.data!.map(c => {
            const roomCount = rooms.filter((r: any) => r.class_id === c.id).length;
            const studentCount = students.filter((s: any) => s.class_id === c.id).length;
            return (
              <Card key={c.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between gap-2">
                    <span className="truncate">{c.name}</span>
                    {c.semester && <span className="text-xs font-normal text-muted-foreground">{c.semester}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
                  <div className="flex gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3.5 w-3.5" /> {studentCount} aluno(s)
                    </span>
                    <span className="text-muted-foreground">{roomCount} sala(s)</span>
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <Link to={`/turmas/${c.id}`}>
                      Abrir turma <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
