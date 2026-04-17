import { MENTION_REGEX, SLASH_REGEX, type MentionType } from './mentionRegistry';

export interface ParsedMention {
  kind: 'mention';
  type: MentionType;
  id: string;
  label: string;
  raw: string;
  index: number;
}

export interface ParsedSlash {
  kind: 'slash';
  command: string;
  payload: string;
  raw: string;
  index: number;
}

export type ParsedToken = ParsedMention | ParsedSlash;

/**
 * Extract every @[label](type:id) and /[cmd](payload) token from text.
 * Returns them in order of appearance.
 */
export function extractTokens(text: string): ParsedToken[] {
  if (!text) return [];
  const tokens: ParsedToken[] = [];

  const m = new RegExp(MENTION_REGEX.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = m.exec(text)) !== null) {
    tokens.push({
      kind: 'mention',
      label: match[1],
      type: match[2] as MentionType,
      id: match[3],
      raw: match[0],
      index: match.index,
    });
  }

  const s = new RegExp(SLASH_REGEX.source, 'g');
  while ((match = s.exec(text)) !== null) {
    tokens.push({
      kind: 'slash',
      command: match[1],
      payload: match[2] ?? '',
      raw: match[0],
      index: match.index,
    });
  }

  return tokens.sort((a, b) => a.index - b.index);
}

/**
 * Strip serialized markup down to plain readable text:
 *   "Hi @[Γιάννη](user:abc) /[summary](today)"  →  "Hi @Γιάννη /summary"
 */
export function toPlainText(text: string): string {
  if (!text) return '';
  return text
    .replace(MENTION_REGEX, (_, label) => `@${label}`)
    .replace(SLASH_REGEX, (_, cmd) => `/${cmd}`);
}

/**
 * Split text into segments suitable for inline rendering — alternating plain text
 * pieces and parsed tokens, in order.
 */
export interface TextSegment { kind: 'text'; text: string; }
export type RenderSegment = TextSegment | ParsedToken;

export function splitForRender(text: string): RenderSegment[] {
  if (!text) return [];
  const tokens = extractTokens(text);
  if (tokens.length === 0) return [{ kind: 'text', text }];

  const out: RenderSegment[] = [];
  let cursor = 0;
  for (const tok of tokens) {
    if (tok.index > cursor) {
      out.push({ kind: 'text', text: text.slice(cursor, tok.index) });
    }
    out.push(tok);
    cursor = tok.index + tok.raw.length;
  }
  if (cursor < text.length) out.push({ kind: 'text', text: text.slice(cursor) });
  return out;
}
