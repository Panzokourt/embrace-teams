import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, 'el', { numeric: true, sensitivity: 'base' });
}

/**
 * Normalize a user-entered URL to a safe absolute https URL.
 * Returns null if the input is empty/invalid.
 */
export function normalizeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Open a URL in a real top-level external tab.
 * Strategy: open about:blank first, then navigate via location.replace.
 * This avoids embedded/iframe restrictions (e.g. ERR_BLOCKED_BY_RESPONSE
 * on Facebook/Instagram/YouTube inside preview shells).
 *
 * Returns true if the tab was opened, false otherwise.
 */
export function openExternalUrl(raw: string | null | undefined): boolean {
  const normalized = normalizeExternalUrl(raw);
  if (!normalized) return false;

  const newWindow = window.open('about:blank', '_blank', 'noopener,noreferrer');
  if (!newWindow) return false;

  try {
    if (newWindow.opener) newWindow.opener = null;
  } catch {
    // ignore cross-origin opener access errors
  }

  try {
    newWindow.location.replace(normalized);
  } catch {
    try {
      newWindow.location.href = normalized;
    } catch {
      return false;
    }
  }

  return true;
}
