import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useMemo,
  useRef, useState, type KeyboardEvent, type ChangeEvent,
} from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useMentionSearch } from './useMentionSearch';
import { MentionPopover } from './MentionPopover';
import {
  SLASH_COMMANDS, MENTION_TYPES, serializeMention, serializeSlash,
  type MentionEntity, type MentionType, type SlashCommand,
} from './mentionRegistry';
import { splitForRender } from './parseMentions';

type TriggerMode = 'mention' | 'slash';

export interface MentionTextareaHandle {
  focus: () => void;
  blur: () => void;
  el: HTMLTextAreaElement | null;
}

export interface MentionTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  /** Restrict mention types (e.g. ['user'] for comments). */
  types?: MentionType[];
  /** Enable "/" slash commands (AI chats only). */
  enableSlash?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  /** Max pixel height for auto-grow. */
  maxHeight?: number;
  autoFocus?: boolean;
  /** Submit on plain Enter? Default true (Shift+Enter = newline). */
  submitOnEnter?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  id?: string;
  name?: string;
}

const MentionTextarea = forwardRef<MentionTextareaHandle, MentionTextareaProps>(function MentionTextarea({
  value, onChange, onSubmit,
  types,
  enableSlash = false,
  placeholder, disabled, className, rows = 1, maxHeight = 200,
  autoFocus, submitOnEnter = true,
  onKeyDown, onPaste, onDragOver, onDragLeave, onDrop, id, name,
}, ref) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<TriggerMode>('mention');
  const [query, setQuery] = useState('');
  const [triggerStart, setTriggerStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    focus: () => taRef.current?.focus(),
    blur: () => taRef.current?.blur(),
    el: taRef.current,
  }), []);

  // Auto-grow
  const autoSize = useCallback(() => {
    const t = taRef.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, maxHeight) + 'px';
  }, [maxHeight]);
  useEffect(() => { autoSize(); }, [value, autoSize]);

  const { results, loading } = useMentionSearch(query, {
    types,
    enabled: open && mode === 'mention',
  });

  // Compute total options for keyboard nav
  const optionsCount = mode === 'slash'
    ? SLASH_COMMANDS.filter(c =>
        c.command.toLowerCase().startsWith(query.toLowerCase()) ||
        c.label.toLowerCase().includes(query.toLowerCase())
      ).length
    : results.flat.length;

  useEffect(() => { setSelectedIndex(0); }, [query, mode, optionsCount]);

  const closePopover = () => {
    setOpen(false);
    setQuery('');
    setTriggerStart(-1);
  };

  const detectTrigger = (text: string, cursor: number) => {
    const before = text.slice(0, cursor);

    const atIdx = before.lastIndexOf('@');
    if (atIdx >= 0) {
      const after = before.slice(atIdx + 1);
      const charBefore = atIdx === 0 ? ' ' : before[atIdx - 1];
      if ((/\s/.test(charBefore) || atIdx === 0) && !/[\s@]/.test(after) && !after.startsWith('[')) {
        setMode('mention');
        setQuery(after);
        setTriggerStart(atIdx);
        setOpen(true);
        return true;
      }
    }

    if (enableSlash) {
      const slashIdx = before.lastIndexOf('/');
      if (slashIdx >= 0) {
        const after = before.slice(slashIdx + 1);
        const charBefore = slashIdx === 0 ? ' ' : before[slashIdx - 1];
        if ((/\s/.test(charBefore) || slashIdx === 0) && !/[\s/]/.test(after) && !after.startsWith('[')) {
          setMode('slash');
          setQuery(after);
          setTriggerStart(slashIdx);
          setOpen(true);
          return true;
        }
      }
    }

    if (open) closePopover();
    return false;
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    const cursor = e.target.selectionStart ?? next.length;
    detectTrigger(next, cursor);
  };

  const insertMention = (entity: MentionEntity) => {
    if (triggerStart < 0) return;
    const before = value.slice(0, triggerStart);
    const after = value.slice(triggerStart + 1 + query.length);
    const inserted = serializeMention({ type: entity.type, id: entity.id, label: entity.label });
    const next = `${before}${inserted} ${after}`;
    onChange(next);
    closePopover();
    requestAnimationFrame(() => {
      const t = taRef.current;
      if (!t) return;
      const pos = before.length + inserted.length + 1;
      t.focus();
      t.setSelectionRange(pos, pos);
    });
  };

  const insertSlash = (cmd: SlashCommand) => {
    if (triggerStart < 0) return;
    const before = value.slice(0, triggerStart);
    const after = value.slice(triggerStart + 1 + query.length);
    const inserted = serializeSlash({ command: cmd.command, payload: cmd.payloadHint });
    const next = `${before}${inserted} ${after}`;
    onChange(next);
    closePopover();
    requestAnimationFrame(() => {
      const t = taRef.current;
      if (!t) return;
      const pos = before.length + inserted.length + 1;
      t.focus();
      t.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (open && optionsCount > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => (i + 1) % optionsCount); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => (i - 1 + optionsCount) % optionsCount); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (mode === 'mention') {
          const entity = results.flat[selectedIndex];
          if (entity) insertMention(entity);
        } else {
          const filtered = SLASH_COMMANDS.filter(c =>
            c.command.toLowerCase().startsWith(query.toLowerCase()) ||
            c.label.toLowerCase().includes(query.toLowerCase())
          );
          const cmd = filtered[selectedIndex];
          if (cmd) insertSlash(cmd);
        }
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); closePopover(); return; }
    }

    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (submitOnEnter && e.key === 'Enter' && !e.shiftKey && !open) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  // Sync overlay scroll with textarea
  const handleScroll = () => {
    const ta = taRef.current;
    const ov = overlayRef.current;
    if (!ta || !ov) return;
    ov.scrollTop = ta.scrollTop;
    ov.scrollLeft = ta.scrollLeft;
  };

  // Build overlay segments
  const segments = useMemo(() => splitForRender(value), [value]);
  const hasTokens = useMemo(() => segments.some(s => s.kind !== 'text'), [segments]);

  // Shared base styling so textarea + overlay align pixel-perfectly
  const sharedBase =
    'text-sm leading-[1.5rem] font-sans whitespace-pre-wrap break-words';

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) closePopover(); }}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          {/* Highlight overlay: renders chips for tokens. aria-hidden — purely visual. */}
          <div
            ref={overlayRef}
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 overflow-hidden',
              sharedBase,
              className,
            )}
            style={{
              maxHeight,
              // Ensure the overlay does NOT add its own border/background — those live on parent containers.
              color: 'hsl(var(--foreground))',
            }}
          >
            {hasTokens ? (
              segments.map((seg, i) => {
                if (seg.kind === 'text') {
                  return <span key={i}>{seg.text}</span>;
                }
                if (seg.kind === 'slash') {
                  return (
                    <span
                      key={i}
                      className="inline-flex items-center gap-0.5 rounded px-1 py-0 align-baseline bg-primary/15 text-primary font-medium"
                    >
                      /{seg.command}
                      {seg.payload && <span className="opacity-60 ml-0.5">({seg.payload})</span>}
                    </span>
                  );
                }
                const cfg = MENTION_TYPES[seg.type];
                if (!cfg) return <span key={i}>@{seg.label}</span>;
                const Icon = cfg.icon;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-0.5 rounded px-1 py-0 align-baseline bg-foreground/10 font-medium"
                  >
                    <Icon className={cn('h-3 w-3', cfg.colorClass)} />
                    <span>@{seg.label}</span>
                  </span>
                );
              })
            ) : null}
            {/* Trailing space ensures last line height is preserved when value ends with newline */}
            {value.endsWith('\n') ? '\u00A0' : null}
          </div>

          <textarea
            ref={taRef}
            id={id}
            name={name}
            value={value}
            rows={rows}
            autoFocus={autoFocus}
            disabled={disabled}
            placeholder={placeholder}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onPaste={onPaste}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'relative w-full resize-none bg-transparent placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-50',
              sharedBase,
              hasTokens
                ? 'text-transparent caret-foreground selection:bg-primary/30 selection:text-foreground'
                : 'text-foreground',
              className,
            )}
            style={{ maxHeight }}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="w-80 p-1"
        align="start"
        side="top"
        sideOffset={6}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <MentionPopover
          mode={mode}
          query={query}
          loading={loading}
          results={results}
          selectedIndex={selectedIndex}
          onSelectMention={insertMention}
          onSelectSlash={insertSlash}
          onHover={setSelectedIndex}
        />
      </PopoverContent>
    </Popover>
  );
});

export default MentionTextarea;
export { MentionTextarea };
