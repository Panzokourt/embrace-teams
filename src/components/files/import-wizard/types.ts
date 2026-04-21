// Shared types for the Import Wizard.

export interface SourceFile {
  file: File;
  /** Path relative to the dropped/selected root, e.g. "Συμβόλαια/2024/contract.pdf" or "single.pdf". */
  relativePath: string;
}

export type DestinationScope = 'project' | 'company';

export interface DestinationSelection {
  scope: DestinationScope;
  /** Required when scope === 'project'. */
  projectId: string | null;
  /** Optional company root sub-folder when scope === 'company'. */
  companyFolderId: string | null;
}

export type FolderMappingAction =
  | { type: 'existing'; folderId: string }
  | { type: 'new'; name: string }
  | { type: 'root' }; // upload to destination root, no extra folder

export interface FolderMapping {
  /** Top-level source folder name from the relative paths (empty string = root files). */
  sourceFolder: string;
  /** How many files (recursive) live under this top-level folder. */
  fileCount: number;
  /** Suggested action that the wizard pre-selects. */
  suggestion: FolderMappingAction;
  /** Confidence 0-100 of the suggestion. */
  score: number;
  /** User-overridden action (defaults to suggestion). */
  action: FolderMappingAction;
}

export interface ImportPlan {
  destination: DestinationSelection;
  /** When true, sub-folders inside each top-level source folder are recreated. Otherwise files are flattened. */
  preserveStructure: boolean;
  mappings: FolderMapping[];
}

export interface ImportProgress {
  phase: 'folders' | 'files';
  total: number;
  done: number;
  currentFile?: string;
  currentFolder?: string;
  failed: number;
  folderTotal?: number;
  folderDone?: number;
}
