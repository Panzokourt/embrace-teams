import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FolderTree, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

export function SidebarPrefsSection() {
  const [treeMode, setTreeMode] = useState(() => localStorage.getItem('sidebar-project-tree-mode') || 'auto');

  const change = (mode: 'auto' | 'manual') => {
    localStorage.setItem('sidebar-project-tree-mode', mode);
    setTreeMode(mode);
    toast.success(mode === 'auto' ? 'Αυτόματη οργάνωση ενεργοποιήθηκε' : 'Χειροκίνητη οργάνωση ενεργοποιήθηκε');
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <Label>Οργάνωση Έργων στο Sidebar</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button variant={treeMode === 'auto' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => change('auto')}>
            <FolderTree className="h-5 w-5" />
            <span className="text-xs">Αυτόματη</span>
          </Button>
          <Button variant={treeMode === 'manual' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => change('manual')}>
            <LayoutGrid className="h-5 w-5" />
            <span className="text-xs">Χειροκίνητη</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Αυτόματη: Κατηγορία → Πελάτης → Έργα. Χειροκίνητη: Δικοί σας φάκελοι με drag & drop.
        </p>
      </CardContent>
    </Card>
  );
}
