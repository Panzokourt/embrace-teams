import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useXPEngine() {
  const { user, company } = useAuth();

  const awardXP = useCallback(async (
    userId: string,
    points: number,
    reason: string,
    sourceType: 'system' | 'kudos' = 'system',
    sourceEntityId?: string,
    givenBy?: string,
    skillTag?: string
  ) => {
    if (!company?.id) return;

    try {
      const { error } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_company_id: company.id,
        p_points: points,
        p_reason: reason,
        p_source_type: sourceType,
        p_source_entity_id: sourceEntityId || null,
        p_given_by: givenBy || null,
        p_skill_tag: skillTag || null,
      });
      if (error) throw error;

      // Show XP toast for current user
      if (userId === user?.id && points > 0) {
        toast(`+${points} XP`, { description: formatReason(reason), duration: 2000 });
      }
    } catch (err) {
      console.error('Failed to award XP:', err);
    }
  }, [user?.id, company?.id]);

  const awardTaskXP = useCallback(async (
    userId: string,
    taskId: string,
    dueDate?: string | null
  ) => {
    // Base task completion XP
    await awardXP(userId, 10, 'task_completed', 'system', taskId);

    // Punctuality bonus/penalty
    if (dueDate) {
      const due = new Date(dueDate);
      const now = new Date();
      if (now < due) {
        await awardXP(userId, 5, 'task_completed_early', 'system', taskId);
      } else if (now.toDateString() === due.toDateString()) {
        await awardXP(userId, 3, 'task_completed_on_time', 'system', taskId);
      } else {
        await awardXP(userId, -2, 'task_completed_late', 'system', taskId);
      }
    }
  }, [awardXP]);

  const awardKudos = useCallback(async (
    recipientId: string,
    skillTag?: string
  ) => {
    if (!user?.id || recipientId === user.id) return;

    // Recipient gets +5
    await awardXP(recipientId, 5, 'kudos_received', 'kudos', undefined, user.id, skillTag);
    // Giver gets +1
    await awardXP(user.id, 1, 'kudos_given', 'system');
  }, [user?.id, awardXP]);

  return { awardXP, awardTaskXP, awardKudos };
}

function formatReason(reason: string): string {
  const map: Record<string, string> = {
    task_completed: 'Task ολοκληρώθηκε',
    task_completed_early: 'Bonus πρόωρης ολοκλήρωσης',
    task_completed_on_time: 'Bonus εμπρόθεσμης ολοκλήρωσης',
    task_completed_late: 'Εκπρόθεσμη ολοκλήρωση',
    kudos_received: 'Kudos από συνάδελφο',
    kudos_given: 'Έδωσες Kudos',
    time_logged: 'Καταγραφή χρόνου',
    file_uploaded: 'Ανέβασμα αρχείου',
  };
  return map[reason] || reason;
}
