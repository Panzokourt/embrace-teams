import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FinderColumnView } from './FinderColumnView';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import type { FileFolder } from './FolderTree';
import type { FileAttachment } from './FilesTableView';

export function CentralFileExplorer() {
  const { user, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchFolders(), fetchFiles()]);
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
      const userIds = [...new Set(data.map((f) => f.uploaded_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setFiles(
        data.map((file) => ({
          ...file,
          uploader: profilesMap.get(file.uploaded_by) || {
            full_name: null,
            email: 'Unknown',
          },
        })) as FileAttachment[]
      );
    } else {
      setFiles([]);
    }
  };

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!user) return;
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
          .insert([
            {
              file_name: file.name,
              file_path: fileName,
              file_size: file.size,
              content_type: file.type,
              uploaded_by: user.id,
              folder_id: folderId,
            },
          ]);
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
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast.success('Το αρχείο διαγράφηκε!');
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Σφάλμα κατά τη διαγραφή');
    }
  };

  const handleMoveFile = async (fileId: string, folderId: string | null) => {
    try {
      const { error } = await supabase
        .from('file_attachments')
        .update({ folder_id: folderId })
        .eq('id', fileId);
      if (error) throw error;
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, folder_id: folderId } : f))
      );
      const folderName = folderId
        ? folders.find((f) => f.id === folderId)?.name
        : 'Χωρίς φάκελο';
      toast.success(`Μετακινήθηκε στο "${folderName}"`);
    } catch (error) {
      console.error('Error moving file:', error);
      toast.error('Σφάλμα κατά τη μετακίνηση');
    }
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Αναζήτηση αρχείων..."
          className="pl-9 pr-8"
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

      {/* Finder view */}
      <FinderColumnView
        files={files}
        folders={folders}
        onUpload={handleUpload}
        onDelete={handleDeleteFile}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onMoveFile={handleMoveFile}
        canManage={canManage}
        loading={loading}
        uploading={uploading}
        searchQuery={searchQuery}
      />
    </div>
  );
}
