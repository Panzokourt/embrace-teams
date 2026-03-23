import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ColorOption {
  value: string;
  label: string;
  bg: string;
  text: string;
}

interface MondayStatusCellProps {
  value: string | null;
  options: ColorOption[];
  onSave: (newValue: string | number | null) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

export function MondayStatusCell({
  value,
  options,
  onSave,
  disabled = false,
  placeholder = '-',
}: MondayStatusCellProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = options.find(o => o.value === value);

  const handleSelect = async (optionValue: string) => {
    if (optionValue === value) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(optionValue);
    } catch (e) {
      console.error('Error saving:', e);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  };

  if (disabled) {
    return (
      <div
        className="flex items-center justify-center py-1.5 px-2 rounded-[6px] text-xs font-medium min-h-[28px]"
        style={{
          backgroundColor: current?.bg || '#8E8E93',
          color: current?.text || '#ffffff',
        }}
      >
        {current?.label || placeholder}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-center py-1.5 px-2 rounded-[6px] text-xs font-medium min-h-[28px] transition-all cursor-pointer",
            saving && "opacity-60"
          )}
          style={{
            backgroundColor: current?.bg || '#8E8E93',
            color: current?.text || '#ffffff',
          }}
          disabled={saving}
        >
          {current?.label || placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1.5" align="center">
        <div className="flex flex-col gap-1">
          {options.map(option => (
            <button
              key={option.value}
              className={cn(
                "w-full py-1.5 px-2 rounded-[6px] text-xs font-medium text-center transition-all hover:brightness-95",
                option.value === value && "ring-2 ring-white/30"
              )}
              style={{
                backgroundColor: option.bg,
                color: option.text,
              }}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
