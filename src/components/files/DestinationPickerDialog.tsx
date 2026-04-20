import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, Folder, Info, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileFolder } from './FolderTree';

export interface PickedDestination {
  scope: 'project' | 'company';
  projectId: string | null;
  folderId: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  client_id?: string | null;
}

interface DestinationPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectOption[];
  folders: FileFolder[];
  /** Optional: pre-select a project (e.g. when client group has only one project) */
  initialProjectId?: string | null;
  /** Optional: only allow selecting from this list of projects (e.g. for client group) */
  restrictToProjectIds?: string[] | null;
  /** Optional: allow company-scope selection */
  allowCompanyScope?: boolean;
  /** Default scope when dialog opens */
  defaultScope?: 'project' | 'company';
  title?: string;
  description?: string;
  onConfirm: (dest: PickedDestination) => void;
}

const NO_FOLDER = '__none__';

export function DestinationPickerDialog({
  open,
  onOpenChange,
  projects,
  folders,
  initialProjectId,
  restrictToProjectIds,
  allowCompanyScope = true,
  defaultScope = 'project',
  title = 'Επιλογή προορισμού',
  description = 'Δεν είναι σαφές πού πρέπει να αποθηκευτεί. Διάλεξε προορισμό.',
  onConfirm,
}: DestinationPickerDialogProps) {
  const availableProjects = useMemo(() => {
    if (!restrictToProjectIds) return projects;
    const allow = new Set(restrictToProjectIds);
    return projects.filter((p) => allow.has(p.id));
  }, [projects, restrictToProjectIds]);

  const [scope, setScope] = useState<'project' | 'company'>(defaultScope);
  const [projectId, setProjectId] = useState<string | null>(
    initialProjectId ?? (availableProjects[0]?.id ?? null)
  );
  const [folderId, setFolderId] = useState<string>(NO_FOLDER);
  const [companyFolderId, setCompanyFolderId] = useState<string>(NO_FOLDER);

  useEffect(() => {
    if (open) {
      setScope(defaultScope);
      setProjectId(initialProjectId ?? (availableProjects[0]?.id ?? null));
      setFolderId(NO_FOLDER);
      setCompanyFolderId(NO_FOLDER);
    }
  }, [open, initialProjectId, availableProjects, defaultScope]);

  const projectFolders = useMemo(() => {
    if (!projectId) return [];
    return folders
      .filter((f) => (f as any).project_id === projectId)
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'el', { numeric: true, sensitivity: 'base' })
      );
  }, [folders, projectId]);

  const companyFolders = useMemo(() => {
    return folders
      .filter((f) => (f as any).company_id && !(f as any).project_id && !(f as any).tender_id)
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'el', { numeric: true, sensitivity: 'base' })
      );
  }, [folders]);

  const handleConfirm = () => {
    if (scope === 'company') {
      onConfirm({
        scope: 'company',
        projectId: null,
        folderId: companyFolderId === NO_FOLDER ? null : companyFolderId,
      });
      onOpenChange(false);
      return;
    }
    if (!projectId) return;
    onConfirm({
      scope: 'project',
      projectId,
      folderId: folderId === NO_FOLDER ? null : folderId,
    });
    onOpenChange(false);
  };

  const canConfirm = scope === 'company' ? true : !!projectId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Επίλεξε αν θες να αποθηκευτεί κάτω από συγκεκριμένο έργο ή στην κεντρική
              αρχειοθήκη της εταιρίας.
            </span>
          </div>

          {/* Scope toggle */}
          {allowCompanyScope && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setScope('project')}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors',
                  scope === 'project'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <Briefcase className="h-4 w-4" />
                <span className="text-xs font-medium">Σε Έργο</span>
                <span className="text-[10px] text-muted-foreground">Αρχείο πελάτη/project</span>
              </button>
              <button
                type="button"
                onClick={() => setScope('company')}
                className={cn(
                  'flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors',
                  scope === 'company'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <Building2 className="h-4 w-4" />
                <span className="text-xs font-medium">Στην Εταιρία</span>
                <span className="text-[10px] text-muted-foreground">HR, templates, internal</span>
              </button>
            </div>
          )}

          {scope === 'project' && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Briefcase className="h-3.5 w-3.5" /> Έργο
                </Label>
                <Select
                  value={projectId ?? undefined}
                  onValueChange={(v) => {
                    setProjectId(v);
                    setFolderId(NO_FOLDER);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Επίλεξε έργο..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProjects.length === 0 && (
                      <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                        Δεν υπάρχουν διαθέσιμα έργα
                      </div>
                    )}
                    {availableProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Folder className="h-3.5 w-3.5" /> Φάκελος (προαιρετικά)
                </Label>
                <Select value={folderId} onValueChange={setFolderId} disabled={!projectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_FOLDER}>Χωρίς φάκελο (root του έργου)</SelectItem>
                    {projectFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {scope === 'company' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs">
                <Folder className="h-3.5 w-3.5" /> Φάκελος εταιρίας (προαιρετικά)
              </Label>
              <Select value={companyFolderId} onValueChange={setCompanyFolderId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FOLDER}>Στη ρίζα της εταιρίας</SelectItem>
                  {companyFolders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Άκυρο
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Αποθήκευση εδώ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
