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
import { Briefcase, Folder, Info } from 'lucide-react';
import type { FileFolder } from './FolderTree';

export interface PickedDestination {
  projectId: string;
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
  title = 'Επιλογή προορισμού',
  description = 'Δεν είναι σαφές πού πρέπει να αποθηκευτεί. Διάλεξε έργο και προαιρετικά φάκελο.',
  onConfirm,
}: DestinationPickerDialogProps) {
  const availableProjects = useMemo(() => {
    if (!restrictToProjectIds) return projects;
    const allow = new Set(restrictToProjectIds);
    return projects.filter((p) => allow.has(p.id));
  }, [projects, restrictToProjectIds]);

  const [projectId, setProjectId] = useState<string | null>(
    initialProjectId ?? (availableProjects[0]?.id ?? null)
  );
  const [folderId, setFolderId] = useState<string>(NO_FOLDER);

  useEffect(() => {
    if (open) {
      setProjectId(initialProjectId ?? (availableProjects[0]?.id ?? null));
      setFolderId(NO_FOLDER);
    }
  }, [open, initialProjectId, availableProjects]);

  const projectFolders = useMemo(() => {
    if (!projectId) return [];
    return folders
      .filter((f) => (f as any).project_id === projectId)
      .sort((a, b) =>
        a.name.localeCompare(b.name, 'el', { numeric: true, sensitivity: 'base' })
      );
  }, [folders, projectId]);

  const handleConfirm = () => {
    if (!projectId) return;
    onConfirm({
      projectId,
      folderId: folderId === NO_FOLDER ? null : folderId,
    });
    onOpenChange(false);
  };

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
              Τα αρχεία αρχειοθετούνται πάντα κάτω από ένα έργο. Επίλεξε σε ποιο έργο
              ανήκει αυτό το upload.
            </span>
          </div>

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
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Άκυρο
          </Button>
          <Button onClick={handleConfirm} disabled={!projectId}>
            Αποθήκευση εδώ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
