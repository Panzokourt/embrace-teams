import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
}

interface BulkActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: 'status' | 'assignee' | 'priority' | null;
  selectedCount: number;
  users?: Profile[];
  onConfirm: (value: string) => Promise<void>;
}

const STATUS_OPTIONS = [
  { value: 'todo', label: 'Προς Υλοποίηση' },
  { value: 'in_progress', label: 'Σε Εξέλιξη' },
  { value: 'review', label: 'Αναθεώρηση' },
  { value: 'completed', label: 'Ολοκληρώθηκε' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Χαμηλή' },
  { value: 'medium', label: 'Μεσαία' },
  { value: 'high', label: 'Υψηλή' },
];

export function BulkActionsDialog({
  open,
  onOpenChange,
  actionType,
  selectedCount,
  users = [],
  onConfirm,
}: BulkActionsDialogProps) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!value) return;
    setSaving(true);
    try {
      await onConfirm(value);
      onOpenChange(false);
      setValue('');
    } finally {
      setSaving(false);
    }
  };

  const getTitle = () => {
    switch (actionType) {
      case 'status': return 'Αλλαγή Κατάστασης';
      case 'assignee': return 'Αλλαγή Υπευθύνου';
      case 'priority': return 'Αλλαγή Προτεραιότητας';
      default: return 'Μαζική Ενέργεια';
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderOptions = () => {
    switch (actionType) {
      case 'status':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε κατάσταση" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'priority':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε προτεραιότητα" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'assignee':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder="Επιλέξτε υπεύθυνο" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Χωρίς ανάθεση</SelectItem>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    {user.full_name || user.email}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>
            Εφαρμογή σε {selectedCount} επιλεγμένα tasks
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label className="mb-2 block">Νέα τιμή</Label>
          {renderOptions()}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Ακύρωση
          </Button>
          <Button onClick={handleConfirm} disabled={!value || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Εφαρμογή
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
