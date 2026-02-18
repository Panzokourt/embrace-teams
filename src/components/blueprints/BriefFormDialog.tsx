import { useState } from 'react';
import { BriefDefinition, BriefFieldConfig } from './briefDefinitions';
import { exportBriefToPdf, exportBriefToWord, exportBriefToExcel } from './BriefExport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Save, Download, Plus, Trash2, Loader2 } from 'lucide-react';

interface BriefFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definition: BriefDefinition;
  initialData?: Record<string, any>;
  briefId?: string;
  onSaved?: () => void;
}

export function BriefFormDialog({
  open,
  onOpenChange,
  definition,
  initialData,
  briefId,
  onSaved,
}: BriefFormDialogProps) {
  const { user, profile } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {});
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleCheckboxToggle = (key: string, option: string) => {
    const current: string[] = formData[key] || [];
    const updated = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option];
    handleFieldChange(key, updated);
  };

  const handleMultiSelectToggle = (key: string, option: string) => {
    handleCheckboxToggle(key, option);
  };

  const handleRepeaterAdd = (key: string, subFields: BriefFieldConfig[]) => {
    const current: any[] = formData[key] || [];
    const empty: Record<string, string> = {};
    subFields.forEach(sf => { empty[sf.key] = ''; });
    handleFieldChange(key, [...current, empty]);
  };

  const handleRepeaterRemove = (key: string, index: number) => {
    const current: any[] = formData[key] || [];
    handleFieldChange(key, current.filter((_, i) => i !== index));
  };

  const handleRepeaterChange = (key: string, index: number, subKey: string, value: string) => {
    const current: any[] = [...(formData[key] || [])];
    current[index] = { ...current[index], [subKey]: value };
    handleFieldChange(key, current);
  };

  const getTitle = (): string => {
    const nameField = definition.fields.find(f => 
      f.key === 'project_name' || f.key === 'campaign_name' || f.key === 'event_name'
    );
    return (nameField ? formData[nameField.key] : '') || `${definition.label} - ${new Date().toLocaleDateString('el-GR')}`;
  };

  const handleSave = async (status: 'draft' | 'final' = 'draft') => {
    if (!user) return;
    setSaving(true);
    try {
      const title = getTitle();
      const payload = {
        brief_type: definition.type,
        title,
        data: formData as any,
        status,
        created_by: user.id,
      };

      if (briefId) {
        const { error } = await supabase.from('briefs').update(payload).eq('id', briefId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('briefs').insert(payload);
        if (error) throw error;
      }

      toast.success(status === 'final' ? 'Brief οριστικοποιήθηκε!' : 'Brief αποθηκεύτηκε!');
      onSaved?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving brief:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (format: 'pdf' | 'word' | 'excel') => {
    const title = getTitle();
    switch (format) {
      case 'pdf': exportBriefToPdf(title, definition.fields, formData); break;
      case 'word': exportBriefToWord(title, definition.fields, formData); break;
      case 'excel': exportBriefToExcel(title, definition.fields, formData); break;
    }
  };

  const renderField = (field: BriefFieldConfig) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            value={formData[field.key] || ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'textarea':
        return (
          <Textarea
            value={formData[field.key] || ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
          />
        );
      case 'date':
        return (
          <Input
            type="date"
            value={formData[field.key] || ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={formData[field.key] || ''}
            onChange={e => handleFieldChange(field.key, e.target.value)}
          />
        );
      case 'select':
        return (
          <Select value={formData[field.key] || ''} onValueChange={v => handleFieldChange(field.key, v)}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(opt => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'multiselect':
        return (
          <div className="flex flex-wrap gap-2">
            {field.options?.map(opt => {
              const selected = (formData[field.key] || []).includes(opt);
              return (
                <Badge
                  key={opt}
                  variant={selected ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => handleMultiSelectToggle(field.key, opt)}
                >
                  {opt}
                </Badge>
              );
            })}
          </div>
        );
      case 'checkboxes':
        return (
          <div className="grid grid-cols-2 gap-2">
            {field.options?.map(opt => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={(formData[field.key] || []).includes(opt)}
                  onCheckedChange={() => handleCheckboxToggle(field.key, opt)}
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'repeater':
        const items: any[] = formData[field.key] || [];
        return (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${field.repeaterFields?.length || 1}, 1fr)` }}>
                  {field.repeaterFields?.map(sf => (
                    <div key={sf.key}>
                      <Label className="text-xs text-muted-foreground">{sf.label}</Label>
                      <Input
                        type={sf.type === 'date' ? 'date' : 'text'}
                        value={item[sf.key] || ''}
                        onChange={e => handleRepeaterChange(field.key, idx, sf.key, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 mt-5 shrink-0" onClick={() => handleRepeaterRemove(field.key, idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRepeaterAdd(field.key, field.repeaterFields || [])}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Προσθήκη
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{definition.label}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 py-2">
            {definition.fields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </ScrollArea>
        <DialogFooter className="gap-2 sm:gap-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Εξαγωγή
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('word')}>Word (.doc)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>Excel (.xls)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Αποθήκευση Draft
          </Button>
          <Button onClick={() => handleSave('final')} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Οριστικοποίηση
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
