import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Upload,
  LayoutGrid,
  List,
  Search,
  Download,
  Eye,
  Trash2,
  MoreVertical,
  Image,
  FileText,
  File,
  Link2,
  ChevronDown,
  ChevronRight,
  X,
  Loader2,
  CheckSquare,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Creative {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  title: string | null;
  description: string | null;
  version: string | null;
  deliverable_id: string | null;
  task_id: string | null;
  media_plan_item_id: string | null;
  status: string;
  review_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  signedUrl?: string;
  reviewer?: { full_name: string | null } | null;
  uploader?: { full_name: string | null } | null;
}

interface Deliverable {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
}

interface MediaPlanItem {
  id: string;
  medium: string;
  campaign_name: string | null;
}

interface ProjectCreativesProps {
  projectId: string;
  projectName: string;
  deliverables: Deliverable[];
  tasks: Task[];
  mediaPlanItems: MediaPlanItem[];
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground border-border' },
  review: { label: 'Εσωτ. Review', className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
  client_review: { label: 'Πελάτης Review', className: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  approved: { label: 'Εγκρίθηκε', className: 'bg-success/10 text-success border-success/20' },
  rejected: { label: 'Απορρίφθηκε', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  active: { label: 'Ενεργό', className: 'bg-foreground/10 text-foreground border-foreground/20' },
  archived: { label: 'Αρχείο', className: 'bg-muted/50 text-muted-foreground border-border' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isImageType(contentType: string | null): boolean {
  if (!contentType) return false;
  return ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'].includes(contentType);
}

function getFileIcon(contentType: string | null) {
  if (!contentType) return <File className="h-8 w-8 text-muted-foreground" />;
  if (contentType.startsWith('image/')) return <Image className="h-8 w-8 text-foreground" />;
  if (contentType === 'application/pdf') return <FileText className="h-8 w-8 text-red-500" />;
  return <File className="h-8 w-8 text-muted-foreground" />;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <Badge variant="outline" className={cn('text-xs font-medium border', cfg.className)}>
      {cfg.label}
    </Badge>
  );
}

// ─── UploadCreativesModal ─────────────────────────────────────────────────────

interface UploadFile {
  file: File;
  title: string;
  status: string;
  linkType: 'none' | 'deliverable' | 'task' | 'media_plan';
  linkId: string;
  preview: string | null;
  uploading: boolean;
  done: boolean;
  error: string | null;
}

function UploadCreativesModal({
  open,
  onClose,
  onUploaded,
  projectId,
  deliverables,
  tasks,
  mediaPlanItems,
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  projectId: string;
  deliverables: Deliverable[];
  tasks: Task[];
  mediaPlanItems: MediaPlanItem[];
}) {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const addFiles = (newFiles: File[]) => {
    const entries: UploadFile[] = newFiles.map(f => ({
      file: f,
      title: f.name.replace(/\.[^.]+$/, ''),
      status: 'draft',
      linkType: 'none',
      linkId: '',
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      uploading: false,
      done: false,
      error: null,
    }));
    setFiles(prev => [...prev, ...entries]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const update = (idx: number, patch: Partial<UploadFile>) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, ...patch } : f));
  };

  const remove = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUploadAll = async () => {
    if (!user) return;
    if (files.length === 0) return;
    setUploading(true);

    // Snapshot the files array to avoid stale closure issues
    const snapshot = [...files];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < snapshot.length; i++) {
      if (snapshot[i].done) { successCount++; continue; }
      update(i, { uploading: true, error: null });
      const f = snapshot[i];
      try {
        const objectKey = createProjectFilesObjectKey({
          userId: user.id,
          originalName: f.file.name,
          prefix: `creatives/${projectId}`,
        });

        const { error: storageErr } = await supabase.storage
          .from('project-files')
          .upload(objectKey, f.file);

        if (storageErr) throw storageErr;

        const record: Record<string, unknown> = {
          project_id: projectId,
          file_name: f.file.name,
          file_path: objectKey,
          file_size: f.file.size,
          content_type: f.file.type || null,
          title: f.title || f.file.name,
          status: f.status,
          uploaded_by: user.id,
        };

        if (f.linkType === 'deliverable' && f.linkId) record.deliverable_id = f.linkId;
        if (f.linkType === 'task' && f.linkId) record.task_id = f.linkId;
        if (f.linkType === 'media_plan' && f.linkId) record.media_plan_item_id = f.linkId;

        const { error: dbErr } = await supabase.from('project_creatives').insert(record as never);
        if (dbErr) throw dbErr;

        update(i, { uploading: false, done: true });
        successCount++;
      } catch (err: any) {
        console.error('Upload error:', err);
        update(i, { uploading: false, error: err?.message || 'Σφάλμα ανεβάσματος' });
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0 && errorCount === 0) {
      toast.success(`${successCount} εικαστικά ανέβηκαν!`);
      setFiles([]);
      onUploaded();
      onClose();
    } else if (successCount > 0 && errorCount > 0) {
      toast.warning(`${successCount} ανέβηκαν, ${errorCount} απέτυχαν`);
      onUploaded();
    } else {
      toast.error('Το ανέβασμα απέτυχε. Δείτε τα σφάλματα παρακάτω.');
    }
  };

  const pendingCount = files.filter(f => !f.done).length;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Ανέβασμα Εικαστικών</DialogTitle>
        </DialogHeader>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
            dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
          onClick={() => document.getElementById('creative-file-input')?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">Σύρτε αρχεία ή κάντε κλικ</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF, AI, PSD, ZIP, SVG…</p>
          <input
            id="creative-file-input"
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {files.map((f, idx) => (
              <div key={idx} className={cn(
                'border rounded-lg p-3 space-y-2',
                f.done && 'opacity-60',
                f.error && 'border-destructive/50'
              )}>
                <div className="flex items-center gap-3">
                  {f.preview ? (
                    <img src={f.preview} className="h-10 w-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                      {getFileIcon(f.file.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <Input
                      value={f.title}
                      onChange={e => update(idx, { title: e.target.value })}
                      className="h-7 text-sm"
                      placeholder="Τίτλος εικαστικού"
                    />
                    <p className="text-xs text-muted-foreground mt-0.5">{f.file.name} · {formatBytes(f.file.size)}</p>
                  </div>
                  {f.uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : f.done ? (
                    <CheckSquare className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => remove(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {f.error && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {f.error}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Select value={f.status} onValueChange={v => update(idx, { status: v })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map(s => (
                        <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={f.linkType} onValueChange={v => update(idx, { linkType: v as UploadFile['linkType'], linkId: '' })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Σύνδεση με…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Χωρίς σύνδεση</SelectItem>
                      {deliverables.length > 0 && <SelectItem value="deliverable" className="text-xs">Παραδοτέο</SelectItem>}
                      {tasks.length > 0 && <SelectItem value="task" className="text-xs">Task</SelectItem>}
                      {mediaPlanItems.length > 0 && <SelectItem value="media_plan" className="text-xs">Media Plan</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>

                {f.linkType === 'deliverable' && (
                  <Select value={f.linkId} onValueChange={v => update(idx, { linkId: v })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Επιλογή παραδοτέου…" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliverables.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.linkType === 'task' && (
                  <Select value={f.linkId} onValueChange={v => update(idx, { linkId: v })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Επιλογή task…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {f.linkType === 'media_plan' && (
                  <Select value={f.linkId} onValueChange={v => update(idx, { linkId: v })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Επιλογή ενέργειας…" />
                    </SelectTrigger>
                    <SelectContent>
                      {mediaPlanItems.map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.medium}{m.campaign_name ? ` — ${m.campaign_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Ακύρωση</Button>
          <Button onClick={handleUploadAll} disabled={uploading || pendingCount === 0}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Ανέβασμα {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CreativeCard (Gallery) ───────────────────────────────────────────────────

function CreativeCard({
  creative,
  selected,
  onSelect,
  onClick,
  onDownload,
  onDelete,
  onStatusChange,
}: {
  creative: Creative;
  selected: boolean;
  onSelect: (id: string, val: boolean) => void;
  onClick: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isImage = isImageType(creative.content_type);

  return (
    <div
      className={cn(
        'group relative border rounded-xl overflow-hidden bg-card transition-all duration-150',
        selected && 'ring-2 ring-foreground border-foreground'
      )}
    >
      {/* Thumbnail area */}
      <div
        className="aspect-[4/3] bg-muted flex items-center justify-center cursor-pointer relative overflow-hidden"
        onClick={onClick}
      >
        {isImage && creative.signedUrl ? (
          <img
            src={creative.signedUrl}
            alt={creative.title || creative.file_name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4">
            {getFileIcon(creative.content_type)}
            <span className="text-xs text-muted-foreground text-center break-all">
              {creative.file_name.split('.').pop()?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onDownload(); }}>
            <Download className="h-3 w-3 mr-1" /> Λήψη
          </Button>
          <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onClick(); }}>
            <Eye className="h-3 w-3 mr-1" /> Προβολή
          </Button>
        </div>
      </div>

      {/* Info footer */}
      <div className="p-3 space-y-1.5">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={selected}
            onCheckedChange={v => onSelect(creative.id, !!v)}
            className="mt-0.5 shrink-0"
            onClick={e => e.stopPropagation()}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">
              {creative.title || creative.file_name}
            </p>
            <p className="text-xs text-muted-foreground">{creative.version ? `v${creative.version}` : 'v1.0'}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
              {ALL_STATUSES.map(s => (
                <DropdownMenuItem key={s} onClick={() => onStatusChange(creative.id, s)} className="text-xs">
                  {STATUS_CONFIG[s].label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDownload} className="text-xs">
                <Download className="h-3 w-3 mr-2" /> Λήψη
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-xs text-destructive">
                <Trash2 className="h-3 w-3 mr-2" /> Διαγραφή
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <StatusBadge status={creative.status} />
      </div>
    </div>
  );
}

// ─── CreativeDetailPanel ──────────────────────────────────────────────────────

function CreativeDetailPanel({
  creative,
  open,
  onClose,
  onUpdate,
  onDelete,
  deliverables,
  tasks,
  mediaPlanItems,
}: {
  creative: Creative | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
  deliverables: Deliverable[];
  tasks: Task[];
  mediaPlanItems: MediaPlanItem[];
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    status: '',
    description: '',
    review_notes: '',
    version: '',
    deliverable_id: '',
    task_id: '',
    media_plan_item_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (creative) {
      setForm({
        status: creative.status,
        description: creative.description || '',
        review_notes: creative.review_notes || '',
        version: creative.version || '1.0',
        deliverable_id: creative.deliverable_id || '',
        task_id: creative.task_id || '',
        media_plan_item_id: creative.media_plan_item_id || '',
      });
    }
  }, [creative]);

  const handleSave = async () => {
    if (!creative) return;
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        status: form.status,
        description: form.description || null,
        review_notes: form.review_notes || null,
        version: form.version || '1.0',
        deliverable_id: form.deliverable_id || null,
        task_id: form.task_id || null,
        media_plan_item_id: form.media_plan_item_id || null,
      };

      if (form.status !== creative.status) {
        updateData.reviewed_by = user?.id;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('project_creatives')
        .update(updateData as never)
        .eq('id', creative.id);

      if (error) throw error;
      toast.success('Αποθηκεύτηκε!');
      onUpdate();
    } catch {
      toast.error('Σφάλμα αποθήκευσης');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!creative) return;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(creative.file_path, 60);
      if (error) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = creative.file_name;
      a.click();
    } catch {
      toast.error('Σφάλμα λήψης');
    } finally {
      setDownloading(false);
    }
  };

  const isImage = isImageType(creative?.content_type || null);

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-[420px] sm:w-[520px] overflow-y-auto p-0">
        {creative && (
          <>
            <SheetHeader className="p-4 pb-3 border-b">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-base truncate">{creative.title || creative.file_name}</SheetTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{creative.file_name} · {formatBytes(creative.file_size)}</p>
                </div>
              </div>
              {/* Status selector */}
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger className="h-8 text-sm w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SheetHeader>

            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {isImage && creative.signedUrl ? (
                  <img
                    src={creative.signedUrl}
                    alt={creative.title || creative.file_name}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {getFileIcon(creative.content_type)}
                    <span className="text-sm">{creative.file_name.split('.').pop()?.toUpperCase()}</span>
                  </div>
                )}
              </div>

              {/* Linking */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Link2 className="h-3.5 w-3.5" /> Σύνδεση με
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Παραδοτέο</p>
                    <Select value={form.deliverable_id || 'none'} onValueChange={v => setForm(p => ({ ...p, deliverable_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Χωρίς" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">Χωρίς</SelectItem>
                        {deliverables.map(d => <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Task</p>
                    <Select value={form.task_id || 'none'} onValueChange={v => setForm(p => ({ ...p, task_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Χωρίς" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-xs">Χωρίς</SelectItem>
                        {tasks.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Media Plan</p>
                  <Select value={form.media_plan_item_id || 'none'} onValueChange={v => setForm(p => ({ ...p, media_plan_item_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Χωρίς" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Χωρίς</SelectItem>
                      {mediaPlanItems.map(m => (
                        <SelectItem key={m.id} value={m.id} className="text-xs">
                          {m.medium}{m.campaign_name ? ` — ${m.campaign_name}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Version & Description */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Version</p>
                  <Input
                    value={form.version}
                    onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Ημ/νία upload</p>
                  <p className="text-xs py-2">{format(new Date(creative.created_at), 'd MMM yyyy, HH:mm', { locale: el })}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Περιγραφή</p>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="text-sm resize-none"
                  rows={2}
                  placeholder="Προαιρετική περιγραφή…"
                />
              </div>

              {/* Review Notes */}
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Σημειώσεις Review</p>
                <Textarea
                  value={form.review_notes}
                  onChange={e => setForm(p => ({ ...p, review_notes: e.target.value }))}
                  className="text-sm resize-none"
                  rows={3}
                  placeholder="Σχόλια, feedback, παρατηρήσεις…"
                />
                {creative.reviewed_at && (
                  <p className="text-xs text-muted-foreground">
                    Αναθεωρήθηκε: {format(new Date(creative.reviewed_at), 'd MMM yyyy', { locale: el })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Αποθήκευση
                </Button>
                <Button variant="outline" onClick={handleDownload} disabled={downloading}>
                  {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                </Button>
                <Button variant="outline" onClick={() => { onDelete(creative.id); onClose(); }} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type GroupByOption = 'deliverable' | 'task' | 'media_plan' | 'status' | 'none';

export function ProjectCreatives({
  projectId,
  deliverables,
  tasks,
  mediaPlanItems,
}: ProjectCreativesProps) {
  const { user, isAdmin, isManager } = useAuth();
  const canManage = isAdmin || isManager;

  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'gallery' | 'list'>('gallery');
  const [groupBy, setGroupBy] = useState<GroupByOption>('deliverable');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const fetchCreatives = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_creatives')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Generate signed URLs for images
      const withUrls = await Promise.all(
        (data || []).map(async (c) => {
          if (isImageType(c.content_type)) {
            const { data: urlData } = await supabase.storage
              .from('project-files')
              .createSignedUrl(c.file_path, 3600);
            return { ...c, signedUrl: urlData?.signedUrl };
          }
          return c;
        })
      );

      setCreatives(withUrls);
    } catch (err) {
      console.error('Error fetching creatives:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchCreatives(); }, [fetchCreatives]);

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = creatives.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !c.file_name.toLowerCase().includes(q) &&
        !(c.title || '').toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  // ── Grouping ───────────────────────────────────────────────────────────────
  const grouped: Record<string, Creative[]> = {};

  if (groupBy === 'none') {
    grouped['Όλα'] = filtered;
  } else {
    filtered.forEach(c => {
      let key = 'Χωρίς σύνδεση';
      if (groupBy === 'deliverable' && c.deliverable_id) {
        key = deliverables.find(d => d.id === c.deliverable_id)?.name || c.deliverable_id;
      } else if (groupBy === 'task' && c.task_id) {
        key = tasks.find(t => t.id === c.task_id)?.title || c.task_id;
      } else if (groupBy === 'media_plan' && c.media_plan_item_id) {
        const m = mediaPlanItems.find(i => i.id === c.media_plan_item_id);
        key = m ? `${m.medium}${m.campaign_name ? ` — ${m.campaign_name}` : ''}` : c.media_plan_item_id;
      } else if (groupBy === 'status') {
        key = STATUS_CONFIG[c.status]?.label || c.status;
      }
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(c);
    });
  }

  // ── Selection ──────────────────────────────────────────────────────────────
  const toggleSelect = (id: string, val: boolean) => {
    setSelectedIds(prev => val ? [...prev, id] : prev.filter(i => i !== id));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(c => c.id));
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('project_creatives')
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
      fetchCreatives();
    } catch {
      toast.error('Σφάλμα ενημέρωσης');
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      await Promise.all(
        selectedIds.map(id =>
          supabase.from('project_creatives').update({ status } as never).eq('id', id)
        )
      );
      toast.success('Η κατάσταση ενημερώθηκε');
      setSelectedIds([]);
      fetchCreatives();
    } catch {
      toast.error('Σφάλμα');
    }
  };

  const handleDownload = async (creative: Creative) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .createSignedUrl(creative.file_path, 60);
      if (error) throw error;
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = creative.file_name;
      a.click();
    } catch {
      toast.error('Σφάλμα λήψης');
    }
  };

  const handleBulkDownload = async () => {
    const selected = creatives.filter(c => selectedIds.includes(c.id));
    await Promise.all(selected.map(handleDownload));
  };

  const handleDelete = async (id: string) => {
    try {
      const creative = creatives.find(c => c.id === id);
      if (creative) {
        await supabase.storage.from('project-files').remove([creative.file_path]);
      }
      const { error } = await supabase.from('project_creatives').delete().eq('id', id);
      if (error) throw error;
      toast.success('Διαγράφηκε');
      fetchCreatives();
    } catch {
      toast.error('Σφάλμα διαγραφής');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map(handleDelete));
      setSelectedIds([]);
    } catch {
      toast.error('Σφάλμα μαζικής διαγραφής');
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openDetail = (c: Creative) => {
    setSelectedCreative(c);
    setDetailOpen(true);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Δημιουργικά</h3>
        <div className="flex items-center gap-2">
          {canManage && (
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Upload
            </Button>
          )}
        </div>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex items-center border rounded-md overflow-hidden">
          <button
            className={cn('p-1.5 transition-colors', view === 'gallery' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            onClick={() => setView('gallery')}
            title="Gallery"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            className={cn('p-1.5 transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            onClick={() => setView('list')}
            title="Λίστα"
          >
            <List className="h-4 w-4" />
          </button>
        </div>

        {/* Group by */}
        <Select value={groupBy} onValueChange={v => setGroupBy(v as GroupByOption)}>
          <SelectTrigger className="h-8 text-xs w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deliverable" className="text-xs">Ανά Παραδοτέο</SelectItem>
            <SelectItem value="task" className="text-xs">Ανά Task</SelectItem>
            <SelectItem value="media_plan" className="text-xs">Ανά Media Plan</SelectItem>
            <SelectItem value="status" className="text-xs">Ανά Status</SelectItem>
            <SelectItem value="none" className="text-xs">Χωρίς ομαδοποίηση</SelectItem>
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">Όλα τα statuses</SelectItem>
            {ALL_STATUSES.map(s => (
              <SelectItem key={s} value={s} className="text-xs">{STATUS_CONFIG[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Αναζήτηση…"
            className="h-8 text-xs pl-7"
          />
        </div>
      </div>

      {/* ── Bulk Actions Bar ─────────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-2.5 bg-muted/50 border border-foreground/20 rounded-lg">
          <span className="text-sm font-medium">{selectedIds.length} επιλεγμένα</span>
          <div className="flex items-center gap-2 ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Αλλαγή Status <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {ALL_STATUSES.map(s => (
                  <DropdownMenuItem key={s} onClick={() => handleBulkStatusChange(s)} className="text-xs">
                    {STATUS_CONFIG[s].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleBulkDownload}>
              <Download className="h-3 w-3 mr-1" /> Download All
            </Button>
            {canManage && (
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-3 w-3 mr-1" /> Διαγραφή
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelectedIds([])}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Image className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Δεν υπάρχουν εικαστικά</p>
          {canManage && (
            <Button size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Ανέβασμα εικαστικών
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([groupKey, items]) => (
            <div key={groupKey}>
              {/* Group header */}
              {groupBy !== 'none' && (
                <button
                  className="flex items-center gap-2 mb-3 text-sm font-medium hover:text-foreground transition-colors w-full"
                  onClick={() => toggleGroup(groupKey)}
                >
                  {collapsedGroups.has(groupKey) ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span>{groupKey}</span>
                  <span className="text-xs text-muted-foreground font-normal">({items.length})</span>
                </button>
              )}

              {!collapsedGroups.has(groupKey) && (
                view === 'gallery' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map(c => (
                      <CreativeCard
                        key={c.id}
                        creative={c}
                        selected={selectedIds.includes(c.id)}
                        onSelect={toggleSelect}
                        onClick={() => openDetail(c)}
                        onDownload={() => handleDownload(c)}
                        onDelete={() => handleDelete(c.id)}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </div>
                ) : (
                  // List view
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b">
                          <th className="p-2 w-8">
                            <Checkbox
                              checked={items.every(c => selectedIds.includes(c.id))}
                              onCheckedChange={v => {
                                if (v) setSelectedIds(prev => [...new Set([...prev, ...items.map(c => c.id)])]);
                                else setSelectedIds(prev => prev.filter(id => !items.some(c => c.id === id)));
                              }}
                            />
                          </th>
                          <th className="p-2 text-left font-medium text-xs text-muted-foreground w-12">Preview</th>
                          <th className="p-2 text-left font-medium text-xs text-muted-foreground">Τίτλος</th>
                          <th className="p-2 text-left font-medium text-xs text-muted-foreground">Τύπος</th>
                          <th className="p-2 text-left font-medium text-xs text-muted-foreground">Status</th>
                          <th className="p-2 text-left font-medium text-xs text-muted-foreground">Version</th>
                          <th className="p-2 text-left font-medium text-xs text-muted-foreground">Ημ/νία</th>
                          <th className="p-2 w-16"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((c, idx) => (
                          <tr
                            key={c.id}
                            className={cn(
                              'border-b last:border-0 hover:bg-muted/30 cursor-pointer',
                              selectedIds.includes(c.id) && 'bg-primary/5'
                            )}
                          >
                            <td className="p-2" onClick={e => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedIds.includes(c.id)}
                                onCheckedChange={v => toggleSelect(c.id, !!v)}
                              />
                            </td>
                            <td className="p-2">
                              <div
                                className="h-9 w-12 rounded bg-muted flex items-center justify-center overflow-hidden"
                                onClick={() => openDetail(c)}
                              >
                                {isImageType(c.content_type) && c.signedUrl ? (
                                  <img src={c.signedUrl} className="h-full w-full object-cover" />
                                ) : (
                                  getFileIcon(c.content_type)
                                )}
                              </div>
                            </td>
                            <td className="p-2" onClick={() => openDetail(c)}>
                              <p className="font-medium truncate max-w-[200px]">{c.title || c.file_name}</p>
                              <p className="text-xs text-muted-foreground">{c.file_name}</p>
                            </td>
                            <td className="p-2 text-xs text-muted-foreground">{c.content_type?.split('/')[1]?.toUpperCase() || '–'}</td>
                            <td className="p-2"><StatusBadge status={c.status} /></td>
                            <td className="p-2 text-xs">{c.version ? `v${c.version}` : 'v1.0'}</td>
                            <td className="p-2 text-xs text-muted-foreground">
                              {format(new Date(c.created_at), 'd MMM yy', { locale: el })}
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDownload(c)}>
                                  <Download className="h-3 w-3" />
                                </Button>
                                {canManage && (
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(c.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <UploadCreativesModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={fetchCreatives}
        projectId={projectId}
        deliverables={deliverables}
        tasks={tasks}
        mediaPlanItems={mediaPlanItems}
      />

      <CreativeDetailPanel
        creative={selectedCreative}
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedCreative(null); }}
        onUpdate={() => { fetchCreatives(); }}
        onDelete={handleDelete}
        deliverables={deliverables}
        tasks={tasks}
        mediaPlanItems={mediaPlanItems}
      />
    </div>
  );
}
