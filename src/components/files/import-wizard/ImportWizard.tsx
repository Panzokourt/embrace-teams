import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Import as ImportIcon } from 'lucide-react';
import { createProjectFilesObjectKey } from '@/utils/storageKeys';
import type { FileFolder } from '../FolderTree';
import { StepSource } from './StepSource';
import { StepDestination } from './StepDestination';
import { StepMapping, buildInitialMappings } from './StepMapping';
import { StepConfirm } from './StepConfirm';
import type {
  DestinationSelection,
  FolderMapping,
  ImportProgress,
  SourceFile,
} from './types';

interface ProjectOption {
  id: string;
  name: string;
  client_id?: string | null;
}
interface ClientOption {
  id: string;
  name: string;
}

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  clients: ClientOption[];
  folders: FileFolder[];
  /** Initial files (e.g. when opened from a drag-and-drop). */
  initialFiles?: SourceFile[];
  /** Called after the import completes successfully so the parent can refresh. */
  onComplete: (dest: DestinationSelection) => Promise<void> | void;
  /** Called when wizard creates new entities so parent can refetch lists. */
  onEntitiesChanged: () => Promise<void> | void;
}

const STEPS = ['Επιλογή', 'Προορισμός', 'Αντιστοίχιση', 'Επιβεβαίωση'] as const;

const UPLOAD_PARALLELISM = 8;

export function ImportWizard({
  open,
  onOpenChange,
  projects,
  clients,
  folders,
  initialFiles,
  onComplete,
  onEntitiesChanged,
}: ImportWizardProps) {
  const { user, company } = useAuth();
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<SourceFile[]>(initialFiles ?? []);
  const [destination, setDestination] = useState<DestinationSelection | null>(null);
  const [mappings, setMappings] = useState<FolderMapping[]>([]);
  const [preserveStructure, setPreserveStructure] = useState(true);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [done, setDone] = useState(false);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setFiles(initialFiles ?? []);
      setDestination(null);
      setMappings([]);
      setPreserveStructure(true);
      setProgress(null);
      setDone(false);
    }
  }, [open, initialFiles]);

  // Group source files by top-level folder and count nested folders
  const sourceFolders = useMemo(() => {
    const counts = new Map<string, number>();
    const nested = new Map<string, Set<string>>();
    for (const sf of files) {
      const parts = sf.relativePath.split('/').filter(Boolean);
      const top = parts.length > 1 ? parts[0] : '';
      counts.set(top, (counts.get(top) ?? 0) + 1);
      if (parts.length > 2) {
        if (!nested.has(top)) nested.set(top, new Set());
        for (let i = 1; i < parts.length - 1; i++) {
          nested.get(top)!.add(parts.slice(1, i + 1).join('/'));
        }
      }
    }
    return [...counts.entries()]
      .map(([name, fileCount]) => ({
        name,
        fileCount,
        nestedFolderCount: nested.get(name)?.size ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'el'));
  }, [files]);

  const nestedFolderCount = useMemo(
    () => sourceFolders.reduce((sum, sf) => sum + sf.nestedFolderCount, 0),
    [sourceFolders]
  );

  // Build initial mappings whenever destination/sourceFolders change and we enter step 2
  useEffect(() => {
    if (step === 2 && destination) {
      setMappings(buildInitialMappings(sourceFolders, destination, folders));
    }
  }, [step, destination, sourceFolders, folders]);

  // ============ Inline create handlers ============

  const handleCreateClient = async (name: string): Promise<ClientOption | null> => {
    if (!company?.id) return null;
    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, company_id: company.id }])
      .select('id, name')
      .single();
    if (error) {
      toast.error('Αποτυχία δημιουργίας πελάτη');
      return null;
    }
    toast.success(`Δημιουργήθηκε ο πελάτης "${name}"`);
    await onEntitiesChanged();
    return data as ClientOption;
  };

  const handleCreateProject = async (
    name: string,
    clientId: string | null
  ): Promise<ProjectOption | null> => {
    if (!company?.id || !user) return null;
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          name,
          company_id: company.id,
          client_id: clientId,
          created_by: user.id,
          status: 'active',
        } as any,
      ])
      .select('id, name, client_id')
      .single();
    if (error) {
      toast.error('Αποτυχία δημιουργίας έργου');
      return null;
    }
    toast.success(`Δημιουργήθηκε το έργο "${name}"`);
    await onEntitiesChanged();
    return data as ProjectOption;
  };

  // ============ Validation ============

  const canNext = useMemo(() => {
    if (step === 0) return files.length > 0;
    if (step === 1) {
      if (!destination) return false;
      if (destination.scope === 'project' && !destination.projectId) return false;
      return true;
    }
    return true;
  }, [step, files.length, destination]);

  // ============ Destination label ============

  const destinationLabel = useMemo(() => {
    if (!destination) return '—';
    if (destination.scope === 'company') {
      const fname = destination.companyFolderId
        ? folders.find((f) => f.id === destination.companyFolderId)?.name
        : 'Ρίζα εταιρίας';
      return `Εταιρία › ${fname ?? 'Ρίζα'}`;
    }
    const p = projects.find((x) => x.id === destination.projectId);
    return `Έργο › ${p?.name ?? '?'}`;
  }, [destination, folders, projects]);

  // ============ Execute import ============

  const buildPlanForFile = (
    sf: SourceFile,
    folderIdByTop: Map<string, string | null>
  ): { folderId: string | null } => {
    const idx = sf.relativePath.indexOf('/');
    if (idx < 0) {
      return { folderId: folderIdByTop.get('') ?? null };
    }
    const top = sf.relativePath.slice(0, idx);
    return { folderId: folderIdByTop.get(top) ?? null };
  };

  const ensureSubfolder = async (
    name: string,
    parentId: string | null,
    scope: 'project' | 'company',
    projectId: string | null,
    cache: Map<string, string>
  ): Promise<string> => {
    const cacheKey = `${parentId ?? 'root'}::${name}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey)!;

    const payload: any = {
      name,
      parent_folder_id: parentId,
      created_by: user!.id,
    };
    if (scope === 'project') payload.project_id = projectId;
    else payload.company_id = company!.id;

    const { data, error } = await supabase
      .from('file_folders')
      .insert([payload])
      .select('id')
      .single();
    if (error) throw error;
    cache.set(cacheKey, data.id);
    return data.id;
  };

  const runImport = async () => {
    if (!user || !company?.id || !destination) return;

    const scope = destination.scope;
    const projectId = destination.projectId;
    const rootFolderId =
      scope === 'company' ? destination.companyFolderId : null;

    const estimatedFolderTotal =
      mappings.filter((m) => m.action.type === 'new' && m.sourceFolder).length +
      (preserveStructure ? nestedFolderCount : 0);

    setProgress({
      phase: estimatedFolderTotal > 0 ? 'folders' : 'files',
      total: estimatedFolderTotal > 0 ? estimatedFolderTotal : files.length,
      done: 0,
      failed: 0,
      folderTotal: estimatedFolderTotal,
      folderDone: 0,
    });
    setDone(false);

    try {
      // Resolve top-level destination folder for each mapping
      const folderIdByTop = new Map<string, string | null>();
      const folderIdBySourcePath = new Map<string, string | null>();
      const subfolderCache = new Map<string, string>();
      let foldersDone = 0;

      const markFolderProgress = (name: string) => {
        if (estimatedFolderTotal <= 0) return;
        foldersDone += 1;
        setProgress({
          phase: 'folders',
          total: estimatedFolderTotal,
          done: foldersDone,
          failed: 0,
          currentFolder: name,
          folderTotal: estimatedFolderTotal,
          folderDone: foldersDone,
        });
      };

      for (const m of mappings) {
        let folderId: string | null = rootFolderId;
        if (m.action.type === 'existing') {
          folderId = m.action.folderId;
        } else if (m.action.type === 'new' && m.sourceFolder) {
          folderId = await ensureSubfolder(
            m.action.name,
            rootFolderId,
            scope,
            projectId,
            subfolderCache
          );
          markFolderProgress(m.action.name);
        } else if (m.action.type === 'root') {
          folderId = rootFolderId;
        }
        folderIdByTop.set(m.sourceFolder, folderId);
        if (m.sourceFolder) folderIdBySourcePath.set(m.sourceFolder, folderId);
      }

      if (preserveStructure) {
        for (const sf of files) {
          const parts = sf.relativePath.split('/').filter(Boolean);
          if (parts.length <= 2) continue;
          const top = parts[0];
          let parent = folderIdByTop.get(top) ?? rootFolderId;
          for (let p = 1; p < parts.length - 1; p++) {
            const sourcePath = parts.slice(0, p + 1).join('/');
            if (folderIdBySourcePath.has(sourcePath)) {
              parent = folderIdBySourcePath.get(sourcePath) ?? null;
              continue;
            }
            parent = await ensureSubfolder(
              parts[p],
              parent,
              scope,
              projectId,
              subfolderCache
            );
            folderIdBySourcePath.set(sourcePath, parent);
            markFolderProgress(sourcePath);
          }
        }
      }

      // Upload files in batches
      let doneCount = 0;
      let failedCount = 0;

      setProgress({
        phase: 'files',
        total: files.length,
        done: 0,
        failed: 0,
        folderTotal: estimatedFolderTotal,
        folderDone: foldersDone,
      });

      for (let i = 0; i < files.length; i += UPLOAD_PARALLELISM) {
        const batch = files.slice(i, i + UPLOAD_PARALLELISM);

        await Promise.all(
          batch.map(async (sf) => {
            try {
              const { folderId: topFolderId } = buildPlanForFile(sf, folderIdByTop);
              let targetFolderId = topFolderId;
              if (preserveStructure) {
                const parts = sf.relativePath.split('/').filter(Boolean);
                if (parts.length > 2) {
                  targetFolderId =
                    folderIdBySourcePath.get(parts.slice(0, -1).join('/')) ?? topFolderId;
                }
              }

              const objectKey = createProjectFilesObjectKey({
                userId: user.id,
                originalName: sf.file.name,
              });
              const { error: upErr } = await supabase.storage
                .from('project-files')
                .upload(objectKey, sf.file);
              if (upErr) throw upErr;

              const payload: any = {
                file_name: sf.file.name,
                file_path: objectKey,
                file_size: sf.file.size,
                content_type: sf.file.type,
                uploaded_by: user.id,
                folder_id: targetFolderId,
              };
              if (scope === 'project') payload.project_id = projectId;
              else payload.company_id = company.id;

              const { error: insErr } = await supabase
                .from('file_attachments')
                .insert([payload]);
              if (insErr) throw insErr;

              doneCount += 1;
            } catch (err) {
              console.error('Import file failed:', sf.relativePath, err);
              failedCount += 1;
            } finally {
              setProgress({
                phase: 'files',
                total: files.length,
                done: doneCount,
                failed: failedCount,
                currentFile: sf.relativePath,
                folderTotal: estimatedFolderTotal,
                folderDone: foldersDone,
              });
            }
          })
        );
      }

      setDone(true);
      if (failedCount === 0) {
        toast.success(`Ανέβηκαν ${doneCount} αρχεία επιτυχώς!`);
      } else {
        toast.warning(`Ανέβηκαν ${doneCount} αρχεία, ${failedCount} απέτυχαν`);
      }
      await onComplete(destination);
    } catch (err) {
      console.error('Import failed:', err);
      toast.error('Σφάλμα κατά την εισαγωγή');
    }
  };

  const newFolderCount = mappings.filter(
    (m) => m.action.type === 'new' && m.sourceFolder
  ).length;

  const handleNext = async () => {
    if (step === 3) {
      // Already on confirm step → run
      await runImport();
      return;
    }
    // Skip mapping step if there are no top-level subfolders
    const hasSubfolders = sourceFolders.some((sf) => sf.name);
    if (step === 1 && !hasSubfolders) {
      setStep(3);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (step === 0) return;
    const hasSubfolders = sourceFolders.some((sf) => sf.name);
    if (step === 3 && !hasSubfolders) {
      setStep(1);
      return;
    }
    setStep(step - 1);
  };

  const isImporting = !!progress && !done;

  return (
    <Dialog open={open} onOpenChange={(v) => !isImporting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImportIcon className="h-5 w-5" />
            Εισαγωγή αρχείων & φακέλων
          </DialogTitle>
          <DialogDescription>
            Βήμα {step + 1} από {STEPS.length}: {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex items-center gap-1">
              <div
                className={
                  'h-1 flex-1 rounded-full ' +
                  (i <= step ? 'bg-primary' : 'bg-muted')
                }
              />
            </div>
          ))}
        </div>

        <div className="min-h-[280px]">
          {step === 0 && (
            <StepSource files={files} onFilesChange={setFiles} />
          )}
          {step === 1 && (
            <StepDestination
              destination={destination}
              onDestinationChange={setDestination}
              projects={projects}
              clients={clients}
              folders={folders}
              onCreateClient={handleCreateClient}
              onCreateProject={handleCreateProject}
            />
          )}
          {step === 2 && destination && (
            <StepMapping
              destination={destination}
              folders={folders}
              sourceFolders={sourceFolders}
              mappings={mappings}
              onMappingsChange={setMappings}
              preserveStructure={preserveStructure}
              onPreserveStructureChange={setPreserveStructure}
            />
          )}
          {step === 3 && (
            <StepConfirm
              summary={{
                fileCount: files.length,
                folderCount: newFolderCount,
                destinationLabel,
              }}
              progress={progress}
              done={done}
            />
          )}
        </div>

        <DialogFooter className="flex !justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0 || isImporting}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Πίσω
          </Button>
          {done ? (
            <Button onClick={() => onOpenChange(false)}>Κλείσιμο</Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canNext || isImporting}
            >
              {step === 3 ? (
                isImporting ? 'Ανέβασμα…' : 'Έναρξη εισαγωγής'
              ) : (
                <>
                  Επόμενο <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
