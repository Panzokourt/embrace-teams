import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { EntitySchema, ImportEntity, ValidatedRow } from '../schemas/types';
import { cn } from '@/lib/utils';

interface Props {
  entity: ImportEntity;
  schema: EntitySchema;
  rows: ValidatedRow[];
  onRowsChange: (rows: ValidatedRow[]) => void;
  autoCreateMissing: boolean;
  onAutoCreateChange: (v: boolean) => void;
  onContinue: () => void;
}

export function StepValidation({ entity, schema, rows, onRowsChange, autoCreateMissing, onAutoCreateChange, onContinue }: Props) {
  const stats = useMemo(() => {
    let ok = 0, warn = 0, err = 0;
    for (const r of rows) {
      if (r.skip) continue;
      const hasErr = r.issues.some((i) => i.level === 'error');
      const hasWarn = r.issues.some((i) => i.level === 'warning');
      if (hasErr) err++;
      else if (hasWarn) warn++;
      else ok++;
    }
    return { ok, warn, err };
  }, [rows]);

  const missingFkCount = useMemo(() => {
    if (entity === 'projects') {
      return rows.filter((r) => r.fkResolution?.clientNameRaw && !r.fkResolution.clientId).length;
    }
    if (entity === 'tasks') {
      return rows.filter((r) => r.fkResolution?.projectNameRaw && !r.fkResolution.projectId).length;
    }
    return 0;
  }, [rows, entity]);

  const toggleSkip = (idx: number) => {
    onRowsChange(rows.map((r) => (r.index === idx ? { ...r, skip: !r.skip } : r)));
  };

  const editValue = (idx: number, key: string, val: string) => {
    onRowsChange(
      rows.map((r) => {
        if (r.index !== idx) return r;
        return {
          ...r,
          values: { ...r.values, [key]: val },
          // Clear error for this field after manual edit (simple optimistic clear)
          issues: r.issues.filter((i) => i.field !== key || i.level !== 'error' || !val),
        };
      })
    );
  };

  const importableFields = schema.fields.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
          <CheckCircle2 className="h-3 w-3" /> {stats.ok} έγκυρα
        </Badge>
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
          <AlertTriangle className="h-3 w-3" /> {stats.warn} με warnings
        </Badge>
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
          <XCircle className="h-3 w-3" /> {stats.err} σφάλματα
        </Badge>
      </div>

      {missingFkCount > 0 && (
        <div className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30">
          <div className="text-xs">
            {missingFkCount} γραμμές αναφέρονται σε {entity === 'projects' ? 'πελάτες' : 'έργα'} που δεν υπάρχουν.
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-create" className="text-xs">Αυτόματη δημιουργία</Label>
            <Switch id="auto-create" checked={autoCreateMissing} onCheckedChange={onAutoCreateChange} />
          </div>
        </div>
      )}

      <div className="border rounded-md overflow-hidden">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="px-2 py-1.5 text-left font-medium w-10">#</th>
                <th className="px-2 py-1.5 text-left font-medium w-12">Skip</th>
                {importableFields.map((f) => (
                  <th key={f.key} className="px-2 py-1.5 text-left font-medium whitespace-nowrap">
                    {f.label}{f.required ? ' *' : ''}
                  </th>
                ))}
                <th className="px-2 py-1.5 text-left font-medium">Issues</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const hasErr = r.issues.some((i) => i.level === 'error');
                const hasWarn = r.issues.some((i) => i.level === 'warning');
                return (
                  <tr
                    key={r.index}
                    className={cn(
                      'border-t',
                      r.skip && 'opacity-40',
                      !r.skip && hasErr && 'bg-destructive/5',
                      !r.skip && !hasErr && hasWarn && 'bg-warning/5'
                    )}
                  >
                    <td className="px-2 py-1 text-muted-foreground">{r.index + 1}</td>
                    <td className="px-2 py-1">
                      <input type="checkbox" checked={!!r.skip} onChange={() => toggleSkip(r.index)} />
                    </td>
                    {importableFields.map((f) => {
                      const issueForField = r.issues.find((i) => i.field === f.key);
                      const v = r.values[f.key];
                      const display = Array.isArray(v) ? v.join(', ') : v == null ? '' : String(v);
                      return (
                        <td key={f.key} className="px-1 py-0.5">
                          <input
                            value={display}
                            onChange={(e) => editValue(r.index, f.key, e.target.value)}
                            className={cn(
                              'w-full bg-transparent border-0 px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 rounded',
                              issueForField?.level === 'error' && 'text-destructive',
                              issueForField?.level === 'warning' && 'text-warning'
                            )}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1 text-[10px] text-muted-foreground">
                      {r.issues.slice(0, 2).map((i, k) => (
                        <div key={k} className={cn(i.level === 'error' ? 'text-destructive' : 'text-warning')}>
                          {i.message}
                        </div>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onContinue} disabled={stats.ok + stats.warn === 0}>
          Έναρξη εισαγωγής ({stats.ok + stats.warn} γραμμές)
        </Button>
      </div>
    </div>
  );
}
