import { useState } from 'react';
import { LayoutDashboard, Plus, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardConfig } from '@/hooks/useDashboardConfig';

interface Props {
  savedLayouts: Record<string, DashboardConfig>;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}

export default function DashboardLayoutSelector({ savedLayouts, onSave, onLoad, onDelete }: Props) {
  const [showInput, setShowInput] = useState(false);
  const [newName, setNewName] = useState('');
  const names = Object.keys(savedLayouts);

  const handleSave = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setNewName('');
    setShowInput(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 shrink-0">
          <LayoutDashboard className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {names.length === 0 && !showInput && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Κανένα αποθηκευμένο layout</p>
        )}

        {names.map(name => (
          <DropdownMenuItem key={name} className="flex items-center justify-between group" onSelect={(e) => e.preventDefault()}>
            <button className="flex-1 text-left text-sm" onClick={() => onLoad(name)}>
              {name}
            </button>
            <button
              className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 p-1"
              onClick={(e) => { e.stopPropagation(); onDelete(name); }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {showInput ? (
          <div className="px-2 py-1.5 flex gap-1">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Όνομα layout..."
              className="h-7 text-xs"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
            <Button size="sm" className="h-7 w-7 p-0 shrink-0" onClick={handleSave}>
              <Check className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setShowInput(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Αποθήκευση τρέχοντος
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
