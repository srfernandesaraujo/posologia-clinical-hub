import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ClassRow {
  id: string;
  name: string;
  description: string | null;
  semester: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ClassStudent {
  id: string;
  class_id: string;
  full_name: string;
  email: string;
  external_id: string | null;
  created_at: string;
}

export function useClasses() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["classes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("classes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ClassRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; description?: string; semester?: string }) => {
      const { data, error } = await (supabase as any)
        .from("classes")
        .insert({ ...input, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as ClassRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Turma criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string; semester?: string; archived_at?: string | null }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any).from("classes").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Turma atualizada");
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("classes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Turma excluída");
    },
  });

  return { list, create, update, remove };
}

export function useClassStudents(classId: string | undefined) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["class-students", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("class_students")
        .select("*")
        .eq("class_id", classId)
        .order("full_name");
      if (error) throw error;
      return (data || []) as ClassStudent[];
    },
  });

  const addMany = useMutation({
    mutationFn: async (students: { full_name: string; email: string; external_id?: string }[]) => {
      if (!classId) return;
      const rows = students
        .filter(s => s.email && s.full_name)
        .map(s => ({ ...s, class_id: classId, email: s.email.trim().toLowerCase() }));
      if (!rows.length) return;
      const { error } = await (supabase as any).from("class_students").upsert(rows, {
        onConflict: "class_id,email",
        ignoreDuplicates: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-students", classId] });
      toast.success("Alunos adicionados");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("class_students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["class-students", classId] });
    },
  });

  return { list, addMany, remove };
}
