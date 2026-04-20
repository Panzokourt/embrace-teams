import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import {
  Folder,
  FileText,
  Image,
  FileVideo,
  FileAudio,
  File,
  ChevronRight,
  Download,
  Eye,
  Trash2,
  Upload,
  FolderPlus,
  Loader2,
  X,
  Pencil,
  Move,
  FolderInput,
  FolderUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FilePreviewDialog } from './FilePreviewDialog';
import type { FileFolder } from './FolderTree';
import type { FileAttachment } from './FilesTableView';
import { readDroppedItems, hasDirectoryEntry } from '@/utils/dropFolderReader';

interface FinderColumnViewProps {
  files: FileAttachment[];
  folders: FileFolder[];
  allFolders?: FileFolder[];
  onUpload: (files: FileList, folderId: string | null) => Promise<void>;
  onUploadFolder?: (
    files: FileList | Array<{ file: File; relativePath: string }>,
    folderId: string | null
  ) => Promise<void>;
  onDelete: (file: FileAttachment) => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameFolder: (folderId: string, newName: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onMoveFile?: (fileId: string, folderId: string | null) => Promise<void>;
  onMoveFolder?: (folderId: string, targetParentId: string | null) => Promise<void>;
  canManage: boolean;
  loading?: boolean;
  uploading?: boolean;
  searchQuery?: string;
}

function getFileIcon(contentType: string | null) {
  if (!contentType) return File;
  if (contentType.startsWith('image/')) return Image;
  if (contentType.startsWith('video/')) return FileVideo;
  if (contentType.startsWith('audio/')) return FileAudio;
  if (contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text'))
    return FileText;
  return File;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ColumnItem =
  | { kind: 'folder'; data: FileFolder }
  | { kind: 'file'; data: FileAttachment };

export function FinderColumnView({
  files,
  folders,
  allFolders,
  onUpload,
  onUploadFolder,
  onDelete,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFile,
  onMoveFolder,
  canManage,
  loading,
  uploading,
  searchQuery,
}: FinderColumnViewProps) {
  const [path, setPath] = useState<(string | null)[]>([null]);
  const [selectedItem, setSelectedItem] = useState<ColumnItem | null>(null);
  const [creatingInColumn, setCreatingInColumn] = useState<number | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragOverColumn, setDragOverColumn] = useState<number | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // The real folders list for "Move to" menus
  const moveFolders = allFolders || folders;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [path]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && selectedItem?.kind === 'file' && !previewOpen) {
        e.preventDefault();
        setPreviewOpen(true);
      }
    };
    const el = containerRef.current;
    if (el) {
      el.addEventListener('keydown', handler);
      return () => el.removeEventListener('keydown', handler);
    }
  }, [selectedItem, previewOpen]);

  const filteredFiles = useMemo(() => {
    if (!searchQuery?.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(
      (f) =>
        f.file_name.toLowerCase().includes(q) ||
        f.content_type?.toLowerCase().includes(q)
    );
  }, [files, searchQuery]);

  const nonEmptyFolderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const f of files) {
      if (f.folder_id) ids.add(f.folder_id);
    }
    for (const f of folders) {
      if (f.parent_folder_id) ids.add(f.parent_folder_id);
    }
    return ids;
  }, [files, folders]);

  function getColumnItems(parentId: string | null): ColumnItem[] {
    const childFolders = folders
      .filter((f) => f.parent_folder_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'el', { numeric: true, sensitivity: 'base' }))
      .map((f) => ({ kind: 'folder' as const, data: f }));

    const childFiles = filteredFiles
      .filter((f) => f.folder_id === parentId)
      .sort((a, b) => a.file_name.localeCompare(b.file_name, 'el', { numeric: true, sensitivity: 'base' }))
      .map((f) => ({ kind: 'file' as const, data: f }));

    return [...childFolders, ...childFiles];
  }

  function handleSelectItem(item: ColumnItem, columnIndex: number) {
    setSelectedItem(item);
    if (item.kind === 'folder') {
      const newPath = path.slice(0, columnIndex + 1);
      newPath.push(item.data.id);
      setPath(newPath);
    } else {
      setPath(path.slice(0, columnIndex + 1));
    }
  }

  function handleUploadToColumn(parentId: string | null) {
    (fileInputRef.current as any).__targetFolder = parentId;
    fileInputRef.current?.click();
  }

  function handleUploadFolderToColumn(parentId: string | null) {
    if (folderInputRef.current) {
      (folderInputRef.current as any).__targetFolder = parentId;
      folderInputRef.current.click();
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const target = e.target as any;
    const folderId = target.__targetFolder ?? null;
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files, folderId);
    }
    e.target.value = '';
  }

  function handleFolderInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const target = e.target as any;
    const folderId = target.__targetFolder ?? null;
    if (e.target.files && e.target.files.length > 0 && onUploadFolder) {
      onUploadFolder(e.target.files, folderId);
    }
    e.target.value = '';
  }

  // --- Internal DnD handlers ---
  const handleDragStart = useCallback((e: React.DragEvent, item: ColumnItem) => {
    if (item.kind === 'file') {
      e.dataTransfer.setData('application/x-file-id', (item.data as FileAttachment).id);
    } else {
      e.dataTransfer.setData('application/x-folder-id', item.data.id);
    }
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colIndex: number, targetFolderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(colIndex);
    setDragOverFolderId(targetFolderId ?? null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDragOverFolderId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, colIndex: number, targetFolderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumn(null);
    setDragOverFolderId(null);

    const fileId = e.dataTransfer.getData('application/x-file-id');
    const folderId = e.dataTransfer.getData('application/x-folder-id');
    const dropTarget = targetFolderId ?? path[colIndex] ?? null;

    if (fileId && onMoveFile) {
      onMoveFile(fileId, dropTarget);
      return;
    }
    if (folderId && onMoveFolder && dropTarget !== folderId) {
      onMoveFolder(folderId, dropTarget);
      return;
    }

    // OS file drop — check for folder upload via webkitRelativePath
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      const hasRelativePaths = Array.from(droppedFiles).some(
        (f: any) => f.webkitRelativePath && f.webkitRelativePath.includes('/')
      );
      if (hasRelativePaths && onUploadFolder) {
        onUploadFolder(droppedFiles, dropTarget);
      } else {
        onUpload(droppedFiles, dropTarget);
      }
    }
  }, [path, onUpload, onUploadFolder, onMoveFile, onMoveFolder]);

  async function handleCreateFolder(columnIndex: number) {
    if (!newFolderName.trim()) return;
    const parentId = path[columnIndex] ?? null;
    await onCreateFolder(newFolderName.trim(), parentId);
    setNewFolderName('');
    setCreatingInColumn(null);
  }

  async function handleDownload(file: FileAttachment) {
    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.file_path, 300);
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch {
      toast.error('Σφάλμα κατά τη λήψη');
    }
  }

  function startRenameFolder(folder: FileFolder) {
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  }

  async function submitRenameFolder() {
    if (renamingFolderId && renameValue.trim()) {
      await onRenameFolder(renamingFolderId, renameValue.trim());
    }
    setRenamingFolderId(null);
    setRenameValue('');
  }

  // Build "Move to" folder list for context menus (only real folders, exclude virtual)
  const moveTargetFolders = useMemo(() => {
    return moveFolders.filter((f) => !f.id.startsWith('vc-') && !f.id.startsWith('vp-') && !f.id.startsWith('vd-'));
  }, [moveFolders]);

  const breadcrumb = useMemo(() => {
    const items: { id: string | null; name: string }[] = [
      { id: null, name: 'Αρχεία' },
    ];
    for (let i = 1; i < path.length; i++) {
      const folder = folders.find((f) => f.id === path[i]);
      if (folder) items.push({ id: folder.id, name: folder.name });
    }
    return items;
  }, [path, folders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isFileSelected = selectedItem?.kind === 'file';
  const selectedFile = isFileSelected ? (selectedItem.data as FileAttachment) : null;
  const FileIcon = selectedFile ? getFileIcon(selectedFile.content_type) : File;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="flex flex-col h-[calc(100vh-12rem)] border border-border rounded-xl bg-card overflow-hidden outline-none"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1 text-sm min-w-0 flex-1">
          {breadcrumb.map((item, i) => (
            <span key={item.id ?? 'root'} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              <button
                onClick={() => {
                  const idx = path.indexOf(item.id);
                  if (idx >= 0) {
                    setPath(path.slice(0, idx + 1));
                    setSelectedItem(null);
                  }
                }}
                className={cn(
                  'truncate max-w-[120px] hover:text-foreground transition-colors',
                  i === breadcrumb.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {item.name}
              </button>
            </span>
          ))}
        </div>

        {canManage && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleUploadToColumn(path[path.length - 1] ?? null)}
              disabled={uploading}
              title="Ανέβασμα αρχείου"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleUploadFolderToColumn(path[path.length - 1] ?? null)}
              disabled={uploading}
              title="Ανέβασμα φακέλου"
            >
              <FolderUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCreatingInColumn(path.length - 1);
                setNewFolderName('');
              }}
              title="Νέος φάκελος"
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Columns + Preview */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div ref={scrollRef} className="flex flex-1 min-w-0 overflow-x-auto">
          {path.map((folderId, colIndex) => {
            const items = getColumnItems(folderId);
            const isLastColumn = colIndex === path.length - 1;
            const isDragOver = dragOverColumn === colIndex && !dragOverFolderId;

            return (
              <ContextMenu key={`col-${colIndex}-${folderId}`}>
                <ContextMenuTrigger asChild>
                  <div
                    className={cn(
                      'flex flex-col min-w-[220px] w-[220px] border-r border-border shrink-0 transition-colors',
                      isLastColumn && 'flex-1 min-w-[220px] w-auto',
                      isDragOver && 'bg-primary/5 border-primary/30'
                    )}
                    onDragOver={(e) => handleDragOver(e, colIndex)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, colIndex)}
                  >
                    <ScrollArea className="flex-1">
                      <div className="py-1">
                        {/* New folder input */}
                        {creatingInColumn === colIndex && (
                          <div className="px-2 py-1">
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleCreateFolder(colIndex);
                              }}
                              className="flex gap-1"
                            >
                              <Input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="Όνομα φακέλου..."
                                className="h-7 text-xs"
                                autoFocus
                              />
                              <Button type="submit" size="sm" className="h-7 px-2 text-xs">
                                OK
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setCreatingInColumn(null)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </form>
                          </div>
                        )}

                        {items.length === 0 && !isDragOver && (
                          <div className="px-3 py-8 text-center text-xs text-muted-foreground">
                            Κενός φάκελος
                          </div>
                        )}

                        {items.length === 0 && isDragOver && (
                          <div className="px-3 py-8 text-center">
                            <Upload className="h-6 w-6 mx-auto mb-2 text-primary/60" />
                            <p className="text-xs text-primary/80 font-medium">
                              Αφήστε αρχεία εδώ
                            </p>
                          </div>
                        )}

                        {isDragOver && items.length > 0 && (
                          <div className="px-3 py-2 text-center border-b border-dashed border-primary/30">
                            <p className="text-xs text-primary/80 font-medium flex items-center justify-center gap-1">
                              <Upload className="h-3 w-3" />
                              Αφήστε αρχεία εδώ
                            </p>
                          </div>
                        )}

                        {items.map((item) => {
                          const isSelected =
                            selectedItem &&
                            ((item.kind === 'folder' &&
                              selectedItem.kind === 'folder' &&
                              item.data.id === selectedItem.data.id) ||
                              (item.kind === 'file' &&
                                selectedItem.kind === 'file' &&
                                item.data.id === (selectedItem.data as FileAttachment).id));

                          const isDrilledInto =
                            item.kind === 'folder' && path.includes(item.data.id);

                          const isFolderDragTarget =
                            item.kind === 'folder' && dragOverFolderId === item.data.id;

                          if (item.kind === 'folder') {
                            const folder = item.data;

                            if (renamingFolderId === folder.id) {
                              return (
                                <div key={folder.id} className="px-2 py-1">
                                  <form
                                    onSubmit={(e) => { e.preventDefault(); submitRenameFolder(); }}
                                    className="flex gap-1"
                                  >
                                    <Input
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      className="h-7 text-xs"
                                      autoFocus
                                      onBlur={() => submitRenameFolder()}
                                    />
                                  </form>
                                </div>
                              );
                            }

                            const isVirtualFolder = folder.id.startsWith('vc-') || folder.id.startsWith('vp-') || folder.id.startsWith('vd-');

                            return (
                              <ContextMenu key={folder.id}>
                                <ContextMenuTrigger asChild>
                                  <button
                                    draggable={canManage && !isVirtualFolder}
                                    onDragStart={(e) => handleDragStart(e, item)}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverFolderId(folder.id);
                                      setDragOverColumn(colIndex);
                                    }}
                                    onDragLeave={(e) => {
                                      e.stopPropagation();
                                      setDragOverFolderId(null);
                                    }}
                                    onDrop={(e) => handleDrop(e, colIndex, folder.id)}
                                    onClick={() => handleSelectItem(item, colIndex)}
                                    className={cn(
                                      'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted/60 transition-colors',
                                      (isSelected || isDrilledInto) && 'bg-primary/10 text-primary',
                                      isFolderDragTarget && 'bg-primary/20 ring-1 ring-primary/40'
                                    )}
                                  >
                                    <Folder className="h-4 w-4 shrink-0 text-primary/70" />
                                    <span className="truncate flex-1">{folder.name}</span>
                                    {nonEmptyFolderIds.has(folder.id) && (
                                      <span className="h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                                    )}
                                    <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                                  </button>
                                </ContextMenuTrigger>
                                {canManage && !isVirtualFolder && (
                                  <ContextMenuContent className="w-52">
                                    <ContextMenuItem onClick={() => handleUploadToColumn(folder.id)}>
                                      <Upload className="h-3.5 w-3.5 mr-2" /> Ανέβασμα αρχείου
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleUploadFolderToColumn(folder.id)}>
                                      <FolderUp className="h-3.5 w-3.5 mr-2" /> Ανέβασμα φακέλου
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => {
                                      setCreatingInColumn(path.indexOf(folder.id) >= 0 ? path.indexOf(folder.id) : colIndex);
                                      setNewFolderName('');
                                    }}>
                                      <FolderPlus className="h-3.5 w-3.5 mr-2" /> Νέος υποφάκελος
                                    </ContextMenuItem>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => startRenameFolder(folder)}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" /> Μετονομασία
                                    </ContextMenuItem>
                                    {onMoveFolder && moveTargetFolders.length > 0 && (
                                      <ContextMenuSub>
                                        <ContextMenuSubTrigger>
                                          <Move className="h-3.5 w-3.5 mr-2" /> Μετακίνηση σε...
                                        </ContextMenuSubTrigger>
                                        <ContextMenuSubContent className="w-48 max-h-64 overflow-y-auto">
                                          <ContextMenuItem onClick={() => onMoveFolder(folder.id, null)}>
                                            <FolderInput className="h-3.5 w-3.5 mr-2" /> Ρίζα (/)
                                          </ContextMenuItem>
                                          <ContextMenuSeparator />
                                          {moveTargetFolders
                                            .filter((f) => f.id !== folder.id)
                                            .map((target) => (
                                              <ContextMenuItem
                                                key={target.id}
                                                onClick={() => onMoveFolder(folder.id, target.id)}
                                              >
                                                <Folder className="h-3.5 w-3.5 mr-2 text-primary/70" />
                                                <span className="truncate">{target.name}</span>
                                              </ContextMenuItem>
                                            ))}
                                        </ContextMenuSubContent>
                                      </ContextMenuSub>
                                    )}
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => onDeleteFolder(folder.id)} className="text-destructive">
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Διαγραφή
                                    </ContextMenuItem>
                                  </ContextMenuContent>
                                )}
                              </ContextMenu>
                            );
                          }

                          const fileData = item.data as FileAttachment;
                          const Icon = getFileIcon(fileData.content_type);

                          return (
                            <ContextMenu key={fileData.id}>
                              <ContextMenuTrigger asChild>
                                <button
                                  draggable={canManage}
                                  onDragStart={(e) => handleDragStart(e, item)}
                                  onClick={() => handleSelectItem(item, colIndex)}
                                  className={cn(
                                    'w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left hover:bg-muted/60 transition-colors',
                                    isSelected && 'bg-primary/10 text-primary'
                                  )}
                                >
                                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                  <span className="truncate flex-1">{fileData.file_name}</span>
                                </button>
                              </ContextMenuTrigger>
                              <ContextMenuContent className="w-52">
                                <ContextMenuItem onClick={() => {
                                  setSelectedItem(item);
                                  setPreviewOpen(true);
                                }}>
                                  <Eye className="h-3.5 w-3.5 mr-2" /> Προεπισκόπηση
                                </ContextMenuItem>
                                <ContextMenuItem onClick={() => handleDownload(fileData)}>
                                  <Download className="h-3.5 w-3.5 mr-2" /> Λήψη
                                </ContextMenuItem>
                                {canManage && onMoveFile && moveTargetFolders.length > 0 && (
                                  <>
                                    <ContextMenuSeparator />
                                    <ContextMenuSub>
                                      <ContextMenuSubTrigger>
                                        <Move className="h-3.5 w-3.5 mr-2" /> Μετακίνηση σε...
                                      </ContextMenuSubTrigger>
                                      <ContextMenuSubContent className="w-48 max-h-64 overflow-y-auto">
                                        <ContextMenuItem onClick={() => onMoveFile(fileData.id, null)}>
                                          <FolderInput className="h-3.5 w-3.5 mr-2" /> Χωρίς φάκελο
                                        </ContextMenuItem>
                                        <ContextMenuSeparator />
                                        {moveTargetFolders.map((target) => (
                                          <ContextMenuItem
                                            key={target.id}
                                            onClick={() => onMoveFile(fileData.id, target.id)}
                                          >
                                            <Folder className="h-3.5 w-3.5 mr-2 text-primary/70" />
                                            <span className="truncate">{target.name}</span>
                                          </ContextMenuItem>
                                        ))}
                                      </ContextMenuSubContent>
                                    </ContextMenuSub>
                                  </>
                                )}
                                {canManage && (
                                  <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => onDelete(fileData)} className="text-destructive">
                                      <Trash2 className="h-3.5 w-3.5 mr-2" /> Διαγραφή
                                    </ContextMenuItem>
                                  </>
                                )}
                              </ContextMenuContent>
                            </ContextMenu>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </div>
                </ContextMenuTrigger>
                {/* Empty area context menu */}
                {canManage && (
                  <ContextMenuContent className="w-52">
                    <ContextMenuItem onClick={() => handleUploadToColumn(folderId)}>
                      <Upload className="h-3.5 w-3.5 mr-2" /> Ανέβασμα αρχείου
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleUploadFolderToColumn(folderId)}>
                      <FolderUp className="h-3.5 w-3.5 mr-2" /> Ανέβασμα φακέλου
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => {
                      setCreatingInColumn(colIndex);
                      setNewFolderName('');
                    }}>
                      <FolderPlus className="h-3.5 w-3.5 mr-2" /> Νέος φάκελος
                    </ContextMenuItem>
                  </ContextMenuContent>
                )}
              </ContextMenu>
            );
          })}
        </div>

        {/* Preview panel */}
        {selectedFile && (
          <div className="w-[360px] shrink-0 border-l border-border bg-muted/20 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
                  <FileIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-center leading-tight w-full break-all px-1">
                  {selectedFile.file_name}
                </h3>
                <Separator />
                <div className="w-full space-y-3 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Τύπος</span>
                    <span className="text-foreground font-medium break-all">
                      {selectedFile.content_type || '—'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Μέγεθος</span>
                    <span className="text-foreground font-medium">
                      {formatFileSize(selectedFile.file_size)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Ημερομηνία</span>
                    <span className="text-foreground font-medium">
                      {format(new Date(selectedFile.created_at), 'dd MMM yyyy, HH:mm', { locale: el })}
                    </span>
                  </div>
                  {selectedFile.uploader && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-muted-foreground">Από</span>
                      <span className="text-foreground font-medium break-all">
                        {selectedFile.uploader.full_name || selectedFile.uploader.email}
                      </span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="w-full space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => handleDownload(selectedFile)}
                  >
                    <Download className="h-4 w-4" /> Λήψη
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start gap-2"
                    onClick={() => setPreviewOpen(true)}
                  >
                    <Eye className="h-4 w-4" /> Προεπισκόπηση
                  </Button>
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                      onClick={() => onDelete(selectedFile)}
                    >
                      <Trash2 className="h-4 w-4" /> Διαγραφή
                    </Button>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFolderInputChange}
        {...({ webkitdirectory: '', directory: '' } as any)}
      />

      {/* Preview Dialog */}
      <FilePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        filePath={selectedFile?.file_path ?? null}
        fileName={selectedFile?.file_name ?? ''}
        contentType={selectedFile?.content_type ?? null}
      />
    </div>
  );
}
