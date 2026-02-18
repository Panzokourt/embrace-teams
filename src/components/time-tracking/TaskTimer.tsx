import { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { cn } from '@/lib/utils';

interface TaskTimerProps {
  taskId: string;
  projectId: string;
  compact?: boolean;
}

export function TaskTimer({ taskId, projectId, compact = false }: TaskTimerProps) {
  const { activeTimer, elapsed, formatElapsed, startTimer, stopTimer } = useTimeTracking();
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [description, setDescription] = useState('');

  const isRunning = activeTimer?.is_running && activeTimer.task_id === taskId;

  const handleToggle = () => {
    if (isRunning) {
      setShowStopDialog(true);
    } else {
      startTimer(taskId, projectId);
    }
  };

  const handleStop = () => {
    stopTimer(description || undefined);
    setShowStopDialog(false);
    setDescription('');
  };

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <Button
            variant={isRunning ? 'destructive' : 'ghost'}
            size="icon"
            className="h-7 w-7"
            onClick={handleToggle}
          >
            {isRunning ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          {isRunning && (
            <span className="text-xs font-mono text-primary animate-pulse">
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>
        <StopDialog
          open={showStopDialog}
          onOpenChange={setShowStopDialog}
          description={description}
          setDescription={setDescription}
          onStop={handleStop}
          elapsed={formatElapsed(elapsed)}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant={isRunning ? 'destructive' : 'outline'}
        size="sm"
        onClick={handleToggle}
        className={cn("gap-2", isRunning && "animate-pulse")}
      >
        {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {isRunning ? formatElapsed(elapsed) : 'Timer'}
      </Button>
      <StopDialog
        open={showStopDialog}
        onOpenChange={setShowStopDialog}
        description={description}
        setDescription={setDescription}
        onStop={handleStop}
        elapsed={formatElapsed(elapsed)}
      />
    </>
  );
}

function StopDialog({
  open, onOpenChange, description, setDescription, onStop, elapsed
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  description: string;
  setDescription: (v: string) => void;
  onStop: () => void;
  elapsed: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Σταμάτημα Timer</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center">
            <span className="text-3xl font-mono font-bold text-primary">{elapsed}</span>
          </div>
          <Textarea
            placeholder="Σημειώσεις (προαιρετικό)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Ακύρωση</Button>
          <Button variant="destructive" onClick={onStop}>
            <Square className="h-4 w-4 mr-2" />
            Σταμάτημα
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
