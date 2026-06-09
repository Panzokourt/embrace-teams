import { format, isToday, isYesterday, isThisWeek, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import DOMPurify from 'dompurify';
import {
  Inbox as InboxIcon,
  Send,
  FileEdit,
  Trash2,
  AlertOctagon,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { EmailThread } from '@/hooks/useEmailMessages';

export type FolderKey = 'inbox' | 'sent' | 'drafts' | 'trash' | 'spam' | 'starred';

export interface FolderMeta {
  key: FolderKey;
  label: string;
  icon: LucideIcon;
  match: (folder: string | null | undefined) => boolean;
}

const norm = (s: string | null | undefined) => (s || '').toLowerCase();

export const FOLDERS: FolderMeta[] = [
  {
    key: 'inbox',
    label: 'Εισερχόμενα',
    icon: InboxIcon,
    match: (f) => {
      const v = norm(f);
      return v === '' || v === 'inbox' || v === 'εισερχόμενα';
    },
  },
  {
    key: 'sent',
    label: 'Απεσταλμένα',
    icon: Send,
    match: (f) => ['sent', 'sentitems', 'sent items', 'απεσταλμένα'].includes(norm(f)),
  },
  {
    key: 'drafts',
    label: 'Πρόχειρα',
    icon: FileEdit,
    match: (f) => ['drafts', 'draft', 'πρόχειρα'].includes(norm(f)),
  },
  {
    key: 'spam',
    label: 'Ανεπιθύμητα',
    icon: AlertOctagon,
    match: (f) => ['spam', 'junk', 'junkemail', 'ανεπιθύμητα'].includes(norm(f)),
  },
  {
    key: 'trash',
    label: 'Κάδος',
    icon: Trash2,
    match: (f) => ['trash', 'bin', 'deleteditems', 'κάδος'].includes(norm(f)),
  },
  {
    key: 'starred',
    label: 'Με αστερίσκο',
    icon: Star,
    match: () => false,
  },
];

export function filterThreadsByFolder(threads: EmailThread[], key: FolderKey): EmailThread[] {
  if (key === 'starred') return threads.filter((t) => t.is_starred);
  const meta = FOLDERS.find((f) => f.key === key)!;
  return threads.filter((t) => meta.match(t.last_message?.folder));
}

export function folderCounts(threads: EmailThread[]): Record<FolderKey, number> {
  const counts: Record<FolderKey, number> = {
    inbox: 0, sent: 0, drafts: 0, trash: 0, spam: 0, starred: 0,
  };
  for (const t of threads) {
    if (t.is_starred) counts.starred += 1;
    for (const m of FOLDERS) {
      if (m.key === 'starred') continue;
      if (m.match(t.last_message?.folder)) {
        if (m.key === 'inbox') counts.inbox += t.unread_count > 0 ? 1 : 0;
        else counts[m.key] += 1;
        break;
      }
    }
  }
  return counts;
}

// ---------- Linkify plain-text bodies ----------
const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]])/gi;

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function linkifyText(text: string): string {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped.replace(URL_REGEX, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    const display = url.length > 60 ? url.slice(0, 57) + '…' : url;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="underline decoration-current/40 hover:decoration-current break-all">${display}</a>`;
  });
}

// ---------- HTML email sanitization ----------
const TRACKER_HINTS = /(track|pixel|beacon|open\?|mailtrack|=open|\/o\/|sensor|gif\?)/i;

export function sanitizeEmailHtml(html: string): string {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'style', 'width', 'height',
      'align', 'valign', 'border', 'cellpadding', 'cellspacing', 'colspan',
      'rowspan', 'bgcolor', 'color', 'target', 'rel', 'srcset',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'meta', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    ADD_ATTR: ['target'],
  });

  if (typeof window === 'undefined') return clean;

  const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return clean;

  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const w = parseInt(img.getAttribute('width') || '0', 10);
    const h = parseInt(img.getAttribute('height') || '0', 10);
    const tiny = (w > 0 && w <= 2) || (h > 0 && h <= 2);
    const looksLikeTracker = TRACKER_HINTS.test(src);
    if (tiny || (looksLikeTracker && !img.getAttribute('alt'))) {
      img.remove();
      return;
    }
    img.setAttribute('loading', 'lazy');
    img.setAttribute('referrerpolicy', 'no-referrer');
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
  });

  root.querySelectorAll('a[href]').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
  });

  return root.innerHTML;
}

export function hasMeaningfulHtml(html: string | null | undefined): boolean {
  if (!html) return false;
  return /<(table|div|img|a|h[1-6]|ul|ol|blockquote|style|font|center|span|td)\b/i.test(html);
}

// ---------- Personal vs Bulk classification ----------
const BULK_SENDER_REGEX = /^(no[-_.]?reply|donotreply|do[-_.]?not[-_.]?reply|notifications?|news|newsletter|marketing|mailer|bounce|updates?|alerts?|noticias)@/i;
const BULK_HINTS_REGEX = /(list-unsubscribe|unsubscribe|view in browser|view this email in your browser|email preferences|manage preferences|δείτε στο πρόγραμμα περιήγησης|διαγραφή εγγραφής|κατάργηση εγγραφής|απεγγραφή|προτιμήσεις email|you are receiving this email|you received this email)/i;

export interface ClassifiableMessage {
  from_address?: string | null;
  from_name?: string | null;
  body_html?: string | null;
  body_text?: string | null;
}

export function classifyEmail(m: ClassifiableMessage): 'personal' | 'bulk' {
  const html = m.body_html || '';
  const text = m.body_text || '';
  const from = (m.from_address || '').toLowerCase();

  if (BULK_HINTS_REGEX.test(html) || BULK_HINTS_REGEX.test(text)) return 'bulk';
  if (BULK_SENDER_REGEX.test(from)) return 'bulk';

  // HTML-only complexity (only when there's NO plain text alternative)
  if (html && !text.trim()) {
    const imgCount = (html.match(/<img\b/gi) || []).length;
    const tableCount = (html.match(/<table\b/gi) || []).length;
    const hasSignatureMarker = /(--|email signature|best regards|regards|με εκτίμηση|φιλικά|ευχαριστώ)/i.test(html);
    if (!hasSignatureMarker && (tableCount >= 3 || (imgCount >= 6 && tableCount >= 1) || html.length > 15000)) return 'bulk';
  }

  return 'personal';
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, ' ');
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, script, head').forEach((el) => el.remove());
  // Preserve line breaks
  doc.querySelectorAll('br').forEach((el) => el.replaceWith('\n'));
  doc.querySelectorAll('p, div, li, tr, h1, h2, h3, h4, h5, h6').forEach((el) => {
    el.append('\n');
  });
  const text = doc.body?.textContent || '';
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function extractCleanPersonalText(m: ClassifiableMessage): string {
  let raw = m.body_text || '';
  if (!raw && m.body_html) raw = htmlToPlainText(m.body_html);
  return stripSignature(raw);
}

const AVATAR_COLORS = [
  { bg: 'bg-indigo-500', text: 'text-white' },
  { bg: 'bg-teal-500', text: 'text-white' },
  { bg: 'bg-emerald-500', text: 'text-white' },
  { bg: 'bg-rose-500', text: 'text-white' },
  { bg: 'bg-violet-500', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-cyan-500', text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
];

export function getAvatarColor(name: string): { bg: string; text: string } {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getFirstName(name: string | null | undefined): string {
  if (!name) return 'Άγνωστος';
  return name.split(/\s+/)[0];
}

export function formatMessageTime(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return 'Χθες';
  if (isThisWeek(date, { weekStartsOn: 1 })) return format(date, 'EEE', { locale: el });
  return format(date, 'd MMM', { locale: el });
}

export function formatBubbleTime(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isToday(date)) return format(date, 'HH:mm');
  if (isYesterday(date)) return `Χθες, ${format(date, 'HH:mm')}`;
  return format(date, 'd MMM, HH:mm', { locale: el });
}

export function formatDaySeparator(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isToday(date)) return 'Σήμερα';
  if (isYesterday(date)) return 'Χθες';
  return format(date, 'EEEE, d MMMM', { locale: el });
}

export type ThreadGroupKey = 'Σήμερα' | 'Χθες' | 'Αυτή την εβδομάδα' | 'Παλαιότερα';
const GROUP_ORDER: ThreadGroupKey[] = ['Σήμερα', 'Χθες', 'Αυτή την εβδομάδα', 'Παλαιότερα'];

export function groupThreadsByTime(threads: EmailThread[]): Array<{ key: ThreadGroupKey; items: EmailThread[] }> {
  const groups: Record<ThreadGroupKey, EmailThread[]> = {
    'Σήμερα': [],
    'Χθες': [],
    'Αυτή την εβδομάδα': [],
    'Παλαιότερα': [],
  };
  for (const t of threads) {
    const ts = t.last_message?.sent_at || t.last_message?.created_at;
    if (!ts) { groups['Παλαιότερα'].push(t); continue; }
    const date = new Date(ts);
    if (isToday(date)) groups['Σήμερα'].push(t);
    else if (isYesterday(date)) groups['Χθες'].push(t);
    else if (isThisWeek(date, { weekStartsOn: 1 })) groups['Αυτή την εβδομάδα'].push(t);
    else groups['Παλαιότερα'].push(t);
  }
  return GROUP_ORDER.filter(k => groups[k].length > 0).map(k => ({ key: k, items: groups[k] }));
}

export function stripSignature(body: string | null | undefined): string {
  if (!body) return '';
  let text = body;
  // Cut at common signature delimiters
  text = text.split(/(?:^|\n)\s*(?:--|__|—{2,}|–{2,})\s*(?=\n|$)/)[0];
  // Cut common generated/HTML signature blocks even when the delimiter was lost
  text = text.replace(/\n\s*(?:create your own\s+)?email signature[\s\S]*$/i, '');
  text = text.replace(/\n\s*(?:facebook|instagram|linkedin|twitter|x)\b[\s\S]*$/i, '');
  text = text.replace(/\n\s*\+?[0-9][0-9\s().-]{6,}\s*(?:\||•|·|–|-|\s{2,})[\s\S]*$/i, '');
  // Cut at common closings (case-insensitive, multilingual)
  const closingRegex = /\n\s*(Με εκτίμηση|Ευχαριστώ|Φιλικά|Best regards|Best,|Regards|Cheers|Thanks|Thank you|Sincerely|Sent from my)\b[\s\S]*$/i;
  text = text.replace(closingRegex, '');
  // Cut at quoted-text blocks (Gmail/Outlook)
  text = text.replace(/\n\s*On .+ wrote:[\s\S]*$/i, '');
  text = text.replace(/\n\s*Στις .+ έγραψε:[\s\S]*$/i, '');
  text = text.replace(/\n\s*From: [\s\S]*$/i, '');
  // Strip leading > quoted lines
  text = text.split('\n').filter(l => !l.trimStart().startsWith('>')).join('\n');
  // Strip unsubscribe footer lines
  text = text.replace(/^.*unsubscribe.*$/gim, '');
  // Trim excessive blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

export function shouldShowDaySeparator(prev: Date | null, current: Date): boolean {
  if (!prev) return true;
  return differenceInDays(current, prev) !== 0 || prev.getDate() !== current.getDate();
}
