import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FolderTree, type FileFolder } from './FolderTree';
import { FilesTableView, type FileAttachment } from './FilesTableView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Search, 
  Filter,
  Building2,
  FolderKanban,
  Calendar,
  FileText,
  X
} from 'lucide-react';
import { format, parseISO, isThisMonth, isThisWeek, isThisYear } from 'date-fns';
import { el } from 'date-fns/locale';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  client_id: string | null;
}

interface Tender {
  id: string;
  name: string;
  client_id: string | null;
}

interface RelatedEntity {
  id: string;
  name: string;
  type: 'deliverable' | 'task';
}

type ViewMode = 'all' | 'by-client' | 'by-project' | 'by-date';
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'year';

export function CentralFileExplorer() {
  const { user, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [deliverables, setDeliverables] = useState<RelatedEntity[]>([]);
  const [tasks, setTasks] = useState<RelatedEntity[]>([]);
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFolders(),
        fetchFiles(),
        fetchClients(),
        fetchProjects(),
        fetchTenders(),
        fetchDeliverables(),
        fetchTasks()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Σφάλμα κατά τη φόρτωση');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from('file_folders')
      .select('*')
      .order('name');
    
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
      const userIds = [...new Set(data.map(f => f.uploaded_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const filesWithUploaders = data.map(file => ({
        ...file,
        uploader: profilesMap.get(file.uploaded_by) || { full_name: null, email: 'Unknown' }
      }));
      setFiles(filesWithUploaders as FileAttachment[]);
    } else {
      setFiles([]);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name')
      .order('name');
    setClients(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, client_id')
      .order('name');
    setProjects(data || []);
  };

  const fetchTenders = async () => {
    const { data } = await supabase
      .from('tenders')
      .select('id, name, client_id')
      .order('name');
    setTenders(data || []);
  };

  const fetchDeliverables = async () => {
    const [projectDeliverables, tenderDeliverables] = await Promise.all([
      supabase.from('deliverables').select('id, name'),
      supabase.from('tender_deliverables').select('id, name')
    ]);
    
    const all = [
      ...(projectDeliverables.data || []).map(d => ({ id: d.id, name: d.name, type: 'deliverable' as const })),
      ...(tenderDeliverables.data || []).map(d => ({ id: d.id, name: d.name, type: 'deliverable' as const }))
    ];
    setDeliverables(all);
  };

  const fetchTasks = async () => {
    const [projectTasks, tenderTasks] = await Promise.all([
      supabase.from('tasks').select('id, title'),
      supabase.from('tender_tasks').select('id, title')
    ]);
    
    const all = [
      ...(projectTasks.data || []).map(t => ({ id: t.id, name: t.title, type: 'task' as const })),
      ...(tenderTasks.data || []).map(t => ({ id: t.id, name: t.title, type: 'task' as const }))
    ];
    setTasks(all);
  };

  // Filter files based on current selections
  const filteredFiles = useMemo(() => {
    let result = [...files];

    // Filter by folder
    if (selectedFolderId) {
      result = result.filter(f => f.folder_id === selectedFolderId);
    }

    // Filter by client (through project/tender)
    if (selectedClientId) {
      const clientProjectIds = projects.filter(p => p.client_id === selectedClientId).map(p => p.id);
      const clientTenderIds = tenders.filter(t => t.client_id === selectedClientId).map(t => t.id);
      result = result.filter(f => 
        (f.project_id && clientProjectIds.includes(f.project_id)) ||
        (f.tender_id && clientTenderIds.includes(f.tender_id))
      );
    }

    // Filter by project
    if (selectedProjectId) {
      result = result.filter(f => f.project_id === selectedProjectId);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      result = result.filter(f => {
        const date = parseISO(f.created_at);
        switch (dateFilter) {
          case 'today':
            return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
          case 'week':
            return isThisWeek(date, { locale: el });
          case 'month':
            return isThisMonth(date);
          case 'year':
            return isThisYear(date);
          default:
            return true;
        }
      });
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.file_name.toLowerCase().includes(query) ||
        f.content_type?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [files, selectedFolderId, selectedClientId, selectedProjectId, dateFilter, searchQuery, projects, tenders]);

  // Group files by client for the by-client view
  const filesByClient = useMemo(() => {
    const map = new Map<string, { client: Client; files: FileAttachment[] }>();
    
    // Add "No Client" group
    map.set('no-client', { 
      client: { id: 'no-client', name: 'Χωρίς Πελάτη' }, 
      files: [] 
    });
    
    clients.forEach(client => {
      map.set(client.id, { client, files: [] });
    });

    filteredFiles.forEach(file => {
      let clientId = 'no-client';
      
      if (file.project_id) {
        const project = projects.find(p => p.id === file.project_id);
        if (project?.client_id) clientId = project.client_id;
      } else if (file.tender_id) {
        const tender = tenders.find(t => t.id === file.tender_id);
        if (tender?.client_id) clientId = tender.client_id;
      }
      
      const group = map.get(clientId);
      if (group) group.files.push(file);
    });

    return Array.from(map.values()).filter(g => g.files.length > 0);
  }, [filteredFiles, clients, projects, tenders]);

  // Group files by project for the by-project view
  const filesByProject = useMemo(() => {
    const map = new Map<string, { name: string; type: 'project' | 'tender'; files: FileAttachment[] }>();
    
    map.set('no-project', { name: 'Χωρίς Έργο/Διαγωνισμό', type: 'project', files: [] });
    
    projects.forEach(p => map.set(`project-${p.id}`, { name: p.name, type: 'project', files: [] }));
    tenders.forEach(t => map.set(`tender-${t.id}`, { name: t.name, type: 'tender', files: [] }));

    filteredFiles.forEach(file => {
      let key = 'no-project';
      if (file.project_id) key = `project-${file.project_id}`;
      else if (file.tender_id) key = `tender-${file.tender_id}`;
      
      const group = map.get(key);
      if (group) group.files.push(file);
    });

    return Array.from(map.entries())
      .filter(([_, g]) => g.files.length > 0)
      .map(([key, group]) => ({ key, ...group }));
  }, [filteredFiles, projects, tenders]);

  // Group files by date
  const filesByDate = useMemo(() => {
    const map = new Map<string, { label: string; files: FileAttachment[] }>();
    
    filteredFiles.forEach(file => {
      const date = parseISO(file.created_at);
      const key = format(date, 'yyyy-MM');
      const label = format(date, 'MMMM yyyy', { locale: el });
      
      if (!map.has(key)) {
        map.set(key, { label, files: [] });
      }
      map.get(key)!.files.push(file);
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, group]) => ({ key, ...group }));
  }, [filteredFiles]);

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('file_folders')
        .insert([{
          name,
          parent_folder_id: parentId,
          created_by: user.id,
        }]);

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
      const folder = folders.find(f => f.id === folderId);
      if (folder) {
        await supabase
          .from('file_attachments')
          .update({ folder_id: folder.parent_folder_id })
          .eq('folder_id', folderId);
      }

      const { error } = await supabase
        .from('file_folders')
        .delete()
        .eq('id', folderId);

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
        const fileName = createProjectFilesObjectKey({
          userId: user.id,
          originalName: file.name,
        });

        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('file_attachments')
          .insert([{
            file_name: file.name,
            file_path: fileName,
            file_size: file.size,
            content_type: file.type,
            uploaded_by: user.id,
            folder_id: folderId,
          }]);

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

      const { error } = await supabase
        .from('file_attachments')
        .delete()
        .eq('id', file.id);

      if (error) throw error;

      setFiles(prev => prev.filter(f => f.id !== file.id));
      toast.success('Το αρχείο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleUpdateFile = async (fileId: string, field: string, value: string | null) => {
    try {
      const { error } = await supabase
        .from('file_attachments')
        .update({ [field]: value })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, [field]: value } : f
      ));
    } catch (error) {
      console.error('Error updating file:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      throw error;
    }
  };

  const handleMoveFile = async (fileId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('file_attachments')
        .update({ folder_id: folderId })
        .eq('id', fileId);

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, folder_id: folderId } : f
      ));
      
      const folderName = folderId ? folders.find(f => f.id === folderId)?.name : 'Χωρίς φάκελο';
      toast.success(`Μετακινήθηκε στο "${folderName}"`);
    } catch (error) {
      console.error('Error moving file:', error);
      toast.error('Σφάλμα κατά τη μετακίνηση');
    }
  };

  const clearFilters = () => {
    setSelectedClientId(null);
    setSelectedProjectId(null);
    setDateFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = selectedClientId || selectedProjectId || dateFilter !== 'all' || searchQuery;

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Αναζήτηση αρχείων..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={selectedClientId || 'all'} onValueChange={(v) => setSelectedClientId(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[180px]">
            <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Πελάτης" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλοι οι Πελάτες</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedProjectId || 'all'} onValueChange={(v) => setSelectedProjectId(v === 'all' ? null : v)}>
          <SelectTrigger className="w-[180px]">
            <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Έργο" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλα τα Έργα</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-[160px]">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Όλες οι ημ/νίες</SelectItem>
            <SelectItem value="today">Σήμερα</SelectItem>
            <SelectItem value="week">Αυτή την εβδομάδα</SelectItem>
            <SelectItem value="month">Αυτόν τον μήνα</SelectItem>
            <SelectItem value="year">Αυτόν τον χρόνο</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Καθαρισμός
          </Button>
        )}
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="all" className="gap-2">
            <FileText className="h-4 w-4" />
            Όλα τα Αρχεία
          </TabsTrigger>
          <TabsTrigger value="by-client" className="gap-2">
            <Building2 className="h-4 w-4" />
            Κατά Πελάτη
          </TabsTrigger>
          <TabsTrigger value="by-project" className="gap-2">
            <FolderKanban className="h-4 w-4" />
            Κατά Έργο
          </TabsTrigger>
          <TabsTrigger value="by-date" className="gap-2">
            <Calendar className="h-4 w-4" />
            Χρονολογικά
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <div className="flex gap-6">
            {/* Folder sidebar */}
            <div className="w-56 shrink-0 border-r pr-4">
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
                onDropFile={handleMoveFile}
                canManage={canManage}
              />
            </div>

            {/* Files table */}
            <div className="flex-1 min-w-0">
              <FilesTableView
                files={filteredFiles}
                folders={folders}
                selectedFolderId={selectedFolderId}
                deliverables={deliverables}
                tasks={tasks}
                onUpload={handleUpload}
                onDelete={handleDeleteFile}
                onUpdateFile={handleUpdateFile}
                onMoveFile={handleMoveFile}
                canManage={canManage}
                loading={loading}
                uploading={uploading}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="by-client" className="mt-4">
          <div className="space-y-6">
            {filesByClient.map(group => (
              <div key={group.client.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-foreground" />
                  <h3 className="font-semibold text-lg">{group.client.name}</h3>
                  <Badge variant="secondary">{group.files.length} αρχεία</Badge>
                </div>
                <FilesTableView
                  files={group.files}
                  folders={folders}
                  selectedFolderId={null}
                  deliverables={deliverables}
                  tasks={tasks}
                  onUpload={handleUpload}
                  onDelete={handleDeleteFile}
                  onUpdateFile={handleUpdateFile}
                  onMoveFile={handleMoveFile}
                  canManage={canManage}
                  loading={false}
                  uploading={uploading}
                />
              </div>
            ))}
            {filesByClient.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                Δεν βρέθηκαν αρχεία με τα επιλεγμένα φίλτρα
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="by-project" className="mt-4">
          <div className="space-y-6">
            {filesByProject.map(group => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-foreground" />
                  <h3 className="font-semibold text-lg">{group.name}</h3>
                  <Badge variant={group.type === 'tender' ? 'outline' : 'secondary'}>
                    {group.type === 'tender' ? 'Διαγωνισμός' : 'Έργο'}
                  </Badge>
                  <Badge variant="secondary">{group.files.length} αρχεία</Badge>
                </div>
                <FilesTableView
                  files={group.files}
                  folders={folders}
                  selectedFolderId={null}
                  deliverables={deliverables}
                  tasks={tasks}
                  onUpload={handleUpload}
                  onDelete={handleDeleteFile}
                  onUpdateFile={handleUpdateFile}
                  onMoveFile={handleMoveFile}
                  canManage={canManage}
                  loading={false}
                  uploading={uploading}
                />
              </div>
            ))}
            {filesByProject.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                Δεν βρέθηκαν αρχεία με τα επιλεγμένα φίλτρα
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="by-date" className="mt-4">
          <div className="space-y-6">
            {filesByDate.map(group => (
              <div key={group.key} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-foreground" />
                  <h3 className="font-semibold text-lg capitalize">{group.label}</h3>
                  <Badge variant="secondary">{group.files.length} αρχεία</Badge>
                </div>
                <FilesTableView
                  files={group.files}
                  folders={folders}
                  selectedFolderId={null}
                  deliverables={deliverables}
                  tasks={tasks}
                  onUpload={handleUpload}
                  onDelete={handleDeleteFile}
                  onUpdateFile={handleUpdateFile}
                  onMoveFile={handleMoveFile}
                  canManage={canManage}
                  loading={false}
                  uploading={uploading}
                />
              </div>
            ))}
            {filesByDate.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground">
                Δεν βρέθηκαν αρχεία με τα επιλεγμένα φίλτρα
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground px-2">
        <span>
          Σύνολο: {filteredFiles.length} αρχεία
          {hasActiveFilters && ` (από ${files.length})`}
        </span>
        <span>
          {folders.length} φάκελοι
        </span>
      </div>
    </div>
  );
}
