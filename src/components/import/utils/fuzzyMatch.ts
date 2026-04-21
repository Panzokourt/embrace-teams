import type { FieldDef } from '../schemas/types';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[_\-\s]+/g, '')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

/** Best-matching field for a given header. Returns null if no match above threshold. */
export function fuzzyMatchHeader(header: string, fields: FieldDef[], threshold = 0.7): string | null {
  let bestKey: string | null = null;
  let bestScore = 0;
  for (const f of fields) {
    const candidates = [f.key, f.label, ...(f.aliases ?? [])];
    for (const cand of candidates) {
      const score = similarity(header, cand);
      if (score > bestScore) {
        bestScore = score;
        bestKey = f.key;
      }
    }
  }
  return bestScore >= threshold ? bestKey : null;
}

export function autoMapHeaders(headers: string[], fields: FieldDef[]): Record<string, string | null> {
  const used = new Set<string>();
  const out: Record<string, string | null> = {};
  for (const h of headers) {
    const match = fuzzyMatchHeader(h, fields);
    if (match && !used.has(match)) {
      out[h] = match;
      used.add(match);
    } else {
      out[h] = null;
    }
  }
  return out;
}
