import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MENTION_TYPES, SLASH_COMMANDS, type MentionEntity, type SlashCommand } from './mentionRegistry';
import type { MentionSearchResults } from './useMentionSearch';

type Mode = 'mention' | 'slash';

interface MentionPopoverProps {
  mode: Mode;
  query: string;
  loading: boolean;
  results: MentionSearchResults;          // for mention mode
  selectedIndex: number;
  onSelectMention: (entity: MentionEntity) => void;
  onSelectSlash: (cmd: SlashCommand) => void;
  onHover: (index: number) => void;
}

export function MentionPopover({
  mode, query, loading, results, selectedIndex,
  onSelectMention, onSelectSlash, onHover,
}: MentionPopoverProps) {
  // ── Slash mode ──
  if (mode === 'slash') {
    const filtered = SLASH_COMMANDS.filter(c =>
      c.command.toLowerCase().startsWith(query.toLowerCase()) ||
      c.label.toLowerCase().includes(query.toLowerCase())
    );
    if (filtered.length === 0) return null;
    return (
      <div className="overflow-hidden">
        <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Εντολές
        </div>
        <ul className="max-h-72 overflow-y-auto py-0.5">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <li key={cmd.command}>
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-left rounded-md transition-colors',
                    i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                  )}
                  onMouseEnter={() => onHover(i)}
                  onMouseDown={(e) => { e.preventDefault(); onSelectSlash(cmd); }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="font-medium">/{cmd.command}</span>
                  <span className="text-xs text-muted-foreground truncate">{cmd.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ── Mention mode ──
  if (loading && results.flat.length === 0) {
    return (
      <div className="px-3 py-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Αναζήτηση…
      </div>
    );
  }

  if (results.flat.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-xs text-muted-foreground">
        {query.length === 0 ? 'Πληκτρολόγησε για αναζήτηση…' : 'Δεν βρέθηκαν αποτελέσματα'}
      </div>
    );
  }

  let runningIndex = 0;
  return (
    <div className="overflow-hidden max-h-80 overflow-y-auto py-0.5">
      {results.grouped.map(group => {
        const cfg = MENTION_TYPES[group.type];
        const Icon = cfg.icon;
        return (
          <div key={group.type}>
            <div className="px-2 pt-1.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
              <Icon className={cn('h-3 w-3', cfg.colorClass)} />
              {cfg.label}
            </div>
            <ul>
              {group.items.map(item => {
                const idx = runningIndex++;
                return (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      className={cn(
                        'w-full flex items-center gap-2.5 px-2.5 py-1.5 text-sm text-left rounded-md transition-colors',
                        idx === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                      )}
                      onMouseEnter={() => onHover(idx)}
                      onMouseDown={(e) => { e.preventDefault(); onSelectMention(item); }}
                    >
                      <Icon className={cn('h-3.5 w-3.5 shrink-0', cfg.colorClass)} />
                      <span className="truncate font-medium flex-1">{item.label}</span>
                      {item.sub && (
                        <span className="truncate text-xs text-muted-foreground max-w-[40%]">
                          {item.sub}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
