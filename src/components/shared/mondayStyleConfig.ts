// Monday.com-inspired color configuration for task tables
// All colors are hex for inline styles on colored cells

// Apple-inspired color configuration for task tables
// All colors are Apple HIG standard palette

export const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  todo: { bg: '#8E8E93', text: '#ffffff', label: 'Προς Υλοποίηση' },
  in_progress: { bg: '#FF9F0A', text: '#ffffff', label: 'Σε Εξέλιξη' },
  review: { bg: '#FF375F', text: '#ffffff', label: 'Αναθεώρηση' },
  internal_review: { bg: '#BF5AF2', text: '#ffffff', label: 'Εσωτ. Έγκριση' },
  client_review: { bg: '#FF6723', text: '#ffffff', label: 'Έγκριση Πελάτη' },
  completed: { bg: '#30D158', text: '#ffffff', label: 'Ολοκληρώθηκε' },
};

export const PRIORITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: '#007AFF', text: '#ffffff', label: 'Χαμηλή' },
  medium: { bg: '#FF9F0A', text: '#ffffff', label: 'Μεσαία' },
  high: { bg: '#FF375F', text: '#ffffff', label: 'Υψηλή' },
  urgent: { bg: '#1C1C1E', text: '#ffffff', label: 'Επείγον' },
};

// Group header colors (for groupBy = status)
export const GROUP_COLORS: Record<string, string> = {
  todo: '#8E8E93',
  in_progress: '#FF9F0A',
  review: '#FF375F',
  internal_review: '#BF5AF2',
  client_review: '#FF6723',
  completed: '#30D158',
  // Priority groups
  low: '#007AFF',
  medium: '#FF9F0A',
  high: '#FF375F',
  urgent: '#1C1C1E',
  // Fallback
  none: '#8E8E93',
  unassigned: '#8E8E93',
};
