import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Trash2, Database, FolderOpen, Users, FileText, Radio, MessageSquare, Heart, Brain, Bell } from 'lucide-react';

const CATEGORIES = [
  { key: 'projects', label: 'Έργα & Tasks', description: 'Projects, tasks, deliverables, σχόλια, χρονοκαταγραφή, αρχεία', icon: FolderOpen },
  { key: 'clients', label: 'Πελάτες & Επαφές', description: 'Πελάτες, επαφές, ετικέτες επαφών', icon: Users },
  { key: 'proposals', label: 'Προτάσεις & Συμβόλαια', description: 'Προτάσεις, συμβόλαια, τιμολόγια, έξοδα', icon: FileText },
  { key: 'media', label: 'Media Plans', description: 'Media plans, items, snapshots', icon: Radio },
  { key: 'communication', label: 'Επικοινωνία', description: 'Chat μηνύματα, κανάλια, συνομιλίες secretary', icon: MessageSquare },
  { key: 'hr', label: 'HR & Άδειες', description: 'Έγγραφα HR, αιτήματα αδειών, υπόλοιπα', icon: Heart },
  { key: 'brain', label: 'Brain / AI', description: 'AI insights, deep dives', icon: Brain },
  { key: 'logs', label: 'Ειδοποιήσεις & Logs', description: 'Ειδοποιήσεις, activity log', icon: Bell },
] as const;

export function DataManagementCard() {
  const { company } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!company) return;
    fetchCounts();
  }, [company]);

  const fetchCounts = async () => {
    if (!company) return;
    setLoadingCounts(true);
    try {
      const { data } = await supabase.functions.invoke('data-management', {
        body: { action: 'counts', company_id: company.id },
      });
      if (data?.counts) setCounts(data.counts);
    } catch (err) {
      console.error('Error fetching counts:', err);
    } finally {
      setLoadingCounts(false);
    }
  };

  const toggleCategory = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleDelete = async () => {
    if (confirmText !== 'ΔΙΑΓΡΑΦΗ' || !company) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('data-management', {
        body: { action: 'delete', categories: Array.from(selected), company_id: company.id },
      });
      if (error) throw error;
      toast.success('Τα δεδομένα διαγράφηκαν επιτυχώς');
      setDialogOpen(false);
      setConfirmText('');
      setSelected(new Set());
      fetchCounts();
    } catch (err: any) {
      toast.error(err.message || 'Σφάλμα κατά τη διαγραφή');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-destructive" />
            <CardTitle>Διαχείριση Δεδομένων</CardTitle>
          </div>
          <CardDescription>
            Επιλέξτε κατηγορίες δεδομένων για μαζική διαγραφή. Αυτή η ενέργεια είναι μη αναστρέψιμη.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingCounts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-3">
              {CATEGORIES.map(({ key, label, description, icon: Icon }) => {
                const count = counts[key] || 0;
                return (
                  <label
                    key={key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={selected.has(key)}
                      onCheckedChange={() => toggleCategory(key)}
                      disabled={count === 0}
                      className="mt-0.5"
                    />
                    <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{count} εγγραφές</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <div className="pt-2">
            <Button
              variant="destructive"
              disabled={selected.size === 0}
              onClick={() => setDialogOpen(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Διαγραφή Επιλεγμένων ({selected.size})
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Επιβεβαίωση Διαγραφής
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Πρόκειται να διαγράψετε δεδομένα από <strong>{selected.size}</strong> κατηγορ{selected.size === 1 ? 'ία' : 'ίες'}:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {Array.from(selected).map(key => {
                  const cat = CATEGORIES.find(c => c.key === key);
                  return <li key={key}>{cat?.label} ({counts[key] || 0} εγγραφές)</li>;
                })}
              </ul>
              <p className="font-medium text-destructive">
                Αυτή η ενέργεια είναι μη αναστρέψιμη. Πληκτρολογήστε ΔΙΑΓΡΑΦΗ για επιβεβαίωση.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-delete">Επιβεβαίωση</Label>
            <Input
              id="confirm-delete"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="ΔΙΑΓΡΑΦΗ"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setConfirmText(''); }}>
              Ακύρωση
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'ΔΙΑΓΡΑΦΗ' || deleting}
              onClick={handleDelete}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Οριστική Διαγραφή
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
