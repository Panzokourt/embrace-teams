import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X, Filter, Users, Briefcase, CalendarDays, Building2, Import as ImportIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FinderColumnView } from './FinderColumnView';
import { DestinationPickerDialog, type PickedDestination } from './DestinationPickerDialog';
import { ImportWizard } from './import-wizard/ImportWizard';
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

const SYSTEM_FILE_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini']);

function isSystemFileName(pathOrName: string): boolean {
  const parts = pathOrName.split('/').filter(Boolean);
  return parts.some((part) => {
    const lower = part.toLowerCase();
    return lower === '__macosx' || SYSTEM_FILE_NAMES.has(lower);
  });
}

const isVirtualId = (id: string | null | undefined): boolean =>
  !!id && (
    id.startsWith('vp-') ||
    id.startsWith('vc-') ||
    id.startsWith('vd-') ||
    id.startsWith('vco-') ||
    id.startsWith('lens:') ||
    id === 'vco-root'
  );

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
  const [importWizardOpen, setImportWizardOpen] = useState(false);

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

  const isFolderDescendant = useCallback((candidateId: string | null, ancestorId: string) => {
    let current = candidateId ? folders.find((f) => f.id === candidateId) : undefined;
    while (current) {
      if (current.id === ancestorId) return true;
      current = current.parent_folder_id ? folders.find((f) => f.id === current!.parent_folder_id) : undefined;
    }
    return false;
  }, [folders]);

  const visibleFiles = useMemo(
    () => typeFilteredFiles.filter((file) => !isSystemFileName(file.file_name)),
    [typeFilteredFiles]
  );

  // Build lens-based folders for every grouped view while preserving real hierarchy.
  const { virtualFolders, virtualFiles } = useMemo(() => {
    const vFolders: FileFolder[] = [];
    const vFiles: FileAttachment[] = [];
    const folderById = new Map(folders.map((folder) => [folder.id, folder]));

    const makeGroup = (id: string, name: string, parent_folder_id: string | null = null) => ({
      id,
      name,
      parent_folder_id,
      created_by: '',
      created_at: '',
      color: null,
    } as FileFolder);

    const cloneFolderBranch = (folder: FileFolder, parentId: string | null, lensPrefix?: string): FileFolder => {
      const cloneId = lensPrefix ? `${lensPrefix}:${folder.id}` : folder.id;
      const clone = {
        ...folder,
        id: cloneId,
        parent_folder_id: parentId,
        original_id: folder.id,
      } as FileFolder;
      vFolders.push(clone);
      return clone;
    };

    const addFolderAncestors = (folderId: string | null, rootParentId: string, lensPrefix?: string): string | null => {
      if (!folderId) return rootParentId;
      const chain: FileFolder[] = [];
      let current = folderById.get(folderId);
      while (current) {
        chain.unshift(current);
        current = current.parent_folder_id ? folderById.get(current.parent_folder_id) : undefined;
      }

      let parent = rootParentId;
      for (const folder of chain) {
        const cloneId = lensPrefix ? `${lensPrefix}:${folder.id}` : folder.id;
        if (!vFolders.some((existing) => existing.id === cloneId)) {
          cloneFolderBranch(folder, parent, lensPrefix);
        }
        parent = cloneId;
      }
      return parent;
    };

    if (viewMode === 'company') {
      const companyFolders = folders.filter(
        (f) => (f as any).company_id && !(f as any).project_id && !(f as any).tender_id
      );
      vFolders.push(...companyFolders);
      visibleFiles.forEach((f) => {
        if ((f as any).company_id && !(f as any).project_id) vFiles.push(f);
      });
    } else if (viewMode === 'by-project') {
      const projectIds = new Set(visibleFiles.map((f) => f.project_id).filter(Boolean) as string[]);

      projects.forEach((project) => {
        if (!projectIds.has(project.id)) return;
        const projectRootId = `vp-${project.id}`;
        vFolders.push(makeGroup(projectRootId, project.name));

        folders
          .filter((folder) => (folder as any).project_id === project.id)
          .forEach((folder) => {
            if (folder.parent_folder_id) return;
            cloneFolderBranch(folder, projectRootId);
          });

        folders
          .filter((folder) => (folder as any).project_id === project.id && folder.parent_folder_id)
          .forEach((folder) => vFolders.push(folder));
      });

      visibleFiles.forEach((file) => {
        if (!file.project_id) return;
        if (file.folder_id && folderById.has(file.folder_id)) vFiles.push(file);
        else vFiles.push({ ...file, folder_id: `vp-${file.project_id}` });
      });
    } else if (viewMode === 'by-client') {
      const projectById = new Map(projects.map((project) => [project.id, project]));
      const clientIds = new Set<string>();
      visibleFiles.forEach((file) => {
        const clientId = file.project_id ? projectById.get(file.project_id)?.client_id : null;
        if (clientId) clientIds.add(clientId);
      });

      clients.forEach((client) => {
        if (!clientIds.has(client.id)) return;
        const clientRootId = `vc-${client.id}`;
        vFolders.push(makeGroup(clientRootId, client.name));

        projects
          .filter((project) => project.client_id === client.id && visibleFiles.some((file) => file.project_id === project.id))
          .forEach((project) => {
            const projectRootId = `vp-${project.id}`;
            vFolders.push(makeGroup(projectRootId, project.name, clientRootId));
            folders
              .filter((folder) => (folder as any).project_id === project.id)
              .forEach((folder) => {
                const parentId = folder.parent_folder_id ?? projectRootId;
                vFolders.push({ ...folder, parent_folder_id: parentId } as FileFolder);
              });
          });
      });

      visibleFiles.forEach((file) => {
        if (!file.project_id) return;
        if (file.folder_id && folderById.has(file.folder_id)) vFiles.push(file);
        else vFiles.push({ ...file, folder_id: `vp-${file.project_id}` });
      });
    } else if (viewMode === 'by-date') {
      const projectById = new Map(projects.map((project) => [project.id, project]));
      const monthGroups = new Map<string, string>();
      visibleFiles.forEach((file) => {
        const date = new Date(file.created_at);
        const key = format(date, 'yyyy-MM');
        if (!monthGroups.has(key)) monthGroups.set(key, format(date, 'LLLL yyyy', { locale: el }));
      });

      [...monthGroups.entries()]
        .sort((a, b) => b[0].localeCompare(a[0], 'el', { numeric: true }))
        .forEach(([monthKey, label]) => {
          const monthRootId = `vd-${monthKey}`;
          vFolders.push(makeGroup(monthRootId, label.charAt(0).toUpperCase() + label.slice(1)));

          const monthFiles = visibleFiles.filter((file) => format(new Date(file.created_at), 'yyyy-MM') === monthKey);
          const roots = new Map<string, { id: string; label: string; projectId: string | null }>();
          monthFiles.forEach((file) => {
            if (file.project_id) {
              const project = projectById.get(file.project_id);
              roots.set(`project:${file.project_id}`, {
                id: `vd-${monthKey}-project-${file.project_id}`,
                label: project?.name ?? 'Χωρίς έργο',
                projectId: file.project_id,
              });
            } else if ((file as any).company_id) {
              roots.set('company', { id: `vd-${monthKey}-company`, label: 'Εταιρικά', projectId: null });
            }
          });

          roots.forEach((root) => vFolders.push(makeGroup(root.id, root.label, monthRootId)));

          monthFiles.forEach((file) => {
            const root = file.project_id ? roots.get(`project:${file.project_id}`) : roots.get('company');
            if (!root) return;
            const lensPrefix = `lens:${monthKey}:${root.projectId ?? 'company'}`;
            const folderId = addFolderAncestors(file.folder_id, root.id, lensPrefix);
            vFiles.push({ ...file, folder_id: folderId });
          });
        });
    }

    return { virtualFolders: vFolders, virtualFiles: vFiles };
  }, [viewMode, visibleFiles, folders, clients, projects]);

  // ============================================================
  // Destination resolution
  // ============================================================

  const resolveDestination = useCallback(
    async (
      target: string | null
    ): Promise<{ scope: 'project' | 'company'; projectId: string | null; folderId: string | null } | null> => {
      // Lens cloned folder → resolve to the original real folder id
      if (target?.startsWith('lens:')) {
        const realFolderId = target.split(':').pop() ?? null;
        return resolveDestination(realFolderId);
      }

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
      const uploadFiles = Array.from(selectedFiles).filter((file) => !isSystemFileName(file.name));
      for (const file of uploadFiles) {
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
      const entries: Array<{ file: File; relativePath: string }> = (Array.isArray(fileList)
        ? fileList
        : Array.from(fileList).map((file) => ({
            file,
            relativePath: (file as any).webkitRelativePath || file.name,
          }))).filter((entry) => !isSystemFileName(entry.relativePath));

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

  const handleDeleteFiles = async (selectedFiles: FileAttachment[]) => {
    const allowed = selectedFiles.filter((file) => canManage || user?.id === file.uploaded_by);
    if (!allowed.length) {
      toast.error('Δεν έχετε δικαίωμα διαγραφής');
      return;
    }
    try {
      await supabase.storage.from('project-files').remove(allowed.map((file) => file.file_path));
      const { error } = await supabase.from('file_attachments').delete().in('id', allowed.map((file) => file.id));
      if (error) throw error;
      setFiles((prev) => prev.filter((file) => !allowed.some((deleted) => deleted.id === file.id)));
      toast.success(`Διαγράφηκαν ${allowed.length} αρχεία`);
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Σφάλμα κατά τη μαζική διαγραφή');
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

  const handleMoveFiles = async (fileIds: string[], folderId: string | null) => {
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
      const { error } = await supabase.from('file_attachments').update(update).in('id', fileIds);
      if (error) throw error;
      setFiles((prev) => prev.map((file) => (fileIds.includes(file.id) ? { ...file, ...update } : file)));
      toast.success(`Μετακινήθηκαν ${fileIds.length} αρχεία`);
    } catch (error) {
      console.error('Error moving files:', error);
      toast.error('Σφάλμα κατά τη μαζική μετακίνηση');
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

  const handleMoveFolders = async (folderIds: string[], targetParentId: string | null) => {
    const realIds = folderIds.filter((id) => !isVirtualId(id));
    if (realIds.some((id) => id === targetParentId || isFolderDescendant(targetParentId, id))) {
      toast.error('Δεν μπορείς να μετακινήσεις φάκελο μέσα στον εαυτό του');
      return;
    }
    for (const folderId of realIds) {
      await handleMoveFolder(folderId, targetParentId);
    }
    if (realIds.length > 1) toast.success(`Μετακινήθηκαν ${realIds.length} φάκελοι`);
  };

  const handleDeleteFolders = async (folderIds: string[]) => {
    const realIds = folderIds.filter((id) => !isVirtualId(id));
    try {
      for (const folderId of realIds) {
        const folder = folders.find((f) => f.id === folderId);
        if (folder) {
          await supabase
            .from('file_attachments')
            .update({ folder_id: folder.parent_folder_id })
            .eq('folder_id', folderId);
        }
      }
      const { error } = await supabase.from('file_folders').delete().in('id', realIds);
      if (error) throw error;
      toast.success(`Διαγράφηκαν ${realIds.length} φάκελοι`);
      await Promise.all([fetchFolders(), fetchFiles()]);
    } catch (error) {
      console.error('Error deleting folders:', error);
      toast.error('Σφάλμα κατά τη μαζική διαγραφή φακέλων');
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

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => setImportWizardOpen(true)}
        >
          <ImportIcon className="h-4 w-4 mr-1.5" />
          Εισαγωγή
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {visibleFiles.length} αρχεί{visibleFiles.length === 1 ? 'ο' : 'α'}
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
        onMoveFiles={handleMoveFiles}
        onMoveFolders={handleMoveFolders}
        onDeleteFiles={handleDeleteFiles}
        onDeleteFolders={handleDeleteFolders}
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

      <ImportWizard
        open={importWizardOpen}
        onOpenChange={setImportWizardOpen}
        projects={projects}
        clients={clients}
        folders={folders}
        onComplete={async () => {
          await Promise.all([fetchFolders(), fetchFiles()]);
        }}
        onEntitiesChanged={async () => {
          await Promise.all([fetchClients(), fetchProjects(), fetchFolders()]);
        }}
      />
    </div>
  );
}
