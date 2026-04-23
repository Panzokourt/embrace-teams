/**
 * Coaching Registry
 *
 * Single source of truth for in-app coaching content.
 * Each entry describes a tour, popover, tooltip or banner that should
 * appear the first time a user reaches a route or feature.
 *
 * Visibility is filtered by role/permissions.
 */

export type CoachType = 'tour' | 'popover' | 'banner';

export interface CoachStep {
  selector?: string;     // optional CSS selector to anchor/spotlight (data-coach attrs)
  title: string;
  body: string;          // plain text (short paragraphs)
}

export interface CoachEntry {
  /** Unique key — used to mark as seen in `user_coaching_state`. */
  key: string;
  type: CoachType;

  /** Route prefix that triggers the coach (exact match or startsWith). */
  routeMatch?: string | string[];
  /** Match via element selector mounting (used by manual triggers). */
  elementSelector?: string;

  title: string;
  body?: string;
  steps?: CoachStep[];

  /** Allowed company roles (omit = all roles). */
  requiredRoles?: Array<'owner' | 'admin' | 'manager' | 'member' | 'viewer' | 'billing'>;

  /** Higher = wins when multiple entries match same route. */
  priority?: number;

  /** Optional CTA button label + route to navigate to. */
  cta?: { label: string; href?: string };
}

export const COACHING_REGISTRY: CoachEntry[] = [
  // ─── Page-level intros ──────────────────────────────────────────────
  {
    key: 'page.work',
    type: 'tour',
    routeMatch: '/',
    title: 'Καλωσήρθες στο Command Center',
    body: 'Ο ενιαίος χώρος εργασίας σου. Δες σήμερα τις εργασίες, σημειώσεις, εγκρίσεις και χρόνο σε ένα μέρος.',
    priority: 10,
    steps: [
      { title: 'Σημερινές εργασίες', body: 'Εδώ φαίνονται όλα όσα έχεις για σήμερα — με προτεραιότητα και deadlines.' },
      { title: 'Quick Notes', body: 'Γράψε γρήγορες σημειώσεις. Με AI μπορείς να τις μετατρέψεις σε tasks ή meeting minutes.' },
      { title: 'Pending Approvals', body: 'Εδώ συγκεντρώνονται όσα περιμένουν δικιά σου έγκριση από όλη την εφαρμογή.' },
    ],
  },
  {
    key: 'page.work.list',
    type: 'popover',
    routeMatch: '/work',
    title: 'Όλη η δουλειά σε ένα μέρος',
    body: 'Projects, tasks και campaigns — εναλλάξιμη προβολή (List, Kanban, Gantt). Φίλτραρε ανά πελάτη ή ομάδα.',
  },
  {
    key: 'page.knowledge',
    type: 'tour',
    routeMatch: '/knowledge',
    title: 'Η Βιβλιοθήκη Γνώσης',
    body: 'Εδώ ζουν όλα τα SOPs, templates, guidelines και άρθρα της εταιρείας — με AI που τα οργανώνει και τα συντάσσει.',
    steps: [
      { title: 'Library', body: 'Δες, αναζήτησε και διάβασε όλα τα άρθρα. Φίλτραρε ανά κατηγορία ή tag.' },
      { title: 'AI Compose', body: 'Πάτα το ✨ AI Σύνταξη για να δημιουργήσεις άρθρο από brief — με context της εταιρείας σου.' },
      { title: 'AI Suggestions', body: 'Το panel προτάσεων εντοπίζει κενά και σου προτείνει νέα άρθρα να γράψεις.' },
      { title: 'Review Queue', body: 'Tα άρθρα που σου έχουν ανατεθεί για review εμφανίζονται με badge "Σε εμένα".' },
    ],
  },
  {
    key: 'page.clients',
    type: 'popover',
    routeMatch: '/clients',
    title: 'Οι Πελάτες σου',
    body: 'Νέος πελάτης; Πάτα ✨ Auto-fill και ο AI θα συμπληρώσει automatic στοιχεία (industry, logo, contact) από το όνομα ή το URL.',
  },
  {
    key: 'page.financials',
    type: 'banner',
    routeMatch: '/financials',
    title: 'Οικονομική επισκόπηση',
    body: 'Παρακολούθησε τιμολόγια, έξοδα και κερδοφορία ανά project/πελάτη. Η ομάδα σου βλέπει μόνο όσα έχει permission.',
    requiredRoles: ['owner', 'super_admin', 'admin', 'manager'],
  },
  {
    key: 'page.hr',
    type: 'popover',
    routeMatch: '/hr',
    title: 'Διαχείριση Ομάδας',
    body: 'Πρόσκληση μελών, οργανόγραμμα, άδειες, στόχοι. Τα δικαιώματα προσαρμόζονται αυτόματα στον ρόλο τους.',
    requiredRoles: ['owner', 'super_admin', 'admin', 'manager'],
  },
  {
    key: 'page.calendar',
    type: 'popover',
    routeMatch: '/calendar',
    title: 'Έξυπνο Ημερολόγιο',
    body: 'Tasks, meetings, deadlines και χρόνος εργασίας ενοποιημένα. Drag & drop για επαναπρογραμματισμό.',
  },
  {
    key: 'page.files',
    type: 'popover',
    routeMatch: '/files',
    title: 'Αρχεία (Finder-style)',
    body: 'Column view σαν macOS Finder. Drop έναν φάκελο για bulk upload. Preview για PDF/Office/εικόνες χωρίς download.',
  },
  {
    key: 'page.inbox',
    type: 'popover',
    routeMatch: '/inbox',
    title: 'Email & Briefs',
    body: 'Σύνδεσε το Gmail σου ή προώθησε emails — ο AI εντοπίζει briefs και τα μετατρέπει σε projects/tasks.',
  },
  {
    key: 'page.settings',
    type: 'popover',
    routeMatch: '/settings',
    title: 'Ρυθμίσεις',
    body: 'Profile, εταιρεία, ομάδα, billing και ασφάλεια. Στο tab "Βοήθεια" μπορείς να επανεκκινήσεις τα tutorials.',
  },

  // ─── Action-level coaches (anchored to elements via data-coach) ──────
  {
    key: 'action.create_project',
    type: 'popover',
    elementSelector: '[data-coach="create-project"]',
    title: 'Δημιούργησε project',
    body: 'Χρησιμοποίησε ένα template για να ξεκινήσεις γρήγορα — ή ξεκίνα από κενό και ο AI θα προτείνει tasks.',
  },
  {
    key: 'feature.ai_compose',
    type: 'popover',
    elementSelector: '[data-coach="ai-compose"]',
    title: 'AI Σύνταξη Άρθρου',
    body: 'Ο AI χρησιμοποιεί τα δεδομένα της εταιρείας σου (πελάτες, υπηρεσίες, υπάρχοντα άρθρα) για να γράψει συνεκτικό draft.',
  },
];

/**
 * Filter registry by current user role.
 */
export function filterCoachingForRole(
  entries: CoachEntry[],
  role: string | null | undefined
): CoachEntry[] {
  return entries.filter((e) => {
    if (!e.requiredRoles || e.requiredRoles.length === 0) return true;
    if (!role) return false;
    return e.requiredRoles.includes(role as any);
  });
}

/**
 * Find a registry entry that matches the current pathname.
 */
export function findCoachForRoute(
  entries: CoachEntry[],
  pathname: string
): CoachEntry | null {
  const candidates = entries.filter((e) => {
    if (!e.routeMatch) return false;
    const matchers = Array.isArray(e.routeMatch) ? e.routeMatch : [e.routeMatch];
    return matchers.some((m) => (m === '/' ? pathname === '/' : pathname.startsWith(m)));
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  return candidates[0];
}
