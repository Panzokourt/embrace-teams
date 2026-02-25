import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface KBSearchBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function KBSearchBar({ value, onChange, placeholder = 'Αναζήτηση στο Knowledge Base...' }: KBSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}
