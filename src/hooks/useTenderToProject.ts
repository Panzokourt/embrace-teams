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
        agency_fee_percentage: 30, // Default agency fee
        start_date: new Date().toISOString().split('T')[0],
        end_date: tender.submission_deadline,
      })
      .select('id')
      .single();

    if (projectError) throw projectError;

    // Copy any file attachments from tender to the new project
    // (Note: tenders don't have file_attachments linked directly in the current schema,
    // but this is placeholder for future enhancement)

    toast.success(`Ο διαγωνισμός "${tender.name}" μετατράπηκε σε έργο!`);
    
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
