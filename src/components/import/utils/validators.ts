import type { FieldDef, RowIssue } from '../schemas/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/.+\..+/i;

export function coerceValue(field: FieldDef, raw: unknown): { value: any; issue?: RowIssue } {
  if (raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')) {
    if (field.required) {
      return { value: null, issue: { field: field.key, level: 'error', message: `${field.label} είναι υποχρεωτικό` } };
    }
    return { value: null };
  }

  const str = String(raw).trim();

  switch (field.type) {
    case 'string':
      return { value: str };

    case 'email': {
      const lower = str.toLowerCase();
      if (!EMAIL_RE.test(lower)) {
        return { value: lower, issue: { field: field.key, level: field.required ? 'error' : 'warning', message: 'Μη έγκυρο email' } };
      }
      return { value: lower };
    }

    case 'url': {
      const v = str.startsWith('http') ? str : `https://${str}`;
      if (!URL_RE.test(v)) {
        return { value: v, issue: { field: field.key, level: 'warning', message: 'Μη έγκυρο URL' } };
      }
      return { value: v };
    }

    case 'phone': {
      const cleaned = str.replace(/[^\d+]/g, '');
      if (cleaned.length < 5) {
        return { value: str, issue: { field: field.key, level: 'warning', message: 'Πιθανώς μη έγκυρο τηλέφωνο' } };
      }
      return { value: cleaned };
    }

    case 'number': {
      const n = parseFloat(str.replace(/\./g, '').replace(',', '.').replace(/[^\d.\-]/g, ''));
      if (isNaN(n)) {
        return { value: null, issue: { field: field.key, level: 'error', message: 'Μη έγκυρος αριθμός' } };
      }
      return { value: n };
    }

    case 'date': {
      const iso = parseDate(str);
      if (!iso) {
        return { value: null, issue: { field: field.key, level: 'error', message: 'Μη έγκυρη ημερομηνία (yyyy-mm-dd ή dd/mm/yyyy)' } };
      }
      return { value: iso };
    }

    case 'enum': {
      const allowed = field.enumValues ?? [];
      const lower = str.toLowerCase();
      const match = allowed.find(
        (e) => e.value.toLowerCase() === lower || e.label.toLowerCase() === lower
      );
      if (!match) {
        return {
          value: null,
          issue: {
            field: field.key,
            level: 'warning',
            message: `Μη αναγνωρίσιμη τιμή. Επιτρεπόμενες: ${allowed.map((e) => e.value).join(', ')}`,
          },
        };
      }
      return { value: match.value };
    }

    case 'tags': {
      const arr = str
        .split(/[,;|]/)
        .map((t) => t.trim())
        .filter(Boolean);
      return { value: arr };
    }
  }
}

function parseDate(input: string): string | null {
  if (!input) return null;
  // Already ISO yyyy-mm-dd
  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    if (isValidYMD(+y, +m, +d)) return `${y}-${m}-${d}`;
  }
  // dd/mm/yyyy or dd-mm-yyyy or dd.mm.yyyy
  const dmy = input.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let [, d, m, y] = dmy;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    const yi = +y, mi = +m, di = +d;
    if (isValidYMD(yi, mi, di)) {
      return `${y.padStart(4, '0')}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
    }
  }
  // Excel-formatted date like "Apr 5, 2026"
  const native = new Date(input);
  if (!isNaN(native.getTime())) {
    const y = native.getFullYear();
    const m = String(native.getMonth() + 1).padStart(2, '0');
    const d = String(native.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function isValidYMD(y: number, m: number, d: number): boolean {
  if (y < 1900 || y > 2200) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  return true;
}
