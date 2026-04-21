import { supabase } from '@/integrations/supabase/client';
import type { ImportEntity, ValidatedRow } from '../schemas/types';
import { coerceValue } from './validators';
import type { FieldDef } from '../schemas/types';

export interface FkLookups {
  clientsByName: Map<string, string>; // lowercase name → id
  projectsByName: Map<string, string>;
  usersByEmail: Map<string, string>;
}

export async function loadFkLookups(companyId: string, entity: ImportEntity): Promise<FkLookups> {
  const lookups: FkLookups = {
    clientsByName: new Map(),
    projectsByName: new Map(),
    usersByEmail: new Map(),
  };

  if (entity === 'projects' || entity === 'tasks') {
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', companyId);
    (clients || []).forEach((c) => lookups.clientsByName.set(c.name.toLowerCase(), c.id));
  }
  if (entity === 'tasks') {
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')
      .eq('company_id', companyId);
    (projects || []).forEach((p) => lookups.projectsByName.set(p.name.toLowerCase(), p.id));

    const { data: users } = await supabase
      .from('profiles')
      .select('id, email')
      .in('status', ['active', 'pending']);
    (users || []).forEach((u) => {
      if (u.email) lookups.usersByEmail.set(u.email.toLowerCase(), u.id);
    });
  }
  return lookups;
}

export function buildValidatedRows(
  rawRows: Record<string, unknown>[],
  mapping: Record<string, string | null>,
  fields: FieldDef[],
  entity: ImportEntity,
  fk: FkLookups
): ValidatedRow[] {
  const fieldMap = new Map(fields.map((f) => [f.key, f]));

  // Track duplicates within this file (name/title case-insensitive)
  const seenKeys = new Map<string, number>();
  const dupKeyField =
    entity === 'clients' ? 'name' : entity === 'projects' ? 'name' : 'title';

  return rawRows.map((raw, idx) => {
    const row: ValidatedRow = {
      index: idx,
      values: {},
      issues: [],
      fkResolution: {},
    };

    // Apply mapping → coerce per field
    for (const [header, fieldKey] of Object.entries(mapping)) {
      if (!fieldKey) continue;
      const field = fieldMap.get(fieldKey);
      if (!field) continue;
      const { value, issue } = coerceValue(field, raw[header]);
      row.values[fieldKey] = value;
      if (issue) row.issues.push(issue);
    }

    // Required-fields check (in case columns not mapped)
    for (const f of fields) {
      if (f.required && (row.values[f.key] === null || row.values[f.key] === undefined || row.values[f.key] === '')) {
        if (!row.issues.some((i) => i.field === f.key && i.level === 'error')) {
          row.issues.push({ field: f.key, level: 'error', message: `${f.label} είναι υποχρεωτικό` });
        }
      }
    }

    // FK resolution
    if (entity === 'projects') {
      const cn = row.values.client_name as string | null;
      if (cn) {
        const cid = fk.clientsByName.get(cn.toLowerCase()) ?? null;
        row.fkResolution!.clientNameRaw = cn;
        row.fkResolution!.clientId = cid;
        if (!cid) {
          row.issues.push({
            field: 'client_name',
            level: 'warning',
            message: 'Δεν βρέθηκε πελάτης — μπορεί να δημιουργηθεί νέος',
          });
        }
      }
    } else if (entity === 'tasks') {
      const pn = row.values.project_name as string | null;
      if (pn) {
        const pid = fk.projectsByName.get(pn.toLowerCase()) ?? null;
        row.fkResolution!.projectNameRaw = pn;
        row.fkResolution!.projectId = pid;
        if (!pid) {
          row.issues.push({
            field: 'project_name',
            level: 'warning',
            message: 'Δεν βρέθηκε έργο — μπορεί να δημιουργηθεί νέο',
          });
        }
      } else {
        row.issues.push({ field: 'project_name', level: 'error', message: 'Απαιτείται όνομα έργου' });
      }
      const ae = row.values.assigned_to_email as string | null;
      if (ae) {
        const uid = fk.usersByEmail.get(ae.toLowerCase()) ?? null;
        row.fkResolution!.assignedToRaw = ae;
        row.fkResolution!.assignedTo = uid;
        if (!uid) {
          row.issues.push({
            field: 'assigned_to_email',
            level: 'warning',
            message: 'Δεν βρέθηκε χρήστης — η εργασία θα μείνει χωρίς ανάθεση',
          });
        }
      }
    }

    // Duplicate check within file
    const dupVal = row.values[dupKeyField];
    if (typeof dupVal === 'string' && dupVal.trim()) {
      const key = dupVal.toLowerCase().trim();
      const prev = seenKeys.get(key);
      if (prev !== undefined) {
        row.issues.push({
          field: dupKeyField,
          level: 'warning',
          message: `Διπλότυπο με τη γραμμή ${prev + 1}`,
        });
      } else {
        seenKeys.set(key, idx);
      }
    }

    return row;
  });
}
