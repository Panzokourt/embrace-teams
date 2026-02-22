import { useState } from 'react';
import { TimeEntry } from '@/hooks/useTimeTracking';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Check, X, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { el } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TimeEntriesListViewProps {
  entries: TimeEntry[];
  users: { id: string; full_name: string | null }[];
  showUserColumn: boolean;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function TimeEntriesListView({ entries, users, showUserColumn, onDelete, onRefresh }: TimeEntriesListViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ start: string; end: string; description: string }>({
    start: '', end: '', description: ''
  });

  const startEdit = (entry: TimeEntry) => {
    setEditingId(entry.id);
    setEditValues({
      start: format(parseISO(entry.start_time), 'HH:mm'),
      end: entry.end_time ? format(parseISO(entry.end_time), 'HH:mm') : '',
      description: entry.description || '',
    });
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (entry: TimeEntry) => {
    const dateStr = format(parseISO(entry.start_time), 'yyyy-MM-dd');
    const newStart = `${dateStr}T${editValues.start}:00`;
    const newEnd = editValues.end ? `${dateStr}T${editValues.end}:00` : null;

    let durationMinutes = entry.duration_minutes;
    if (newEnd) {
      const diff = new Date(newEnd).getTime() - new Date(newStart).getTime();
      durationMinutes = Math.max(1, Math.round(diff / 60000));
    }

    const { error } = await supabase
      .from('time_entries')
      .update({
        start_time: newStart,
        end_time: newEnd,
        duration_minutes: durationMinutes,
        description: editValues.description || null,
      })
      .eq('id', entry.id);

    if (error) {
      toast.error('Σφάλμα αποθήκευσης');
    } else {
      toast.success('Ενημερώθηκε');
      onRefresh();
    }
    setEditingId(null);
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ημερομηνία</TableHead>
            <TableHead>Ώρες</TableHead>
            <TableHead>Διάρκεια</TableHead>
            <TableHead>Έργο</TableHead>
            <TableHead>Task</TableHead>
            {showUserColumn && <TableHead>Χρήστης</TableHead>}
            <TableHead>Σημειώσεις</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showUserColumn ? 8 : 7} className="text-center text-muted-foreground py-12">
                Δεν βρέθηκαν καταχωρήσεις
              </TableCell>
            </TableRow>
          ) : entries.map(entry => {
            const isEditing = editingId === entry.id;

            return (
              <TableRow key={entry.id}>
                <TableCell className="text-sm">
                  {format(parseISO(entry.start_time), 'dd MMM yyyy', { locale: el })}
                </TableCell>
                <TableCell className="text-sm font-mono">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="time"
                        value={editValues.start}
                        onChange={e => setEditValues(v => ({ ...v, start: e.target.value }))}
                        className="h-7 w-24 text-xs"
                      />
                      <span>→</span>
                      <Input
                        type="time"
                        value={editValues.end}
                        onChange={e => setEditValues(v => ({ ...v, end: e.target.value }))}
                        className="h-7 w-24 text-xs"
                      />
                    </div>
                  ) : (
                    <>
                      {format(parseISO(entry.start_time), 'HH:mm')}
                      {' → '}
                      {entry.end_time ? format(parseISO(entry.end_time), 'HH:mm') : (
                        <span className="text-foreground animate-pulse">τρέχει</span>
                      )}
                    </>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {entry.is_running ? '...' : `${Math.floor(entry.duration_minutes / 60)}ω ${entry.duration_minutes % 60}λ`}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{(entry as any).project?.name || '—'}</TableCell>
                <TableCell className="text-sm">{(entry as any).task?.title || '—'}</TableCell>
                {showUserColumn && (
                  <TableCell className="text-sm">
                    {users.find(u => u.id === entry.user_id)?.full_name || '—'}
                  </TableCell>
                )}
                <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                  {isEditing ? (
                    <Input
                      value={editValues.description}
                      onChange={e => setEditValues(v => ({ ...v, description: e.target.value }))}
                      className="h-7 text-xs"
                      placeholder="Σημειώσεις..."
                    />
                  ) : (
                    <span className="truncate block">{entry.description || '—'}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveEdit(entry)}>
                        <Check className="h-3.5 w-3.5 text-success" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelEdit}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {!entry.is_running && (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(entry)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(entry.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
