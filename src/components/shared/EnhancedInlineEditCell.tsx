import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, Calendar, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  avatar?: string;
  color?: string;
}

interface EnhancedInlineEditCellProps {
  value: string | number | null;
  onSave: (newValue: string | number | null) => Promise<void>;
  type?: 'text' | 'number' | 'date' | 'select' | 'progress' | 'avatar-select';
  options?: SelectOption[];
  className?: string;
  displayValue?: string;
  placeholder?: string;
  disabled?: boolean;
  minWidth?: string;
}

export function EnhancedInlineEditCell({ 
  value, 
  onSave, 
  type = 'text',
  options = [],
  className,
  displayValue,
  placeholder = '-',
  disabled = false,
  minWidth = '80px'
}: EnhancedInlineEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number | null>(value);
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current && (type === 'text' || type === 'number')) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, type]);

  const handleSave = async (newValue?: string | number | null) => {
    const valueToSave = newValue !== undefined ? newValue : editValue;
    if (valueToSave === value) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(valueToSave);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving:', error);
      setEditValue(value);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <span className={cn("text-muted-foreground", className)} style={{ minWidth }}>
        {displayValue || value || placeholder}
      </span>
    );
  }

  // Date picker type
  if (type === 'date') {
    const dateValue = value ? (typeof value === 'string' ? parseISO(value) : new Date(value)) : undefined;
    const formattedDate = dateValue ? format(dateValue, 'd MMM yyyy', { locale: el }) : placeholder;
    
    return (
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-sm hover:bg-muted transition-colors cursor-pointer -mx-1",
              !value && "text-muted-foreground",
              className
            )}
            style={{ minWidth }}
          >
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {formattedDate}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={dateValue}
            onSelect={async (date) => {
              const newValue = date ? format(date, 'yyyy-MM-dd') : null;
              setCalendarOpen(false);
              await handleSave(newValue);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Select dropdown type
  if (type === 'select' || type === 'avatar-select') {
    const selectedOption = options.find(opt => opt.value === value);
    
    return (
      <Select
        value={String(value || '')}
        onValueChange={async (newValue) => {
          await handleSave(newValue || null);
        }}
        disabled={saving}
      >
        <SelectTrigger 
          className={cn(
            "h-7 border-0 bg-transparent hover:bg-muted focus:ring-0 focus:ring-offset-0 px-2 -mx-1",
            className
          )}
          style={{ minWidth }}
        >
          <SelectValue placeholder={placeholder}>
            {selectedOption ? (
              <div className="flex items-center gap-2">
                {type === 'avatar-select' && selectedOption.avatar && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedOption.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {selectedOption.label.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
                {selectedOption.icon}
                {selectedOption.color && (
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: selectedOption.color }}
                  />
                )}
                <span className="truncate">{selectedOption.label}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {type === 'avatar-select' && option.avatar && (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={option.avatar} />
                    <AvatarFallback className="text-[10px]">
                      {option.label.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                )}
                {option.icon}
                {option.color && (
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Progress slider type
  if (type === 'progress') {
    const progressValue = typeof value === 'number' ? value : (value ? parseInt(String(value)) : 0);
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-2 py-1 rounded hover:bg-muted transition-colors cursor-pointer -mx-1",
              className
            )}
            style={{ minWidth: '100px' }}
          >
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  progressValue >= 100 ? "bg-success" : 
                  progressValue >= 50 ? "bg-primary" : 
                  "bg-warning"
                )}
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-8 text-right">{progressValue}%</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48" align="start">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Πρόοδος</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={editValue ?? 0}
                onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                className="w-16 h-7 text-sm"
              />
            </div>
            <Slider
              value={[typeof editValue === 'number' ? editValue : 0]}
              onValueChange={([val]) => setEditValue(val)}
              max={100}
              step={5}
              className="w-full"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditValue(progressValue)}
              >
                Ακύρωση
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave(editValue)}
                disabled={saving}
              >
                Αποθήκευση
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Text/Number input type (with inline edit mode)
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type}
          value={editValue ?? ''}
          onChange={(e) => setEditValue(type === 'number' ? (e.target.value ? parseFloat(e.target.value) : null) : e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => handleSave()}
          className="h-7 text-sm px-2"
          style={{ minWidth }}
          disabled={saving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => handleSave()}
          disabled={saving}
        >
          <Check className="h-3 w-3 text-success" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCancel}
          disabled={saving}
        >
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <span
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors -mx-1 inline-block",
        !value && "text-muted-foreground",
        className
      )}
      style={{ minWidth }}
      title="Κλικ για επεξεργασία"
    >
      {displayValue || value || placeholder}
    </span>
  );
}
