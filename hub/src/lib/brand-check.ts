// The brand check that every post goes through, whoever (or whichever AI) wrote it.
// Pure and dependency-free: the same function runs on the server, in the composer and in the MCP tools.

export type Channel = 'linkedin' | 'x';
export type IssueLevel = 'error' | 'warning';
export interface Issue { level: IssueLevel; code: string; message: string }

export const CHANNEL_LIMITS: Record<Channel, number> = { linkedin: 3000, x: 280 };
export const CHANNEL_NAMES: Record<Channel, string> = { linkedin: 'LinkedIn', x: 'X' };

export interface CheckRules {
  /** Lower-case phrases that must not appear. */
  banned: string[];
  /** Text of the approved facts and claims. Numbers in a post should appear here. */
  approvedFacts: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** X counts every link as 23 characters; everything else by code point. */
export const countChars = (copy: string, channel: Channel): number => {
  if (channel !== 'x') return [...copy].length;
  const withoutLinks = copy.replace(/https?:\/\/\S+/g, '');
  const links = (copy.match(/https?:\/\/\S+/g) ?? []).length;
  return [...withoutLinks].length + links * 23;
};

// Figures that read as claims: percentages, money, multipliers, and counts of 3+ digits.
const CLAIM_NUMBER = /(?:[$€£]\s?\d[\d,.]*\s?[kKmMbB]?\b|\b\d[\d,.]*\s?%|\b\d+(?:\.\d+)?\s?[xX]\b|\b\d{1,3}(?:,\d{3})+\b|\b\d{3,}\b)/g;
const normaliseNumber = (s: string) => s.toLowerCase().replace(/[\s,]/g, '');

export const checkCopy = (copyRaw: string, channel: Channel, rules: CheckRules): Issue[] => {
  const issues: Issue[] = [];
  const copy = copyRaw.trim();
  if (!copy) {
    issues.push({ level: 'error', code: 'empty', message: 'The post has no text yet.' });
    return issues;
  }

  const limit = CHANNEL_LIMITS[channel];
  const length = countChars(copy, channel);
  if (length > limit) {
    issues.push({ level: 'error', code: 'too_long', message: `${length} characters. ${CHANNEL_NAMES[channel]} allows ${limit}.` });
  }

  const seen = new Set<string>();
  for (const phrase of rules.banned) {
    if (!phrase || seen.has(phrase)) continue;
    seen.add(phrase);
    // Whole words only, so "hack" does not flag "hackathon".
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(phrase)}(?![\\p{L}\\p{N}])`, 'iu');
    if (re.test(copy)) issues.push({ level: 'error', code: 'banned', message: `"${phrase}" is on this brand's avoid list.` });
  }

  const emoji = copy.match(/\p{Extended_Pictographic}/gu);
  if (emoji) issues.push({ level: 'warning', code: 'emoji', message: `Contains emoji (${[...new Set(emoji)].slice(0, 3).join(' ')}). The brand voice avoids them.` });

  const hashtags = copy.match(/(?<!\S)#[\p{L}\p{N}_]+/gu) ?? [];
  if (hashtags.length > 3) issues.push({ level: 'warning', code: 'hashtags', message: `${hashtags.length} hashtags. Keep it to 3 or fewer.` });

  // Numbers that are not in the approved facts are the most common way AI drafts go wrong.
  const facts = normaliseNumber(rules.approvedFacts);
  const unverified = new Set<string>();
  for (const m of copy.replace(/https?:\/\/\S+/g, ' ').matchAll(CLAIM_NUMBER)) {
    const n = m[0].trim();
    // Years are dates, not claims.
    if (/^(19|20)\d{2}$/.test(n)) continue;
    if (!facts.includes(normaliseNumber(n))) unverified.add(n);
  }
  if (unverified.size) {
    issues.push({ level: 'warning', code: 'unverified_number', message: `Check ${[...unverified].slice(0, 4).join(', ')}: not found in the approved facts.` });
  }

  if (channel === 'x' && /https?:\/\/\S+/.test(copy)) {
    issues.push({ level: 'warning', code: 'x_link', message: 'Links in an X post cut its reach. Consider putting the link in a reply.' });
  }
  return issues;
};

export const hasErrors = (issues: Issue[]): boolean => issues.some((i) => i.level === 'error');
