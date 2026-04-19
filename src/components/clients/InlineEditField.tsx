import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Pencil, Check, X, Loader2 } from 'lucide-react';
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
  const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
  return (
    <button
      type="button"
      onClick={() => canEdit && setEditing(true)}
      disabled={!canEdit}
      className={cn(
        'group inline-flex items-center gap-1.5 text-left rounded-md transition-colors min-w-0',
        canEdit && 'hover:bg-secondary/60 cursor-text px-1.5 -mx-1.5 py-0.5',
        !canEdit && 'cursor-default',
        className,
      )}
    >
      {prefix}
      <span className={cn('truncate', isEmpty && 'text-muted-foreground italic', displayClassName)}>
        {renderDisplay ? renderDisplay(value) : (isEmpty ? (emptyLabel || placeholder) : value)}
      </span>
      {canEdit && (
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      )}
    </button>
  );
}
