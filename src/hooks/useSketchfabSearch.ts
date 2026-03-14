import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SketchfabModel {
  uid: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  viewerUrl: string;
  isDownloadable: boolean;
  user: string;
  viewCount: number;
  likeCount: number;
}

interface SearchResult {
  models: SketchfabModel[];
  totalCount: number;
}

export function useSketchfabSearch() {
  const [models, setModels] = useState<SketchfabModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const searchModels = useCallback(async (query: string, count = 4) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-sketchfab", {
        body: { query, count },
      });

      if (error) throw error;

      const result = data as SearchResult;
      setModels(result.models || []);
      setTotalCount(result.totalCount || 0);
      return result.models || [];
    } catch (err) {
      console.error("Sketchfab search error:", err);
      toast.error("Erro ao buscar modelos no Sketchfab");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { models, isLoading, totalCount, searchModels };
}
