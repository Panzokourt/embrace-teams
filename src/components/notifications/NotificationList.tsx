import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckSquare, FileText, AlertCircle, Check } from 'lucide-react';
import { format, isToday, addDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'task_due' | 'task_overdue' | 'tender_deadline';
  title: string;
  description: string;
  date: string;
  read: boolean;
  link?: string;
}

interface NotificationListProps {
  active?: boolean;
}

export function NotificationList({ active = true }: NotificationListProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user || !active) return;
    fetchNotifications();

    const channel = supabase
      .channel('notification-panel-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenders' }, () => fetchNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, active]);

  const fetchNotifications = async () => {
    const today = new Date();
    const upcoming = addDays(today, 3);
    const notifs: Notification[] = [];

    try {
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .lt('due_date', format(today, 'yyyy-MM-dd'))
        .neq('status', 'completed');

      (overdueTasks || []).forEach(task => {
        notifs.push({
          id: `task-overdue-${task.id}`,
          type: 'task_overdue',
          title: 'Εκπρόθεσμο Task',
          description: task.title,
          date: task.due_date!,
          read: false,
          link: '/tasks'
        });
      });

      const { data: upcomingTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(upcoming, 'yyyy-MM-dd'))
        .neq('status', 'completed');

      (upcomingTasks || []).forEach(task => {
        notifs.push({
          id: `task-due-${task.id}`,
          type: 'task_due',
          title: isToday(new Date(task.due_date!)) ? 'Task λήγει σήμερα' : 'Επερχόμενο deadline',
          description: task.title,
          date: task.due_date!,
          read: false,
          link: '/tasks'
        });
      });

      const { data: tenders } = await supabase
        .from('tenders')
        .select('id, name, submission_deadline')
        .gte('submission_deadline', format(today, 'yyyy-MM-dd'))
        .lte('submission_deadline', format(upcoming, 'yyyy-MM-dd'))
        .in('stage', ['identification', 'preparation', 'submitted', 'evaluation']);

      (tenders || []).forEach(tender => {
        notifs.push({
          id: `tender-${tender.id}`,
          type: 'tender_deadline',
          title: 'Deadline Διαγωνισμού',
          description: tender.name,
          date: tender.submission_deadline!,
          read: false,
          link: '/tenders'
        });
      });

      notifs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setNotifications(notifs);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_overdue': return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'task_due': return <CheckSquare className="h-4 w-4 text-warning" />;
      case 'tender_deadline': return <FileText className="h-4 w-4 text-primary" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {unreadCount > 0 && (
        <div className="flex items-center justify-end px-4 py-2 border-b">
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            <Check className="h-4 w-4 mr-1" />
            Αναγνώστηκαν
          </Button>
        </div>
      )}
      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">Δεν υπάρχουν ειδοποιήσεις</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={cn(
                  "px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors",
                  !notification.read && "bg-primary/5"
                )}
                onClick={() => {
                  setNotifications(prev =>
                    prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                  );
                  if (notification.link) {
                    window.location.href = notification.link;
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{notification.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notification.date), 'd MMM yyyy', { locale: el })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
