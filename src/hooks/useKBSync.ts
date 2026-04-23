import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/** Slugifies Greek + Latin text, preserving uniqueness via a fallback prefix. */
function slugify(s: string, prefix = ''): string {
  const base = s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9α-ω]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  return prefix ? `${prefix}-${base}` : base;
}

/**
 * Συγχρονίζει το kb_categories tree με τα Departments / Clients / Services
 * του χρήστη. Idempotent: χρησιμοποιεί (source_type, source_id) ως key.
 */
export function useKBSync() {
  const { companyRole } = useAuth();
  const qc = useQueryClient();
  const companyId = companyRole?.company_id;

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('No company');

      // Fetch existing categories + source data σε παράλληλα queries
      const [{ data: existing }, { data: depts }, { data: clientsData }, { data: services }] = await Promise.all([
        supabase.from('kb_categories').select('id, slug, source_type, source_id, parent_id, name').eq('company_id', companyId),
        supabase.from('departments').select('id, name').eq('company_id', companyId),
        supabase.from('clients').select('id, name').eq('company_id', companyId).eq('status', 'active'),
        supabase.from('services').select('id, name, category').eq('company_id', companyId).eq('is_active', true),
      ]);

      const cats = existing || [];
      const findRoot = (slug: string) => cats.find(c => c.slug === slug && !c.parent_id);

      // 1. Ensure root categories exist: company / departments / clients / services / templates
      const rootDefs = [
        { slug: 'company', name: 'Company' },
        { slug: 'departments', name: 'Departments' },
        { slug: 'clients', name: 'Clients' },
        { slug: 'services', name: 'Services' },
        { slug: 'templates', name: 'Templates' },
      ];
      const rootMap: Record<string, string> = {};
      for (const r of rootDefs) {
        const found = findRoot(r.slug);
        if (found) {
          rootMap[r.slug] = found.id;
        } else {
          const { data } = await supabase.from('kb_categories').insert({
            company_id: companyId, name: r.name, slug: r.slug, level: 1, sort_order: 0,
            source_type: 'system', auto_synced: false,
          } as any).select('id').single();
          if (data) rootMap[r.slug] = data.id;
        }
      }

      // Helper για insert/update child category linked σε entity
      const upsertLinked = async (params: {
        parentId: string; sourceType: string; sourceId: string; name: string; slug: string;
      }) => {
        const existing = cats.find(c => c.source_type === params.sourceType && c.source_id === params.sourceId);
        if (existing) {
          // Update name αν άλλαξε
          if (existing.name !== params.name) {
            await supabase.from('kb_categories').update({ name: params.name } as any).eq('id', existing.id);
          }
          return { created: false };
        }
        await supabase.from('kb_categories').insert({
          company_id: companyId,
          name: params.name,
          slug: params.slug,
          parent_id: params.parentId,
          level: 2,
          sort_order: 0,
          source_type: params.sourceType,
          source_id: params.sourceId,
          auto_synced: true,
        } as any);
        return { created: true };
      };

      let created = 0;
      let updated = 0;

      // 2. Departments
      for (const d of depts || []) {
        const r = await upsertLinked({
          parentId: rootMap['departments'],
          sourceType: 'department',
          sourceId: d.id,
          name: d.name,
          slug: slugify(d.name, 'dept'),
        });
        if (r.created) created++; else updated++;
      }

      // 3. Clients
      for (const c of clientsData || []) {
        const r = await upsertLinked({
          parentId: rootMap['clients'],
          sourceType: 'client',
          sourceId: c.id,
          name: c.name,
          slug: slugify(c.name, 'client'),
        });
        if (r.created) created++; else updated++;
      }

      // 4. Services (group by category αν υπάρχει)
      for (const s of services || []) {
        const r = await upsertLinked({
          parentId: rootMap['services'],
          sourceType: 'service',
          sourceId: s.id,
          name: s.name,
          slug: slugify(s.name, 'svc'),
        });
        if (r.created) created++; else updated++;
      }

      return { created, updated };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['kb-categories'] });
      toast.success(`Συγχρονισμός ολοκληρώθηκε: ${data.created} νέες, ${data.updated} ενημερωμένες`);
    },
    onError: (e: Error) => toast.error(`Σφάλμα συγχρονισμού: ${e.message}`),
  });
}
