import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X, Filter, Users, Briefcase, CalendarDays, Building2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinderColumnView } from './FinderColumnView';
import { DestinationPickerDialog, type PickedDestination } from './DestinationPickerDialog';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import type { FileFolder } from './FolderTree';
import type { FileAttachment } from './FilesTableView';

type FileViewMode = 'company' | 'by-project' | 'by-client' | 'by-date';
type FileTypeFilter = 'all' | 'images' | 'documents' | 'videos' | 'audio';

const VIEW_TABS: { value: FileViewMode; label: string; icon: React.ElementType }[] = [
  { value: 'company', label: 'Εταιρία', icon: Building2 },
  { value: 'by-project', label: 'Κατά Έργο', icon: Briefcase },
  { value: 'by-client', label: 'Κατά Πελάτη', icon: Users },
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

const isVirtualId = (id: string | null | undefined): boolean =>
  !!id && (id.startsWith('vp-') || id.startsWith('vc-') || id.startsWith('vd-') || id.startsWith('vco-') || id === 'vco-root');

interface ClientInfo { id: string; name: string }
interface ProjectInfo { id: string; name: string; client_id?: string | null }

export function CentralFileExplorer() {
  const { user, company, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<FileViewMode>('company');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');

  // Destination picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRestrict, setPickerRestrict] = useState<string[] | null>(null);
  const [pickerInitialProject, setPickerInitialProject] = useState<string | null>(null);
  const [pickerDefaultScope, setPickerDefaultScope] = useState<'project' | 'company'>('project');
  const pickerResolveRef = useRef<((d: PickedDestination | null) => void) | null>(null);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchAllData();
  }, []);

  // Ensure company root folders exist (idempotent)
  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      try {
        await supabase.rpc('ensure_company_root_folders', { _company_id: company.id });
        await fetchFolders();
      } catch (err) {
        console.warn('ensure_company_root_folders failed', err);
      }
    })();
  }, [company?.id]);

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
    const vFolders: FileFolder[] = [];
    const vFiles: FileAttachment[] = [];

    if (viewMode === 'company') {
      // Pure company view: real company-scoped folders + files
      const companyFolders = folders.filter(
        (f) => (f as any).company_id && !(f as any).project_id && !(f as any).tender_id
      );
      vFolders.push(...companyFolders);

      typeFilteredFiles.forEach((f) => {
        if ((f as any).company_id && !(f as any).project_id) {
          vFiles.push(f);
        }
      });
    } else if (viewMode === 'by-client') {
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
        // Skip pure company files in client view
        if (!(f as any).company_id) {
          vFiles.push({ ...f, folder_id: null });
        }
      });
    } else if (viewMode === 'by-project') {
      const projectIds = new Set(typeFilteredFiles.map((f) => f.project_id).filter(Boolean));

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
          const vpId = `vp-${project.id}`;
          vFolders.push({
            id: vpId,
            name: project.name,
            parent_folder_id: null,
            created_by: '',
            created_at: '',
            color: null,
          } as FileFolder);

          const realFolders = projectFoldersMap.get(project.id) || [];
          realFolders.forEach((rf) => {
            if (!rf.parent_folder_id) {
              vFolders.push({
                ...rf,
                id: rf.id,
                parent_folder_id: vpId,
              } as FileFolder);
            } else {
              vFolders.push(rf);
            }
          });
        }
      });

      typeFilteredFiles.forEach((f) => {
        if (f.project_id) {
          if (f.folder_id && folders.some(fl => fl.id === f.folder_id)) {
            vFiles.push(f);
          } else {
            vFiles.push({ ...f, folder_id: `vp-${f.project_id}` });
          }
        } else if (!(f as any).company_id) {
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

  // ============================================================
  // Destination resolution
  // ============================================================

  const resolveDestination = useCallback(
    async (
      target: string | null
    ): Promise<{ scope: 'project' | 'company'; projectId: string | null; folderId: string | null } | null> => {
      // Case 1: real folder UUID
      if (target && !isVirtualId(target)) {
        const folder = folders.find((f) => f.id === target);
        if (folder) {
          const projectId = (folder as any).project_id ?? null;
          const companyId = (folder as any).company_id ?? null;
          if (projectId) {
            return { scope: 'project', projectId, folderId: folder.id };
          }
          if (companyId) {
            return { scope: 'company', projectId: null, folderId: folder.id };
          }
          // Folder exists but no scope — ask user
          const picked = await openPicker({});
          if (!picked) return null;
          return picked.scope === 'company'
            ? { scope: 'company', projectId: null, folderId: folder.id }
            : { scope: 'project', projectId: picked.projectId, folderId: folder.id };
        }
      }

      // Case 2: virtual project group → upload to project root
      if (target && target.startsWith('vp-')) {
        const projectId = target.slice(3);
        return { scope: 'project', projectId, folderId: null };
      }

      // Case 3: virtual client group
      if (target && target.startsWith('vc-')) {
        const clientId = target.slice(3);
        const clientProjects = projects.filter((p) => p.client_id === clientId);
        if (clientProjects.length === 1) {
          return { scope: 'project', projectId: clientProjects[0].id, folderId: null };
        }
        const picked = await openPicker({
          restrictToProjectIds: clientProjects.map((p) => p.id),
        });
        if (!picked) return null;
        return { scope: picked.scope, projectId: picked.projectId, folderId: picked.folderId };
      }

      // Case 4: company root in company view → no prompt
      if (viewMode === 'company' && (target === null || target === undefined)) {
        return { scope: 'company', projectId: null, folderId: null };
      }

      // Case 5: virtual date OR generic root → ask user
      const picked = await openPicker({
        defaultScope: viewMode === 'company' ? 'company' : 'project',
      });
      if (!picked) return null;
      return { scope: picked.scope, projectId: picked.projectId, folderId: picked.folderId };
    },
    [folders, projects, viewMode]
  );

  const openPicker = useCallback(
    (opts: { restrictToProjectIds?: string[]; initialProjectId?: string; defaultScope?: 'project' | 'company' }) =>
      new Promise<PickedDestination | null>((resolve) => {
        setPickerRestrict(opts.restrictToProjectIds ?? null);
        setPickerInitialProject(opts.initialProjectId ?? null);
        setPickerDefaultScope(opts.defaultScope ?? 'project');
        pickerResolveRef.current = resolve;
        setPickerOpen(true);
      }),
    []
  );

  const handlePickerConfirm = (dest: PickedDestination) => {
    pickerResolveRef.current?.(dest);
    pickerResolveRef.current = null;
  };

  const handlePickerCancel = (open: boolean) => {
    setPickerOpen(open);
    if (!open && pickerResolveRef.current) {
      pickerResolveRef.current(null);
      pickerResolveRef.current = null;
    }
  };

  // ============================================================
  // Folder CRUD
  // ============================================================

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!user) return;

    let scope: 'project' | 'company' = 'project';
    let projectId: string | null = null;
    let companyId: string | null = null;
    let realParentId: string | null = null;

    if (parentId && !isVirtualId(parentId)) {
      // Real folder → inherit its scope
      const parent = folders.find((f) => f.id === parentId);
      const parentProject = (parent as any)?.project_id ?? null;
      const parentCompany = (parent as any)?.company_id ?? null;
      realParentId = parentId;
      if (parentProject) {
        scope = 'project';
        projectId = parentProject;
      } else if (parentCompany) {
        scope = 'company';
        companyId = parentCompany;
      }
    } else if (parentId?.startsWith('vp-')) {
      scope = 'project';
      projectId = parentId.slice(3);
      realParentId = null;
    } else if (viewMode === 'company' && parentId === null) {
      // Company root → company-scoped folder, no prompt
      scope = 'company';
      companyId = company?.id ?? null;
      realParentId = null;
    } else {
      // root, vc-, vd- → ask
      const dest = await resolveDestination(parentId);
      if (!dest) return;
      scope = dest.scope;
      projectId = dest.projectId;
      realParentId = dest.folderId;
      if (dest.scope === 'company') companyId = company?.id ?? null;
    }

    if (scope === 'project' && !projectId) {
      toast.error('Δεν είναι δυνατός ο εντοπισμός έργου');
      return;
    }
    if (scope === 'company' && !companyId) {
      toast.error('Δεν είναι δυνατός ο εντοπισμός εταιρίας');
      return;
    }

    try {
      const payload: any = {
        name,
        parent_folder_id: realParentId,
        created_by: user.id,
      };
      if (scope === 'project') payload.project_id = projectId;
      else payload.company_id = companyId;

      const { error } = await supabase.from('file_folders').insert([payload]);
      if (error) throw error;
      toast.success('Ο φάκελος δημιουργήθηκε!');
      await fetchFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Σφάλμα κατά τη δημιουργία φακέλου');
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    if (isVirtualId(folderId)) return;
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
    if (isVirtualId(folderId)) return;
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

  // ============================================================
  // File uploads
  // ============================================================

  const buildAttachmentPayload = (
    file: File,
    fileName: string,
    dest: { scope: 'project' | 'company'; projectId: string | null; folderId: string | null }
  ) => {
    const payload: any = {
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      content_type: file.type,
      uploaded_by: user!.id,
      folder_id: dest.folderId,
    };
    if (dest.scope === 'project') payload.project_id = dest.projectId;
    else payload.company_id = company?.id ?? null;
    return payload;
  };

  const handleUpload = async (selectedFiles: FileList, folderId: string | null) => {
    if (!user) return;

    const dest = await resolveDestination(folderId);
    if (!dest) return;
    if (dest.scope === 'project' && !dest.projectId) {
      toast.error('Δεν είναι δυνατός ο εντοπισμός έργου');
      return;
    }
    if (dest.scope === 'company' && !company?.id) {
      toast.error('Δεν είναι δυνατός ο εντοπισμός εταιρίας');
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        const fileName = createProjectFilesObjectKey({ userId: user.id, originalName: file.name });
        const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('file_attachments')
          .insert([buildAttachmentPayload(file, fileName, dest)]);
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

  const handleUploadFolder = async (
    fileList: FileList | Array<{ file: File; relativePath: string }>,
    targetFolderId: string | null
  ) => {
    if (!user) return;

    const dest = await resolveDestination(targetFolderId);
    if (!dest) return;
    if (dest.scope === 'project' && !dest.projectId) {
      toast.error('Δεν είναι δυνατός ο εντοπισμός έργου');
      return;
    }
    if (dest.scope === 'company' && !company?.id) {
      toast.error('Δεν είναι δυνατός ο εντοπισμός εταιρίας');
      return;
    }

    setUploading(true);
    try {
      const entries: Array<{ file: File; relativePath: string }> = Array.isArray(fileList)
        ? fileList
        : Array.from(fileList).map((file) => ({
            file,
            relativePath: (file as any).webkitRelativePath || file.name,
          }));

      const folderMap = new Map<string, string>();

      for (const { file, relativePath } of entries) {
        const parts = relativePath.split('/');

        let currentParent = dest.folderId;
        for (let i = 0; i < parts.length - 1; i++) {
          const dirPath = parts.slice(0, i + 1).join('/');
          if (!folderMap.has(dirPath)) {
            const folderPayload: any = {
              name: parts[i],
              parent_folder_id: currentParent,
              created_by: user.id,
            };
            if (dest.scope === 'project') folderPayload.project_id = dest.projectId;
            else folderPayload.company_id = company?.id ?? null;

            const { data, error } = await supabase
              .from('file_folders')
              .insert([folderPayload])
              .select('id')
              .single();
            if (error) throw error;
            folderMap.set(dirPath, data.id);
            currentParent = data.id;
          } else {
            currentParent = folderMap.get(dirPath)!;
          }
        }

        const fileName = createProjectFilesObjectKey({ userId: user.id, originalName: file.name });
        const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('file_attachments')
          .insert([buildAttachmentPayload(file, fileName, { ...dest, folderId: currentParent })]);
        if (insertError) throw insertError;
      }

      toast.success('Ο φάκελος ανέβηκε επιτυχώς!');
      await Promise.all([fetchFolders(), fetchFiles()]);
    } catch (error) {
      console.error('Error uploading folder:', error);
      toast.error('Σφάλμα κατά το ανέβασμα φακέλου');
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
    const dest = await resolveDestination(folderId);
    if (!dest) return;

    try {
      const update: any = { folder_id: dest.folderId };
      if (dest.scope === 'project') {
        update.project_id = dest.projectId;
        update.company_id = null;
      } else {
        update.company_id = company?.id ?? null;
        update.project_id = null;
      }
      const { error } = await supabase.from('file_attachments').update(update).eq('id', fileId);
      if (error) throw error;
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, ...update } : f)));
      const folderName = dest.folderId
        ? folders.find((f) => f.id === dest.folderId)?.name
        : (dest.scope === 'company' ? 'Ρίζα εταιρίας' : 'Ρίζα έργου');
      toast.success(`Μετακινήθηκε στο "${folderName}"`);
    } catch (error) {
      console.error('Error moving file:', error);
      toast.error('Σφάλμα κατά τη μετακίνηση');
    }
  };

  const handleMoveFolder = async (folderId: string, targetParentId: string | null) => {
    if (isVirtualId(folderId)) {
      toast.error('Δεν μπορείς να μετακινήσεις εικονική ομάδα');
      return;
    }

    let scope: 'project' | 'company' = 'project';
    let projectId: string | null = null;
    let companyId: string | null = null;
    let realParent: string | null = null;

    if (targetParentId && !isVirtualId(targetParentId)) {
      const parent = folders.find((f) => f.id === targetParentId);
      realParent = targetParentId;
      const parentProject = (parent as any)?.project_id ?? null;
      const parentCompany = (parent as any)?.company_id ?? null;
      if (parentProject) { scope = 'project'; projectId = parentProject; }
      else if (parentCompany) { scope = 'company'; companyId = parentCompany; }
    } else if (targetParentId?.startsWith('vp-')) {
      scope = 'project';
      projectId = targetParentId.slice(3);
      realParent = null;
    } else if (viewMode === 'company' && targetParentId === null) {
      scope = 'company';
      companyId = company?.id ?? null;
      realParent = null;
    } else {
      const dest = await resolveDestination(targetParentId);
      if (!dest) return;
      scope = dest.scope;
      projectId = dest.projectId;
      realParent = dest.folderId;
      if (dest.scope === 'company') companyId = company?.id ?? null;
    }

    try {
      const update: any = { parent_folder_id: realParent };
      if (scope === 'project') {
        update.project_id = projectId;
        update.company_id = null;
      } else {
        update.company_id = companyId;
        update.project_id = null;
      }
      const { error } = await supabase.from('file_folders').update(update).eq('id', folderId);
      if (error) throw error;
      const folderName = folders.find((f) => f.id === folderId)?.name;
      const targetName = realParent ? folders.find((f) => f.id === realParent)?.name : 'Ρίζα';
      toast.success(`"${folderName}" → "${targetName}"`);
      await fetchFolders();
    } catch (error) {
      console.error('Error moving folder:', error);
      toast.error('Σφάλμα κατά τη μετακίνηση φακέλου');
    }
  };

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
        allFolders={folders}
        onUpload={handleUpload}
        onUploadFolder={handleUploadFolder}
        onDelete={handleDeleteFile}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onMoveFile={handleMoveFile}
        onMoveFolder={handleMoveFolder}
        canManage={canManage}
        loading={loading}
        uploading={uploading}
        searchQuery={searchQuery}
      />

      <DestinationPickerDialog
        open={pickerOpen}
        onOpenChange={handlePickerCancel}
        projects={projects}
        folders={folders}
        restrictToProjectIds={pickerRestrict}
        initialProjectId={pickerInitialProject}
        defaultScope={pickerDefaultScope}
        allowCompanyScope
        onConfirm={handlePickerConfirm}
      />
    </div>
  );
}
