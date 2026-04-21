// Shared types for the Bulk Import Wizard

export type ImportEntity = 'clients' | 'projects' | 'tasks';

export interface FieldDef {
  /** Internal DB column name */
  key: string;
  /** Greek label shown in mapping dropdown */
  label: string;
  /** Whether this field is required */
  required?: boolean;
  /** Type used for validation/parsing */
  type: 'string' | 'email' | 'number' | 'date' | 'enum' | 'tags' | 'phone' | 'url';
  /** Allowed values when type === 'enum' */
  enumValues?: { value: string; label: string }[];
  /** Foreign key target — used at validation step */
  fk?: 'client' | 'project' | 'user';
  /** Help text shown in mapping/template */
  hint?: string;
  /** Aliases used by fuzzy matching */
  aliases?: string[];
}

export interface EntitySchema {
  entity: ImportEntity;
  /** Greek label for stepper / titles */
  label: string;
  /** Greek label in plural for summary */
  labelPlural: string;
  fields: FieldDef[];
  /** Example row used in template */
  exampleRow: Record<string, string | number | string[]>;
}

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  /** Original sheet name (excel only) */
  sheetName?: string;
  /** All sheets discovered (excel only) */
  sheetNames?: string[];
}

export type ColumnMapping = Record<string, string | null>; // file header -> field key (or null = ignore)

export interface RowIssue {
  field: string;
  level: 'error' | 'warning';
  message: string;
}

export interface ValidatedRow {
  /** Original row index in the file (0-based, excluding header) */
  index: number;
  /** Mapped+coerced values (field key → value) */
  values: Record<string, any>;
  /** Per-row issues */
  issues: RowIssue[];
  /** Foreign-key resolution context */
  fkResolution?: {
    /** For projects: client_name → resolved client_id (or null) */
    clientId?: string | null;
    clientNameRaw?: string | null;
    /** For tasks: project_name → resolved project_id (or null) */
    projectId?: string | null;
    projectNameRaw?: string | null;
    /** For tasks: assigned_to_email → resolved user_id (or null) */
    assignedTo?: string | null;
    assignedToRaw?: string | null;
  };
  /** True if user marked this row to skip */
  skip?: boolean;
}

export interface ImportSummary {
  total: number;
  created: number;
  skipped: number;
  failed: number;
  failures: { index: number; error: string; data: Record<string, any> }[];
  newClients?: number;
  newProjects?: number;
}
