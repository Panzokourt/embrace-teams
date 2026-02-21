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

// Reverse mapping: display name -> display name (identity)
const REVERSE_CATEGORY: Set<string> = new Set(Object.values(SECTOR_TO_CATEGORY));

export function sectorToCategory(sector: string | null): string | null {
  if (!sector) return null;
  // Try key mapping first
  if (SECTOR_TO_CATEGORY[sector]) return SECTOR_TO_CATEGORY[sector];
  // If the value is already a display name, return as-is
  if (REVERSE_CATEGORY.has(sector)) return sector;
  // Fallback: return sector as-is (custom category name)
  return sector;
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
