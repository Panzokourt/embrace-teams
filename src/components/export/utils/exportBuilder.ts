import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { SCHEMAS } from '@/components/import/schemas';
import type { EntitySchema, ImportEntity } from '@/components/import/schemas/types';

export type ExportFormat = 'xlsx' | 'csv';

function toStringValue(v: any): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
}

function rowsToSheetData(schema: EntitySchema, rows: Record<string, any>[]): (string | number)[][] {
  const headers = schema.fields.map((f) => (f.required ? `${f.label} *` : f.label));
  const data = rows.map((r) => schema.fields.map((f) => toStringValue(r[f.key])));
  return [headers, ...data];
}

function makeBlob(schema: EntitySchema, rows: Record<string, any>[], format: ExportFormat): Blob {
  const sheetData = rowsToSheetData(schema, rows);

  if (format === 'csv') {
    const csv = sheetData
      .map((row) =>
        row
          .map((cell) => {
            const s = String(cell ?? '');
            return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      )
      .join('\n');
    return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws['!cols'] = schema.fields.map((f) => ({ wch: Math.max(14, f.label.length + 4) }));
  XLSX.utils.book_append_sheet(wb, ws, schema.label);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

async function fetchClients(companyId: string, clientIds?: string[]) {
  let q = supabase
    .from('clients')
    .select('name, sector, website, contact_email, contact_phone, secondary_phone, address, tax_id, tags, notes, id')
    .eq('company_id', companyId);
  if (clientIds?.length) q = q.in('id', clientIds);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

async function fetchProjects(companyId: string, clientIds?: string[]) {
  let q = supabase
    .from('projects')
    .select('name, status, start_date, end_date, budget, agency_fee_percentage, description, client:clients!inner(name, id)')
    .eq('company_id', companyId);
  if (clientIds?.length) q = q.in('client_id', clientIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((p: any) => ({
    name: p.name,
    client_name: p.client?.name ?? '',
    status: p.status,
    start_date: p.start_date,
    end_date: p.end_date,
    budget: p.budget,
    agency_fee_percentage: p.agency_fee_percentage,
    description: p.description,
  }));
}

async function fetchTasks(companyId: string, clientIds?: string[]) {
  let q: any = supabase
    .from('tasks')
    .select(
      'title, status, priority, start_date, due_date, estimated_hours, description, assigned_to, project:projects!inner(name, client_id, company_id)'
    )
    .eq('project.company_id', companyId);
  if (clientIds?.length) q = q.in('project.client_id', clientIds);
  const { data, error } = await q;
  if (error) throw error;

  const rows = data ?? [];

  // Resolve assignee emails
  const userIds = Array.from(new Set(rows.map((r: any) => r.assigned_to).filter(Boolean)));
  let emailMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profs } = await (supabase as any)
      .from('profiles')
      .select('user_id, email')
      .in('user_id', userIds);
    emailMap = new Map((profs ?? []).map((p: any) => [p.user_id, p.email]));
  }

  return rows.map((t: any) => ({
    title: t.title,
    project_name: t.project?.name ?? '',
    assigned_to_email: t.assigned_to ? emailMap.get(t.assigned_to) ?? '' : '',
    status: t.status,
    priority: t.priority,
    start_date: t.start_date,
    due_date: t.due_date,
    estimated_hours: t.estimated_hours,
    description: t.description,
  }));
}

export async function buildExportFile(
  entity: ImportEntity,
  companyId: string,
  clientIds: string[] | undefined,
  format: ExportFormat
): Promise<{ blob: Blob; filename: string; count: number }> {
  const schema = SCHEMAS[entity];
  let rows: Record<string, any>[] = [];
  if (entity === 'clients') rows = await fetchClients(companyId, clientIds);
  else if (entity === 'projects') rows = await fetchProjects(companyId, clientIds);
  else if (entity === 'tasks') rows = await fetchTasks(companyId, clientIds);

  const blob = makeBlob(schema, rows, format);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${entity}-export-${date}.${format}`;
  return { blob, filename, count: rows.length };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
