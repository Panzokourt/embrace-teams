import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Send, Loader2, Trash2, Edit2, X, Check, AtSign } from 'lucide-react';
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

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

interface CommentsSectionProps {
  projectId?: string;
  taskId?: string;
  deliverableId?: string;
}

// ── Mention rendering helper ─────────────────────────────────────────────────
function renderCommentContent(content: string) {
  // Split on @mentions (Greek + Latin chars, spaces within the mention)
  const parts = content.split(/(@[^\s@][^@\n]*?)(?=\s|@|$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span
          key={i}
          className="text-primary font-medium bg-primary/10 px-1 py-0.5 rounded text-sm"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ── MentionTextarea ───────────────────────────────────────────────────────────
interface MentionTextareaProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  projectUsers: Profile[];
  className?: string;
}

function MentionTextarea({
  value,
  onChange,
  onSubmit,
  placeholder,
  disabled,
  projectUsers,
  className,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionAnchorPos, setMentionAnchorPos] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const filteredUsers = projectUsers.filter(u => {
    const name = (u.full_name || u.email).toLowerCase();
    return name.includes(mentionQuery.toLowerCase());
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(text);

    // Detect @mention trigger
    const textBeforeCursor = text.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const afterAt = textBeforeCursor.slice(atIndex + 1);
      // No space in what was typed after @
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setMentionQuery(afterAt);
        setMentionAnchorPos(atIndex);
        setShowDropdown(true);
        setHighlightedIndex(0);
        return;
      }
    }
    setShowDropdown(false);
  };

  const insertMention = useCallback(
    (user: Profile) => {
      const name = user.full_name || user.email;
      const before = value.slice(0, mentionAnchorPos);
      const after = value.slice(mentionAnchorPos + 1 + mentionQuery.length);
      const newText = `${before}@${name} ${after}`;
      onChange(newText);
      setShowDropdown(false);
      // Restore focus + set cursor
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = before.length + name.length + 2; // @name + space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [value, mentionAnchorPos, mentionQuery, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, filteredUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        insertMention(filteredUsers[highlightedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowDropdown(false);
        return;
      }
    }
    // Submit on Ctrl/Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('min-h-[60px]', className)}
      />

      {/* Mention dropdown */}
      {showDropdown && filteredUsers.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 z-50 w-64 rounded-md border bg-popover shadow-md overflow-hidden">
          <div className="flex items-center gap-1.5 px-2 py-1.5 border-b bg-muted/50">
            <AtSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Mention χρήστη</span>
          </div>
          <ul className="max-h-40 overflow-y-auto">
            {filteredUsers.map((user, idx) => (
              <li key={user.id}>
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                    idx === highlightedIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent textarea blur
                    insertMention(user);
                  }}
                >
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarFallback className="text-[9px]">
                      {(user.full_name || user.email)[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user.full_name || user.email}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function CommentsSection({ projectId, taskId, deliverableId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [projectUsers, setProjectUsers] = useState<Profile[]>([]);

  useEffect(() => {
    fetchComments();
    if (projectId) fetchProjectUsers(projectId);

    const channel = supabase
      .channel('comments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchComments();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, taskId, deliverableId]);

  const fetchProjectUsers = async (pid: string) => {
    try {
      // Get users with direct project access
      const { data: accessData } = await supabase
        .from('project_user_access')
        .select('user_id')
        .eq('project_id', pid);

      if (!accessData || accessData.length === 0) return;

      const userIds = accessData.map(a => a.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      setProjectUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching project users:', error);
    }
  };

  const fetchComments = async () => {
    try {
      let query = supabase
        .from('comments')
        .select('*')
        .order('created_at', { ascending: true });

      if (projectId) query = query.eq('project_id', projectId);
      else if (taskId) query = query.eq('task_id', taskId);
      else if (deliverableId) query = query.eq('deliverable_id', deliverableId);

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setComments(data.map(comment => ({
          ...comment,
          user: profilesMap.get(comment.user_id) || { full_name: null, email: 'Unknown' }
        })));
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
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
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            Δεν υπάρχουν σχόλια ακόμα. Γράψτε το πρώτο!
          </p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                <AvatarFallback className="text-xs">
                  {getInitials(comment.user?.full_name || null, comment.user?.email || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-medium text-sm">
                    {comment.user?.full_name || comment.user?.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(comment.created_at), 'd MMM, HH:mm', { locale: el })}
                  </span>
                  {comment.updated_at !== comment.created_at && (
                    <span className="text-xs text-muted-foreground italic">(επεξεργασμένο)</span>
                  )}
                </div>

                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <MentionTextarea
                      value={editContent}
                      onChange={setEditContent}
                      projectUsers={projectUsers}
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
                  <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {renderCommentContent(comment.content)}
                  </div>
                )}
              </div>

              {user?.id === comment.user_id && editingId !== comment.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
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
      <div className="flex gap-2 items-end pt-2 border-t">
        <MentionTextarea
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleSubmit}
          placeholder="Γράψτε ένα σχόλιο... (@mention για να αναφέρετε κάποιον)"
          disabled={sending}
          projectUsers={projectUsers}
        />
        <Button
          onClick={handleSubmit}
          size="icon"
          disabled={sending || !newComment.trim()}
          className="shrink-0 h-10 w-10"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Ctrl+Enter για αποστολή · @ για mention</p>
    </div>
  );
}
