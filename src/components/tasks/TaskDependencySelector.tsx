import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { Link2, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskDependency {
  id: string;
  depends_on_task_id: string;
  dependency_type: string;
  task_title?: string;
}

interface TaskDependencySelectorProps {
  taskId: string;
  dependencies: TaskDependency[];
  onUpdate: () => void;
  disabled?: boolean;
}

export function TaskDependencySelector({ taskId, dependencies, onUpdate, disabled }: TaskDependencySelectorProps) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('id, title')
      .neq('id', taskId)
      .ilike('title', `%${query}%`)
      .limit(10);
    setSearchResults(data || []);
    setLoading(false);
  };

  const addDependency = async (dependsOnId: string) => {
    const { error } = await supabase
      .from('task_dependencies')
      .insert({ task_id: taskId, depends_on_task_id: dependsOnId });
    if (error) {
      toast.error(error.code === '23505' ? 'Η εξάρτηση υπάρχει ήδη' : 'Σφάλμα');
      return;
    }
    toast.success('Εξάρτηση προστέθηκε!');
    setSearch('');
    setSearchResults([]);
    onUpdate();
  };

  const removeDependency = async (depId: string) => {
    await supabase.from('task_dependencies').delete().eq('id', depId);
    toast.success('Εξάρτηση αφαιρέθηκε');
    onUpdate();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" disabled={disabled}>
          <Link2 className="h-3.5 w-3.5" />
          Εξαρτήσεις
          {dependencies.length > 0 && (
            <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">{dependencies.length}</Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <p className="text-sm font-medium mb-2">Εξαρτήσεις Task</p>
        {dependencies.length > 0 && (
          <div className="space-y-1 mb-3">
            {dependencies.map(dep => (
              <div key={dep.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5">
                <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{dep.task_title || dep.depends_on_task_id}</span>
                <Badge variant="outline" className="text-[9px] px-1">{dep.dependency_type === 'finish_to_start' ? 'FS' : dep.dependency_type}</Badge>
                {!disabled && (
                  <button onClick={() => removeDependency(dep.id)} className="text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {!disabled && (
          <div className="space-y-2">
            <Input
              placeholder="Αναζήτηση task..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-8 text-xs"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
            {searchResults.map(t => (
              <button
                key={t.id}
                className="w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-muted text-left"
                onClick={() => addDependency(t.id)}
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                <span className="truncate">{t.title}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
