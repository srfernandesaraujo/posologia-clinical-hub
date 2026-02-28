import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useMarketplacePurchases() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["marketplace-purchases", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_purchases" as any)
        .select("tool_id, tool_type, price_brl, created_at")
        .eq("buyer_id", user!.id);
      if (error) throw error;
      return (data || []) as unknown as { tool_id: string; tool_type: string; price_brl: number; created_at: string }[];
    },
    enabled: !!user,
  });

  const purchasedToolIds = new Set(purchases.map((p) => p.tool_id));

  const hasPurchased = (toolId: string) => purchasedToolIds.has(toolId);

  const purchaseMutation = useMutation({
    mutationFn: async (toolId: string) => {
      const { data, error } = await supabase.functions.invoke("purchase-tool", {
        body: { toolId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-purchases"] });
      toast.success("Ferramenta adquirida com sucesso! O valor será cobrado na sua próxima fatura.");
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao adquirir ferramenta");
    },
  });

  return {
    purchases,
    isLoading,
    hasPurchased,
    purchaseTool: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
  };
}
