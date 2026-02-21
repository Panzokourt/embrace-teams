import { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ContactSelectorProps {
  value?: string;
  onSelect: (contactId: string, contact: any) => void;
  placeholder?: string;
  excludeIds?: string[];
  categoryFilter?: string;
}

export function ContactSelector({ value, onSelect, placeholder = 'Επιλογή επαφής...', excludeIds = [], categoryFilter }: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    const fetch = async () => {
      let q = supabase.from('contacts').select('*').eq('is_active', true).order('name');
      if (categoryFilter) q = q.eq('category', categoryFilter);
      const { data } = await q;
      setContacts((data || []).filter(c => !excludeIds.includes(c.id)));
      if (value && data) setSelected(data.find(c => c.id === value));
    };
    fetch();
  }, [value, categoryFilter, excludeIds.join(',')]);

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between">
          {selected ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px]">{getInitials(selected.name)}</AvatarFallback></Avatar>
              {selected.name}
            </div>
          ) : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Αναζήτηση..." />
          <CommandList>
            <CommandEmpty>Δεν βρέθηκαν επαφές</CommandEmpty>
            <CommandGroup>
              {contacts.map(c => (
                <CommandItem key={c.id} value={c.name} onSelect={() => { onSelect(c.id, c); setSelected(c); setOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", value === c.id ? "opacity-100" : "opacity-0")} />
                  <Avatar className="h-5 w-5 mr-2"><AvatarImage src={c.avatar_url} /><AvatarFallback className="text-[9px]">{getInitials(c.name)}</AvatarFallback></Avatar>
                  <span className="truncate">{c.name}</span>
                  {c.client_id && <Badge variant="outline" className="ml-auto text-[9px]">Πελάτης</Badge>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
