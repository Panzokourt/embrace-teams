import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';
import { Brain, Loader2, FolderPlus, ListPlus, Clock, Zap, Download, FileText, Printer, Save, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export interface DeepDiveResult {
  extended_analysis: string;
  action_plan: Array<{ step: string; timeline: string; effort: string }>;
  suggested_project?: {
    name: string;
    description: string;
    client_id?: string;
    budget?: number;
    estimated_duration_days?: number;
  };
  suggested_task?: {
    title: string;
    description: string;
    priority: string;
    estimated_hours?: number;
  };
}

interface BrainDeepDiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  result: DeepDiveResult | null;
  insightTitle: string;
  onCreateProject?: (suggested: DeepDiveResult['suggested_project']) => void;
  onCreateTask?: (suggested: DeepDiveResult['suggested_task']) => void;
  onSave?: () => Promise<void>;
  isSaved?: boolean;
}

const effortColors: Record<string, string> = {
  low: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  high: 'bg-red-500/10 text-red-600 border-red-500/20',
};

function buildExportContent(result: DeepDiveResult, title: string): string {
  let content = `Deep Dive Analysis: ${title}\n${'='.repeat(50)}\n\n`;
  content += result.extended_analysis + '\n\n';
  if (result.action_plan?.length) {
    content += 'Action Plan\n' + '-'.repeat(30) + '\n';
    result.action_plan.forEach((item, i) => {
      content += `${i + 1}. ${item.step}\n   Timeline: ${item.timeline} | Effort: ${item.effort}\n\n`;
    });
  }
  if (result.suggested_project) {
    content += '\nΠροτεινόμενο Έργο\n' + '-'.repeat(30) + '\n';
    content += `Όνομα: ${result.suggested_project.name}\n`;
    content += `Περιγραφή: ${result.suggested_project.description}\n`;
    if (result.suggested_project.budget) content += `Budget: €${result.suggested_project.budget.toLocaleString()}\n`;
  }
  if (result.suggested_task) {
    content += '\nΠροτεινόμενο Task\n' + '-'.repeat(30) + '\n';
    content += `Τίτλος: ${result.suggested_task.title}\n`;
    content += `Περιγραφή: ${result.suggested_task.description}\n`;
    content += `Priority: ${result.suggested_task.priority}\n`;
  }
  return content;
}

function exportAsPDF(result: DeepDiveResult, title: string) {
  const content = buildExportContent(result, title);
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <html><head><title>Deep Dive: ${title}</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.6; font-size: 14px; }
      h1 { font-size: 20px; border-bottom: 2px solid #e5e5e5; padding-bottom: 8px; }
      h2 { font-size: 16px; margin-top: 24px; }
      pre { white-space: pre-wrap; font-family: inherit; }
      .step { background: #f5f5f5; padding: 12px; border-radius: 8px; margin: 8px 0; }
      .step-num { font-weight: bold; color: #6366f1; }
      .meta { color: #666; font-size: 12px; }
    </style></head><body>
    <h1>🧠 Deep Dive: ${title}</h1>
    <pre>${result.extended_analysis}</pre>
    ${result.action_plan?.length ? `
      <h2>⚡ Action Plan</h2>
      ${result.action_plan.map((item, i) => `
        <div class="step">
          <span class="step-num">${i + 1}.</span> ${item.step}
          <div class="meta">Timeline: ${item.timeline} | Effort: ${item.effort}</div>
        </div>
      `).join('')}
    ` : ''}
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 300);
}

function exportAsDoc(result: DeepDiveResult, title: string) {
  const content = buildExportContent(result, title);
  const blob = new Blob(['\uFEFF' + content], { type: 'application/msword;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `deep-dive-${title.slice(0, 30).replace(/[^a-zA-Zα-ωΑ-Ω0-9]/g, '-')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function BrainDeepDiveDialog({
  open, onOpenChange, isLoading, result, insightTitle,
  onCreateProject, onCreateTask, onSave, isSaved,
}: BrainDeepDiveDialogProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try { await onSave(); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="p-5 pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="h-4 w-4 text-primary" />
              Deep Dive Analysis
            </DialogTitle>
            {result && (
              <div className="flex items-center gap-1">
                {/* Save button */}
                {onSave && (
                  <Button
                    size="sm"
                    variant={isSaved ? "ghost" : "outline"}
                    className="h-7 text-[11px] gap-1"
                    onClick={handleSave}
                    disabled={saving || isSaved}
                  >
                    {isSaved ? <><Check className="h-3 w-3" /> Αποθηκεύτηκε</> : saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Αποθήκευση...</> : <><Save className="h-3 w-3" /> Αποθήκευση</>}
                  </Button>
                )}
                {/* Export dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[11px] gap-1">
                      <Download className="h-3 w-3" /> Εξαγωγή
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportAsPDF(result, insightTitle)} className="text-xs gap-2 cursor-pointer">
                      <Printer className="h-3.5 w-3.5" /> Εκτύπωση / PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportAsDoc(result, insightTitle)} className="text-xs gap-2 cursor-pointer">
                      <FileText className="h-3.5 w-3.5" /> Word (.doc)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{insightTitle}</p>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Αναλύω σε βάθος...</p>
              <p className="text-[11px] text-muted-foreground/60">AI + Market Research</p>
            </div>
          ) : result ? (
            <div className="space-y-5">
              {/* Extended Analysis — well-formatted prose */}
              <article className="prose prose-sm dark:prose-invert max-w-none
                prose-headings:text-foreground prose-headings:font-semibold
                prose-h1:text-base prose-h1:mt-5 prose-h1:mb-2 prose-h1:border-b prose-h1:border-border/30 prose-h1:pb-2
                prose-h2:text-sm prose-h2:mt-4 prose-h2:mb-1.5
                prose-h3:text-[13px] prose-h3:mt-3 prose-h3:mb-1
                prose-p:text-[13px] prose-p:leading-relaxed prose-p:text-muted-foreground prose-p:my-1.5
                prose-li:text-[13px] prose-li:text-muted-foreground prose-li:leading-relaxed prose-li:my-0.5
                prose-strong:text-foreground prose-strong:font-semibold
                prose-ul:my-2 prose-ol:my-2
                prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground prose-blockquote:text-[13px] prose-blockquote:not-italic
              ">
                <ReactMarkdown>{result.extended_analysis}</ReactMarkdown>
              </article>

              {/* Action Plan */}
              {result.action_plan && result.action_plan.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/30">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-primary" /> Action Plan
                  </h4>
                  <div className="space-y-1.5">
                    {result.action_plan.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/20">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium leading-snug">{item.step}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" /> {item.timeline}
                            </span>
                            <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border", effortColors[item.effort] || '')}>
                              {item.effort === 'low' ? 'Χαμηλό' : item.effort === 'high' ? 'Υψηλό' : 'Μεσαίο'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                {result.suggested_project && onCreateProject && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onCreateProject(result.suggested_project)}>
                    <FolderPlus className="h-3.5 w-3.5" /> Δημιούργησε Έργο
                    {result.suggested_project.budget && (
                      <span className="text-muted-foreground ml-1">• €{result.suggested_project.budget.toLocaleString()}</span>
                    )}
                  </Button>
                )}
                {result.suggested_task && onCreateTask && (
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => onCreateTask(result.suggested_task)}>
                    <ListPlus className="h-3.5 w-3.5" /> Δημιούργησε Task
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
