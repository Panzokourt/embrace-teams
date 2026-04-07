import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FinderColumnView } from './FinderColumnView';
import { FileUploadWizard, DOCTYPE_FOLDER_MAP } from './FileUploadWizard';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import { useDocumentParser } from '@/hooks/useDocumentParser';
import type { FileFolder } from './FolderTree';
import type { FileAttachment } from './FilesTableView';
import type { DocumentType, AnalysisData, ApplyFields } from './FileUploadWizard';

const DEFAULT_FOLDER_NAMES = [
  'Προτάσεις', 'Παρουσιάσεις', 'Προσφορές', 'Συμβόλαια & Συμβάσεις',
  'Briefs', 'Αναφορές', 'Δημιουργικά', 'Τιμολόγια & Παραστατικά',
  'Προμηθευτές', 'Αλληλογραφία',
];

interface FileExplorerProps {
  tenderId?: string;
  projectId?: string;
  taskId?: string;
}

export function FileExplorer({ tenderId, projectId, taskId }: FileExplorerProps) {
  const { user, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const canManage = isAdmin || isManager;
  const { parseFiles } = useDocumentParser();

  useEffect(() => {
    fetchData();
  }, [tenderId, projectId, taskId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fetchedFolders] = await Promise.all([fetchFolders(), fetchFiles()]);
      if (projectId && fetchedFolders && fetchedFolders.length === 0) {
        await autoCreateFolders();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const autoCreateFolders = async () => {
    if (!user || !projectId) return;
    try {
      const { data: project } = await supabase.from('projects').select('company_id').eq('id', projectId).single();
      if (!project) return;
      const { data: templates } = await supabase.from('project_folder_templates').select('name, sort_order').eq('company_id', project.company_id).order('sort_order');
      const folderNames = templates && templates.length > 0 ? templates.map(t => t.name) : DEFAULT_FOLDER_NAMES;
      const inserts = folderNames.map(name => ({ name, project_id: projectId, created_by: user.id }));
      const { error } = await supabase.from('file_folders').insert(inserts);
      if (error) throw error;
      await fetchFolders();
    } catch (error) {
      console.error('Error auto-creating folders:', error);
    }
  };

  const fetchFolders = async (): Promise<FileFolder[]> => {
    let query = supabase.from('file_folders').select('*').order('name');
    if (tenderId) query = query.eq('tender_id', tenderId);
    else if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    const result = (data || []) as FileFolder[];
    setFolders(result);
    return result;
  };

  const fetchFiles = async () => {
    let query = supabase.from('file_attachments').select('*').order('created_at', { ascending: false });
    if (taskId) query = query.eq('task_id', taskId);
    else if (tenderId) query = query.eq('tender_id', tenderId);
    else if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((f) => f.uploaded_by))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      setFiles(data.map((file) => ({ ...file, uploader: profilesMap.get(file.uploaded_by) || { full_name: null, email: 'Unknown' } })) as FileAttachment[]);
    } else {
      setFiles([]);
    }
  };

  const handleCreateFolder = async (name: string, parentId: string | null) => {
    if (!user) return;
    try {
      const folderData: Record<string, unknown> = { name, parent_folder_id: parentId, created_by: user.id };
      if (tenderId) folderData.tender_id = tenderId;
      if (projectId) folderData.project_id = projectId;
      const { error } = await supabase.from('file_folders').insert([folderData as any]);
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
      const { error } = await supabase.from('file_folders').update({ name: newName }).eq('id', folderId);
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
        await supabase.from('file_attachments').update({ folder_id: folder.parent_folder_id }).eq('folder_id', folderId);
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

  // Upload files and return their IDs
  const handleUploadWithType = async (
    selectedFiles: FileList, folderId: string | null, documentType: DocumentType, _runAnalysis: boolean
  ): Promise<string[]> => {
    if (!user) return [];
    setUploading(true);
    const uploadedFileIds: string[] = [];
    try {
      for (const file of Array.from(selectedFiles)) {
        const fileName = createProjectFilesObjectKey({ userId: user.id, originalName: file.name });
        const { error: uploadError } = await supabase.storage.from('project-files').upload(fileName, file);
        if (uploadError) throw uploadError;
        const fileData: Record<string, unknown> = {
          file_name: file.name, file_path: fileName, file_size: file.size,
          content_type: file.type, uploaded_by: user.id, folder_id: folderId, document_type: documentType,
        };
        if (tenderId) fileData.tender_id = tenderId;
        if (projectId) fileData.project_id = projectId;
        const { data: inserted, error: insertError } = await supabase.from('file_attachments').insert([fileData as any]).select('id').single();
        if (insertError) throw insertError;
        if (inserted) uploadedFileIds.push(inserted.id);
      }
      toast.success('Τα αρχεία ανέβηκαν επιτυχώς!');
      await fetchFiles();
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Σφάλμα κατά το ανέβασμα');
    } finally {
      setUploading(false);
    }
    return uploadedFileIds;
  };

  // Legacy upload handler for FinderColumnView drag-drop
  const handleUpload = async (selectedFiles: FileList, folderId: string | null) => {
    await handleUploadWithType(selectedFiles, folderId, 'other', false);
  };

  // Run AI analysis and return extracted data
  const runDocumentAnalysis = async (fileId: string, documentType: string): Promise<AnalysisData | null> => {
    try {
      const file = files.find(f => f.id === fileId) ||
        (await supabase.from('file_attachments').select('*').eq('id', fileId).single()).data;
      if (!file) throw new Error('File not found');

      const contentType = (file as any).content_type || '';
      let textContent = '';

      if (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml')) {
        const { data: fileData, error: dlError } = await supabase.storage.from('project-files').download((file as any).file_path);
        if (dlError) throw dlError;
        textContent = await fileData.text();
      } else {
        const { data: fileData, error: dlError } = await supabase.storage.from('project-files').download((file as any).file_path);
        if (dlError) throw dlError;
        const fileObj = new window.File([fileData], (file as any).file_name, { type: contentType });
        const parsed = await parseFiles([fileObj]);
        if (parsed && parsed.length > 0) textContent = parsed[0].content;
        if (!textContent || textContent.length < 50) {
          textContent = `[Αρχείο: ${(file as any).file_name}, Τύπος: ${contentType}] Δεν ήταν δυνατή η εξαγωγή κειμένου.`;
        }
      }

      if (textContent.length > 400000) textContent = textContent.substring(0, 400000);

      const { data: result, error: fnError } = await supabase.functions.invoke('analyze-document', {
        body: { fileId, documentType, textContent },
      });
      if (fnError) throw fnError;

      if (result?.analysis) {
        toast.success('Η ανάλυση ολοκληρώθηκε!');
        await fetchFiles();
        return result.analysis as AnalysisData;
      }
      return null;
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Σφάλμα κατά την ανάλυση');
      return null;
    }
  };

  // Apply analysis results to project fields
  const applyAnalysisToProject = async (fields: ApplyFields, documentType: DocumentType, fileId: string) => {
    if (!projectId || !user) return;
    try {
      const { data: project } = await supabase.from('projects').select('company_id, description').eq('id', projectId).single();
      if (!project) throw new Error('Project not found');

      // 1. Update project fields
      const updates: Record<string, any> = {};
      if (fields.description) {
        const existing = project.description || '';
        updates.description = existing
          ? `${existing}\n\n--- AI Ανάλυση (${new Date().toLocaleDateString('el')}) ---\n${fields.description}`
          : fields.description;
      }
      if (fields.budget !== null) updates.budget = fields.budget;
      if (fields.startDate) updates.start_date = fields.startDate;
      if (fields.endDate) updates.end_date = fields.endDate;

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from('projects').update(updates).eq('id', projectId);
        if (error) throw error;
      }

      // 2. Create deliverables
      const selectedDeliverables = fields.deliverables.filter(d => d.selected);
      if (selectedDeliverables.length > 0) {
        const { error } = await supabase.from('deliverables').insert(
          selectedDeliverables.map(d => ({ name: d.name, project_id: projectId }))
        );
        if (error) console.error('Error creating deliverables:', error);
      }

      // 3. Create tasks
      const selectedTasks = fields.tasks.filter(t => t.selected);
      if (selectedTasks.length > 0) {
        const { error } = await supabase.from('tasks').insert(
          selectedTasks.map(t => ({
            title: t.title,
            project_id: projectId,
            status: 'todo' as any,
            is_ai_generated: true,
            created_by: user.id,
          }))
        );
        if (error) console.error('Error creating tasks:', error);
      }

      // 4. Create contract record if contract type
      if (documentType === 'contract') {
        await supabase.from('project_contracts').insert({
          project_id: projectId,
          file_attachment_id: fileId,
          company_id: project.company_id,
          contract_type: 'Σύμβαση',
          parties: fields.parties || [],
          start_date: fields.startDate || null,
          end_date: fields.endDate || null,
          value: fields.budget,
          status: 'active',
          extracted_data: {},
        } as any);
      }

      toast.success('Τα δεδομένα εφαρμόστηκαν στο έργο!');
    } catch (error) {
      console.error('Error applying analysis:', error);
      toast.error('Σφάλμα κατά την εφαρμογή');
      throw error;
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

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Αναζήτηση αρχείων..." className="pl-9 pr-8" />
          {searchQuery && (
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} size="sm">
          <Upload className="h-4 w-4 mr-1" /> Ανέβασμα
        </Button>
      </div>

      <FinderColumnView
        files={files} folders={folders} onUpload={handleUpload} onDelete={handleDeleteFile}
        onCreateFolder={handleCreateFolder} onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder} onMoveFile={handleMoveFile}
        onMoveFolder={async (folderId, targetParentId) => {
          try {
            const { error } = await supabase.from('file_folders').update({ parent_folder_id: targetParentId }).eq('id', folderId);
            if (error) throw error;
            toast.success('Ο φάκελος μετακινήθηκε!');
            await fetchFolders();
          } catch { toast.error('Σφάλμα μετακίνησης φακέλου'); }
        }}
        canManage={canManage} loading={loading} uploading={uploading} searchQuery={searchQuery}
      />

      <FileUploadWizard
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUploadWithType}
        onRunAnalysis={runDocumentAnalysis}
        onApplyToProject={projectId ? applyAnalysisToProject : undefined}
        folders={folders.map(f => ({ id: f.id, name: f.name }))}
        uploading={uploading}
        hasProject={!!projectId}
      />
    </div>
  );
}
