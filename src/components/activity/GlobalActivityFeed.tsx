import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  FolderKanban,
  CheckSquare,
  Package,
  Users,
  DollarSign,
  FileText,
  Building2,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    email: string;
  };
}

interface GlobalActivityFeedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalActivityFeed({ open, onOpenChange }: GlobalActivityFeedProps) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!open) return;

    fetchActivities();

    const channel = supabase
      .channel('global-activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity_log' },
        async (payload) => {
          const newItem = payload.new as ActivityItem;
          // Fetch profile for the new item
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', newItem.user_id)
            .single();

          const itemWithProfile = { ...newItem, profile: profile || { full_name: null, email: 'Unknown' } };
          setActivities(prev => [itemWithProfile, ...prev].slice(0, 50));
          if (initialLoadDone.current) {
            setNewIds(prev => new Set(prev).add(newItem.id));
            setTimeout(() => {
              setNewIds(prev => {
                const next = new Set(prev);
                next.delete(newItem.id);
                return next;
              });
            }, 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setActivities(
          data.map(a => ({
            ...a,
            profile: profilesMap.get(a.user_id) || { full_name: null, email: 'Unknown' },
          }))
        );
      } else {
        setActivities([]);
      }
      initialLoadDone.current = true;
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'project': return <FolderKanban className="h-4 w-4 text-primary" />;
      case 'task': return <CheckSquare className="h-4 w-4 text-warning" />;
      case 'deliverable': return <Package className="h-4 w-4 text-success" />;
      case 'invoice': return <FileText className="h-4 w-4 text-accent-foreground" />;
      case 'expense': return <DollarSign className="h-4 w-4 text-destructive" />;
      case 'tender': return <FileText className="h-4 w-4 text-primary" />;
      case 'client': return <Building2 className="h-4 w-4 text-muted-foreground" />;
      case 'team': return <Users className="h-4 w-4 text-primary" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      created: 'δημιούργησε',
      updated: 'ενημέρωσε',
      deleted: 'διέγραψε',
      completed: 'ολοκλήρωσε',
      status_change: 'άλλαξε κατάσταση',
      assigned: 'ανέθεσε',
    };
    return map[action] || action;
  };

  const getEntityLabel = (type: string) => {
    const map: Record<string, string> = {
      project: 'έργο',
      task: 'task',
      tender: 'διαγωνισμό',
      invoice: 'τιμολόγιο',
      expense: 'έξοδο',
      client: 'πελάτη',
      deliverable: 'παραδοτέο',
      team: 'ομάδα',
    };
    return map[type] || type;
  };

  const getEntityLink = (type: string, id: string) => {
    switch (type) {
      case 'project': return `/projects/${id}`;
      case 'tender': return `/tenders/${id}`;
      case 'client': return `/clients/${id}`;
      case 'task': return '/tasks';
      default: return null;
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return email[0].toUpperCase();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Δραστηριότητα
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-80px)]">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Activity className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm">Δεν υπάρχει πρόσφατη δραστηριότητα</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {activities.map(activity => {
                const link = getEntityLink(activity.entity_type, activity.entity_id);
                const isNew = newIds.has(activity.id);
                return (
                  <div
                    key={activity.id}
                    className={cn(
                      "px-5 py-3.5 transition-all duration-300 cursor-default",
                      "hover:bg-secondary/50",
                      isNew && "animate-fade-in bg-primary/5",
                      link && "cursor-pointer"
                    )}
                    onClick={() => {
                      if (link) {
                        navigate(link);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                        <AvatarFallback className="text-xs bg-secondary">
                          {getInitials(activity.profile?.full_name || null, activity.profile?.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-medium text-foreground">
                            {activity.profile?.full_name || activity.profile?.email}
                          </span>{' '}
                          <span className="text-muted-foreground">
                            {getActionLabel(activity.action)} {getEntityLabel(activity.entity_type)}
                          </span>
                          {activity.entity_name && (
                            <span className="text-foreground/80 font-medium">
                              {' "'}
                              {activity.entity_name}
                              {'"'}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getEntityIcon(activity.entity_type)}
                          <span className="text-xs text-muted-foreground/70">
                            {formatDistanceToNow(new Date(activity.created_at), {
                              addSuffix: true,
                              locale: el,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
