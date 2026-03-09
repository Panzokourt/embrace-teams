// Monday.com-inspired color configuration for task tables
// All colors are hex for inline styles on colored cells

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  todo: { bg: '#c4c4c4', text: '#ffffff', label: 'Προς Υλοποίηση' },
  in_progress: { bg: '#fdab3d', text: '#ffffff', label: 'Σε Εξέλιξη' },
  review: { bg: '#e2445c', text: '#ffffff', label: 'Αναθεώρηση' },
  internal_review: { bg: '#a25ddc', text: '#ffffff', label: 'Εσωτ. Έγκριση' },
  client_review: { bg: '#ff642e', text: '#ffffff', label: 'Έγκριση Πελάτη' },
  completed: { bg: '#00c875', text: '#ffffff', label: 'Ολοκληρώθηκε' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: '#579bfc', text: '#ffffff', label: 'Χαμηλή' },
  medium: { bg: '#fdab3d', text: '#ffffff', label: 'Μεσαία' },
  high: { bg: '#e2445c', text: '#ffffff', label: 'Υψηλή' },
  urgent: { bg: '#333333', text: '#ffffff', label: 'Επείγον' },
};

// Group header colors (for groupBy = status)
export const GROUP_COLORS: Record<string, string> = {
  todo: '#c4c4c4',
  in_progress: '#fdab3d',
  review: '#e2445c',
  internal_review: '#a25ddc',
  client_review: '#ff642e',
  completed: '#00c875',
  // Priority groups
  low: '#579bfc',
  medium: '#fdab3d',
  high: '#e2445c',
  urgent: '#333333',
  // Fallback
  none: '#c4c4c4',
  unassigned: '#c4c4c4',
};
