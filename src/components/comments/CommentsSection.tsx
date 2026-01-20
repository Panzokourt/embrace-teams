import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Send, Loader2, Trash2, Edit2, X, Check } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

interface CommentsSectionProps {
  projectId?: string;
  taskId?: string;
  deliverableId?: string;
}

export function CommentsSection({ projectId, taskId, deliverableId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchComments();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, taskId, deliverableId]);

  const fetchComments = async () => {
    try {
      let query = supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (taskId) {
        query = query.eq('task_id', taskId);
      } else if (deliverableId) {
        query = query.eq('deliverable_id', deliverableId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch user profiles for comments
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const commentsWithUsers = data.map(comment => ({
          ...comment,
          user: profilesMap.get(comment.user_id) || { full_name: null, email: 'Unknown' }
        }));
        setComments(commentsWithUsers);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSending(true);
    try {
      const commentData: Record<string, unknown> = {
        content: newComment.trim(),
        user_id: user.id,
      };

      if (projectId) commentData.project_id = projectId;
      if (taskId) commentData.task_id = taskId;
      if (deliverableId) commentData.deliverable_id = deliverableId;

      const { error } = await supabase.from('comments').insert([commentData as any]);
      if (error) throw error;

      setNewComment('');
      toast.success('Το σχόλιο προστέθηκε!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Σφάλμα κατά την προσθήκη σχολίου');
    } finally {
      setSending(false);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId);

      if (error) throw error;

      setEditingId(null);
      setEditContent('');
      toast.success('Το σχόλιο ενημερώθηκε!');
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      toast.success('Το σχόλιο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
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

  return (
    <div className="space-y-4">
      {/* Comments list */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">
            Δεν υπάρχουν σχόλια ακόμα
          </p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {getInitials(comment.user?.full_name || null, comment.user?.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {comment.user?.full_name || comment.user?.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), 'd MMM, HH:mm', { locale: el })}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="text-xs text-muted-foreground">(επεξεργασμένο)</span>
                  )}
                </div>
                
                {editingId === comment.id ? (
                  <div className="mt-1 space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(comment.id)}>
                        <Check className="h-3 w-3 mr-1" /> Αποθήκευση
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-3 w-3 mr-1" /> Ακύρωση
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                )}
              </div>
              
              {user?.id === comment.user_id && editingId !== comment.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setEditingId(comment.id);
                      setEditContent(comment.content);
                    }}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Γράψτε ένα σχόλιο..."
          className="min-h-[60px] flex-1"
        />
        <Button type="submit" size="icon" disabled={sending || !newComment.trim()}>
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
