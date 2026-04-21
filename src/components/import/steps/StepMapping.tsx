import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { ColumnMapping, EntitySchema, ImportEntity, ParsedFile } from '../schemas/types';

interface Props {
  parsed: ParsedFile;
  schema: EntitySchema;
  entity: ImportEntity;
  mapping: ColumnMapping;
  onMappingChange: (m: ColumnMapping) => void;
  onContinue: () => void;
}

const IGNORE = '__ignore__';

export function StepMapping({ parsed, schema, entity, mapping, onMappingChange, onContinue }: Props) {
  const [aiLoading, setAiLoading] = useState(false);

  const usedKeys = useMemo(() => {
    const set = new Set<string>();
    Object.values(mapping).forEach((v) => v && set.add(v));
    return set;
  }, [mapping]);

  const missingRequired = schema.fields.filter((f) => f.required && !usedKeys.has(f.key));

  const handleSelect = (header: string, val: string) => {
    onMappingChange({ ...mapping, [header]: val === IGNORE ? null : val });
  };

  const runAiSuggest = async () => {
    setAiLoading(true);
    try {
      const sample = parsed.rows.slice(0, 3);
      const { data, error } = await supabase.functions.invoke('ai-suggest-mapping', {
        body: { entity, headers: parsed.headers, sampleRows: sample, fields: schema.fields.map(f => ({ key: f.key, label: f.label, type: f.type })) },
      });
      if (error) throw error;
      const suggestions = (data?.mapping || {}) as Record<string, string>;
      const next = { ...mapping };
      let applied = 0;
      for (const [h, k] of Object.entries(suggestions)) {
        if (parsed.headers.includes(h) && schema.fields.some((f) => f.key === k)) {
          if (next[h] !== k) {
            next[h] = k;
            applied++;
          }
        }
      }
      onMappingChange(next);
      if (applied > 0) toast.success(`Το AI πρότεινε ${applied} νέες αντιστοιχίσεις`);
      else toast.info('Δεν υπήρχαν νέες προτάσεις');
    } catch (e: any) {
      toast.error('AI mapping απέτυχε: ' + (e?.message || ''));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Αντιστοίχισε τις στήλες του αρχείου σου με τα πεδία του συστήματος.
        </p>
        <Button size="sm" variant="outline" onClick={runAiSuggest} disabled={aiLoading} className="gap-1.5">
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
          AI Πρόταση
        </Button>
      </div>

      {missingRequired.length > 0 && (
        <div className="p-2.5 rounded-md border border-destructive/30 bg-destructive/5 text-xs text-destructive">
          Λείπουν υποχρεωτικά πεδία: {missingRequired.map((f) => f.label).join(', ')}
        </div>
      )}

      <div className="border rounded-md divide-y">
        {parsed.headers.map((h) => {
          const current = mapping[h] ?? null;
          const field = schema.fields.find((f) => f.key === current);
          const isDup = current && Object.entries(mapping).some(([oh, k]) => oh !== h && k === current);
          return (
            <div key={h} className="flex items-center gap-3 p-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{h}</div>
                <div className="text-xs text-muted-foreground truncate">
                  π.χ. {String(parsed.rows[0]?.[h] ?? '—')}
                </div>
              </div>
              <div className="text-muted-foreground text-xs">→</div>
              <div className="w-[240px] shrink-0">
                <Select value={current ?? IGNORE} onValueChange={(v) => handleSelect(h, v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={IGNORE}>— Αγνόησε —</SelectItem>
                    {schema.fields.map((f) => (
                      <SelectItem key={f.key} value={f.key}>
                        {f.label}{f.required ? ' *' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {field?.required && <Badge variant="outline" className="text-[10px]">required</Badge>}
              {isDup && <Badge variant="destructive" className="text-[10px]">διπλό</Badge>}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={onContinue} disabled={missingRequired.length > 0}>
          Συνέχεια στο validation
        </Button>
      </div>
    </div>
  );
}
