import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, CheckSquare, FileText, AlertCircle, Check } from 'lucide-react';
import { format, isPast, isToday, addDays } from 'date-fns';
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

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Subscribe to realtime changes on tasks and tenders
    const channel = supabase
      .channel('notification-bell-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenders' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    const today = new Date();
    const upcoming = addDays(today, 3);
    const notifs: Notification[] = [];

    try {
      // Fetch overdue tasks
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, project:projects(name)')
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

      // Fetch upcoming tasks (next 3 days)
      const { data: upcomingTasks } = await supabase
        .from('tasks')
        .select('id, title, due_date, project:projects(name)')
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

      // Fetch upcoming tender deadlines
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

      // Sort by date
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
      case 'task_overdue':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'task_due':
        return <CheckSquare className="h-4 w-4 text-warning" />;
      case 'tender_deadline':
        return <FileText className="h-4 w-4 text-primary" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">Ειδοποιήσεις</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="h-4 w-4 mr-1" />
              Αναγνώστηκαν
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Δεν υπάρχουν ειδοποιήσεις</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
                    !notification.read && "bg-primary/5"
                  )}
                  onClick={() => {
                    setNotifications(prev => 
                      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                    );
                    if (notification.link) {
                      window.location.href = notification.link;
                    }
                    setOpen(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {notification.description}
                      </p>
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
      </PopoverContent>
    </Popover>
  );
}
