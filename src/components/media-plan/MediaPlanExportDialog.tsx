import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { STATUS_LABELS, type MediaActionStatus } from './mediaConstants';
import { getChannelGroup } from './channelTaxonomy';
import { FileText, BarChart3, Table2, Printer } from 'lucide-react';
import { format } from 'date-fns';

interface MediaPlanExportDialogProps {
  open: boolean;
  onClose: () => void;
  plan: {
    name: string;
    status: string;
    total_budget: number | null;
    period_start: string | null;
    period_end: string | null;
    objective: string | null;
    client_name?: string;
    project_name?: string;
    owner_name?: string;
    notes?: string | null;
  };
  items: any[];
  summary: {
    totalBudget: number;
    allocatedBudget: number;
    actionsCount: number;
    activeChannels: number;
    linkedTasks: number;
  };
  profiles: { id: string; full_name: string }[];
}

type ExportTemplate = 'executive' | 'detailed';

const TEMPLATES: { id: ExportTemplate; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'executive', label: 'Executive Summary', desc: 'Budget overview, channel breakdown, KPIs', icon: BarChart3 },
  { id: 'detailed', label: 'Detailed Plan', desc: 'Full table with all action rows and fields', icon: Table2 },
];

export function MediaPlanExportDialog({ open, onClose, plan, items, summary, profiles }: MediaPlanExportDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>('executive');
  const [generating, setGenerating] = useState(false);

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return '—';
    return profiles.find(p => p.id === ownerId)?.full_name || '—';
  };

  const handleExport = () => {
    setGenerating(true);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setGenerating(false);
      return;
    }

    const html = selectedTemplate === 'executive'
      ? buildExecutiveHTML(plan, items, summary)
      : buildDetailedHTML(plan, items, profiles, getOwnerName);

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
      setGenerating(false);
      onClose();
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Export Media Plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {TEMPLATES.map(t => {
            const Icon = t.icon;
            const isSelected = selectedTemplate === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id)}
                className={`w-full text-left rounded-xl border p-3 transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                  {isSelected && <Badge className="ml-auto text-[10px]">Selected</Badge>}
                </div>
              </button>
            );
          })}
        </div>
        <Separator />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} disabled={generating}>
            <Printer className="h-3.5 w-3.5 mr-1" /> {generating ? 'Generating...' : 'Export PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildExecutiveHTML(plan: any, items: any[], summary: any): string {
  const channelBreakdown: Record<string, number> = {};
  items.forEach(i => {
    const group = getChannelGroup(i.medium) || i.medium || 'Other';
    channelBreakdown[group] = (channelBreakdown[group] || 0) + (i.budget || 0);
  });

  const statusBreakdown: Record<string, number> = {};
  items.forEach(i => {
    const label = STATUS_LABELS[i.status as MediaActionStatus] || i.status || 'Unknown';
    statusBreakdown[label] = (statusBreakdown[label] || 0) + 1;
  });

  const remaining = summary.totalBudget - summary.allocatedBudget;
  const pct = summary.totalBudget > 0 ? Math.round((summary.allocatedBudget / summary.totalBudget) * 100) : 0;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${plan.name}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 4px; } h2 { font-size: 16px; margin-top: 28px; border-bottom: 1px solid #e5e5e5; padding-bottom: 6px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .kpi { border: 1px solid #e5e5e5; border-radius: 8px; padding: 12px; }
  .kpi-label { font-size: 11px; color: #888; text-transform: uppercase; } .kpi-value { font-size: 18px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { padding: 8px 12px; border-bottom: 1px solid #e5e5e5; text-align: left; }
  th { font-weight: 600; font-size: 11px; text-transform: uppercase; color: #888; }
  td.right { text-align: right; } .footer { margin-top: 40px; font-size: 11px; color: #aaa; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>${plan.name}</h1>
<div class="meta">
  ${plan.client_name ? `Client: ${plan.client_name} · ` : ''}${plan.project_name ? `Project: ${plan.project_name} · ` : ''}${plan.owner_name ? `Owner: ${plan.owner_name} · ` : ''}${plan.period_start && plan.period_end ? `${format(new Date(plan.period_start), 'dd/MM/yyyy')} – ${format(new Date(plan.period_end), 'dd/MM/yyyy')}` : ''}
</div>
<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">Total Budget</div><div class="kpi-value">€${summary.totalBudget.toLocaleString()}</div></div>
  <div class="kpi"><div class="kpi-label">Allocated (${pct}%)</div><div class="kpi-value">€${summary.allocatedBudget.toLocaleString()}</div></div>
  <div class="kpi"><div class="kpi-label">Remaining</div><div class="kpi-value" style="color:${remaining < 0 ? '#dc2626' : '#16a34a'}">€${Math.abs(remaining).toLocaleString()}</div></div>
  <div class="kpi"><div class="kpi-label">Actions</div><div class="kpi-value">${summary.actionsCount}</div></div>
</div>
${plan.notes ? `<h2>Notes & Assumptions</h2><p style="font-size:13px;color:#444;">${plan.notes}</p>` : ''}
<h2>Budget by Channel Group</h2>
<table><thead><tr><th>Channel Group</th><th class="right">Budget</th><th class="right">% of Total</th></tr></thead><tbody>
${Object.entries(channelBreakdown).sort((a, b) => b[1] - a[1]).map(([group, budget]) =>
  `<tr><td>${group}</td><td class="right">€${budget.toLocaleString()}</td><td class="right">${summary.totalBudget > 0 ? Math.round((budget / summary.totalBudget) * 100) : 0}%</td></tr>`
).join('')}
</tbody></table>
<h2>Actions by Status</h2>
<table><thead><tr><th>Status</th><th class="right">Count</th></tr></thead><tbody>
${Object.entries(statusBreakdown).map(([s, c]) => `<tr><td>${s}</td><td class="right">${c}</td></tr>`).join('')}
</tbody></table>
<div class="footer">Generated on ${format(new Date(), 'dd/MM/yyyy HH:mm')} · ${plan.name}</div>
</body></html>`;
}

function buildDetailedHTML(plan: any, items: any[], profiles: any[], getOwnerName: (id: string | null) => string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${plan.name} — Detailed</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { padding: 6px 8px; border: 1px solid #e5e5e5; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; font-size: 10px; text-transform: uppercase; white-space: nowrap; }
  td.right { text-align: right; } .footer { margin-top: 20px; font-size: 10px; color: #aaa; }
  @media print { body { padding: 10px; } @page { size: landscape; } }
</style></head><body>
<h1>${plan.name}</h1>
<div class="meta">
  ${plan.client_name ? `Client: ${plan.client_name} · ` : ''}${plan.project_name ? `Project: ${plan.project_name} · ` : ''}Exported: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
</div>
<table>
<thead><tr>
  <th>#</th><th>Title</th><th>Channel</th><th>Placement</th><th>Objective</th><th>Funnel</th><th>Owner</th>
  <th>Start</th><th>End</th><th>Budget</th><th>Daily</th><th>Status</th><th>Priority</th><th>KPI</th><th>Notes</th>
</tr></thead>
<tbody>
${items.map((item, i) => `<tr>
  <td>${i + 1}</td>
  <td>${item.title || '—'}</td>
  <td>${item.medium || '—'}</td>
  <td>${item.placement || '—'}</td>
  <td>${item.objective || '—'}</td>
  <td>${item.funnel_stage || '—'}</td>
  <td>${getOwnerName(item.owner_id)}</td>
  <td>${item.start_date ? format(new Date(item.start_date), 'dd/MM') : '—'}</td>
  <td>${item.end_date ? format(new Date(item.end_date), 'dd/MM') : '—'}</td>
  <td class="right">${item.budget != null ? `€${item.budget.toLocaleString()}` : '—'}</td>
  <td class="right">${item.daily_budget != null ? `€${item.daily_budget.toLocaleString()}` : '—'}</td>
  <td>${STATUS_LABELS[item.status as MediaActionStatus] || item.status || '—'}</td>
  <td>${item.priority || '—'}</td>
  <td>${item.kpi_target || '—'}</td>
  <td>${item.notes || '—'}</td>
</tr>`).join('')}
</tbody>
</table>
<div class="footer">Total: ${items.length} actions · Budget: €${items.reduce((s: number, i: any) => s + (i.budget || 0), 0).toLocaleString()}</div>
</body></html>`;
}
