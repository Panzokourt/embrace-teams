import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { FolderInput, RefreshCw, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'proposal', label: 'Πρόταση' },
  { value: 'negotiation', label: 'Διαπραγμάτευση' },
  { value: 'active', label: 'Ενεργό' },
  { value: 'completed', label: 'Ολοκληρωμένο' },
  { value: 'cancelled', label: 'Ακυρωμένο' },
];

interface ProjectBulkActionsProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onActionComplete: () => void;
}

export function ProjectBulkActions({ selectedIds, onClearSelection, onActionComplete }: ProjectBulkActionsProps) {
  const { company } = useAuth();
  const queryClient = useQueryClient();
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: folders = [] } = useQuery({
    queryKey: ['project-folders', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data } = await supabase
        .from('project_folders')
        .select('id, name')
        .eq('company_id', company.id)
        .order('name');
      return data || [];
    },
    enabled: !!company?.id,
  });

  const ids = [...selectedIds];

  const handleMove = async () => {
    setSaving(true);
    try {
      const folderId = selectedFolder === 'none' ? null : selectedFolder;
      const { error } = await supabase
        .from('projects')
        .update({ folder_id: folderId })
        .in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} έργα μετακινήθηκαν`);
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      onActionComplete();
      onClearSelection();
    } catch {
      toast.error('Σφάλμα μετακίνησης');
    } finally {
      setSaving(false);
      setMoveDialogOpen(false);
      setSelectedFolder('');
    }
  };

  const handleStatusChange = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: selectedStatus as any })
        .in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} έργα ενημερώθηκαν`);
      onActionComplete();
      onClearSelection();
    } catch {
      toast.error('Σφάλμα ενημέρωσης');
    } finally {
      setSaving(false);
      setStatusDialogOpen(false);
      setSelectedStatus('');
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .in('id', ids);
      if (error) throw error;
      toast.success(`${ids.length} έργα διαγράφηκαν`);
      queryClient.invalidateQueries({ queryKey: ['sidebar-projects'] });
      onActionComplete();
      onClearSelection();
    } catch {
      toast.error('Σφάλμα διαγραφής');
    } finally {
      setSaving(false);
      setDeleteDialogOpen(false);
    }
  };

  if (selectedIds.size === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Badge variant="secondary" className="text-xs">
          {selectedIds.size} επιλεγμένα
        </Badge>
        <div className="flex items-center gap-1 ml-2">
          <Button variant="outline" size="sm" onClick={() => setMoveDialogOpen(true)}>
            <FolderInput className="h-3.5 w-3.5 mr-1.5" />
            Φάκελος
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(true)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Status
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(true)} className="text-destructive hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Διαγραφή
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto" onClick={onClearSelection}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Move Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Μετακίνηση σε Φάκελο</DialogTitle>
            <DialogDescription>{selectedIds.size} έργα</DialogDescription>
          </DialogHeader>
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger><SelectValue placeholder="Επιλέξτε φάκελο" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Χωρίς φάκελο</SelectItem>
              {folders.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleMove} disabled={!selectedFolder || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Μετακίνηση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Αλλαγή Κατάστασης</DialogTitle>
            <DialogDescription>{selectedIds.size} έργα</DialogDescription>
          </DialogHeader>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger><SelectValue placeholder="Επιλέξτε κατάσταση" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleStatusChange} disabled={!selectedStatus || saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Εφαρμογή
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή {selectedIds.size} έργων;</AlertDialogTitle>
            <AlertDialogDescription>
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Θα διαγραφούν και όλα τα σχετικά δεδομένα.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
