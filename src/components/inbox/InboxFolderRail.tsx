import { cn } from '@/lib/utils';
import { FOLDERS, FolderKey } from './inboxUtils';

interface InboxFolderRailProps {
  active: FolderKey;
  onChange: (key: FolderKey) => void;
  counts: Record<FolderKey, number>;
}

export function InboxFolderRail({ active, onChange, counts }: InboxFolderRailProps) {
  return (
    <div className="h-full w-[180px] shrink-0 border-r border-border bg-muted/20 flex flex-col">
      <div className="px-3 pt-4 pb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
        Φάκελοι
      </div>
      <nav className="flex-1 px-2 space-y-0.5">
        {FOLDERS.map((f) => {
          const Icon = f.icon;
          const count = counts[f.key] || 0;
          const isActive = active === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onChange(f.key)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground/80 hover:bg-muted/60'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="flex-1 text-left truncate">{f.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[10px] font-bold px-1.5',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
