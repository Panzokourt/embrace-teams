import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, FileText, CheckSquare, Package, Users, DollarSign, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivityItem {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  details: unknown;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

interface ActivityLogProps {
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export function ActivityLog({ entityType, entityId, limit = 20 }: ActivityLogProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_log',
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityType, entityId]);

  const fetchActivities = async () => {
    try {
      let query = supabase
        .from('activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (entityType && entityId) {
        query = query.eq('entity_type', entityType).eq('entity_id', entityId);
      } else if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(a => a.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const activitiesWithUsers = data.map(activity => ({
          ...activity,
          user: profilesMap.get(activity.user_id) || { full_name: null, email: 'Unknown' }
        }));
        setActivities(activitiesWithUsers);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'project': return <FolderKanban className="h-4 w-4" />;
      case 'task': return <CheckSquare className="h-4 w-4" />;
      case 'deliverable': return <Package className="h-4 w-4" />;
      case 'invoice': return <FileText className="h-4 w-4" />;
      case 'expense': return <DollarSign className="h-4 w-4" />;
      case 'team': return <Users className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActionText = (action: string, entityType: string, entityName: string | null) => {
    const name = entityName || 'αντικείμενο';
    const typeLabels: Record<string, string> = {
      project: 'έργο',
      task: 'task',
      deliverable: 'παραδοτέο',
      invoice: 'τιμολόγιο',
      expense: 'έξοδο',
      team: 'ομάδα',
    };
    const typeLabel = typeLabels[entityType] || entityType;

    switch (action) {
      case 'created': return `δημιούργησε ${typeLabel} "${name}"`;
      case 'updated': return `ενημέρωσε ${typeLabel} "${name}"`;
      case 'deleted': return `διέγραψε ${typeLabel} "${name}"`;
      case 'completed': return `ολοκλήρωσε ${typeLabel} "${name}"`;
      case 'assigned': return `ανέθεσε ${typeLabel} "${name}"`;
      case 'commented': return `σχολίασε στο ${typeLabel} "${name}"`;
      case 'uploaded': return `ανέβασε αρχείο στο ${typeLabel} "${name}"`;
      default: return `${action} ${typeLabel} "${name}"`;
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        Δεν υπάρχει ιστορικό δραστηριότητας
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className={cn(
            "flex items-start gap-3 py-3",
            index !== activities.length - 1 && "border-b"
          )}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className="text-xs">
              {getInitials(activity.user?.full_name || null, activity.user?.email || 'U')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">
                {activity.user?.full_name || activity.user?.email}
              </span>{' '}
              <span className="text-muted-foreground">
                {getActionText(activity.action, activity.entity_type, activity.entity_name)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {format(new Date(activity.created_at), 'd MMMM yyyy, HH:mm', { locale: el })}
            </p>
          </div>

          <div className="p-1.5 rounded-md bg-muted">
            {getEntityIcon(activity.entity_type)}
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to log activities
export async function logActivity(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  entityName?: string,
  details?: Record<string, unknown>
) {
  try {
    await supabase.from('activity_log').insert([{
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName || null,
      details: (details || null) as any,
    }]);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}
