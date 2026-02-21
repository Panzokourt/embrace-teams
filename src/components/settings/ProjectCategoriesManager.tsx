import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FolderTree, Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';

interface ProjectCategory {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

export function ProjectCategoriesManager() {
  const { company } = useAuth();
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['project-categories', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order');
      if (error) throw error;
      return data as ProjectCategory[];
    },
    enabled: !!companyId,
  });

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('project_categories').insert({
        company_id: companyId!,
        name,
        sort_order: categories.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-categories'] });
      setNewName('');
      toast.success('Η κατηγορία προστέθηκε');
    },
    onError: () => toast.error('Σφάλμα δημιουργίας'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('project_categories').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-categories'] });
      setEditingId(null);
      toast.success('Η κατηγορία ενημερώθηκε');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('project_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-categories'] });
      toast.success('Η κατηγορία διαγράφηκε');
    },
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const defaults = [
        { name: 'Δημόσιος Τομέας', sort_order: 0 },
        { name: 'Ιδιωτικός Τομέας', sort_order: 1 },
        { name: 'Μη Κερδοσκοπικός', sort_order: 2 },
        { name: 'Κυβερνητικός', sort_order: 3 },
        { name: 'Μικτός', sort_order: 4 },
      ];
      const { error } = await supabase.from('project_categories').insert(
        defaults.map(d => ({ ...d, company_id: companyId! }))
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-categories'] });
      toast.success('Οι προεπιλεγμένες κατηγορίες δημιουργήθηκαν');
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" />
          <CardTitle>Κατηγορίες Έργων</CardTitle>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
            Admin Only
          </Badge>
        </div>
        <CardDescription>
          Οι κατηγορίες χρησιμοποιούνται για την αυτόματη οργάνωση των έργων στο sidebar (Κατηγορία → Πελάτης → Έργα).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length === 0 && !isLoading && (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-muted-foreground">Δεν υπάρχουν κατηγορίες ακόμα.</p>
            <Button variant="outline" size="sm" onClick={() => seedDefaults.mutate()}>
              <Plus className="h-4 w-4 mr-2" />
              Δημιουργία Προεπιλεγμένων
            </Button>
          </div>
        )}

        <div className="space-y-1">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-secondary/30 group">
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
              <div
                className="h-3 w-3 rounded-full shrink-0 border border-border/50"
                style={{ backgroundColor: cat.color || '#3B82F6' }}
              />
              {editingId === cat.id ? (
                <form
                  className="flex items-center gap-1 flex-1"
                  onSubmit={e => {
                    e.preventDefault();
                    if (editValue.trim()) updateCategory.mutate({ id: cat.id, name: editValue.trim() });
                  }}
                >
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="h-7 text-sm flex-1"
                  />
                  <Button type="submit" size="icon" variant="ghost" className="h-7 w-7">
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="text-sm flex-1">{cat.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => { setEditingId(cat.id); setEditValue(cat.name); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={() => {
                      if (confirm('Διαγραφή κατηγορίας "' + cat.name + '";')) {
                        deleteCategory.mutate(cat.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            if (newName.trim()) addCategory.mutate(newName.trim());
          }}
        >
          <Input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Νέα κατηγορία..."
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Προσθήκη
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
