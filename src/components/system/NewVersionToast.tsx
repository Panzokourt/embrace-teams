import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { RefreshCw, Sparkles } from 'lucide-react';
import { useNewVersionAvailable } from '@/hooks/useNewVersionAvailable';

const TOAST_ID = 'app-update-available';

export function NewVersionToast() {
  const { hasUpdate, reload, dismiss } = useNewVersionAvailable();
  const shown = useRef(false);

  useEffect(() => {
    if (!hasUpdate) {
      shown.current = false;
      return;
    }
    if (shown.current) return;
    shown.current = true;

    toast(
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium">Νέα έκδοση διαθέσιμη</p>
          <p className="text-xs text-muted-foreground">
            Κάνε refresh για να δεις τις αλλαγές
          </p>
        </div>
      </div>,
      {
        id: TOAST_ID,
        duration: Infinity,
        position: 'bottom-right',
        action: {
          label: (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Refresh
            </span>
          ) as unknown as string,
          onClick: () => reload(),
        },
        onDismiss: () => dismiss(),
        onAutoClose: () => dismiss(),
      }
    );
  }, [hasUpdate, reload, dismiss]);

  return null;
}
