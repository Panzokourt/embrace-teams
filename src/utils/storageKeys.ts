/**
 * Supabase/Lovable Cloud Storage object keys are validated server-side.
 * Some characters (including certain unicode filenames) can be rejected.
 *
 * We store the original filename in DB metadata (file_name) and use a
 * sanitized filename for the storage object key (file_path).
 */

export function sanitizeStorageFileName(originalName: string): string {
  const trimmed = (originalName || '').trim();

  // Split extension (keep last dot as extension separator)
  const lastDot = trimmed.lastIndexOf('.');
  const hasExt = lastDot > 0 && lastDot < trimmed.length - 1;
  const base = hasExt ? trimmed.slice(0, lastDot) : trimmed;
  const ext = hasExt ? trimmed.slice(lastDot + 1) : '';

  // Remove combining marks (diacritics) to reduce weird unicode edge cases
  const baseNoMarks = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // Keep a conservative set of characters (ASCII) to avoid InvalidKey errors.
  // NOTE: The original filename is still kept in DB (file_name).
  let safeBase = baseNoMarks
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\.]+|[_\.]+$/g, '');

  if (!safeBase) safeBase = 'file';
  safeBase = safeBase.slice(0, 80);

  const safeExt = ext
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .slice(0, 10);

  return safeExt ? `${safeBase}.${safeExt}` : safeBase;
}

export function createProjectFilesObjectKey(params: {
  userId: string;
  originalName: string;
  prefix?: string;
}): string {
  const safeName = sanitizeStorageFileName(params.originalName);
  const ts = Date.now();

  const parts = [params.userId, params.prefix].filter(Boolean);
  return `${parts.join('/')}/${ts}_${safeName}`;
}
