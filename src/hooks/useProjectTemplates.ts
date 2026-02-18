import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

interface ApplyTemplateOptions {
  projectId: string;
  templateId: string;
  startDate?: string; // project start date for offset calculations
}

export function useProjectTemplates() {
  const { user } = useAuth();
  const [applying, setApplying] = useState(false);

  const applyTemplate = async ({ projectId, templateId, startDate }: ApplyTemplateOptions) => {
    if (!user) return;

    setApplying(true);
    try {
      // Fetch template deliverables and tasks
      const [{ data: templateDeliverables }, { data: templateTasks }] = await Promise.all([
        supabase
          .from('project_template_deliverables')
          .select('*')
          .eq('template_id', templateId)
          .order('sort_order'),
        supabase
          .from('project_template_tasks')
          .select('*')
          .eq('template_id', templateId)
          .order('sort_order'),
      ]);

      const baseDate = startDate ? new Date(startDate) : new Date();

      // Create deliverables and map sort_order -> new id
      const deliverableMap: Record<number, string> = {};
      if (templateDeliverables && templateDeliverables.length > 0) {
        const { data: createdDeliverables, error: delError } = await supabase
          .from('deliverables')
          .insert(
            templateDeliverables.map(d => ({
              project_id: projectId,
              name: d.name,
              description: d.description,
              budget: d.default_budget || 0,
              completed: false,
            }))
          )
          .select('id');

        if (delError) throw delError;

        // Map sort_order to deliverable id
        createdDeliverables?.forEach((del, idx) => {
          deliverableMap[templateDeliverables[idx].sort_order] = del.id;
        });
      }

      // Create tasks
      if (templateTasks && templateTasks.length > 0) {
        const { error: taskError } = await supabase
          .from('tasks')
          .insert(
            templateTasks.map(t => ({
              project_id: projectId,
              title: t.title,
              description: t.description,
              priority: t.priority || 'medium',
              task_type: t.task_type || 'task',
              task_category: t.task_category,
              estimated_hours: t.estimated_hours || 0,
              status: 'todo' as const,
              deliverable_id: t.deliverable_ref_order !== null ? deliverableMap[t.deliverable_ref_order] || null : null,
              start_date: format(addDays(baseDate, t.days_offset_start || 0), 'yyyy-MM-dd'),
              due_date: format(addDays(baseDate, t.days_offset_due || 7), 'yyyy-MM-dd'),
              created_by: user.id,
            }))
          );

        if (taskError) throw taskError;
      }

      const totalItems = (templateDeliverables?.length || 0) + (templateTasks?.length || 0);
      toast.success(`Template εφαρμόστηκε! ${totalItems} στοιχεία δημιουργήθηκαν.`);
      return true;
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Σφάλμα κατά την εφαρμογή του template');
      return false;
    } finally {
      setApplying(false);
    }
  };

  return { applyTemplate, applying };
}
