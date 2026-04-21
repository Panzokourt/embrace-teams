import { Progress } from '@/components/ui/progress';
import { CheckCircle2, FileWarning, Loader2 } from 'lucide-react';
import type { ImportProgress } from './types';

interface StepConfirmProps {
  summary: {
    fileCount: number;
    folderCount: number;
    destinationLabel: string;
  };
  progress: ImportProgress | null;
  done: boolean;
}

export function StepConfirm({ summary, progress, done }: StepConfirmProps) {
  const pct = progress && progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;
  const folderPct = progress?.folderTotal
    ? Math.round(((progress.folderDone ?? 0) / progress.folderTotal) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-muted/30 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Αρχεία προς ανέβασμα</span>
          <span className="font-medium tabular-nums">{summary.fileCount}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Φάκελοι προς δημιουργία</span>
          <span className="font-medium tabular-nums">{summary.folderCount}</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm min-w-0">
          <span className="text-muted-foreground">Προορισμός</span>
          <span className="font-medium truncate min-w-0" title={summary.destinationLabel}>{summary.destinationLabel}</span>
        </div>
      </div>

      {progress && (
        <div className="space-y-3 min-w-0">
          {!!progress.folderTotal && (
            <div className="space-y-1.5">
              <Progress value={folderPct} />
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground min-w-0">
                <span className="truncate min-w-0">
                  {progress.phase === 'folders'
                    ? progress.currentFolder ?? 'Δημιουργία δομής φακέλων…'
                    : 'Η δομή φακέλων δημιουργήθηκε'}
                </span>
                <span className="tabular-nums shrink-0">
                  {progress.folderDone ?? 0}/{progress.folderTotal}
                </span>
              </div>
            </div>
          )}
          <Progress value={pct} />
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground min-w-0">
            <span className="flex items-center gap-1.5 min-w-0 flex-1">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span className="truncate min-w-0" dir="rtl" title={progress.currentFile}>
                {done
                  ? 'Ολοκληρώθηκε'
                  : progress.phase === 'folders'
                  ? 'Αναμονή για ανέβασμα αρχείων…'
                  : progress.currentFile ?? 'Προετοιμασία…'}
              </span>
            </span>
            <span className="tabular-nums shrink-0">
              {progress.done}/{progress.total}
              {progress.failed > 0 && (
                <span className="text-destructive ml-2 inline-flex items-center gap-0.5">
                  <FileWarning className="h-3 w-3" />
                  {progress.failed}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
