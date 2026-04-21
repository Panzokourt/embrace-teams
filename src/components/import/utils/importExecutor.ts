import { supabase } from '@/integrations/supabase/client';
import type { ImportEntity, ImportSummary, ValidatedRow } from '../schemas/types';

interface ExecutorContext {
  entity: ImportEntity;
  rows: ValidatedRow[];
  companyId: string;
  userId: string;
  /** Whether to auto-create missing clients (projects import) or projects (tasks import) */
  autoCreateMissing: boolean;
  onProgress: (done: number, total: number, label?: string) => void;
}

const BATCH_SIZE = 25;

export async function executeImport(ctx: ExecutorContext): Promise<ImportSummary> {
  const { entity } = ctx;
  if (entity === 'clients') return importClients(ctx);
  if (entity === 'projects') return importProjects(ctx);
  return importTasks(ctx);
}

async function importClients(ctx: ExecutorContext): Promise<ImportSummary> {
  const validRows = ctx.rows.filter((r) => !r.skip && !r.issues.some((i) => i.level === 'error'));
  const summary: ImportSummary = {
    total: ctx.rows.length,
    created: 0,
    skipped: ctx.rows.length - validRows.length,
    failed: 0,
    failures: [],
  };

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const payload = batch.map((r) => ({
      ...r.values,
      company_id: ctx.companyId,
    }));
    const { data, error } = await supabase.from('clients').insert(payload).select('id');
    if (error) {
      // Per-row fallback so other batches keep going
      for (const r of batch) {
        const { error: e2 } = await supabase
          .from('clients')
          .insert([{ ...r.values, company_id: ctx.companyId }]);
        if (e2) {
          summary.failed += 1;
          summary.failures.push({ index: r.index, error: e2.message, data: r.values });
        } else {
          summary.created += 1;
        }
      }
    } else {
      summary.created += data?.length ?? batch.length;
    }
    ctx.onProgress(Math.min(i + batch.length, validRows.length), validRows.length, 'Πελάτες');
  }

  return summary;
}

async function importProjects(ctx: ExecutorContext): Promise<ImportSummary> {
  const validRows = ctx.rows.filter((r) => !r.skip && !r.issues.some((i) => i.level === 'error'));
  const summary: ImportSummary = {
    total: ctx.rows.length,
    created: 0,
    skipped: ctx.rows.length - validRows.length,
    failed: 0,
    failures: [],
    newClients: 0,
  };

  // Step 1: gather all unresolved client names and create them if requested
  const clientCache = new Map<string, string>(); // name lower → id
  for (const r of validRows) {
    if (r.fkResolution?.clientId) {
      clientCache.set((r.fkResolution.clientNameRaw || '').toLowerCase(), r.fkResolution.clientId);
    }
  }
  if (ctx.autoCreateMissing) {
    const missingNames = new Set<string>();
    for (const r of validRows) {
      const raw = r.fkResolution?.clientNameRaw;
      if (raw && !r.fkResolution?.clientId && !clientCache.has(raw.toLowerCase())) {
        missingNames.add(raw);
      }
    }
    let processed = 0;
    for (const name of missingNames) {
      const { data, error } = await supabase
        .from('clients')
        .insert([{ name, company_id: ctx.companyId }])
        .select('id')
        .single();
      if (!error && data) {
        clientCache.set(name.toLowerCase(), data.id);
        summary.newClients = (summary.newClients ?? 0) + 1;
      }
      processed += 1;
      ctx.onProgress(processed, missingNames.size, 'Δημιουργία πελατών');
    }
  }

  // Step 2: insert projects
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    for (const r of batch) {
      const v = { ...r.values };
      const clientNameRaw = r.fkResolution?.clientNameRaw?.toLowerCase();
      const clientId = r.fkResolution?.clientId ?? (clientNameRaw ? clientCache.get(clientNameRaw) ?? null : null);
      // Strip helper fields, build payload
      delete v.client_name;
      const payload: any = {
        ...v,
        client_id: clientId,
        company_id: ctx.companyId,
        created_by: ctx.userId,
        status: v.status ?? 'active',
        budget: v.budget ?? 0,
        agency_fee_percentage: v.agency_fee_percentage ?? 0,
      };
      const { error } = await supabase.from('projects').insert([payload]);
      if (error) {
        summary.failed += 1;
        summary.failures.push({ index: r.index, error: error.message, data: payload });
      } else {
        summary.created += 1;
      }
    }
    ctx.onProgress(Math.min(i + batch.length, validRows.length), validRows.length, 'Έργα');
  }

  return summary;
}

async function importTasks(ctx: ExecutorContext): Promise<ImportSummary> {
  const validRows = ctx.rows.filter((r) => !r.skip && !r.issues.some((i) => i.level === 'error'));
  const summary: ImportSummary = {
    total: ctx.rows.length,
    created: 0,
    skipped: ctx.rows.length - validRows.length,
    failed: 0,
    failures: [],
    newProjects: 0,
  };

  // Resolve missing projects if auto-create
  const projectCache = new Map<string, string>();
  for (const r of validRows) {
    if (r.fkResolution?.projectId) {
      projectCache.set((r.fkResolution.projectNameRaw || '').toLowerCase(), r.fkResolution.projectId);
    }
  }
  if (ctx.autoCreateMissing) {
    const missing = new Set<string>();
    for (const r of validRows) {
      const raw = r.fkResolution?.projectNameRaw;
      if (raw && !r.fkResolution?.projectId && !projectCache.has(raw.toLowerCase())) {
        missing.add(raw);
      }
    }
    let processed = 0;
    for (const name of missing) {
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name,
            company_id: ctx.companyId,
            created_by: ctx.userId,
            status: 'active',
            budget: 0,
            agency_fee_percentage: 0,
          } as any,
        ])
        .select('id')
        .single();
      if (!error && data) {
        projectCache.set(name.toLowerCase(), data.id);
        summary.newProjects = (summary.newProjects ?? 0) + 1;
      }
      processed += 1;
      ctx.onProgress(processed, missing.size, 'Δημιουργία έργων');
    }
  }

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    for (const r of batch) {
      const v = { ...r.values };
      const projectNameRaw = r.fkResolution?.projectNameRaw?.toLowerCase();
      const projectId =
        r.fkResolution?.projectId ?? (projectNameRaw ? projectCache.get(projectNameRaw) ?? null : null);
      if (!projectId) {
        summary.failed += 1;
        summary.failures.push({
          index: r.index,
          error: 'Δεν βρέθηκε / δημιουργήθηκε έργο',
          data: v,
        });
        continue;
      }
      delete v.project_name;
      delete v.assigned_to_email;
      const payload: any = {
        ...v,
        project_id: projectId,
        assigned_to: r.fkResolution?.assignedTo ?? null,
        created_by: ctx.userId,
        status: v.status ?? 'todo',
        priority: v.priority ?? 'medium',
      };
      const { error } = await supabase.from('tasks').insert([payload]);
      if (error) {
        summary.failed += 1;
        summary.failures.push({ index: r.index, error: error.message, data: payload });
      } else {
        summary.created += 1;
      }
    }
    ctx.onProgress(Math.min(i + batch.length, validRows.length), validRows.length, 'Tasks');
  }

  return summary;
}
