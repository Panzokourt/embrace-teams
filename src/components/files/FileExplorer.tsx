import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Search, X, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FinderColumnView } from './FinderColumnView';
import { FileUploadDialog, DOCTYPE_FOLDER_MAP } from './FileUploadDialog';
import { DocumentAnalysisPanel } from './DocumentAnalysisPanel';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import type { FileFolder } from './FolderTree';
import type { FileAttachment } from './FilesTableView';
import type { DocumentType } from './FileUploadDialog';

interface FileExplorerProps {
  tenderId?: string;
  projectId?: string;
}

export function FileExplorer({ tenderId, projectId }: FileExplorerProps) {
  const { user, isAdmin, isManager } = useAuth();
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFileForAnalysis, setSelectedFileForAnalysis] = useState<FileAttachment | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const canManage = isAdmin || isManager;

  useEffect(() => {
    fetchData();
  }, [tenderId, projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchFolders(), fetchFiles()]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    let query = supabase.from('file_folders').select('*').order('name');
    if (tenderId) query = query.eq('tender_id', tenderId);
    else if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) throw error;
    setFolders((data || []) as FileFolder[]);
  };

  const fetchFiles = async () => {
    let query = supabase
      .from('file_attachments')
      .select('*')
      .order('created_at', { ascending: false });
    if (tenderId) query = query.eq('tender_id', tenderId);
    else if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
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

  const handleUploadWithType = async (
    selectedFiles: FileList,
    folderId: string | null,
    documentType: DocumentType,
    runAnalysis: boolean
  ) => {
    if (!user) return;
    setUploading(true);
    const uploadedFileIds: string[] = [];
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

        const fileData: Record<string, unknown> = {
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: user.id,
          folder_id: folderId,
          document_type: documentType,
        };
        if (tenderId) fileData.tender_id = tenderId;
        if (projectId) fileData.project_id = projectId;

        const { data: inserted, error: insertError } = await supabase
          .from('file_attachments')
          .insert([fileData as any])
          .select('id')
          .single();
        if (insertError) throw insertError;
        if (inserted) uploadedFileIds.push(inserted.id);
      }
      toast.success('Τα αρχεία ανέβηκαν επιτυχώς!');
      await fetchFiles();

      // Run AI analysis if requested
      if (runAnalysis && uploadedFileIds.length > 0) {
        for (const fileId of uploadedFileIds) {
          await runDocumentAnalysis(fileId, documentType);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Σφάλμα κατά το ανέβασμα');
    } finally {
      setUploading(false);
    }
  };

  // Legacy upload handler for FinderColumnView drag-drop
  const handleUpload = async (selectedFiles: FileList, folderId: string | null) => {
    await handleUploadWithType(selectedFiles, folderId, 'other', false);
  };

  const runDocumentAnalysis = async (fileId: string, documentType: string) => {
    setAnalyzing(true);
    try {
      // Get file content for analysis
      const file = files.find(f => f.id === fileId) || 
        (await supabase.from('file_attachments').select('*').eq('id', fileId).single()).data;
      
      if (!file) throw new Error('File not found');

      // Download file content
      const { data: fileData, error: dlError } = await supabase.storage
        .from('project-files')
        .download((file as any).file_path);
      if (dlError) throw dlError;

      let textContent = '';
      const contentType = (file as any).content_type || '';
      
      if (contentType.includes('text') || contentType.includes('json') || contentType.includes('xml')) {
        textContent = await fileData.text();
      } else if (contentType.includes('pdf')) {
        // For PDF, send base64 and let AI handle it
        const arrayBuf = await fileData.arrayBuffer();
        const bytes = new Uint8Array(arrayBuf);
        // Truncate to ~300KB for safety
        const truncated = bytes.slice(0, 300000);
        textContent = `[PDF document: ${(file as any).file_name}] Base64 content follows, extract text and analyze:\n` +
          btoa(String.fromCharCode(...truncated));
      } else {
        textContent = `[Αρχείο: ${(file as any).file_name}, Τύπος: ${contentType}] Δεν είναι δυνατή η εξαγωγή κειμένου.`;
      }

      // Truncate
      if (textContent.length > 400000) {
        textContent = textContent.substring(0, 400000);
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('analyze-document', {
        body: { fileId, documentType, textContent },
      });

      if (fnError) throw fnError;

      if (result?.analysis) {
        toast.success('Η ανάλυση ολοκληρώθηκε!');
        // Auto-create contract record if document type is contract
        if (documentType === 'contract' && projectId && result.analysis) {
          await createContractFromAnalysis(fileId, result.analysis);
        }
        await fetchFiles();
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Σφάλμα κατά την ανάλυση');
    } finally {
      setAnalyzing(false);
    }
  };

  const createContractFromAnalysis = async (fileId: string, analysis: any) => {
    if (!projectId || !user) return;
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('company_id')
        .eq('id', projectId)
        .single();
      if (!project) return;

      await supabase.from('project_contracts').insert({
        project_id: projectId,
        file_attachment_id: fileId,
        company_id: project.company_id,
        contract_type: analysis.contract_type || 'Σύμβαση',
        parties: analysis.parties || [],
        start_date: analysis.start_date || null,
        end_date: analysis.end_date || null,
        value: analysis.value || null,
        status: 'active',
        extracted_data: analysis,
      } as any);
    } catch (error) {
      console.error('Error creating contract:', error);
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
      if (selectedFileForAnalysis?.id === file.id) setSelectedFileForAnalysis(null);
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
      {/* Header with search & upload */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
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
        <Button onClick={() => setUploadDialogOpen(true)} size="sm">
          <Upload className="h-4 w-4 mr-1" />
          Ανέβασμα
        </Button>
      </div>

      {/* Analysis panel for selected file */}
      {selectedFileForAnalysis && (
        <DocumentAnalysisPanel
          fileId={selectedFileForAnalysis.id}
          fileName={selectedFileForAnalysis.file_name}
          documentType={(selectedFileForAnalysis as any).document_type || 'other'}
          analysis={(selectedFileForAnalysis as any).ai_analysis || null}
          onAnalysisUpdate={(analysis) => {
            setFiles(prev => prev.map(f => 
              f.id === selectedFileForAnalysis.id ? { ...f, ai_analysis: analysis } as any : f
            ));
            setSelectedFileForAnalysis(prev => prev ? { ...prev, ai_analysis: analysis } as any : null);
          }}
          onReanalyze={() => runDocumentAnalysis(selectedFileForAnalysis.id, (selectedFileForAnalysis as any).document_type || 'other')}
          analyzing={analyzing}
        />
      )}

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

      {/* Upload Dialog */}
      <FileUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUpload={handleUploadWithType}
        folders={folders.map(f => ({ id: f.id, name: f.name }))}
        uploading={uploading}
      />
    </div>
  );
}
