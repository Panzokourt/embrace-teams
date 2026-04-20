// Pure utility for suggesting how a source folder name maps onto an
// existing folder (project template, company template, or already-created folder).
//
// Strategy:
//   1. Normalize names (lowercase, strip diacritics, trim trailing year/numbers).
//   2. exact match → 100
//   3. one contains the other → 70-85
//   4. Levenshtein-based similarity → 50-90
// Threshold for auto-suggest: 60.

export interface FolderCandidate {
  id: string;
  name: string;
}

export interface MatchResult {
  candidate: FolderCandidate | null;
  score: number;
}

export function normalizeFolderName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // strip trailing year (e.g. "Briefs 2024", "Reports_2023")
    .replace(/[\s_\-]*(19|20)\d{2}\s*$/, '')
    // collapse separators
    .replace(/[\s_\-]+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

function similarity(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 100;
  const dist = levenshtein(a, b);
  return Math.round((1 - dist / max) * 100);
}

export function suggestFolderMatch(
  sourceName: string,
  candidates: FolderCandidate[]
): MatchResult {
  if (!sourceName) return { candidate: null, score: 0 };
  const src = normalizeFolderName(sourceName);
  if (!src) return { candidate: null, score: 0 };

  let best: MatchResult = { candidate: null, score: 0 };

  for (const c of candidates) {
    const cand = normalizeFolderName(c.name);
    if (!cand) continue;

    let score = 0;
    if (src === cand) {
      score = 100;
    } else if (cand.includes(src) || src.includes(cand)) {
      // contains → high but not perfect; longer overlap → higher
      const ratio = Math.min(src.length, cand.length) / Math.max(src.length, cand.length);
      score = Math.round(70 + ratio * 15);
    } else {
      const sim = similarity(src, cand);
      // Penalise very short strings to avoid false positives
      if (Math.min(src.length, cand.length) < 4 && sim < 90) {
        score = Math.round(sim * 0.6);
      } else {
        score = sim;
      }
    }

    if (score > best.score) {
      best = { candidate: c, score };
    }
  }

  return best;
}

/** Convenience threshold used by the UI to decide auto-pick vs. create-new. */
export const AUTO_SUGGEST_THRESHOLD = 60;
export const AUTO_PICK_THRESHOLD = 80;
