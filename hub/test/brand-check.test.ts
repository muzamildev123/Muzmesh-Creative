import { describe, expect, it } from 'vitest';
import { checkCopy, countChars, hasErrors } from '../src/lib/brand-check';
import { bannedPhrases, parseBrandConfig, brandFontsUrl } from '../src/lib/brand';
import { BOOKLY } from './helpers';

const rules = { banned: ['hack', '10x', 'ai-powered', 'game-changer'], approvedFacts: 'Plans start at $12 a month. 4,200 readers. 38% finish rate.' };
const codes = (copy: string, ch: 'linkedin' | 'x' = 'linkedin') => checkCopy(copy, ch, rules).map((i) => i.code);

describe('brand check', () => {
  it('passes clean copy', () => expect(codes('Finish the book you started in March.')).toEqual([]));
  it('blocks empty copy', () => expect(codes('   ')).toEqual(['empty']));
  it('flags banned phrases as errors, whole words only, any case', () => {
    expect(hasErrors(checkCopy('A reading Hack for you', 'linkedin', rules))).toBe(true);
    expect(codes('Join our hackathon')).toEqual([]);
    expect(codes('An AI-Powered shelf')).toContain('banned');
    expect(codes('10x your reading')).toContain('banned');
  });
  it('enforces the X limit and counts links as 23', () => {
    expect(codes('a'.repeat(281), 'x')).toContain('too_long');
    expect(codes('a'.repeat(280), 'x')).not.toContain('too_long');
    expect(countChars(`hi https://example.com/${'x'.repeat(200)}`, 'x')).toBe(3 + 23);
    expect(codes('a'.repeat(2999))).not.toContain('too_long');
  });
  it('warns on emoji and too many hashtags without blocking', () => {
    const issues = checkCopy('Big news 🚀 #a #b #c #d', 'linkedin', rules);
    expect(issues.map((i) => i.code).sort()).toEqual(['emoji', 'hashtags']);
    expect(hasErrors(issues)).toBe(false);
  });
  it('flags numbers that are not in the approved facts, and accepts ones that are', () => {
    expect(codes('We grew 300% this year')).toContain('unverified_number');
    expect(codes('Plans start at $12, loved by 4,200 readers with a 38% finish rate')).toEqual([]);
    expect(codes('Launching in 2026')).toEqual([]);
    expect(codes('Ten minutes a day, 1 chapter at a time')).toEqual([]);
  });
  it('warns about links on X', () => expect(codes('Read it https://example.com', 'x')).toContain('x_link'));
});

describe('brand config', () => {
  it('reads the Bookly kit', () => {
    const r = parseBrandConfig(BOOKLY);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(bannedPhrases(r.brand)).toContain('ai-powered');
    expect(brandFontsUrl(r.brand)).toBe('https://fonts.googleapis.com/css2?family=Fraunces:wght@500;600&family=Inter:wght@400;500;600&display=swap');
  });
  it('rejects bad JSON, bad colours and font names that could break out of a URL', () => {
    expect(parseBrandConfig('{').ok).toBe(false);
    const cfg = JSON.parse(BOOKLY);
    cfg.colors.accent.hex = 'red; background:url(x)';
    expect(parseBrandConfig(JSON.stringify(cfg)).ok).toBe(false);
    const cfg2 = JSON.parse(BOOKLY);
    cfg2.fonts.display.family = 'Inter&family=Evil"><script>';
    expect(parseBrandConfig(JSON.stringify(cfg2)).ok).toBe(false);
  });
});
