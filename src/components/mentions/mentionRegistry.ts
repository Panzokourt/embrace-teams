import {
  User, FolderKanban, CheckSquare, Building2, FileSignature, Package,
  Receipt, Megaphone, Gavel, File as FileIcon, Mail, BookOpen,
  Calendar, Search, Sparkles, HelpCircle, Plus, type LucideIcon,
} from 'lucide-react';

export type MentionType =
  | 'user' | 'project' | 'task' | 'client' | 'contract'
  | 'deliverable' | 'invoice' | 'campaign' | 'tender'
  | 'file' | 'email' | 'wiki';

export interface MentionEntity {
  id: string;
  type: MentionType;
  label: string;       // primary display name
  sub?: string;        // secondary line (email, status, etc.)
  href?: string;       // navigate target on click
}

export interface MentionTypeConfig {
  type: MentionType;
  icon: LucideIcon;
  label: string;       // group header in popover (Greek)
  /** Tailwind class for icon color (semantic when possible). */
  colorClass: string;
  routePrefix?: string; // for click-to-navigate (joined with id)
}

export const MENTION_TYPES: Record<MentionType, MentionTypeConfig> = {
  user:        { type: 'user',        icon: User,           label: 'Άτομα',         colorClass: 'text-primary',                         routePrefix: '/team' },
  project:     { type: 'project',     icon: FolderKanban,   label: 'Έργα',          colorClass: 'text-emerald-500 dark:text-emerald-400', routePrefix: '/projects' },
  task:        { type: 'task',        icon: CheckSquare,    label: 'Tasks',         colorClass: 'text-amber-500 dark:text-amber-400',     routePrefix: '/tasks' },
  client:      { type: 'client',      icon: Building2,      label: 'Πελάτες',       colorClass: 'text-blue-500 dark:text-blue-400',       routePrefix: '/clients' },
  contract:    { type: 'contract',    icon: FileSignature,  label: 'Συμβόλαια',     colorClass: 'text-violet-500 dark:text-violet-400',   routePrefix: '/contracts' },
  deliverable: { type: 'deliverable', icon: Package,        label: 'Παραδοτέα',     colorClass: 'text-orange-500 dark:text-orange-400',   routePrefix: '/projects' },
  invoice:     { type: 'invoice',     icon: Receipt,        label: 'Τιμολόγια',     colorClass: 'text-pink-500 dark:text-pink-400',       routePrefix: '/invoices' },
  campaign:    { type: 'campaign',    icon: Megaphone,      label: 'Καμπάνιες',     colorClass: 'text-rose-500 dark:text-rose-400',       routePrefix: '/campaigns' },
  tender:      { type: 'tender',      icon: Gavel,          label: 'Διαγωνισμοί',   colorClass: 'text-yellow-500 dark:text-yellow-400',   routePrefix: '/tenders' },
  file:        { type: 'file',        icon: FileIcon,       label: 'Αρχεία',        colorClass: 'text-slate-500 dark:text-slate-400',     routePrefix: '/files' },
  email:       { type: 'email',       icon: Mail,           label: 'Emails',        colorClass: 'text-cyan-500 dark:text-cyan-400',       routePrefix: '/inbox' },
  wiki:        { type: 'wiki',        icon: BookOpen,       label: 'Wiki',          colorClass: 'text-indigo-500 dark:text-indigo-400',   routePrefix: '/knowledge' },
};

export const ALL_MENTION_TYPES: MentionType[] = Object.keys(MENTION_TYPES) as MentionType[];

// ───────────────────── Slash commands ─────────────────────
export interface SlashCommand {
  command: string;           // without leading "/"
  label: string;             // display name
  description: string;
  icon: LucideIcon;
  /** When user picks it, this is what gets inserted: "/[command](payloadHint)". */
  payloadHint?: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { command: 'summary',  label: 'Σύνοψη',           description: 'Σύνοψη ημέρας / εβδομάδας',  icon: Sparkles,    payloadHint: 'today' },
  { command: 'task',     label: 'Νέο Task',         description: 'Δημιουργία νέου task',       icon: CheckSquare, payloadHint: '' },
  { command: 'find',     label: 'Αναζήτηση',        description: 'Καθαρή αναζήτηση χωρίς AI',  icon: Search,      payloadHint: '' },
  { command: 'calendar', label: 'Ημερολόγιο',       description: 'Σημερινό schedule',          icon: Calendar,    payloadHint: 'today' },
  { command: 'help',     label: 'Βοήθεια',          description: 'Λίστα όλων των εντολών',     icon: HelpCircle,  payloadHint: '' },
];

// ───────────────────── Serialization helpers ─────────────────────
export const MENTION_REGEX = /@\[([^\]]+)\]\(([a-z]+):([^)]+)\)/g;
export const SLASH_REGEX   = /\/\[([^\]]+)\]\(([^)]*)\)/g;

export function serializeMention(e: { type: MentionType; id: string; label: string }): string {
  return `@[${e.label}](${e.type}:${e.id})`;
}

export function serializeSlash(s: { command: string; payload?: string }): string {
  return `/[${s.command}](${s.payload ?? ''})`;
}

export function getMentionHref(type: MentionType, id: string): string | undefined {
  const cfg = MENTION_TYPES[type];
  if (!cfg?.routePrefix) return undefined;
  // Special routing: deliverables live under projects, no direct route → fallback to prefix only
  if (type === 'deliverable') return undefined;
  return `${cfg.routePrefix}/${id}`;
}
