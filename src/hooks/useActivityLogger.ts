import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/components/activity/ActivityLog';

export function useActivityLogger() {
  const { user } = useAuth();

  const logCreate = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;
    await logActivity(user.id, 'created', entityType, entityId, entityName, details);
  }, [user]);

  const logUpdate = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;
    await logActivity(user.id, 'updated', entityType, entityId, entityName, details);
  }, [user]);

  const logDelete = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string
  ) => {
    if (!user) return;
    await logActivity(user.id, 'deleted', entityType, entityId, entityName);
  }, [user]);

  const logStatusChange = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string,
    oldStatus?: string,
    newStatus?: string
  ) => {
    if (!user) return;
    await logActivity(user.id, 'status_change', entityType, entityId, entityName, {
      old_status: oldStatus,
      new_status: newStatus,
    });
  }, [user]);

  const logComplete = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string
  ) => {
    if (!user) return;
    await logActivity(user.id, 'completed', entityType, entityId, entityName);
  }, [user]);

  return { logCreate, logUpdate, logDelete, logStatusChange, logComplete };
}
