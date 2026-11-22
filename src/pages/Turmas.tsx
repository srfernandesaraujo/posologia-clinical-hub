import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/layouts/PageHeader";
import { Link } from "react-router-dom";
import { useClasses } from "@/hooks/useClasses";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, GraduationCap, ArrowRight, DoorOpen } from "lucide-react";
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
        .select("id, class_id, is_active")
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
      <PageHeader
        icon={<GraduationCap />}
        title="Turmas"
        description="Organize seus alunos em turmas e crie salas virtuais vinculadas a cada turma. Os analytics ficam disponíveis dentro de cada sala."
        className="mb-0"
        actions={
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
        }
      />

      {list.isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (list.data?.length ?? 0) === 0 ? (
        <EmptyState icon={<GraduationCap />} title="Você ainda não tem turmas" description="Crie sua primeira turma para organizar alunos e salas virtuais." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Turmas", value: list.data!.length, icon: <GraduationCap /> },
              { label: "Alunos", value: students.length, icon: <Users /> },
              { label: "Salas ativas", value: rooms.filter((r: any) => r.is_active).length, icon: <DoorOpen /> },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">{s.icon}</span>
                <div>
                  <p className="font-mono text-xl font-semibold tabular-nums leading-none">{s.value}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {list.data!.map(c => {
              const classRooms = rooms.filter((r: any) => r.class_id === c.id);
              const roomCount = classRooms.length;
              const activeCount = classRooms.filter((r: any) => r.is_active).length;
              const studentCount = students.filter((s: any) => s.class_id === c.id).length;
              return (
                <Link
                  key={c.id}
                  to={`/turmas/${c.id}`}
                  className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug">{c.name}</h3>
                    {c.semester && <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{c.semester}</span>}
                  </div>
                  {c.description && <p className="line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-4">
                    {[
                      { v: studentCount, l: "alunos" },
                      { v: roomCount, l: "salas" },
                      { v: activeCount, l: "ativas", ok: activeCount > 0 },
                    ].map(x => (
                      <div key={x.l}>
                        <p className={`font-mono text-lg font-semibold tabular-nums leading-none ${x.ok ? "text-status-ok" : ""}`}>{x.v}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{x.l}</p>
                      </div>
                    ))}
                  </div>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary">
                    Abrir turma <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
