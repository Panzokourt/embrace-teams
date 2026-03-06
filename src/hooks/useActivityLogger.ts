import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/components/activity/ActivityLog';

export function useActivityLogger() {
  const { user, company } = useAuth();

  const logCreate = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;
    await logActivity(user.id, 'created', entityType, entityId, entityName, details, company?.id);
  }, [user, company]);

  const logUpdate = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string,
    details?: Record<string, unknown>
  ) => {
    if (!user) return;
    await logActivity(user.id, 'updated', entityType, entityId, entityName, details, company?.id);
  }, [user, company]);

  const logDelete = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string
  ) => {
    if (!user) return;
    await logActivity(user.id, 'deleted', entityType, entityId, entityName, undefined, company?.id);
  }, [user, company]);

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
    }, company?.id);
  }, [user, company]);

  const logComplete = useCallback(async (
    entityType: string,
    entityId: string,
    entityName?: string
  ) => {
    if (!user) return;
    await logActivity(user.id, 'completed', entityType, entityId, entityName, undefined, company?.id);
  }, [user, company]);

  return { logCreate, logUpdate, logDelete, logStatusChange, logComplete };
}
