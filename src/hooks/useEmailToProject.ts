import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export interface ProjectDraft {
  project_name: string;
  description: string;
  matched_client_id: string | null;
  suggested_client_name: string | null;
  budget: number | null;
  deadline: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  matched_template_id: string | null;
  tasks: { title: string; description?: string; priority?: string }[];
  company_id: string;
  source_email_id: string;
  source_thread_id: string | null;
}

type ParseState = 'idle' | 'parsing' | 'draft' | 'creating' | 'success' | 'error';

export function useEmailToProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<ParseState>('idle');
  const [draft, setDraft] = useState<ProjectDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseBrief = async (messageId: string) => {
    setState('parsing');
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('email-to-project', {
        body: { message_id: messageId },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Σφάλμα ανάλυσης');
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      if (!data?.draft) {
        throw new Error('Δεν επιστράφηκαν δεδομένα');
      }

      setDraft(data.draft);
      setState('draft');
    } catch (e: any) {
      setError(e.message || 'Σφάλμα ανάλυσης');
      setState('error');
      toast.error(e.message || 'Σφάλμα ανάλυσης brief');
    }
  };

  const updateDraft = (updates: Partial<ProjectDraft>) => {
    if (!draft) return;
    setDraft({ ...draft, ...updates });
  };

  const createProject = async () => {
    if (!draft || !user) return;
    setState('creating');

    try {
      // Insert project
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          name: draft.project_name,
          description: draft.description,
          client_id: draft.matched_client_id || undefined,
          company_id: draft.company_id,
          budget: draft.budget || undefined,
          end_date: draft.deadline || undefined,
          status: 'active' as any,
          metadata: { priority: draft.priority, source: 'email_brief' } as any,
          created_by: user.id,
        } as any)
        .select('id')
        .single();

      if (projError || !project) {
        throw new Error(projError?.message || 'Σφάλμα δημιουργίας project');
      }

      // Insert tasks
      if (draft.tasks.length > 0) {
        const taskInserts = draft.tasks.map((t) => ({
          project_id: project.id,
          title: t.title,
          description: t.description || null,
          priority: t.priority || 'medium',
          status: 'todo' as any,
          assigned_to: user.id,
        }));

        const { error: taskError } = await supabase
          .from('tasks')
          .insert(taskInserts as any);

        if (taskError) {
          console.error('Task insert error:', taskError);
        }
      }

      // Link email to project
      if (draft.source_thread_id || draft.source_email_id) {
        await supabase.from('email_entity_links').insert({
          thread_id: draft.source_thread_id,
          email_message_id: draft.source_email_id,
          entity_type: 'project',
          entity_id: project.id,
          user_id: user.id,
        } as any);
      }

      setState('success');
      toast.success('Το project δημιουργήθηκε!');
      
      // Navigate after a brief delay
      setTimeout(() => {
        navigate(`/projects/${project.id}`);
      }, 1000);
    } catch (e: any) {
      setError(e.message);
      setState('error');
      toast.error(e.message || 'Σφάλμα δημιουργίας');
    }
  };

  const reset = () => {
    setState('idle');
    setDraft(null);
    setError(null);
  };

  return { state, draft, error, parseBrief, updateDraft, createProject, reset };
}
