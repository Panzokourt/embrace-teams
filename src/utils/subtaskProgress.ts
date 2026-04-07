export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'internal_review' | 'client_review' | 'completed';

export const STATUS_PROGRESS: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 20,
  review: 50,
  internal_review: 65,
  client_review: 80,
  completed: 100,
};

export function computeParentStatus(subtasks: { status: string }[]): TaskStatus {
  if (subtasks.length === 0) return 'todo';
  if (subtasks.every(s => s.status === 'completed')) return 'completed';
  if (subtasks.some(s => s.status !== 'todo')) return 'in_progress';
  return 'todo';
}

export function computeSubtaskProgress(subtasks: { status: string }[]): number {
  if (subtasks.length === 0) return 0;
  const total = subtasks.reduce((sum, s) => sum + (STATUS_PROGRESS[s.status as TaskStatus] ?? 0), 0);
  return Math.round(total / subtasks.length);
}
