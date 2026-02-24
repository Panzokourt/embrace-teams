import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { CalendarEvent } from '@/hooks/useCalendarEvents';
import { Edit, Trash2, Copy, Palette, FolderKanban, Plus, Bell } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  event?: CalendarEvent | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onNewMeeting?: () => void;
  onNewReminder?: () => void;
}

export function CalendarContextMenu({ children, event, onEdit, onDelete, onDuplicate, onNewMeeting, onNewReminder }: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {event ? (
          <>
            <ContextMenuItem onClick={onEdit}>
              <Edit className="h-3.5 w-3.5 mr-2" /> Επεξεργασία
            </ContextMenuItem>
            <ContextMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5 mr-2" /> Αντιγραφή
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Διαγραφή
            </ContextMenuItem>
          </>
        ) : (
          <>
            <ContextMenuItem onClick={onNewMeeting}>
              <Plus className="h-3.5 w-3.5 mr-2" /> Νέο Meeting
            </ContextMenuItem>
            <ContextMenuItem onClick={onNewReminder}>
              <Bell className="h-3.5 w-3.5 mr-2" /> Νέο Reminder
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
