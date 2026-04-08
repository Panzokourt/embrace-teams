import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Brain, Search, Trash2, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { el } from "date-fns/locale";
import { toast } from "sonner";

interface Memory {
  id: string;
  category: string;
  key: string;
  content: string;
  metadata: Record<string, any> | null;
  project_id: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  general: { label: "Γενικό", color: "bg-muted text-muted-foreground" },
  file_analysis: { label: "Ανάλυση Αρχείου", color: "bg-blue-500/10 text-blue-600" },
  decision: { label: "Απόφαση", color: "bg-amber-500/10 text-amber-600" },
  preference: { label: "Προτίμηση", color: "bg-green-500/10 text-green-600" },
  project_context: { label: "Context Έργου", color: "bg-purple-500/10 text-purple-600" },
};

export default function MemoryManager({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Memory | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("secretary_memory")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (filterCategory) q = q.eq("category", filterCategory);
    if (search.trim()) {
      q = q.or(`content.ilike.%${search.trim()}%,key.ilike.%${search.trim()}%`);
    }

    const { data } = await q;
    setMemories((data as Memory[]) || []);
    setLoading(false);
  }, [user, search, filterCategory]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleDelete = async (memory: Memory) => {
    const { error } = await supabase.from("secretary_memory").delete().eq("id", memory.id);
    if (error) {
      toast.error("Σφάλμα κατά τη διαγραφή");
    } else {
      toast.success("Η μνήμη διαγράφηκε");
      setMemories((prev) => prev.filter((m) => m.id !== memory.id));
    }
    setDeleteTarget(null);
  };

  const handleDeleteAll = async () => {
    if (!user) return;
    const { error } = await supabase.from("secretary_memory").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Σφάλμα κατά τη διαγραφή");
    } else {
      toast.success("Όλες οι μνήμες διαγράφηκαν");
      setMemories([]);
    }
  };

  const categories = Object.keys(CATEGORY_LABELS);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">AI Μνήμη</span>
          <Badge variant="secondary" className="text-xs">{memories.length}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchMemories}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="px-3 py-2 space-y-2 border-b border-border/40 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Αναζήτηση μνημών..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <Badge
            variant={filterCategory === null ? "default" : "outline"}
            className="text-[10px] cursor-pointer"
            onClick={() => setFilterCategory(null)}
          >
            Όλα
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={filterCategory === cat ? "default" : "outline"}
              className="text-[10px] cursor-pointer"
              onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
            >
              {CATEGORY_LABELS[cat].label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Memory List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-8">Φόρτωση...</p>
          ) : memories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Δεν βρέθηκαν μνήμες</p>
          ) : (
            memories.map((mem) => {
              const catInfo = CATEGORY_LABELS[mem.category] || CATEGORY_LABELS.general;
              return (
                <div
                  key={mem.id}
                  className="group rounded-lg border border-border/40 bg-card p-3 space-y-1.5 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge className={`text-[10px] ${catInfo.color} border-0`}>{catInfo.label}</Badge>
                      <span className="text-xs font-medium truncate max-w-[200px]">{mem.key}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-destructive"
                      onClick={() => setDeleteTarget(mem)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{mem.content}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
                    <span>
                      {mem.updated_at
                        ? format(new Date(mem.updated_at), "d MMM yyyy, HH:mm", { locale: el })
                        : "—"}
                    </span>
                    {mem.metadata && Object.keys(mem.metadata).length > 0 && (
                      <span>• {Object.keys(mem.metadata).length} metadata</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      {memories.length > 0 && (
        <div className="px-3 py-2 border-t border-border/40 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs text-destructive hover:text-destructive"
            onClick={() => {
              setDeleteTarget({ id: "ALL", category: "", key: "", content: "", metadata: null, project_id: null, client_id: null, created_at: "", updated_at: "" });
            }}
          >
            <Trash2 className="h-3 w-3 mr-1.5" />
            Διαγραφή όλων
          </Button>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.id === "ALL" ? "Διαγραφή όλων των μνημών;" : "Διαγραφή μνήμης;"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.id === "ALL"
                ? "Θα διαγραφούν οριστικά όλες οι αποθηκευμένες μνήμες. Ο AI δεν θα θυμάται τίποτα από προηγούμενες συνομιλίες."
                : `Θα διαγραφεί η μνήμη "${deleteTarget?.key}".`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget?.id === "ALL") handleDeleteAll();
                else if (deleteTarget) handleDelete(deleteTarget);
              }}
            >
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
