import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Building2, FolderKanban, CheckSquare, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { toast } from '@/hooks/use-toast';
import { buildExportFile, downloadBlob, type ExportFormat } from '@/components/export/utils/exportBuilder';
import type { ImportEntity } from '@/components/import/schemas/types';

const ENTITY_META: { id: ImportEntity; label: string; icon: any }[] = [
  { id: 'clients', label: 'Πελάτες', icon: Building2 },
  { id: 'projects', label: 'Έργα', icon: FolderKanban },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
];

export function BulkExportSection() {
  const { company } = useAuth();
  const companyId = company?.id;

  const [selected, setSelected] = useState<Record<ImportEntity, boolean>>({
    clients: true,
    projects: false,
    tasks: false,
  });
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['export-clients', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId!)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const chosenEntities = (Object.keys(selected) as ImportEntity[]).filter((k) => selected[k]);
  const canExport = !!companyId && chosenEntities.length > 0 && !busy;

  const toggleEntity = (id: ImportEntity) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const toggleClient = (id: string) =>
    setClientIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const handleExport = async () => {
    if (!companyId) return;
    setBusy(true);
    try {
      const filters = clientIds.length ? clientIds : undefined;
      let total = 0;
      for (const entity of chosenEntities) {
        const { blob, filename, count } = await buildExportFile(entity, companyId, filters, format);
        downloadBlob(blob, filename);
        total += count;
        // small delay so browsers accept multiple downloads
        await new Promise((r) => setTimeout(r, 250));
      }
      toast({
        title: 'Η εξαγωγή ολοκληρώθηκε',
        description: `${chosenEntities.length} αρχείο/α • ${total} εγγραφές συνολικά`,
      });
    } catch (e: any) {
      toast({
        title: 'Σφάλμα εξαγωγής',
        description: e?.message ?? 'Δοκιμάστε ξανά',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Μαζική Εξαγωγή / Export
        </CardTitle>
        <CardDescription>
          Εξαγωγή πελατών, έργων ή tasks σε αρχεία Excel/CSV με τη ίδια δομή με τα templates της μαζικής εισαγωγής.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entity selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">1. Τι θέλετε να εξάγετε;</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ENTITY_META.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleEntity(id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  selected[id]
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox checked={selected[id]} className="pointer-events-none" />
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Client filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            2. Φίλτρο πελατών{' '}
            <span className="text-xs font-normal text-muted-foreground">
              (προαιρετικό — αν κενό, εξάγονται όλα)
            </span>
          </Label>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start font-normal">
                {clientIds.length === 0
                  ? 'Όλοι οι πελάτες'
                  : `${clientIds.length} επιλεγμένος/οι πελάτης/ες`}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[360px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Αναζήτηση πελάτη..." />
                <CommandList>
                  <CommandEmpty>Δεν βρέθηκαν πελάτες</CommandEmpty>
                  <CommandGroup>
                    {clients.map((c) => (
                      <CommandItem key={c.id} onSelect={() => toggleClient(c.id)}>
                        <Checkbox
                          checked={clientIds.includes(c.id)}
                          className="mr-2 pointer-events-none"
                        />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {clientIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {clientIds.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1">
                  {clientMap.get(id) ?? id}
                  <button onClick={() => toggleClient(id)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setClientIds([])}
              >
                Καθαρισμός
              </Button>
            </div>
          )}
          {selected.tasks && clientIds.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Θα εξαχθούν μόνο τα tasks που ανήκουν σε έργα των επιλεγμένων πελατών.
            </p>
          )}
        </div>

        {/* Format */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">3. Μορφή αρχείου</Label>
          <RadioGroup
            value={format}
            onValueChange={(v) => setFormat(v as ExportFormat)}
            className="flex gap-6"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="xlsx" id="fmt-xlsx" />
              <Label htmlFor="fmt-xlsx" className="cursor-pointer font-normal">
                Excel (.xlsx)
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="csv" id="fmt-csv" />
              <Label htmlFor="fmt-csv" className="cursor-pointer font-normal">
                CSV
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {chosenEntities.length === 0
              ? 'Επιλέξτε τουλάχιστον μία κατηγορία'
              : `Θα δημιουργηθ${chosenEntities.length === 1 ? 'εί' : 'ούν'} ${chosenEntities.length} αρχείο/α`}
          </p>
          <Button onClick={handleExport} disabled={!canExport} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Λήψη
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
