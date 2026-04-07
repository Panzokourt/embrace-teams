import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Send, Loader2, Trash2, Edit2, X, Check, AtSign,
  Paperclip, FileText, Image, FileVideo, FileAudio, File, Download,
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';

interface CommentAttachment {
  id: string;
  comment_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string;
  created_at: string;
}

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
  attachments?: CommentAttachment[];
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function renderCommentContent(content: string) {
  const parts = content.split(/(@[^\s@][^@\n]*?)(?=\s|@|$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span key={i} className="text-primary font-medium bg-primary/10 px-1 py-0.5 rounded text-sm">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function getAttachmentIcon(contentType: string | null) {
  if (!contentType) return File;
  if (contentType.startsWith('image/')) return Image;
  if (contentType.startsWith('video/')) return FileVideo;
  if (contentType.startsWith('audio/')) return FileAudio;
  if (contentType.includes('pdf') || contentType.includes('text')) return FileText;
  return File;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
}

function MentionTextarea({
  value, onChange, onSubmit, placeholder, disabled, projectUsers, className,
  onDragOver, onDragLeave, onDrop, isDragOver,
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
    const textBeforeCursor = text.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const afterAt = textBeforeCursor.slice(atIndex + 1);
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
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = before.length + name.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [value, mentionAnchorPos, mentionQuery, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, filteredUsers.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); insertMention(filteredUsers[highlightedIndex]); return; }
      if (e.key === 'Escape') { setShowDropdown(false); return; }
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) { e.preventDefault(); onSubmit(); }
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
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          'min-h-[60px]',
          isDragOver && 'ring-2 ring-primary/40 bg-primary/5',
          className,
        )}
      />

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
                    idx === highlightedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
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

// ── Attachment chip (shown under a comment or in pending list) ───────────────
function AttachmentChip({
  fileName, fileSize, contentType, onDownload, onDelete,
}: {
  fileName: string;
  fileSize: number | null;
  contentType: string | null;
  onDownload?: () => void;
  onDelete?: () => void;
}) {
  const Icon = getAttachmentIcon(contentType);
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border bg-muted/40 text-xs group max-w-[220px]">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{fileName}</span>
      {fileSize ? <span className="text-muted-foreground shrink-0">({formatFileSize(fileSize)})</span> : null}
      {onDownload && (
        <button onClick={onDownload} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" title="Λήψη">
          <Download className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
      )}
      {onDelete && (
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 transition-opacity" title="Αφαίρεση">
          <X className="h-3 w-3 text-destructive" />
        </button>
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

  // Pending files for new comment
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments();
    if (projectId) fetchProjectUsers(projectId);
    const channel = supabase
      .channel('comments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => { fetchComments(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, taskId, deliverableId]);

  const fetchProjectUsers = async (pid: string) => {
    try {
      const { data: accessData } = await supabase.from('project_user_access').select('user_id').eq('project_id', pid);
      if (!accessData || accessData.length === 0) return;
      const userIds = accessData.map(a => a.user_id);
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      setProjectUsers(profiles || []);
    } catch (error) {
      console.error('Error fetching project users:', error);
    }
  };

  const fetchComments = async () => {
    try {
      let query = supabase.from('comments').select('*').order('created_at', { ascending: true });
      if (projectId) query = query.eq('project_id', projectId);
      else if (taskId) query = query.eq('task_id', taskId);
      else if (deliverableId) query = query.eq('deliverable_id', deliverableId);
      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(c => c.user_id))];
        const commentIds = data.map(c => c.id);

        // Fetch profiles and attachments in parallel
        const [profilesRes, attachRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, email').in('id', userIds),
          supabase.from('comment_attachments').select('*').in('comment_id', commentIds),
        ]);

        const profilesMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
        const attachMap = new Map<string, CommentAttachment[]>();
        for (const a of (attachRes.data || []) as CommentAttachment[]) {
          const list = attachMap.get(a.comment_id) || [];
          list.push(a);
          attachMap.set(a.comment_id, list);
        }

        setComments(data.map(comment => ({
          ...comment,
          user: profilesMap.get(comment.user_id) || { full_name: null, email: 'Unknown' },
          attachments: attachMap.get(comment.id) || [],
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

  // Upload pending files for a comment
  const uploadFilesForComment = async (commentId: string): Promise<void> => {
    if (!user || pendingFiles.length === 0) return;
    for (const file of pendingFiles) {
      const objectKey = createProjectFilesObjectKey({ userId: user.id, originalName: file.name, prefix: 'comments' });
      const { error: upErr } = await supabase.storage.from('project-files').upload(objectKey, file);
      if (upErr) { console.error('Upload error:', upErr); continue; }
      await supabase.from('comment_attachments').insert({
        comment_id: commentId,
        file_name: file.name,
        file_path: objectKey,
        file_size: file.size,
        content_type: file.type || null,
        uploaded_by: user.id,
      } as any);
    }
  };

  const handleSubmit = async () => {
    if ((!newComment.trim() && pendingFiles.length === 0) || !user) return;
    setSending(true);
    try {
      const commentData: Record<string, unknown> = {
        content: newComment.trim() || (pendingFiles.length > 0 ? `📎 ${pendingFiles.length} αρχεί${pendingFiles.length === 1 ? 'ο' : 'α'}` : ''),
        user_id: user.id,
      };
      if (projectId) commentData.project_id = projectId;
      if (taskId) commentData.task_id = taskId;
      if (deliverableId) commentData.deliverable_id = deliverableId;

      const { data: inserted, error } = await supabase.from('comments').insert([commentData as any]).select('id').single();
      if (error) throw error;

      if (inserted && pendingFiles.length > 0) {
        await uploadFilesForComment(inserted.id);
      }

      setNewComment('');
      setPendingFiles([]);
      toast.success('Το σχόλιο προστέθηκε!');
      await fetchComments();
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
      const { error } = await supabase.from('comments').update({ content: editContent.trim() }).eq('id', commentId);
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
      // Attachments cascade-delete via FK
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (error) throw error;
      toast.success('Το σχόλιο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleDownloadAttachment = async (att: CommentAttachment) => {
    try {
      const { data, error } = await supabase.storage.from('project-files').download(att.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Σφάλμα κατά τη λήψη');
    }
  };

  const handleDeleteAttachment = async (att: CommentAttachment) => {
    try {
      await supabase.storage.from('project-files').remove([att.file_path]);
      await supabase.from('comment_attachments').delete().eq('id', att.id);
      toast.success('Το αρχείο αφαιρέθηκε');
      await fetchComments();
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast.error('Σφάλμα κατά τη διαγραφή αρχείου');
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...droppedFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (selected && selected.length > 0) {
      setPendingFiles(prev => [...prev, ...Array.from(selected)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
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
                  <>
                    <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {renderCommentContent(comment.content)}
                    </div>
                    {/* Comment attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {comment.attachments.map(att => (
                          <AttachmentChip
                            key={att.id}
                            fileName={att.file_name}
                            fileSize={att.file_size}
                            contentType={att.content_type}
                            onDownload={() => handleDownloadAttachment(att)}
                            onDelete={user?.id === att.uploaded_by ? () => handleDeleteAttachment(att) : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {user?.id === comment.user_id && editingId !== comment.id && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(comment.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {pendingFiles.map((file, idx) => (
            <AttachmentChip
              key={`pending-${idx}`}
              fileName={file.name}
              fileSize={file.size}
              contentType={file.type}
              onDelete={() => removePendingFile(idx)}
            />
          ))}
        </div>
      )}

      {/* New comment form */}
      <div className="flex gap-2 items-end pt-2 border-t">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={() => fileInputRef.current?.click()}
          title="Επισύναψη αρχείου"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <MentionTextarea
          value={newComment}
          onChange={setNewComment}
          onSubmit={handleSubmit}
          placeholder="Γράψτε ένα σχόλιο... (@mention για να αναφέρετε κάποιον)"
          disabled={sending}
          projectUsers={projectUsers}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={isDragOver}
        />
        <Button
          onClick={handleSubmit}
          size="icon"
          disabled={sending || (!newComment.trim() && pendingFiles.length === 0)}
          className="shrink-0 h-10 w-10"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Ctrl+Enter για αποστολή · @ για mention · Σύρετε αρχεία στο πεδίο κειμένου</p>
    </div>
  );
}
