import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { LayoutGrid, RotateCcw } from 'lucide-react';
import { CLIENT_SECTION_META, type ClientSectionConfig } from '@/hooks/useClientDetailLayout';

interface Props {
  layout: ClientSectionConfig[];
  onToggle: (id: string) => void;
  onReset: () => void;
}

export function ClientLayoutMenu({ layout, onToggle, onReset }: Props) {
  const map = new Map(layout.map(s => [s.id, s]));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">
          <LayoutGrid className="h-4 w-4 mr-1" /> Διάταξη
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Εμφάνιση Sections</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {CLIENT_SECTION_META.map(meta => {
          const cfg = map.get(meta.id);
          return (
            <DropdownMenuCheckboxItem
              key={meta.id}
              checked={cfg?.visible ?? true}
              onCheckedChange={() => onToggle(meta.id)}
              onSelect={(e) => e.preventDefault()}
            >
              {meta.label}
            </DropdownMenuCheckboxItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Επαναφορά διάταξης
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
