import { useEffect, useState, useCallback, useRef } from 'react';
import { FolderOpen, Upload, FileText, Image as ImageIcon, FileSpreadsheet, File as FileIcon, Trash2, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { FilePreviewDialog } from '@/components/files/FilePreviewDialog';

interface TaskFile {
  id: string;
  file_name: string;
  file_path: string;
  content_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface Props {
  taskId: string;
  projectId: string;
}

function fileIcon(name: string, ct: string | null) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ct?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return <ImageIcon className="h-5 w-5 text-blue-300" />;
  }
  if (ct?.includes('pdf') || ext === 'pdf') return <FileText className="h-5 w-5 text-red-300" />;
  if (ct?.includes('sheet') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="h-5 w-5 text-emerald-300" />;
  }
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return <FileText className="h-5 w-5 text-cyan-300" />;
  return <FileIcon className="h-5 w-5 text-white/60" />;
}

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(name: string, ct: string | null) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ct?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
}

export default function FocusFilesSection({ taskId, projectId }: Props) {
  const { user } = useAuth();
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<TaskFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const fetchFiles = useCallback(async () => {
    const { data } = await supabase
      .from('file_attachments')
      .select('id, file_name, file_path, content_type, file_size, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });
    setFiles((data || []) as TaskFile[]);
  }, [taskId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Resolve signed URLs for image thumbnails
  useEffect(() => {
    const imageFiles = files.filter(f => isImage(f.file_name, f.content_type) && !imageUrls[f.id]);
    if (imageFiles.length === 0) return;

    (async () => {
      const next: Record<string, string> = {};
      for (const f of imageFiles) {
        try {
          const { data } = await supabase.storage.from('files').createSignedUrl(f.file_path, 3600);
          if (data?.signedUrl) next[f.id] = data.signedUrl;
        } catch { /* ignore */ }
      }
      if (Object.keys(next).length) setImageUrls(prev => ({ ...prev, ...next }));
    })();
  }, [files, imageUrls]);

  const upload = async (fileList: FileList | File[]) => {
    if (!user) return;
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    setUploading(true);
    let ok = 0, fail = 0;
    for (const file of arr) {
      try {
        const path = `${user.id}/tasks/${taskId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from('files').upload(path, file, {
          cacheControl: '3600', upsert: false,
        });
        if (upErr) throw upErr;
        const { error: insErr } = await supabase.from('file_attachments').insert({
          file_name: file.name,
          file_path: path,
          file_size: file.size,
          content_type: file.type,
          task_id: taskId,
          project_id: projectId,
          uploaded_by: user.id,
        });
        if (insErr) throw insErr;
        ok += 1;
      } catch (e: any) {
        console.error('Upload failed', e);
        fail += 1;
      }
    }
    setUploading(false);
    if (ok) toast.success(`Ανέβηκαν ${ok} αρχεία`);
    if (fail) toast.error(`Αποτυχία σε ${fail} αρχεία`);
    fetchFiles();
  };

  const remove = async (f: TaskFile) => {
    if (!confirm(`Διαγραφή του "${f.file_name}";`)) return;
    await supabase.storage.from('files').remove([f.file_path]).catch(() => {});
    const { error } = await supabase.from('file_attachments').delete().eq('id', f.id);
    if (error) toast.error('Αποτυχία διαγραφής');
    else fetchFiles();
  };

  const download = async (f: TaskFile) => {
    const { data } = await supabase.storage.from('files').createSignedUrl(f.file_path, 60, {
      download: f.file_name,
    });
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    dragCounter.current = 0;
    if (e.dataTransfer.files?.length) upload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-white/40">
          <FolderOpen className="h-4 w-4" />
          <h3 className="text-xs font-semibold uppercase tracking-widest">
            Αρχεία {files.length > 0 && <span className="text-white/30 normal-case font-normal">· {files.length}</span>}
          </h3>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1"
        >
          <Upload className="h-3 w-3" /> Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      <div
        onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setDragOver(true); }}
        onDragLeave={() => { dragCounter.current--; if (dragCounter.current <= 0) setDragOver(false); }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`relative bg-white/5 border ${dragOver ? 'border-[#3b82f6] border-dashed bg-[#3b82f6]/5' : 'border-white/10'} rounded-xl p-3 transition-colors`}
      >
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center text-[#3b82f6] font-medium pointer-events-none">
            Άφησε τα αρχεία εδώ…
          </div>
        )}

        {files.length === 0 && !uploading && (
          <div className="text-center py-6">
            <Upload className="h-6 w-6 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">Κάνε drop αρχεία εδώ ή κλικ "Upload"</p>
          </div>
        )}

        {files.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {files.map((f) => {
              const img = isImage(f.file_name, f.content_type) ? imageUrls[f.id] : null;
              return (
                <div
                  key={f.id}
                  className="group relative bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-lg overflow-hidden transition-colors cursor-pointer"
                  onClick={() => setPreview(f)}
                >
                  <div className="aspect-video bg-black/30 flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img src={img} alt={f.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="scale-150">{fileIcon(f.file_name, f.content_type)}</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-white/85 truncate font-medium">{f.file_name}</p>
                    <p className="text-[10px] text-white/40">{formatSize(f.file_size)}</p>
                  </div>
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); download(f); }}
                      className="w-6 h-6 rounded-md bg-black/60 backdrop-blur hover:bg-black/80 text-white flex items-center justify-center"
                      title="Download"
                    >
                      <Download className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); remove(f); }}
                      className="w-6 h-6 rounded-md bg-black/60 backdrop-blur hover:bg-red-500/80 text-white flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {uploading && (
          <div className="mt-2 flex items-center gap-2 text-white/60 text-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Ανέβασμα…
          </div>
        )}
      </div>

      {preview && (
        <FilePreviewDialog
          open={!!preview}
          onOpenChange={(o) => !o && setPreview(null)}
          filePath={preview.file_path}
          fileName={preview.file_name}
          contentType={preview.content_type}
        />
      )}
    </div>
  );
}
