import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Folder, FolderPlus, Sparkles } from 'lucide-react';
import type { FileFolder } from '../FolderTree';
import type {
  DestinationSelection,
  FolderMapping,
  FolderMappingAction,
} from './types';
import {
  AUTO_PICK_THRESHOLD,
  AUTO_SUGGEST_THRESHOLD,
  suggestFolderMatch,
  type FolderCandidate,
} from './folderMatcher';
import { DOCTYPE_FOLDER_MAP } from '../FileUploadWizard';

interface StepMappingProps {
  destination: DestinationSelection;
  folders: FileFolder[];
  /** Top-level source folders + file counts (computed by parent). */
  sourceFolders: { name: string; fileCount: number; nestedFolderCount?: number }[];
  mappings: FolderMapping[];
  onMappingsChange: (mappings: FolderMapping[]) => void;
  preserveStructure: boolean;
  onPreserveStructureChange: (v: boolean) => void;
}

const NEW = '__new__';
const ROOT = '__root__';

export function buildInitialMappings(
  sourceFolders: { name: string; fileCount: number; nestedFolderCount?: number }[],
  destination: DestinationSelection,
  folders: FileFolder[]
): FolderMapping[] {
  const candidates = collectCandidates(destination, folders);
  return sourceFolders.map(({ name, fileCount }) => {
    if (!name) {
      return {
        sourceFolder: '',
        fileCount,
        suggestion: { type: 'root' },
        action: { type: 'root' },
        score: 100,
      };
    }
    const match = suggestFolderMatch(name, candidates);
    let suggestion: FolderMappingAction;
    if (match.candidate && match.score >= AUTO_PICK_THRESHOLD) {
      suggestion = { type: 'existing', folderId: match.candidate.id };
    } else {
      suggestion = { type: 'new', name };
    }
    return {
      sourceFolder: name,
      fileCount,
      suggestion,
      action: suggestion,
      score: match.score,
    };
  });
}

function collectCandidates(
  destination: DestinationSelection,
  folders: FileFolder[]
): FolderCandidate[] {
  const list: FolderCandidate[] = [];

  if (destination.scope === 'project' && destination.projectId) {
    folders
      .filter((f) => (f as any).project_id === destination.projectId)
      .forEach((f) => list.push({ id: f.id, name: f.name }));
  } else if (destination.scope === 'company') {
    const parent = destination.companyFolderId;
    folders
      .filter(
        (f) =>
          (f as any).company_id &&
          !(f as any).project_id &&
          (parent ? f.parent_folder_id === parent : !f.parent_folder_id)
      )
      .forEach((f) => list.push({ id: f.id, name: f.name }));
  }

  // Always include the doctype canonical names (in case folder doesn't exist yet
  // we still suggest using that name when creating a new one)
  Object.values(DOCTYPE_FOLDER_MAP).forEach((name) => {
    if (!list.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      list.push({ id: `__doctype_${name}`, name });
    }
  });

  return list;
}

export function StepMapping({
  destination,
  folders,
  sourceFolders,
  mappings,
  onMappingsChange,
  preserveStructure,
  onPreserveStructureChange,
}: StepMappingProps) {
  const candidates = useMemo(
    () => collectCandidates(destination, folders).filter((c) => !c.id.startsWith('__doctype_')),
    [destination, folders]
  );

  const updateRow = (index: number, action: FolderMappingAction) => {
    onMappingsChange(
      mappings.map((m, i) => (i === index ? { ...m, action } : m))
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg">
        <Checkbox
          id="preserve"
          checked={preserveStructure}
          onCheckedChange={(v) => onPreserveStructureChange(!!v)}
        />
        <Label htmlFor="preserve" className="text-xs cursor-pointer">
          Διατήρηση δομής υποφακέλων (αν αποεπιλεγεί, όλα τα αρχεία επίπεδα)
        </Label>
      </div>

      {sourceFolders.length === 0 || (sourceFolders.length === 1 && !sourceFolders[0].name) ? (
        <p className="text-xs text-muted-foreground italic px-2">
          Δεν υπάρχουν υποφάκελοι στην πηγή — όλα τα αρχεία θα ανέβουν στη ρίζα του προορισμού.
        </p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_1.4fr_auto] gap-2 px-3 py-2 bg-muted/40 border-b text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Φάκελος πηγής</span>
            <span>Προορισμός</span>
            <span>Αρχεία</span>
          </div>
          <ul className="divide-y max-h-[320px] overflow-y-auto">
            {mappings.map((m, idx) => {
              if (!m.sourceFolder) return null;
              const value =
                m.action.type === 'existing'
                  ? m.action.folderId
                  : m.action.type === 'new'
                  ? NEW
                  : ROOT;
              const isAutoSuggest =
                m.suggestion.type === 'existing' &&
                m.score >= AUTO_SUGGEST_THRESHOLD;
              return (
                <li
                  key={`${m.sourceFolder}-${idx}`}
                  className="grid grid-cols-[1fr_1.4fr_auto] gap-2 px-3 py-2 items-center text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{m.sourceFolder}</span>
                    </div>
                    {preserveStructure && (sourceFolders[idx]?.nestedFolderCount ?? 0) > 0 && (
                      <div className="text-[10px] text-muted-foreground truncate pl-5">
                        +{sourceFolders[idx].nestedFolderCount} υποφάκελοι θα διατηρηθούν
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Select
                      value={value}
                      onValueChange={(v) => {
                        if (v === NEW) updateRow(idx, { type: 'new', name: m.sourceFolder });
                        else if (v === ROOT) updateRow(idx, { type: 'root' });
                        else updateRow(idx, { type: 'existing', folderId: v });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NEW}>
                          <span className="flex items-center gap-1.5">
                            <FolderPlus className="h-3.5 w-3.5" />
                            Νέος φάκελος "{m.sourceFolder}"
                          </span>
                        </SelectItem>
                        <SelectItem value={ROOT}>Στη ρίζα του προορισμού</SelectItem>
                        {candidates.length > 0 && (
                          <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase">
                            Υπάρχοντες
                          </div>
                        )}
                        {candidates.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isAutoSuggest && m.action === m.suggestion && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] gap-0.5"
                        title={`Αυτόματη πρόταση (${m.score}%)`}
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {m.score}%
                      </Badge>
                    )}
                  </div>
                  <span className="text-muted-foreground tabular-nums text-[11px]">
                    {m.fileCount}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
