import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectCategory {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
}

// Mapping from clients.sector value to category display name
const SECTOR_TO_CATEGORY: Record<string, string> = {
  public: 'Δημόσιος Τομέας',
  private: 'Ιδιωτικός Τομέας',
  non_profit: 'Μη Κερδοσκοπικός',
  government: 'Κυβερνητικός',
  mixed: 'Μικτός',
};

export function sectorToCategory(sector: string | null): string | null {
  if (!sector) return null;
  return SECTOR_TO_CATEGORY[sector] || sector;
}

export function useProjectCategories() {
  const { company } = useAuth();
  const companyId = company?.id;

  return useQuery({
    queryKey: ['project-categories', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('project_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order');
      if (error) throw error;
      return data as ProjectCategory[];
    },
    enabled: !!companyId,
  });
}
