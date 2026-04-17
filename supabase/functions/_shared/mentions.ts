// Server-side mention parser for Lovable Cloud Edge Functions.
// Mirrors src/components/mentions/parseMentions.ts so both ends share the same format.

export type MentionType =
  | 'user' | 'project' | 'task' | 'client' | 'contract'
  | 'deliverable' | 'invoice' | 'campaign' | 'tender'
  | 'file' | 'email' | 'wiki';

export interface ParsedMention {
  kind: 'mention';
  type: MentionType;
  id: string;
  label: string;
  raw: string;
  index: number;
}

export interface ParsedSlash {
  kind: 'slash';
  command: string;
  payload: string;
  raw: string;
  index: number;
}

export type ParsedToken = ParsedMention | ParsedSlash;

const MENTION_REGEX = /@\[([^\]]+)\]\(([a-z]+):([^)]+)\)/g;
const SLASH_REGEX   = /\/\[([^\]]+)\]\(([^)]*)\)/g;

export function extractMentions(text: string): ParsedToken[] {
  if (!text) return [];
  const out: ParsedToken[] = [];
  const m = new RegExp(MENTION_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = m.exec(text)) !== null) {
    out.push({
      kind: 'mention', label: match[1],
      type: match[2] as MentionType, id: match[3],
      raw: match[0], index: match.index,
    });
  }
  const s = new RegExp(SLASH_REGEX.source, 'g');
  while ((match = s.exec(text)) !== null) {
    out.push({
      kind: 'slash', command: match[1], payload: match[2] ?? '',
      raw: match[0], index: match.index,
    });
  }
  return out.sort((a, b) => a.index - b.index);
}

export function toPlainText(text: string): string {
  if (!text) return '';
  return text
    .replace(MENTION_REGEX, (_, label) => `@${label}`)
    .replace(SLASH_REGEX, (_, cmd) => `/${cmd}`);
}

/** Group parsed mentions by type with deduped IDs. */
export function groupMentionsByType(tokens: ParsedToken[]): Record<MentionType, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const t of tokens) {
    if (t.kind !== 'mention') continue;
    if (!out[t.type]) out[t.type] = new Set();
    out[t.type].add(t.id);
  }
  const result: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(out)) result[k] = Array.from(v);
  return result as Record<MentionType, string[]>;
}

/**
 * Fetch lightweight context blurbs for mentioned entities.
 * Returned shape: { type, id, label, summary } — easy to drop into a system prompt.
 */
export async function fetchMentionContext(
  supabase: any,
  tokens: ParsedToken[],
): Promise<Array<{ type: string; id: string; label: string; summary: string }>> {
  const grouped = groupMentionsByType(tokens);
  const out: Array<{ type: string; id: string; label: string; summary: string }> = [];

  const tableMap: Partial<Record<MentionType, { table: string; cols: string; labelCol: string }>> = {
    user:        { table: 'profiles',         cols: 'id, full_name, email, role, department_id', labelCol: 'full_name' },
    project:     { table: 'projects',         cols: 'id, name, status, client_id, end_date',     labelCol: 'name' },
    task:        { table: 'tasks',            cols: 'id, title, status, due_date, assigned_to',  labelCol: 'title' },
    client:      { table: 'clients',          cols: 'id, name, contact_email, status, sector',   labelCol: 'name' },
    contract:    { table: 'contracts',        cols: 'id, contract_number, contract_type, status, total_amount, start_date, end_date', labelCol: 'contract_number' },
    deliverable: { table: 'deliverables',     cols: 'id, name, project_id, due_date, completed', labelCol: 'name' },
    invoice:     { table: 'invoices',         cols: 'id, invoice_number, amount, status, due_date', labelCol: 'invoice_number' },
    campaign:    { table: 'campaigns',        cols: 'id, name, status, budget, start_date, end_date', labelCol: 'name' },
    tender:      { table: 'tenders',          cols: 'id, name, status, deadline',                labelCol: 'name' },
    file:        { table: 'file_attachments', cols: 'id, file_name, content_type, file_size',    labelCol: 'file_name' },
  };

  for (const [type, ids] of Object.entries(grouped)) {
    const map = tableMap[type as MentionType];
    if (!map || ids.length === 0) continue;
    try {
      const { data } = await supabase.from(map.table).select(map.cols).in('id', ids);
      for (const row of (data || [])) {
        const summary = Object.entries(row)
          .filter(([k, v]) => v !== null && v !== undefined && k !== 'id')
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        out.push({
          type,
          id: row.id,
          label: String(row[map.labelCol] ?? row.id),
          summary,
        });
      }
    } catch (e) {
      console.error(`fetchMentionContext failed for ${type}:`, e);
    }
  }

  return out;
}

/** Format context blurbs as a system prompt addendum. */
export function formatMentionContextForPrompt(
  ctx: Array<{ type: string; id: string; label: string; summary: string }>,
): string {
  if (ctx.length === 0) return '';
  const lines = ctx.map(c => `- [${c.type}] ${c.label} (id: ${c.id}) → ${c.summary}`);
  return `\n\n## Αναφερόμενες οντότητες (από τα @mentions του χρήστη)\n${lines.join('\n')}\n`;
}
