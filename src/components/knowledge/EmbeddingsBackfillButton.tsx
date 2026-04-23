import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function EmbeddingsBackfillButton() {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("embed-backfill", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(
        `Embeddings: ${data.article_chunks} chunks · ${data.sources} πηγές · ${data.memories} μνήμες`
      );
      if (data.errors?.length) {
        console.warn("Backfill partial errors:", data.errors);
      }
    } catch (e: any) {
      toast.error(e.message || "Σφάλμα backfill");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={run} disabled={loading} variant="outline" size="sm" className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {loading ? "Δημιουργία embeddings..." : "Επαναφόρτωση embeddings"}
    </Button>
  );
}
