import { useState, useEffect, useRef, useLayoutEffect, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type FieldType = 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select';

interface Option { value: string; label: string }

interface Props {
  value: string | null | undefined;
  onSave: (newValue: string | null) => Promise<void> | void;
  type?: FieldType;
  options?: Option[];
  placeholder?: string;
  emptyLabel?: string;
  canEdit?: boolean;
  className?: string;
  inputClassName?: string;
  displayClassName?: string;
  multiline?: boolean;
  prefix?: React.ReactNode;
  /** Render a custom display (read-mode) view */
  renderDisplay?: (value: string | null | undefined) => React.ReactNode;
  /** Number of lines before clamping with "Show more" toggle. Default: 2. Use 0 to disable. */
  clamp?: number;
}

export function InlineEditField({
  value,
  onSave,
  type = 'text',
  options,
  placeholder = 'Προσθήκη…',
  emptyLabel,
  canEdit = true,
  className,
  inputClassName,
  displayClassName,
  prefix,
  renderDisplay,
  clamp = 2,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value ?? '');
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current && type !== 'select') {
      inputRef.current.focus();
      if ('select' in inputRef.current) (inputRef.current as HTMLInputElement).select();
    }
  }, [editing, type]);

  const handleSave = async () => {
    const next = draft.trim() === '' ? null : draft.trim();
    if (next === (value ?? null)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value ?? '');
    setEditing(false);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (editing && canEdit) {
    if (type === 'select' && options) {
      return (
        <div className={cn('flex items-center gap-1', className)}>
          <Select
            value={draft}
            onValueChange={async (v) => {
              setDraft(v);
              setSaving(true);
              try {
                await onSave(v);
                setEditing(false);
              } finally {
                setSaving(false);
              }
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {options.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }

    if (type === 'textarea') {
      return (
        <div className={cn('space-y-2', className)}>
          <Textarea
            ref={inputRef as any}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className={cn('text-sm', inputClassName)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className={cn('flex items-center gap-1', className)}>
        {prefix}
        <Input
          ref={inputRef as any}
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          onBlur={handleSave}
          placeholder={placeholder}
          className={cn('h-8 text-sm', inputClassName)}
          disabled={saving}
        />
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  // Display mode
  return <DisplayMode
    value={value}
    canEdit={canEdit}
    className={className}
    displayClassName={displayClassName}
    prefix={prefix}
    renderDisplay={renderDisplay}
    placeholder={placeholder}
    emptyLabel={emptyLabel}
    clamp={clamp}
    onStartEdit={() => setEditing(true)}
  />;
}

interface DisplayModeProps {
  value: string | null | undefined;
  canEdit: boolean;
  className?: string;
  displayClassName?: string;
  prefix?: React.ReactNode;
  renderDisplay?: (value: string | null | undefined) => React.ReactNode;
  placeholder: string;
  emptyLabel?: string;
  clamp: number;
  onStartEdit: () => void;
}

function DisplayMode({
  value, canEdit, className, displayClassName, prefix, renderDisplay,
  placeholder, emptyLabel, clamp, onStartEdit,
}: DisplayModeProps) {
  const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement | null>(null);

  // Detect when text actually overflows the clamped height
  useLayoutEffect(() => {
    if (clamp === 0 || !textRef.current || isEmpty) {
      setOverflowing(false);
      return;
    }
    const el = textRef.current;
    // Compare scroll vs client height (with 1px tolerance)
    setOverflowing(el.scrollHeight - el.clientHeight > 1);
  }, [value, clamp, isEmpty, expanded]);

  const clampClass = clamp > 0 && !expanded
    ? clamp === 1 ? 'line-clamp-1'
    : clamp === 2 ? 'line-clamp-2'
    : clamp === 3 ? 'line-clamp-3'
    : 'line-clamp-4'
    : '';

  return (
    <div className={cn('group min-w-0', className)}>
      <div
        role={canEdit ? 'button' : undefined}
        tabIndex={canEdit ? 0 : undefined}
        onClick={() => canEdit && onStartEdit()}
        onKeyDown={(e) => {
          if (canEdit && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onStartEdit();
          }
        }}
        className={cn(
          'flex items-start gap-1.5 text-left rounded-md transition-colors min-w-0',
          canEdit && 'hover:bg-secondary/60 cursor-text px-1.5 -mx-1.5 py-0.5',
          !canEdit && 'cursor-default',
        )}
      >
        {prefix && <span className="shrink-0 mt-0.5">{prefix}</span>}
        <span
          ref={textRef}
          className={cn(
            'min-w-0 flex-1 break-words whitespace-pre-wrap',
            clampClass,
            isEmpty && 'text-muted-foreground italic',
            displayClassName,
          )}
        >
          {renderDisplay ? renderDisplay(value) : (isEmpty ? (emptyLabel || placeholder) : value)}
        </span>
        {canEdit && (
          <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
        )}
      </div>
      {clamp > 0 && (overflowing || expanded) && !isEmpty && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(v => !v);
          }}
          className="text-xs text-primary hover:underline inline-flex items-center gap-0.5 mt-0.5 px-1.5"
        >
          {expanded ? (
            <>Λιγότερα <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Περισσότερα <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}
    </div>
  );
}
