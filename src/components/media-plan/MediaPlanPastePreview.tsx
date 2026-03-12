import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardPaste, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ParsedRow {
  title: string;
  medium: string;
  placement: string;
  objective: string;
  funnel_stage: string;
  start_date: string;
  end_date: string;
  budget: number | null;
  status: string;
  priority: string;
  kpi_target: string;
  notes: string;
}

const COLUMN_MAP = [
  'title', 'medium', 'placement', 'objective', 'funnel_stage',
  'start_date', 'end_date', 'budget', 'status', 'priority', 'kpi_target', 'notes',
] as const;

const COLUMN_LABELS = [
  'Title', 'Channel', 'Placement', 'Objective', 'Funnel',
  'Start', 'End', 'Budget', 'Status', 'Priority', 'KPI', 'Notes',
];

interface MediaPlanPastePreviewProps {
  open: boolean;
  onClose: () => void;
  pastedText: string;
  onConfirm: (rows: ParsedRow[]) => void;
}

export function MediaPlanPastePreview({ open, onClose, pastedText, onConfirm }: MediaPlanPastePreviewProps) {
  const parsed = useMemo(() => parseTSV(pastedText), [pastedText]);

  const handleConfirm = () => {
    if (parsed.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    onConfirm(parsed);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4" /> Paste Preview — {parsed.length} rows detected
          </DialogTitle>
        </DialogHeader>

        <div className="text-xs text-muted-foreground mb-2">
          Expected column order: {COLUMN_LABELS.join(' → ')}. Columns beyond {COLUMN_LABELS.length} are ignored.
        </div>

        {parsed.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No valid rows found. Make sure data is tab-separated.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-8">#</TableHead>
                  {COLUMN_LABELS.map(l => (
                    <TableHead key={l} className="text-xs">{l}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                    <TableCell className="text-xs font-medium">{row.title || '—'}</TableCell>
                    <TableCell className="text-xs">{row.medium || '—'}</TableCell>
                    <TableCell className="text-xs">{row.placement || '—'}</TableCell>
                    <TableCell className="text-xs">{row.objective || '—'}</TableCell>
                    <TableCell className="text-xs">{row.funnel_stage || '—'}</TableCell>
                    <TableCell className="text-xs">{row.start_date || '—'}</TableCell>
                    <TableCell className="text-xs">{row.end_date || '—'}</TableCell>
                    <TableCell className="text-xs tabular-nums text-right">
                      {row.budget != null ? `€${row.budget.toLocaleString()}` : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{row.status || '—'}</TableCell>
                    <TableCell className="text-xs">{row.priority || '—'}</TableCell>
                    <TableCell className="text-xs">{row.kpi_target || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.notes || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={parsed.length === 0}>
            <Check className="h-3.5 w-3.5 mr-1" /> Import {parsed.length} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseTSV(text: string): ParsedRow[] {
  if (!text.trim()) return [];

  const lines = text.trim().split('\n');
  const rows: ParsedRow[] = [];

  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    // Skip header-like rows
    if (cols[0]?.toLowerCase() === 'title' || cols[0]?.toLowerCase() === '#') continue;
    // Need at least a title
    if (!cols[0]) continue;

    const budgetRaw = (cols[7] || '').replace(/[€$,\s]/g, '');
    const budget = budgetRaw ? parseFloat(budgetRaw) : null;

    rows.push({
      title: cols[0] || '',
      medium: cols[1] || 'TBD',
      placement: cols[2] || '',
      objective: cols[3] || '',
      funnel_stage: cols[4] || '',
      start_date: normalizeDate(cols[5] || ''),
      end_date: normalizeDate(cols[6] || ''),
      budget: budget != null && !isNaN(budget) ? budget : null,
      status: normalizeStatus(cols[8] || ''),
      priority: normalizePriority(cols[9] || ''),
      kpi_target: cols[10] || '',
      notes: cols[11] || '',
    });
  }

  return rows;
}

function normalizeDate(raw: string): string {
  if (!raw) return '';
  // Try dd/MM/yyyy or dd-MM-yyyy → yyyy-MM-dd
  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const y = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${y}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  // Try yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return '';
}

function normalizeStatus(raw: string): string {
  const lower = raw.toLowerCase().replace(/\s+/g, '_');
  const statusMap: Record<string, string> = {
    draft: 'draft', planned: 'planned', live: 'live', completed: 'completed',
    ready: 'ready_for_production', in_production: 'in_production',
    on_hold: 'on_hold', cancelled: 'cancelled',
  };
  return statusMap[lower] || 'draft';
}

function normalizePriority(raw: string): string {
  const lower = raw.toLowerCase();
  if (['low', 'medium', 'high', 'critical'].includes(lower)) return lower;
  return 'medium';
}

export type { ParsedRow };
