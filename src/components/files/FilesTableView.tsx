import { useState, useMemo, useRef } from 'react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { 
  File, 
  FileText, 
  Image, 
  FileVideo, 
  FileAudio,
  Download,
  Eye,
  Trash2,
  Upload,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Folder,
  Search,
  X,
  GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TableToolbar } from '@/components/shared/TableToolbar';
import { ResizableTableHeader } from '@/components/shared/ResizableTableHeader';
import { EnhancedInlineEditCell } from '@/components/shared/EnhancedInlineEditCell';
import { GroupedTableSection } from '@/components/shared/GroupedTableSection';
import { useTableViews, type GroupByField } from '@/hooks/useTableViews';
import { type ColumnConfig } from '@/components/shared/ColumnVisibilityToggle';
import { exportToCSV, exportToExcel, formatters } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';
import type { FileFolder } from './FolderTree';
import { usePagination } from '@/hooks/usePagination';
import { PaginationControls } from '@/components/shared/PaginationControls';

const PAGE_SIZE = 25;

export interface FileAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  uploaded_by: string;
  created_at: string;
  folder_id: string | null;
  project_id: string | null;
  tender_id: string | null;
  task_id: string | null;
  deliverable_id: string | null;
  uploader?: {
    full_name: string | null;
    email: string;
  };
}

interface RelatedEntity {
  id: string;
  name: string;
  type: 'deliverable' | 'task';
}

interface FilesTableViewProps {
  files: FileAttachment[];
  folders: FileFolder[];
  selectedFolderId: string | null;
  deliverables: RelatedEntity[];
  tasks: RelatedEntity[];
  onUpload: (files: FileList, folderId: string | null) => Promise<void>;
  onDelete: (file: FileAttachment) => Promise<void>;
  onUpdateFile: (fileId: string, field: string, value: string | null) => Promise<void>;
  onMoveFile?: (fileId: string, folderId: string | null) => Promise<void>;
  canManage: boolean;
  loading?: boolean;
  uploading?: boolean;
}

type SortField = 'file_name' | 'file_size' | 'created_at' | 'content_type' | 'folder';
type SortDirection = 'asc' | 'desc' | null;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'select', label: '', visible: true, locked: true },
  { id: 'file_name', label: 'Όνομα', visible: true },
  { id: 'folder', label: 'Φάκελος', visible: true },
  { id: 'file_size', label: 'Μέγεθος', visible: true },
  { id: 'content_type', label: 'Τύπος', visible: true },
  { id: 'related_to', label: 'Σχετίζεται με', visible: true },
  { id: 'uploaded_by', label: 'Ανέβηκε από', visible: true },
  { id: 'created_at', label: 'Ημερομηνία', visible: true },
  { id: 'actions', label: 'Ενέργειες', visible: true, locked: true },
];

const GROUP_OPTIONS = [
  { value: 'none' as GroupByField, label: 'Χωρίς ομαδοποίηση' },
  { value: 'status' as GroupByField, label: 'Ανά φάκελο' },
];

export function FilesTableView({
  files,
  folders,
  selectedFolderId,
  deliverables,
  tasks,
  onUpload,
  onDelete,
  onUpdateFile,
  onMoveFile,
  canManage,
  loading = false,
  uploading = false
}: FilesTableViewProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);

  const {
    columns,
    setColumns,
    columnWidths,
    setColumnWidth,
    groupBy,
    setGroupBy,
    savedViews,
    saveView,
    loadView,
    deleteView,
    resetToDefault,
  } = useTableViews({
    storageKey: 'files_table',
    defaultColumns: DEFAULT_COLUMNS,
  });

  const pagination = usePagination(PAGE_SIZE);

  // Filter files by selected folder and search query
  const filteredFiles = useMemo(() => {
    let result = files;
    
    // Filter by folder
    if (selectedFolderId !== null) {
      result = result.filter(f => f.folder_id === selectedFolderId);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.file_name.toLowerCase().includes(query) ||
        (f.content_type && f.content_type.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [files, selectedFolderId, searchQuery]);

  // Sort files
  const sortedFiles = useMemo(() => {
    if (!sortField || !sortDirection) return filteredFiles;

    return [...filteredFiles].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'file_name':
          comparison = a.file_name.localeCompare(b.file_name);
          break;
        case 'file_size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'content_type':
          comparison = (a.content_type || '').localeCompare(b.content_type || '');
          break;
        case 'folder':
          const folderA = folders.find(f => f.id === a.folder_id)?.name || '';
          const folderB = folders.find(f => f.id === b.folder_id)?.name || '';
          comparison = folderA.localeCompare(folderB);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredFiles, sortField, sortDirection, folders]);

  // Group files by folder
  const groupedFiles = useMemo(() => {
    if (groupBy !== 'status') return new Map();

    const groups = new Map<string, { label: React.ReactNode; files: FileAttachment[] }>();
    
    sortedFiles.forEach(file => {
      const folder = folders.find(f => f.id === file.folder_id);
      const key = folder?.id || 'no-folder';
      const label = folder ? (
        <span className="flex items-center gap-2">
          <Folder className="h-4 w-4" style={{ color: folder.color || undefined }} />
          {folder.name}
        </span>
      ) : (
        <span className="text-muted-foreground">Χωρίς φάκελο</span>
      );

      if (!groups.has(key)) {
        groups.set(key, { label, files: [] });
      }
      groups.get(key)!.files.push(file);
    });

    return groups;
  }, [sortedFiles, groupBy, folders]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
      if (sortDirection === 'desc') setSortField(null);
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    if (sortDirection === 'asc') return <ArrowUp className="h-4 w-4 text-foreground" />;
    return <ArrowDown className="h-4 w-4 text-foreground" />;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(sortedFiles.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleDownload = async (file: FileAttachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Σφάλμα κατά τη λήψη');
    }
  };

  const handlePreview = async (file: FileAttachment) => {
    try {
      const { data } = await supabase.storage
        .from('project-files')
        .createSignedUrl(file.file_path, 60);

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Σφάλμα κατά την προεπισκόπηση');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await onUpload(e.target.files, selectedFolderId);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleExportCSV = () => {
    const exportColumns = [
      { key: 'file_name', label: 'Όνομα' },
      { key: 'folder', label: 'Φάκελος', format: (v: any, row: any) => folders.find(f => f.id === row.folder_id)?.name || '-' },
      { key: 'file_size', label: 'Μέγεθος', format: (v: any) => formatFileSize(v) },
      { key: 'content_type', label: 'Τύπος' },
      { key: 'uploader_name', label: 'Ανέβηκε από', format: (v: any, row: any) => row.uploader?.full_name || row.uploader?.email || '-' },
      { key: 'created_at', label: 'Ημερομηνία', format: formatters.date },
    ];
    exportToCSV(sortedFiles, exportColumns, 'files');
    toast.success('Εξαγωγή CSV ολοκληρώθηκε!');
  };

  const handleExportExcel = () => {
    const exportColumns = [
      { key: 'file_name', label: 'Όνομα' },
      { key: 'folder', label: 'Φάκελος', format: (v: any, row: any) => folders.find(f => f.id === row.folder_id)?.name || '-' },
      { key: 'file_size', label: 'Μέγεθος', format: (v: any) => formatFileSize(v) },
      { key: 'content_type', label: 'Τύπος' },
      { key: 'uploader_name', label: 'Ανέβηκε από', format: (v: any, row: any) => row.uploader?.full_name || row.uploader?.email || '-' },
      { key: 'created_at', label: 'Ημερομηνία', format: formatters.date },
    ];
    exportToExcel(sortedFiles, exportColumns, 'files');
    toast.success('Εξαγωγή Excel ολοκληρώθηκε!');
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;
    
    for (const fileId of selectedFiles) {
      const file = files.find(f => f.id === fileId);
      if (file) {
        await onDelete(file);
      }
    }
    setSelectedFiles(new Set());
    toast.success(`Διαγράφηκαν ${selectedFiles.size} αρχεία`);
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedFileId(fileId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', fileId);
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
  };

  const getFileIcon = (contentType: string | null) => {
    if (!contentType) return <File className="h-5 w-5 text-muted-foreground" />;
    if (contentType.startsWith('image/')) return <Image className="h-5 w-5 text-primary" />;
    if (contentType.startsWith('video/')) return <FileVideo className="h-5 w-5 text-secondary-foreground" />;
    if (contentType.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-accent" />;
    if (contentType.includes('pdf')) return <FileText className="h-5 w-5 text-destructive" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileTypeBadge = (contentType: string | null) => {
    if (!contentType) return null;
    const type = contentType.split('/')[1]?.toUpperCase() || contentType;
    return <Badge variant="outline" className="text-xs">{type}</Badge>;
  };

  // Build folder options for dropdown (use 'none' instead of empty string for Radix Select)
  const folderOptions = [
    { value: 'none', label: 'Χωρίς φάκελο' },
    ...folders.map(f => ({ value: f.id, label: f.name }))
  ];

  // Build related entity options (use 'none' instead of empty string for Radix Select)
  const relatedOptions = [
    { value: 'none', label: '-' },
    ...deliverables.map(d => ({ value: `deliverable:${d.id}`, label: `📦 ${d.name}` })),
    ...tasks.map(t => ({ value: `task:${t.id}`, label: `✓ ${t.name}` }))
  ];

  const getRelatedValue = (file: FileAttachment) => {
    if (file.deliverable_id) return `deliverable:${file.deliverable_id}`;
    if (file.task_id) return `task:${file.task_id}`;
    return 'none';
  };

  const handleRelatedChange = async (fileId: string, value: string) => {
    if (!value || value === 'none') {
      await onUpdateFile(fileId, 'deliverable_id', null);
      await onUpdateFile(fileId, 'task_id', null);
    } else if (value.startsWith('deliverable:')) {
      await onUpdateFile(fileId, 'task_id', null);
      await onUpdateFile(fileId, 'deliverable_id', value.replace('deliverable:', ''));
    } else if (value.startsWith('task:')) {
      await onUpdateFile(fileId, 'deliverable_id', null);
      await onUpdateFile(fileId, 'task_id', value.replace('task:', ''));
    }
  };

  const isColumnVisible = (columnId: string) => 
    columns.find(c => c.id === columnId)?.visible ?? true;

  const renderFileRow = (file: FileAttachment) => (
    <TableRow 
      key={file.id} 
      className={cn(
        "group",
        draggedFileId === file.id && "opacity-50 bg-muted"
      )}
      draggable={canManage && !!onMoveFile}
      onDragStart={(e) => handleDragStart(e, file.id)}
      onDragEnd={handleDragEnd}
    >
      {isColumnVisible('select') && (
        <TableCell className="w-10">
          <div className="flex items-center gap-1">
            {canManage && onMoveFile && (
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
            <Checkbox
              checked={selectedFiles.has(file.id)}
              onCheckedChange={(checked) => handleSelectFile(file.id, !!checked)}
            />
          </div>
        </TableCell>
      )}
      
      {isColumnVisible('file_name') && (
        <TableCell style={{ width: columnWidths['file_name'] || 200 }}>
          <div className="flex items-center gap-2">
            {getFileIcon(file.content_type)}
            <span className="font-medium truncate">{file.file_name}</span>
          </div>
        </TableCell>
      )}

      {isColumnVisible('folder') && (
        <TableCell style={{ width: columnWidths['folder'] || 150 }}>
          <EnhancedInlineEditCell
            value={file.folder_id || 'none'}
            type="select"
            options={folderOptions}
            onSave={async (val) => await onUpdateFile(file.id, 'folder_id', val === 'none' ? null : val as string)}
            disabled={!canManage}
            placeholder="Επιλέξτε..."
          />
        </TableCell>
      )}

      {isColumnVisible('file_size') && (
        <TableCell style={{ width: columnWidths['file_size'] || 100 }}>
          {formatFileSize(file.file_size)}
        </TableCell>
      )}

      {isColumnVisible('content_type') && (
        <TableCell style={{ width: columnWidths['content_type'] || 100 }}>
          {getFileTypeBadge(file.content_type)}
        </TableCell>
      )}

      {isColumnVisible('related_to') && (
        <TableCell style={{ width: columnWidths['related_to'] || 180 }}>
          <EnhancedInlineEditCell
            value={getRelatedValue(file)}
            type="select"
            options={relatedOptions}
            onSave={async (val) => await handleRelatedChange(file.id, val as string)}
            disabled={!canManage}
            placeholder="-"
          />
        </TableCell>
      )}

      {isColumnVisible('uploaded_by') && (
        <TableCell style={{ width: columnWidths['uploaded_by'] || 150 }}>
          <span className="text-sm text-muted-foreground">
            {file.uploader?.full_name || file.uploader?.email || '-'}
          </span>
        </TableCell>
      )}

      {isColumnVisible('created_at') && (
        <TableCell style={{ width: columnWidths['created_at'] || 120 }}>
          <span className="text-sm text-muted-foreground">
            {format(new Date(file.created_at), 'd MMM yyyy', { locale: el })}
          </span>
        </TableCell>
      )}

      {isColumnVisible('actions') && (
        <TableCell className="w-32">
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handlePreview(file)}
              title="Προεπισκόπηση"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDownload(file)}
              title="Λήψη"
            >
              <Download className="h-4 w-4" />
            </Button>
            {(canManage || user?.id === file.uploaded_by) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => onDelete(file)}
                title="Διαγραφή"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Upload bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση με όνομα ή τύπο..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
          id="files-table-upload"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Ανέβασμα...' : 'Ανέβασμα αρχείων'}
        </Button>
        
        {selectedFolderId && (
          <Badge variant="secondary">
            <Folder className="h-3 w-3 mr-1" />
            {folders.find(f => f.id === selectedFolderId)?.name}
          </Badge>
        )}
        
        {searchQuery && (
          <Badge variant="outline">
            {sortedFiles.length} αποτέλεσμα{sortedFiles.length !== 1 ? 'τα' : ''}
          </Badge>
        )}
      </div>

      {/* Toolbar */}
      <TableToolbar
        columns={columns}
        onColumnsChange={setColumns}
        savedViews={savedViews}
        currentViewId={null}
        onSaveView={(name) => saveView(name, sortField, sortDirection)}
        onLoadView={loadView}
        onDeleteView={deleteView}
        onResetToDefault={resetToDefault}
        onExportCSV={handleExportCSV}
        onExportExcel={handleExportExcel}
        selectedCount={selectedFiles.size}
        onBulkAction={(action) => {
          if (action === 'delete') handleBulkDelete();
        }}
        bulkActions={canManage ? [
          { id: 'delete', label: 'Διαγραφή', icon: <Trash2 className="h-4 w-4" /> }
        ] : []}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupOptions={GROUP_OPTIONS}
      />

      {/* Table */}
      {sortedFiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Δεν υπάρχουν αρχεία</p>
          <p className="text-sm">Ανεβάστε αρχεία για να ξεκινήσετε</p>
        </div>
      ) : groupBy === 'status' ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableBody>
              {Array.from(groupedFiles.entries()).map(([key, { label, files: groupFiles }]) => (
                <GroupedTableSection 
                  key={key} 
                  groupKey={key}
                  groupLabel={typeof label === 'string' ? label : key}
                  itemCount={groupFiles.length}
                  colSpan={columns.filter(c => c.visible).length}
                  badge={typeof label !== 'string' ? label : undefined}
                >
                  {groupFiles.map(renderFileRow)}
                </GroupedTableSection>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <thead className="bg-muted/50">
              <tr>
                {isColumnVisible('select') && (
                  <ResizableTableHeader className="w-10">
                    <Checkbox
                      checked={selectedFiles.size === sortedFiles.length && sortedFiles.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </ResizableTableHeader>
                )}
                {isColumnVisible('file_name') && (
                  <ResizableTableHeader
                    width={columnWidths['file_name'] || 200}
                    onWidthChange={(w) => setColumnWidth('file_name', w)}
                    onClick={() => handleSort('file_name')}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      Όνομα {getSortIcon('file_name')}
                    </div>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('folder') && (
                  <ResizableTableHeader
                    width={columnWidths['folder'] || 150}
                    onWidthChange={(w) => setColumnWidth('folder', w)}
                    onClick={() => handleSort('folder')}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      Φάκελος {getSortIcon('folder')}
                    </div>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('file_size') && (
                  <ResizableTableHeader
                    width={columnWidths['file_size'] || 100}
                    onWidthChange={(w) => setColumnWidth('file_size', w)}
                    onClick={() => handleSort('file_size')}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      Μέγεθος {getSortIcon('file_size')}
                    </div>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('content_type') && (
                  <ResizableTableHeader
                    width={columnWidths['content_type'] || 100}
                    onWidthChange={(w) => setColumnWidth('content_type', w)}
                    onClick={() => handleSort('content_type')}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      Τύπος {getSortIcon('content_type')}
                    </div>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('related_to') && (
                  <ResizableTableHeader
                    width={columnWidths['related_to'] || 180}
                    onWidthChange={(w) => setColumnWidth('related_to', w)}
                  >
                    Σχετίζεται με
                  </ResizableTableHeader>
                )}
                {isColumnVisible('uploaded_by') && (
                  <ResizableTableHeader
                    width={columnWidths['uploaded_by'] || 150}
                    onWidthChange={(w) => setColumnWidth('uploaded_by', w)}
                  >
                    Ανέβηκε από
                  </ResizableTableHeader>
                )}
                {isColumnVisible('created_at') && (
                  <ResizableTableHeader
                    width={columnWidths['created_at'] || 120}
                    onWidthChange={(w) => setColumnWidth('created_at', w)}
                    onClick={() => handleSort('created_at')}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      Ημερομηνία {getSortIcon('created_at')}
                    </div>
                  </ResizableTableHeader>
                )}
                {isColumnVisible('actions') && (
                  <ResizableTableHeader className="w-32">
                    Ενέργειες
                  </ResizableTableHeader>
                )}
              </tr>
            </thead>
            <TableBody>
              {sortedFiles.map(renderFileRow)}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
