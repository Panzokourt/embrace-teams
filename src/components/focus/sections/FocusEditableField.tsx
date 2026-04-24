import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type EditorType = 'text' | 'textarea' | 'number';

interface FocusEditableFieldProps {
  value: string | number | null | undefined;
  onSave: (next: string) => void | Promise<void>;
  type?: EditorType;
  placeholder?: string;
  /** Display class for the read-only state. */
  displayClassName?: string;
  /** Class for the edit input/textarea. */
  inputClassName?: string;
  /** Custom display when not editing (overrides default text). */
  renderDisplay?: (value: string) => ReactNode;
  /** When true, allow Shift+Enter newline (textarea only). */
  multiline?: boolean;
  /** Disable editing entirely. */
  disabled?: boolean;
  /** Number constraints */
  min?: number;
  max?: number;
  step?: number;
  /** Optional ARIA label. */
  ariaLabel?: string;
}

export default function FocusEditableField({
  value,
  onSave,
  type = 'text',
  placeholder = 'Click to edit…',
  displayClassName,
  inputClassName,
  renderDisplay,
  multiline = true,
  disabled = false,
  min, max, step,
  ariaLabel,
}: FocusEditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ''));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(String(value ?? ''));
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if ('select' in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (disabled) return;
    setEditing(true);
  };

  const commit = async () => {
    if (saving) return;
    const next = draft.trim();
    const prev = String(value ?? '').trim();
    if (next === prev) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch (e) {
      console.error('Editable save failed', e);
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setDraft(String(value ?? ''));
    setEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Enter') {
      if (type === 'textarea' && multiline && e.shiftKey) return;
      e.preventDefault();
      commit();
    }
  };

  if (editing) {
    if (type === 'textarea') {
      return (
        <div className="space-y-1">
          <textarea
            ref={(el) => (inputRef.current = el)}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            rows={Math.max(3, draft.split('\n').length + 1)}
            placeholder={placeholder}
            aria-label={ariaLabel}
            disabled={saving}
            className={cn(
              'w-full bg-white/5 border border-white/15 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 outline-none rounded-lg px-3 py-2 text-white/90 text-sm leading-relaxed resize-none',
              inputClassName,
            )}
          />
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10">⏎</kbd> save
            <kbd className="px-1.5 py-0.5 rounded bg-white/10">Esc</kbd> cancel
            {multiline && (<><kbd className="px-1.5 py-0.5 rounded bg-white/10">⇧⏎</kbd> new line</>)}
          </div>
        </div>
      );
    }

    return (
      <div className="inline-flex items-center gap-1 w-full">
        <input
          ref={(el) => (inputRef.current = el)}
          type={type === 'number' ? 'number' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={saving}
          min={min} max={max} step={step}
          className={cn(
            'flex-1 bg-white/5 border border-white/15 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 outline-none rounded-lg px-3 py-1.5 text-white/90 text-sm',
            inputClassName,
          )}
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); commit(); }}
          className="w-7 h-7 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 flex items-center justify-center"
          aria-label="Save"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); cancel(); }}
          className="w-7 h-7 rounded-md bg-white/10 hover:bg-white/15 text-white/70 flex items-center justify-center"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const display = String(value ?? '');
  const isEmpty = display.trim() === '';

  return (
    <button
      type="button"
      onClick={startEdit}
      disabled={disabled}
      className={cn(
        'group/edit text-left w-full rounded-lg px-2 -mx-2 py-1 transition-colors',
        !disabled && 'hover:bg-white/[0.04] cursor-text',
        disabled && 'cursor-default',
        displayClassName,
      )}
      aria-label={ariaLabel}
    >
      {isEmpty ? (
        <span className="text-white/30 italic inline-flex items-center gap-2">
          {placeholder}
          {!disabled && <Pencil className="h-3 w-3 opacity-0 group-hover/edit:opacity-100" />}
        </span>
      ) : (
        <span className="inline-flex items-start gap-2 w-full">
          <span className="flex-1 whitespace-pre-wrap break-words">
            {renderDisplay ? renderDisplay(display) : display}
          </span>
          {!disabled && (
            <Pencil className="h-3 w-3 text-white/30 opacity-0 group-hover/edit:opacity-100 mt-1 shrink-0" />
          )}
        </span>
      )}
    </button>
  );
}
