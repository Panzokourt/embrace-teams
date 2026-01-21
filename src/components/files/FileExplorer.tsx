import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FolderTree, type FileFolder } from './FolderTree';
import { FilesTableView, type FileAttachment } from './FilesTableView';

interface FileExplorerProps {
  tenderId?: string;
  projectId?: string;
}

interface RelatedEntity {
  id: string;
  name: string;
  type: 'deliverable' | 'task';
}

export function FileExplorer({ tenderId, projectId }: FileExplorerProps) {
  const { user, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [deliverables, setDeliverables] = useState<RelatedEntity[]>([]);
  const [tasks, setTasks] = useState<RelatedEntity[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchData();
  }, [tenderId, projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchFolders(),
        fetchFiles(),
        fetchRelatedEntities()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    let query = supabase
      .from('file_folders')
      .select('*')
      .order('name');

    if (tenderId) {
      query = query.eq('tender_id', tenderId);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;
    setFolders((data || []) as FileFolder[]);
  };

  const fetchFiles = async () => {
    let query = supabase
      .from('file_attachments')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenderId) {
      query = query.eq('tender_id', tenderId);
    } else if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch uploader profiles
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

  const fetchRelatedEntities = async () => {
    if (tenderId) {
      // Fetch tender deliverables and tasks
      const [delivRes, taskRes] = await Promise.all([
        supabase.from('tender_deliverables').select('id, name').eq('tender_id', tenderId),
        supabase.from('tender_tasks').select('id, title').eq('tender_id', tenderId)
      ]);

      setDeliverables((delivRes.data || []).map(d => ({ id: d.id, name: d.name, type: 'deliverable' as const })));
      setTasks((taskRes.data || []).map(t => ({ id: t.id, name: t.title, type: 'task' as const })));
    } else if (projectId) {
      // Fetch project deliverables and tasks
      const [delivRes, taskRes] = await Promise.all([
        supabase.from('deliverables').select('id, name').eq('project_id', projectId),
        supabase.from('tasks').select('id, title').eq('project_id', projectId)
      ]);

      setDeliverables((delivRes.data || []).map(d => ({ id: d.id, name: d.name, type: 'deliverable' as const })));
      setTasks((taskRes.data || []).map(t => ({ id: t.id, name: t.title, type: 'task' as const })));
    }
  };

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!user) return;

    try {
      const folderData: Record<string, unknown> = {
        name,
        parent_folder_id: parentId,
        created_by: user.id,
      };

      if (tenderId) folderData.tender_id = tenderId;
      if (projectId) folderData.project_id = projectId;

      const { error } = await supabase
        .from('file_folders')
        .insert([folderData as any]);

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
      // Move files to parent folder (handled by ON DELETE SET NULL)
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
        const fileName = `${user.id}/${Date.now()}_${file.name}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save file metadata
        const fileData: Record<string, unknown> = {
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id,
          folder_id: folderId,
        };

        if (tenderId) fileData.tender_id = tenderId;
        if (projectId) fileData.project_id = projectId;

        const { error: insertError } = await supabase
          .from('file_attachments')
          .insert([fileData as any]);

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

  return (
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
          files={files}
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
  );
}
