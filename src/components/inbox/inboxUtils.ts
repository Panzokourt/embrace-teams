import { format, isToday, isYesterday, isThisWeek, differenceInDays } from 'date-fns';
import { el } from 'date-fns/locale';
import { EmailThread } from '@/hooks/useEmailMessages';

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
  text = text.split(/\n\s*(?:--|__|—{2,})\s*\n/)[0];
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
