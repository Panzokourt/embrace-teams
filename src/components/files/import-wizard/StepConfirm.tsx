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
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Προορισμός</span>
          <span className="font-medium truncate ml-3">{summary.destinationLabel}</span>
        </div>
      </div>

      {progress && (
        <div className="space-y-2">
          <Progress value={pct} />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 truncate">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              <span className="truncate">
                {done
                  ? 'Ολοκληρώθηκε'
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
