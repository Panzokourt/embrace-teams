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

    // Fetch saved AI suggestions for this tender
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
      const deliverables = suggestions.filter(s => s.suggestion_type === 'deliverable');
      const tasks = suggestions.filter(s => s.suggestion_type === 'task');
      const invoices = suggestions.filter(s => s.suggestion_type === 'invoice');

      // Create deliverables and map their IDs
      const deliverableIdMap: Record<number, string> = {};
      
      for (let i = 0; i < deliverables.length; i++) {
        const d = deliverables[i].data as TenderSuggestionData;
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
          deliverableIdMap[i] = newDeliverable.id;
        }
      }

      // Create tasks
      for (const taskSuggestion of tasks) {
        const t = taskSuggestion.data as TenderSuggestionData;
        const deliverableId = t.deliverable_index !== undefined 
          ? deliverableIdMap[t.deliverable_index] 
          : null;

        await supabase
          .from('tasks')
          .insert({
            project_id: project.id,
            title: t.title || 'Εργασία',
            description: t.description || null,
            due_date: t.due_date || null,
            status: 'todo',
            deliverable_id: deliverableId
          });
      }

      // Create invoices
      for (const invSuggestion of invoices) {
        const inv = invSuggestion.data as TenderSuggestionData;
        const invoiceNumber = `INV-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5)}`;
        
        await supabase
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
      }

      // Mark suggestions as applied
      await supabase
        .from('tender_suggestions')
        .update({ applied: true })
        .eq('tender_id', tender.id)
        .eq('selected', true);

      toast.success(`Ο διαγωνισμός "${tender.name}" μετατράπηκε σε έργο με ${deliverables.length} παραδοτέα, ${tasks.length} tasks και ${invoices.length} τιμολόγια!`);
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
