import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useXPNotifications } from '@/contexts/XPNotificationsContext';
import { findUnlockedAchievements } from '@/lib/gamification/achievementDetector';

const REASON_LABEL: Record<string, string> = {
  task_completed: 'Task ολοκληρώθηκε',
  task_completed_early: 'Πρόωρη ολοκλήρωση',
  task_completed_on_time: 'Εμπρόθεσμη ολοκλήρωση',
  task_completed_late: 'Εκπρόθεσμη ολοκλήρωση',
  kudos_received: 'Έλαβες Kudos',
  kudos_given: 'Έδωσες Kudos',
  time_logged: 'Καταγραφή χρόνου',
  file_uploaded: 'Ανέβασμα αρχείου',
  comment_added: 'Προσθήκη σχολίου',
  daily_streak: 'Ημερήσιο streak',
  weekly_goal_met: 'Εβδομαδιαίος στόχος',
  achievement_unlocked: 'Ξεκλείδωσες επίτευγμα',
  first_task: 'Πρώτο task!',
};

export function formatXPReason(reason: string): string {
  return REASON_LABEL[reason] || reason;
}

const DAILY_CAPS: Record<string, number> = {
  time_logged: 5,
  file_uploaded: 10,
  comment_added: 5,
  daily_streak: 25,
};

async function getDailyAwardedXP(userId: string, reason: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('user_xp')
    .select('points')
    .eq('user_id', userId)
    .eq('reason', reason)
    .gte('created_at', today.toISOString());
  return (data || []).reduce((s, r: any) => s + (r.points || 0), 0);
}

export function useXPEngine() {
  const { user, company } = useAuth();
  const notify = useXPNotifications();

  const awardXP = useCallback(async (
    userId: string,
    points: number,
    reason: string,
    sourceType: 'system' | 'kudos' = 'system',
    sourceEntityId?: string,
    givenBy?: string,
    skillTag?: string,
    options?: { silent?: boolean; respectDailyCap?: boolean }
  ) => {
    if (!company?.id || points === 0) return;

    // Daily cap check
    if (options?.respectDailyCap !== false) {
      const cap = DAILY_CAPS[reason];
      if (cap) {
        const awarded = await getDailyAwardedXP(userId, reason);
        if (awarded >= cap) return;
        if (awarded + points > cap) points = cap - awarded;
        if (points <= 0) return;
      }
    }

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

      // Animated toast for current user (not silent)
      if (!options?.silent && userId === user?.id && points !== 0) {
        notify.pushXPGain({ points, reason, skillTag });
      }

      // Achievement detection (best-effort, only for current user to avoid noise)
      if (userId === user?.id) {
        // fire & forget
        detectAndUnlockAchievements(userId, company.id).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to award XP:', err);
    }
  }, [user?.id, company?.id, notify]);

  const detectAndUnlockAchievements = useCallback(async (userId: string, companyId: string) => {
    const ready = await findUnlockedAchievements(userId);
    for (const ach of ready) {
      const { data } = await supabase.rpc('unlock_achievement', {
        p_user_id: userId,
        p_company_id: companyId,
        p_achievement_code: ach.code,
      });
      const result = data as any;
      if (result?.unlocked) {
        notify.pushAchievement({
          code: result.code,
          title: result.title,
          description: result.description,
          icon: result.icon,
          tier: result.tier,
          xpReward: result.xp_reward || 0,
        });
      }
    }
  }, [notify]);

  // ─── Specialized awards ────────────────────────────
  const awardTaskXP = useCallback(async (
    userId: string,
    taskId: string,
    dueDate?: string | null
  ) => {
    await awardXP(userId, 10, 'task_completed', 'system', taskId);

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
    await awardXP(recipientId, 5, 'kudos_received', 'kudos', undefined, user.id, skillTag);
    await awardXP(user.id, 1, 'kudos_given', 'system');
  }, [user?.id, awardXP]);

  /** Award based on a finished time-tracking entry (in minutes). +1 per 30min, capped at +5/day. */
  const awardTimeXP = useCallback(async (userId: string, durationMinutes: number, taskId?: string) => {
    if (!durationMinutes || durationMinutes < 15) return;
    const points = Math.min(5, Math.floor(durationMinutes / 30) || 1);
    await awardXP(userId, points, 'time_logged', 'system', taskId);
  }, [awardXP]);

  /** +2 per file upload, capped at +10/day. */
  const awardFileXP = useCallback(async (userId: string, fileId?: string) => {
    await awardXP(userId, 2, 'file_uploaded', 'system', fileId);
  }, [awardXP]);

  /** +1 per comment, capped at +5/day. */
  const awardCommentXP = useCallback(async (userId: string, entityId?: string) => {
    await awardXP(userId, 1, 'comment_added', 'system', entityId);
  }, [awardXP]);

  return {
    awardXP,
    awardTaskXP,
    awardKudos,
    awardTimeXP,
    awardFileXP,
    awardCommentXP,
  };
}
