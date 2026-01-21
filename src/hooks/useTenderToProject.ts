import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenderData {
  id: string;
  name: string;
  description: string | null;
  client_id: string | null;
  budget: number;
  submission_deadline: string | null;
}

interface TenderSuggestionData {
  name?: string;
  description?: string;
  due_date?: string;
  budget?: number;
  title?: string;
  deliverable_index?: number;
  amount?: number;
}

export async function convertTenderToProject(tender: TenderData): Promise<string | null> {
  try {
    // Create project from tender data
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: tender.name,
        description: tender.description,
        client_id: tender.client_id,
        status: 'active',
        budget: tender.budget,
        agency_fee_percentage: 30,
        start_date: new Date().toISOString().split('T')[0],
        end_date: tender.submission_deadline,
      })
      .select('id')
      .single();

    if (projectError) throw projectError;

    // Track counts for success message
    let deliverableCount = 0;
    let taskCount = 0;
    let invoiceCount = 0;
    let fileCount = 0;

    // ========================================
    // 1. Transfer tender_deliverables to deliverables
    // ========================================
    const { data: tenderDeliverables } = await supabase
      .from('tender_deliverables')
      .select('*')
      .eq('tender_id', tender.id)
      .order('created_at');

    const tenderDeliverableIdMap: Record<string, string> = {};

    if (tenderDeliverables && tenderDeliverables.length > 0) {
      for (const td of tenderDeliverables) {
        const { data: newDeliverable, error: delError } = await supabase
          .from('deliverables')
          .insert({
            project_id: project.id,
            name: td.name,
            description: td.description,
            due_date: td.due_date,
            budget: Number(td.budget) || 0,
            completed: td.completed || false,
          })
          .select('id')
          .single();

        if (!delError && newDeliverable) {
          tenderDeliverableIdMap[td.id] = newDeliverable.id;
          deliverableCount++;
        }
      }
    }

    // ========================================
    // 2. Transfer tender_tasks to tasks
    // ========================================
    const { data: tenderTasks } = await supabase
      .from('tender_tasks')
      .select('*')
      .eq('tender_id', tender.id)
      .order('created_at');

    if (tenderTasks && tenderTasks.length > 0) {
      for (const tt of tenderTasks) {
        // Map tender_deliverable_id to new deliverable_id
        const deliverableId = tt.tender_deliverable_id 
          ? tenderDeliverableIdMap[tt.tender_deliverable_id] 
          : null;

        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            project_id: project.id,
            title: tt.title,
            description: tt.description,
            status: (tt.status as 'todo' | 'in_progress' | 'review' | 'completed') || 'todo',
            due_date: tt.due_date,
            assigned_to: tt.assigned_to,
            deliverable_id: deliverableId,
          });

        if (!taskError) {
          taskCount++;
        }
      }
    }

    // ========================================
    // 3. Transfer tender files to project files
    // ========================================
    const { data: tenderFiles } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('tender_id', tender.id);

    if (tenderFiles && tenderFiles.length > 0) {
      for (const file of tenderFiles) {
        // Update file to also belong to the project
        const { error: fileError } = await supabase
          .from('file_attachments')
          .update({ project_id: project.id })
          .eq('id', file.id);

        if (!fileError) {
          fileCount++;
        }
      }
    }

    // ========================================
    // 4. Process AI suggestions (existing logic)
    // ========================================
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('tender_suggestions')
      .select('*')
      .eq('tender_id', tender.id)
      .eq('selected', true)
      .eq('applied', false);

    if (suggestionsError) {
      console.error('Error fetching tender suggestions:', suggestionsError);
    }

    if (suggestions && suggestions.length > 0) {
      const aiDeliverables = suggestions.filter(s => s.suggestion_type === 'deliverable');
      const aiTasks = suggestions.filter(s => s.suggestion_type === 'task');
      const invoices = suggestions.filter(s => s.suggestion_type === 'invoice');

      // Create AI-suggested deliverables and map their IDs
      const aiDeliverableIdMap: Record<number, string> = {};
      
      for (let i = 0; i < aiDeliverables.length; i++) {
        const d = aiDeliverables[i].data as TenderSuggestionData;
        const { data: newDeliverable, error: delError } = await supabase
          .from('deliverables')
          .insert({
            project_id: project.id,
            name: d.name || 'Παραδοτέο',
            description: d.description || null,
            due_date: d.due_date || null,
            budget: d.budget || null,
            completed: false
          })
          .select('id')
          .single();

        if (!delError && newDeliverable) {
          aiDeliverableIdMap[i] = newDeliverable.id;
          deliverableCount++;
        }
      }

      // Create AI-suggested tasks
      for (const taskSuggestion of aiTasks) {
        const t = taskSuggestion.data as TenderSuggestionData;
        const deliverableId = t.deliverable_index !== undefined 
          ? aiDeliverableIdMap[t.deliverable_index] 
          : null;

        const { error: taskError } = await supabase
          .from('tasks')
          .insert({
            project_id: project.id,
            title: t.title || 'Εργασία',
            description: t.description || null,
            due_date: t.due_date || null,
            status: 'todo',
            deliverable_id: deliverableId
          });

        if (!taskError) {
          taskCount++;
        }
      }

      // Create invoices from AI suggestions
      for (const invSuggestion of invoices) {
        const inv = invSuggestion.data as TenderSuggestionData;
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`;
        
        const { error: invError } = await supabase
          .from('invoices')
          .insert({
            project_id: project.id,
            client_id: tender.client_id,
            invoice_number: invoiceNumber,
            amount: inv.amount || 0,
            due_date: inv.due_date || null,
            issued_date: new Date().toISOString().split('T')[0],
            paid: false
          });

        if (!invError) {
          invoiceCount++;
        }
      }

      // Mark suggestions as applied
      await supabase
        .from('tender_suggestions')
        .update({ applied: true })
        .eq('tender_id', tender.id)
        .eq('selected', true);
    }

    // Build success message
    const parts: string[] = [];
    if (deliverableCount > 0) parts.push(`${deliverableCount} παραδοτέα`);
    if (taskCount > 0) parts.push(`${taskCount} tasks`);
    if (invoiceCount > 0) parts.push(`${invoiceCount} τιμολόγια`);
    if (fileCount > 0) parts.push(`${fileCount} αρχεία`);

    if (parts.length > 0) {
      toast.success(`Ο διαγωνισμός "${tender.name}" μετατράπηκε σε έργο με ${parts.join(', ')}!`);
    } else {
      toast.success(`Ο διαγωνισμός "${tender.name}" μετατράπηκε σε έργο!`);
    }
    
    return project.id;
  } catch (error) {
    console.error('Error converting tender to project:', error);
    toast.error('Σφάλμα κατά τη μετατροπή του διαγωνισμού');
    return null;
  }
}

type TenderStage = 'identification' | 'preparation' | 'submitted' | 'evaluation' | 'won' | 'lost';

export function useTenderToProject() {
  const handleStageChange = async (
    tenderId: string, 
    newStage: TenderStage,
    tenderData: TenderData,
    onProjectCreated?: (projectId: string) => void
  ): Promise<boolean> => {
    try {
      // Update the tender stage in the database
      const { error } = await supabase
        .from('tenders')
        .update({ stage: newStage })
        .eq('id', tenderId);

      if (error) {
        console.error('Error updating tender stage:', error);
        toast.error('Σφάλμα κατά την ενημέρωση φάσης');
        return false;
      }

      toast.success(`Η φάση άλλαξε σε "${getStageLabel(newStage)}"`);

      // If stage is "won", convert to project
      if (newStage === 'won') {
        const projectId = await convertTenderToProject(tenderData);
        if (projectId && onProjectCreated) {
          onProjectCreated(projectId);
        }
      }

      return true;
    } catch (error) {
      console.error('Error in handleStageChange:', error);
      toast.error('Σφάλμα κατά την ενημέρωση');
      return false;
    }
  };

  return { handleStageChange, convertTenderToProject };
}

function getStageLabel(stage: TenderStage): string {
  const labels: Record<TenderStage, string> = {
    identification: 'Εντοπισμός',
    preparation: 'Προετοιμασία',
    submitted: 'Υποβλήθηκε',
    evaluation: 'Αξιολόγηση',
    won: 'Κερδήθηκε',
    lost: 'Απορρίφθηκε'
  };
  return labels[stage];
}
