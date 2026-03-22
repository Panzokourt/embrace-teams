import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X, Filter, FolderOpen, Users, Briefcase, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinderColumnView } from './FinderColumnView';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import type { FileFolder } from './FolderTree';
import type { FileAttachment } from './FilesTableView';

type FileViewMode = 'all' | 'by-client' | 'by-project' | 'by-date';
type FileTypeFilter = 'all' | 'images' | 'documents' | 'videos' | 'audio';

const VIEW_TABS: { value: FileViewMode; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'Όλα', icon: FolderOpen },
  { value: 'by-client', label: 'Κατά Πελάτη', icon: Users },
  { value: 'by-project', label: 'Κατά Έργο', icon: Briefcase },
  { value: 'by-date', label: 'Χρονολογικά', icon: CalendarDays },
];

const FILE_TYPE_OPTIONS: { value: FileTypeFilter; label: string }[] = [
  { value: 'all', label: 'Όλοι οι τύποι' },
  { value: 'images', label: 'Εικόνες' },
  { value: 'documents', label: 'Έγγραφα' },
  { value: 'videos', label: 'Βίντεο' },
  { value: 'audio', label: 'Ήχος' },
];

function matchesTypeFilter(contentType: string | null, filter: FileTypeFilter): boolean {
  if (filter === 'all') return true;
  if (!contentType) return false;
  switch (filter) {
    case 'images': return contentType.startsWith('image/');
    case 'documents': return contentType.includes('pdf') || contentType.includes('document') || contentType.includes('text') || contentType.includes('spreadsheet');
    case 'videos': return contentType.startsWith('video/');
    case 'audio': return contentType.startsWith('audio/');
    default: return true;
  }
}

interface ClientInfo { id: string; name: string }
interface ProjectInfo { id: string; name: string; client_id?: string | null }

export function CentralFileExplorer() {
  const { user, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<FileViewMode>('all');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchFolders(), fetchFiles(), fetchClients(), fetchProjects()]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Σφάλμα κατά τη φόρτωση');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('id, name').order('name');
    setClients(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name, client_id').order('name');
    setProjects(data || []);
  };

  const fetchFolders = async () => {
    const { data, error } = await supabase.from('file_folders').select('*').order('name');
    if (error) throw error;
    setFolders((data || []) as FileFolder[]);
  };

  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((f) => f.uploaded_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setFiles(
        data.map((file) => ({
          ...file,
          uploader: profilesMap.get(file.uploaded_by) || { full_name: null, email: 'Unknown' },
        })) as FileAttachment[]
      );
    } else {
      setFiles([]);
    }
  };

  const typeFilteredFiles = useMemo(() => {
    if (typeFilter === 'all') return files;
    return files.filter((f) => matchesTypeFilter(f.content_type, typeFilter));
  }, [files, typeFilter]);

  // Build virtual folders for grouped views
  const { virtualFolders, virtualFiles } = useMemo(() => {
    if (viewMode === 'all') {
      return { virtualFolders: folders, virtualFiles: typeFilteredFiles };
    }

    const vFolders: FileFolder[] = [];
    const vFiles: FileAttachment[] = [];

    if (viewMode === 'by-client') {
      const clientIds = new Set(typeFilteredFiles.map((f) => f.project_id).filter(Boolean));
      const projectClientMap = new Map(projects.map((p) => [p.id, p.client_id]));
      const relevantClientIds = new Set<string>();
      
      clientIds.forEach((pid) => {
        const clientId = projectClientMap.get(pid!);
        if (clientId) relevantClientIds.add(clientId);
      });

      clients.forEach((client) => {
        if (relevantClientIds.has(client.id)) {
          vFolders.push({
            id: `vc-${client.id}`,
            name: client.name,
            parent_folder_id: null,
            created_by: '',
            created_at: '',
            color: null,
          } as FileFolder);
        }
      });

      typeFilteredFiles.forEach((f) => {
        if (f.project_id) {
          const clientId = projectClientMap.get(f.project_id);
          if (clientId) {
            vFiles.push({ ...f, folder_id: `vc-${clientId}` });
            return;
          }
        }
        vFiles.push({ ...f, folder_id: null });
      });
    } else if (viewMode === 'by-project') {
      // Build project virtual folders
      const projectIds = new Set(typeFilteredFiles.map((f) => f.project_id).filter(Boolean));

      // Also get real file_folders per project to show subfolders
      const projectFoldersMap = new Map<string, FileFolder[]>();
      folders.forEach((f) => {
        const pid = (f as any).project_id;
        if (pid && projectIds.has(pid)) {
          if (!projectFoldersMap.has(pid)) projectFoldersMap.set(pid, []);
          projectFoldersMap.get(pid)!.push(f);
        }
      });

      projects.forEach((project) => {
        if (projectIds.has(project.id)) {
          // Add project as virtual root folder
          const vpId = `vp-${project.id}`;
          vFolders.push({
            id: vpId,
            name: project.name,
            parent_folder_id: null,
            created_by: '',
            created_at: '',
            color: null,
          } as FileFolder);

          // Add real subfolders under this virtual project folder
          const realFolders = projectFoldersMap.get(project.id) || [];
          realFolders.forEach((rf) => {
            // Only add root-level project folders (no parent or parent is null)
            if (!rf.parent_folder_id) {
              vFolders.push({
                ...rf,
                id: rf.id, // keep real ID so files with folder_id match
                parent_folder_id: vpId, // nest under virtual project folder
              } as FileFolder);
            } else {
              // Sub-subfolders: keep as-is (their parent_folder_id points to a real folder)
              vFolders.push(rf);
            }
          });
        }
      });

      typeFilteredFiles.forEach((f) => {
        if (f.project_id) {
          // If file has a real folder_id that exists, keep it (it's now nested under the project virtual folder)
          if (f.folder_id && folders.some(fl => fl.id === f.folder_id)) {
            vFiles.push(f); // folder_id already points to the real folder
          } else {
            // File without a subfolder → goes directly under the virtual project folder
            vFiles.push({ ...f, folder_id: `vp-${f.project_id}` });
          }
        } else {
          vFiles.push({ ...f, folder_id: null });
        }
      });
    } else if (viewMode === 'by-date') {
      const monthGroups = new Map<string, string>();
      typeFilteredFiles.forEach((f) => {
        const date = new Date(f.created_at);
        const key = format(date, 'yyyy-MM');
        if (!monthGroups.has(key)) {
          monthGroups.set(key, format(date, 'LLLL yyyy', { locale: el }));
        }
      });

      const sortedMonths = [...monthGroups.entries()].sort((a, b) => b[0].localeCompare(a[0], 'el', { numeric: true }));
      sortedMonths.forEach(([key, label]) => {
        vFolders.push({
          id: `vd-${key}`,
          name: label.charAt(0).toUpperCase() + label.slice(1),
          parent_folder_id: null,
          created_by: '',
          created_at: '',
          color: null,
        } as FileFolder);
      });

      typeFilteredFiles.forEach((f) => {
        const key = format(new Date(f.created_at), 'yyyy-MM');
        vFiles.push({ ...f, folder_id: `vd-${key}` });
      });
    }

    return { virtualFolders: vFolders, virtualFiles: vFiles };
  }, [viewMode, typeFilteredFiles, folders, clients, projects]);

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!user || viewMode !== 'all') return;
    try {
      const { error } = await supabase
        .from('file_folders')
        .insert([{ name, parent_folder_id: parentId, created_by: user.id }]);
      if (error) throw error;
      toast.success('Ο φάκελος δημιουργήθηκε!');
      await fetchFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Σφάλμα κατά τη δημιουργία φακέλου');
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const { error } = await supabase
        .from('file_folders')
        .update({ name: newName })
        .eq('id', folderId);
      if (error) throw error;
      toast.success('Ο φάκελος μετονομάστηκε!');
      await fetchFolders();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Σφάλμα κατά τη μετονομασία');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      const folder = folders.find((f) => f.id === folderId);
      if (folder) {
        await supabase
          .from('file_attachments')
          .update({ folder_id: folder.parent_folder_id })
          .eq('folder_id', folderId);
      }
      const { error } = await supabase.from('file_folders').delete().eq('id', folderId);
      if (error) throw error;
      toast.success('Ο φάκελος διαγράφηκε!');
      await Promise.all([fetchFolders(), fetchFiles()]);
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleUpload = async (selectedFiles: FileList, folderId: string | null) => {
    if (!user) return;
    setUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        const fileName = createProjectFilesObjectKey({ userId: user.id, originalName: file.name });
        const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('file_attachments')
          .insert([{ file_name: file.name, file_path: fileName, file_size: file.size, content_type: file.type, uploaded_by: user.id, folder_id: folderId }]);
        if (insertError) throw insertError;
      }
      toast.success('Τα αρχεία ανέβηκαν επιτυχώς!');
      await fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Σφάλμα κατά το ανέβασμα');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (file: FileAttachment) => {
    if (!canManage && user?.id !== file.uploaded_by) {
      toast.error('Δεν έχετε δικαίωμα διαγραφής');
      return;
    }
    try {
      await supabase.storage.from('project-files').remove([file.file_path]);
      const { error } = await supabase.from('file_attachments').delete().eq('id', file.id);
      if (error) throw error;
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast.success('Το αρχείο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleMoveFile = async (fileId: string, folderId: string | null) => {
    try {
      const { error } = await supabase.from('file_attachments').update({ folder_id: folderId }).eq('id', fileId);
      if (error) throw error;
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, folder_id: folderId } : f)));
      const folderName = folderId ? folders.find((f) => f.id === folderId)?.name : 'Χωρίς φάκελο';
      toast.success(`Μετακινήθηκε στο "${folderName}"`);
    } catch (error) {
      console.error('Error moving file:', error);
      toast.error('Σφάλμα κατά τη μετακίνηση');
    }
  };

  const handleMoveFolder = async (folderId: string, targetParentId: string | null) => {
    try {
      const { error } = await supabase.from('file_folders').update({ parent_folder_id: targetParentId }).eq('id', folderId);
      if (error) throw error;
      const folderName = folders.find((f) => f.id === folderId)?.name;
      const targetName = targetParentId ? folders.find((f) => f.id === targetParentId)?.name : 'Ρίζα';
      toast.success(`"${folderName}" → "${targetName}"`);
      await fetchFolders();
    } catch (error) {
      console.error('Error moving folder:', error);
      toast.error('Σφάλμα κατά τη μετακίνηση φακέλου');
    }
  };

  const isVirtualMode = viewMode !== 'all';

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary shadow-md opacity-85">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.value}
                variant={viewMode === tab.value ? 'default' : 'ghost'}
                size="sm"
                className="h-8 px-3"
                onClick={() => setViewMode(tab.value)}
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Αναζήτηση αρχείων..."
            className="pl-9 pr-8 h-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as FileTypeFilter)}>
          <SelectTrigger className="w-[160px] h-8">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          {virtualFiles.length} αρχεί{virtualFiles.length === 1 ? 'ο' : 'α'}
        </span>
      </div>

      <FinderColumnView
        files={virtualFiles}
        folders={virtualFolders}
        onUpload={handleUpload}
        onDelete={handleDeleteFile}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onMoveFile={isVirtualMode ? undefined : handleMoveFile}
        canManage={isVirtualMode ? false : canManage}
        loading={loading}
        uploading={uploading}
        searchQuery={searchQuery}
      />
    </div>
  );
}
