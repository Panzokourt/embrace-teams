import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommentsSection } from '@/components/comments/CommentsSection';
import { Loader2, MessageSquare, Clock, CheckSquare, Package, FolderOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { el } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string | null;
  entity_id: string;
  details: any;
  created_at: string;
  user_id: string;
  user?: { full_name: string | null; email: string } | null;
}

interface ProjectCommentsAndHistoryProps {
  projectId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getEntityIcon(entityType: string) {
  switch (entityType) {
    case 'task': return <CheckSquare className="h-3.5 w-3.5 text-foreground" />;
    case 'deliverable': return <Package className="h-3.5 w-3.5 text-warning" />;
    default: return <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case 'created': return 'δημιουργήθηκε';
    case 'updated': return 'ενημερώθηκε';
    case 'deleted': return 'διαγράφηκε';
    case 'status_changed': return 'άλλαξε κατάσταση';
    case 'assigned': return 'ανατέθηκε';
    case 'completed': return 'ολοκληρώθηκε';
    default: return action;
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case 'created': return <Plus className="h-2.5 w-2.5" />;
    case 'updated':
    case 'status_changed': return <Pencil className="h-2.5 w-2.5" />;
    case 'deleted': return <Trash2 className="h-2.5 w-2.5" />;
    default: return null;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'created': return 'bg-success/10 text-success border-success/20';
    case 'deleted': return 'bg-destructive/10 text-destructive border-destructive/20';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return email[0].toUpperCase();
}

// ── ActivityItem ─────────────────────────────────────────────────────────────
function ActivityItem({ entry }: { entry: ActivityEntry }) {
  const userName = entry.user?.full_name || entry.user?.email || 'Άγνωστος';

  return (
    <div className="flex gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-[9px]">
            {getInitials(entry.user?.full_name || null, entry.user?.email || 'U')}
          </AvatarFallback>
        </Avatar>
        <div className="w-px flex-1 bg-border/50 min-h-[8px]" />
      </div>

      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            {getEntityIcon(entry.entity_type)}
          </div>
          {entry.entity_name && (
            <span className="font-medium text-xs text-foreground truncate max-w-[160px]">
              "{entry.entity_name}"
            </span>
          )}
          <Badge
            variant="outline"
            className={cn('text-[10px] px-1.5 py-0 h-4 flex items-center gap-0.5', getActionColor(entry.action))}
          >
            {getActionIcon(entry.action)}
            {getActionLabel(entry.action)}
          </Badge>
        </div>

        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {userName}
          </span>
          <span className="text-muted-foreground/40 text-xs">·</span>
          <span className="text-xs text-muted-foreground" title={format(new Date(entry.created_at), 'd MMM yyyy, HH:mm', { locale: el })}>
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: el })}
          </span>
        </div>

        {/* Show details if available */}
        {entry.details && typeof entry.details === 'object' && (
          <div className="mt-1 text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1">
            {entry.details.old_status && entry.details.new_status && (
              <span>{entry.details.old_status} → {entry.details.new_status}</span>
            )}
            {entry.details.changes && typeof entry.details.changes === 'object' && (
              <span>{Object.keys(entry.details.changes).join(', ')} άλλαξε</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ProjectCommentsAndHistory({ projectId }: ProjectCommentsAndHistoryProps) {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    fetchActivity();
    fetchCommentCount();

    // Realtime subscription for activity log
    const channel = supabase
      .channel('project-activity-history')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, () => {
        fetchActivity();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchCommentCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);

  const fetchCommentCount = async () => {
    const { count } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId);
    setCommentCount(count || 0);
  };

  const fetchActivity = async () => {
    setLoadingActivity(true);
    try {
      // Fetch tasks and deliverables IDs for this project to filter activity
      const [tasksRes, deliverablesRes] = await Promise.all([
        supabase.from('tasks').select('id').eq('project_id', projectId),
        supabase.from('deliverables').select('id').eq('project_id', projectId),
      ]);

      const taskIds = tasksRes.data?.map(t => t.id) || [];
      const deliverableIds = deliverablesRes.data?.map(d => d.id) || [];

      // Build OR filter: project itself + its tasks + its deliverables
      const entityIds = [projectId, ...taskIds, ...deliverableIds];

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .in('entity_id', entityIds)
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
        setActivities(data.map(entry => ({
          ...entry,
          user: profilesMap.get(entry.user_id) || null,
        })));
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  return (
    <Tabs defaultValue="comments" className="space-y-4">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="comments" className="flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" />
          Σχόλια
          {commentCount > 0 && (
            <span className="ml-1 bg-muted text-foreground text-[10px] font-bold rounded-full px-1.5 py-0">
              {commentCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Ιστορικό
          {activities.length > 0 && (
            <span className="ml-1 bg-muted text-muted-foreground text-[10px] font-bold rounded-full px-1.5 py-0">
              {activities.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── COMMENTS TAB ─────────────────────────────────────────────────────── */}
      <TabsContent value="comments" className="mt-0">
        <CommentsSection projectId={projectId} />
      </TabsContent>

      {/* ── HISTORY TAB ──────────────────────────────────────────────────────── */}
      <TabsContent value="history" className="mt-0">
        {loadingActivity ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Δεν υπάρχει ιστορικό ακόμα</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Οι αλλαγές στο έργο, tasks και παραδοτέα θα εμφανίζονται εδώ
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto pr-1">
            {activities.map(entry => (
              <ActivityItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
