import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Brain, Settings as SettingsIcon } from "lucide-react";
import MemoryManager from "@/components/secretary/MemoryManager";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function AIMemoryCard() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("secretary_memory")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setCount(count ?? 0));
  }, [user, open]);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  AI Μνήμη
                  {count !== null && (
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Πληροφορίες που θυμάται ο AI Assistant για να σου παρέχει συνέχεια
                  στις συνομιλίες (αποφάσεις, προτιμήσεις, context έργων).
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setOpen(true)}>
              <SettingsIcon className="h-3.5 w-3.5" />
              Διαχείριση
            </Button>
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Η μνήμη ενημερώνεται αυτόματα από τα AI chats. Από εδώ μπορείς να
          δεις τι έχει αποθηκευτεί ή να διαγράψεις συγκεκριμένες εγγραφές.
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0">
          <MemoryManager onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
