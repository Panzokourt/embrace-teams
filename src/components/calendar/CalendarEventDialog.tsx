import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CalendarEvent, CreateEventInput } from '@/hooks/useCalendarEvents';
import { format } from 'date-fns';

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Call' },
  { value: 'event', label: 'Event' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'pr', label: 'PR' },
  { value: 'campaign', label: 'Campaign' },
];

const COLORS = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1',
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (input: CreateEventInput) => void;
  editEvent?: CalendarEvent | null;
  defaultDate?: Date;
  defaultHour?: number;
  defaultMinutes?: number;
}

export function CalendarEventDialog({ open, onClose, onSave, editEvent, defaultDate, defaultHour, defaultMinutes }: Props) {
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setEventType(editEvent.event_type);
      setStartDate(format(new Date(editEvent.start_time), 'yyyy-MM-dd'));
      setStartTime(format(new Date(editEvent.start_time), 'HH:mm'));
      setEndDate(format(new Date(editEvent.end_time), 'yyyy-MM-dd'));
      setEndTime(format(new Date(editEvent.end_time), 'HH:mm'));
      setAllDay(editEvent.all_day || false);
      setLocation(editEvent.location || '');
      setVideoLink(editEvent.video_link || '');
      setDescription(editEvent.description || '');
      setColor(editEvent.color);
    } else {
      const d = defaultDate || new Date();
      const h = defaultHour ?? 9;
      const m = defaultMinutes ?? 0;
      setTitle('');
      setEventType('meeting');
      setStartDate(format(d, 'yyyy-MM-dd'));
      setStartTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      setEndDate(format(d, 'yyyy-MM-dd'));
      setEndTime(`${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      setAllDay(false);
      setLocation('');
      setVideoLink('');
      setDescription('');
      setColor(null);
    }
  }, [editEvent, defaultDate, defaultHour, defaultMinutes, open]);

  const handleSubmit = () => {
    if (!title.trim() || !startDate || !endDate) return;
    const st = allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`;
    const et = allDay ? `${endDate}T23:59:59` : `${endDate}T${endTime}:00`;
    onSave({
      title: title.trim(),
      event_type: eventType,
      start_time: new Date(st).toISOString(),
      end_time: new Date(et).toISOString(),
      all_day: allDay,
      location: location || undefined,
      video_link: videoLink || undefined,
      description: description || undefined,
      color: color || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editEvent ? 'Επεξεργασία Event' : 'Νέο Event'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Τίτλος</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. Σύσκεψη ομάδας" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Τύπος</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2 pb-2">
                <Switch checked={allDay} onCheckedChange={setAllDay} />
                <Label className="text-xs">Ολοήμερο</Label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ημ/νία Έναρξης</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            {!allDay && (
              <div>
                <Label>Ώρα Έναρξης</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Ημ/νία Λήξης</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            {!allDay && (
              <div>
                <Label>Ώρα Λήξης</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Τοποθεσία</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="π.χ. Αίθουσα Α" />
            </div>
            <div>
              <Label>Video Link</Label>
              <Input value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <Label className="mb-1.5 block">Χρώμα</Label>
            <div className="flex gap-1.5">
              <button
                onClick={() => setColor(null)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 transition-all',
                  !color ? 'border-foreground scale-110' : 'border-border/40'
                )}
                style={{ background: 'linear-gradient(135deg, #ddd 50%, #bbb 50%)' }}
              />
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    color === c ? 'border-foreground scale-110' : 'border-transparent'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Περιγραφή</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Σημειώσεις..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Ακύρωση</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {editEvent ? 'Αποθήκευση' : 'Δημιουργία'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

