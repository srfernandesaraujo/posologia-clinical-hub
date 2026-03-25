import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SystemUpdate {
  id: string;
  type: "update" | "idea";
  status: "done" | "planned" | "in_progress" | "idea";
  title: string;
  description: string | null;
  category: string | null;
  priority: "low" | "medium" | "high" | "critical";
  version: string | null;
  created_at: string;
  implemented_at: string | null;
  created_by: string | null;
  updated_at: string;
}

export type SystemUpdateInsert = Omit<SystemUpdate, "id" | "created_at" | "updated_at">;

export function useSystemUpdates() {
  const queryClient = useQueryClient();

  const updatesQuery = useQuery({
    queryKey: ["system-updates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_updates" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SystemUpdate[];
    },
  });

  const pendingIdeas = (updatesQuery.data || []).filter(
    (u) => u.type === "idea" || u.status === "planned" || u.status === "in_progress"
  );

  const changelog = (updatesQuery.data || []).filter(
    (u) => u.status === "done"
  );

  const createUpdate = useMutation({
    mutationFn: async (update: SystemUpdateInsert) => {
      const { error } = await supabase
        .from("system_updates" as any)
        .insert(update as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-updates"] }),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...fields }: Partial<SystemUpdate> & { id: string }) => {
      const { error } = await supabase
        .from("system_updates" as any)
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-updates"] }),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("system_updates" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["system-updates"] }),
  });

  return {
    updates: updatesQuery.data || [],
    changelog,
    pendingIdeas,
    isLoading: updatesQuery.isLoading,
    createUpdate,
    updateEntry,
    deleteEntry,
  };
}
