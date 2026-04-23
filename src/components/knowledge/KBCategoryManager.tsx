import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, RefreshCw } from 'lucide-react';
import { useKBSync } from '@/hooks/useKBSync';
import type { KBCategory } from '@/hooks/useKnowledgeBase';

interface KBCategoryManagerProps {
  categories: KBCategory[];
  onCreate: (data: Partial<KBCategory>) => void;
  onDelete: (id: string) => void;
}

export function KBCategoryManager({ categories, onCreate, onDelete }: KBCategoryManagerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const sync = useKBSync();

  const handleCreate = () => {
    const parent = parentId ? categories.find(c => c.id === parentId) : null;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    onCreate({
      name,
      slug,
      parent_id: parentId || null,
      level: parent ? parent.level + 1 : 1,
    });
    setName('');
    setParentId('');
    setOpen(false);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={() => sync.mutate()}
        disabled={sync.isPending}
        className="gap-1"
        title="Συγχρονισμός με Departments / Clients / Services"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${sync.isPending ? 'animate-spin' : ''}`} />
        Sync
      </Button>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1">
        <Plus className="h-3.5 w-3.5" /> Κατηγορία
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Νέα Κατηγορία</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Όνομα</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <Label>Parent (optional)</Label>
              <Select value={parentId || '__root__'} onValueChange={(v) => setParentId(v === '__root__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Root level" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">Root</SelectItem>
                  {categories.filter(c => c.level < 3).map(c => (
                    <SelectItem key={c.id} value={c.id}>{'─'.repeat(c.level - 1)} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Ακύρωση</Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>Δημιουργία</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
