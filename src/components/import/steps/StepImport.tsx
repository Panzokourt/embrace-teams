import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Download, XCircle, Loader2 } from 'lucide-react';
import type { ImportSummary } from '../schemas/types';
import { buildErrorReport, downloadBlob } from '../utils/templateBuilder';

interface Props {
  progress: { done: number; total: number; label?: string } | null;
  summary: ImportSummary | null;
  onClose: () => void;
}

export function StepImport({ progress, summary, onClose }: Props) {
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  const downloadFailures = () => {
    if (!summary) return;
    const blob = buildErrorReport(summary.failures);
    downloadBlob(blob, `import-errors-${Date.now()}.csv`);
  };

  if (!summary) {
    return (
      <div className="space-y-4 py-6">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {progress?.label ?? 'Εισαγωγή σε εξέλιξη…'}
        </div>
        <Progress value={pct} />
        <div className="text-xs text-muted-foreground text-center">
          {progress?.done ?? 0} / {progress?.total ?? 0}
        </div>
      </div>
    );
  }

  const fullSuccess = summary.failed === 0;

  return (
    <div className="space-y-4">
      <Card className={`p-4 border-2 ${fullSuccess ? 'border-success/30 bg-success/5' : 'border-warning/30 bg-warning/5'}`}>
        <div className="flex items-center gap-2 mb-2">
          {fullSuccess ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <XCircle className="h-5 w-5 text-warning" />
          )}
          <h3 className="font-medium text-sm">
            {fullSuccess ? 'Η εισαγωγή ολοκληρώθηκε επιτυχώς' : 'Η εισαγωγή ολοκληρώθηκε με σφάλματα'}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Σύνολο</div>
            <div className="font-semibold">{summary.total}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Δημιουργήθηκαν</div>
            <div className="font-semibold text-success">{summary.created}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Παραλείφθηκαν</div>
            <div className="font-semibold text-muted-foreground">{summary.skipped}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Απέτυχαν</div>
            <div className={`font-semibold ${summary.failed > 0 ? 'text-destructive' : ''}`}>{summary.failed}</div>
          </div>
        </div>
        {(summary.newClients || summary.newProjects) && (
          <div className="mt-3 text-xs text-muted-foreground">
            {summary.newClients ? `+ ${summary.newClients} νέοι πελάτες` : ''}
            {summary.newClients && summary.newProjects ? ' · ' : ''}
            {summary.newProjects ? `+ ${summary.newProjects} νέα έργα` : ''}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        {summary.failures.length > 0 && (
          <Button variant="outline" onClick={downloadFailures}>
            <Download className="h-4 w-4 mr-1.5" />
            Λήψη error log
          </Button>
        )}
        <Button onClick={onClose}>Κλείσιμο</Button>
      </div>
    </div>
  );
}
