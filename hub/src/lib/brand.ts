// Reads a client's brand.config.json (made by tools/brand-kit) into the few things the hub needs.
// The config is stored as-is, so the brand kit stays the single source of brand truth.
import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const colour = z.object({ hex, name: z.string().max(60).default(''), use: z.string().max(300).default('') });
const str = (max: number) => z.string().max(max);
const list = (max: number) => z.array(str(max)).max(40).default([]);
// A Google Fonts family name. Kept strict because it is placed in a stylesheet URL and a canvas font string.
const family = z.string().regex(/^[A-Za-z0-9 ]{1,40}$/);

export const brandConfigSchema = z.object({
  name: str(80),
  legalName: str(120).optional(),
  url: str(200).optional(),
  email: str(200).optional(),
  category: str(300).optional(),
  idea: z.object({
    headline: z.array(str(120)).max(2).optional(),
    promise: str(1000).optional(),
    personality: str(300).optional(),
  }).partial().optional(),
  theme: z.object({ default: z.enum(['light', 'dark']) }).optional(),
  colors: z.object({
    light: colour, dark: colour, textOnLight: colour, textOnDark: colour, accent: colour,
    support: z.array(colour).max(8).default([]),
  }),
  fonts: z.object({
    display: z.object({ family, weights: z.array(z.number().int().min(100).max(900)).max(6).default([600]), tracking: str(20).optional() }),
    body: z.object({ family, weights: z.array(z.number().int().min(100).max(900)).max(6).default([400, 600]) }),
    label: z.object({ family, style: z.enum(['mono', 'caps']).default('caps'), weight: z.number().int().min(100).max(900).default(600) }).optional(),
  }),
  shape: z.object({ radius: z.enum(['sharp', 'soft', 'round']), buttons: z.enum(['pill', 'rounded', 'square']) }).partial().optional(),
  labelMarker: z.enum(['square', 'dot', 'line', 'none']).optional(),
  logo: z.object({ wordmark: z.object({ text: str(40), font: z.enum(['display', 'body']).default('display'), weight: z.number().int().min(100).max(900).default(600) }).optional() }).optional(),
  voice: z.object({
    summary: str(600).default(''),
    use: list(60), avoid: list(60), write: list(300), not: list(300),
    ctaPrimary: str(60).optional(), ctaSecondary: str(60).optional(), names: str(300).optional(),
  }).default({ summary: '', use: [], avoid: [], write: [], not: [] }),
  imagery: z.object({
    summary: str(600).optional(),
    do: list(300), dont: list(300),
    style: str(1200).optional(), avoid: str(1200).optional(),
    prompts: z.array(z.object({ title: str(80), ar: str(10).default('1:1'), use: str(200).default(''), subject: str(800) })).max(24).default([]),
    after: list(400), rules: list(400),
  }).partial().optional(),
});
export type BrandConfig = z.infer<typeof brandConfigSchema>;

export type ParsedBrand =
  | { ok: true; brand: BrandConfig }
  | { ok: false; error: string };

export const parseBrandConfig = (raw: string): ParsedBrand => {
  let json: unknown;
  try { json = JSON.parse(raw); } catch { return { ok: false, error: 'That is not valid JSON.' }; }
  const r = brandConfigSchema.safeParse(json);
  if (r.success) return { ok: true, brand: r.data };
  const first = r.error.issues[0];
  return { ok: false, error: `Brand config problem at "${first?.path.join('.') || 'root'}": ${first?.message ?? 'invalid'}` };
};

/** The stored config, or null when a workspace has no brand kit yet. Never throws. */
export const readBrand = (raw: string | null | undefined): BrandConfig | null => {
  if (!raw || raw === '{}') return null;
  const r = parseBrandConfig(raw);
  return r.ok ? r.brand : null;
};

// Phrases the brand kit bans in every client's copy, on top of the client's own list.
export const ALWAYS_BANNED = ['game-changer', 'revolutionary', 'seamless', 'click here'];

export const bannedPhrases = (brand: BrandConfig | null): string[] => {
  const all = [...(brand?.voice.avoid ?? []), ...ALWAYS_BANNED].map((w) => w.trim().toLowerCase()).filter(Boolean);
  return [...new Set(all)];
};

/** Google Fonts stylesheet URL for the brand's fonts. Families are validated by the schema above. */
export const brandFontsUrl = (brand: BrandConfig): string => {
  const fams = new Map<string, Set<number>>();
  const add = (f: string, ws: number[]) => { const s = fams.get(f) ?? new Set<number>(); ws.forEach((w) => s.add(w)); fams.set(f, s); };
  add(brand.fonts.display.family, brand.fonts.display.weights.length ? brand.fonts.display.weights : [600]);
  add(brand.fonts.body.family, brand.fonts.body.weights.length ? brand.fonts.body.weights : [400, 600]);
  if (brand.fonts.label) add(brand.fonts.label.family, [brand.fonts.label.weight]);
  const q = [...fams].map(([f, ws]) => `family=${f.replace(/ /g, '+')}:wght@${[...ws].sort((a, b) => a - b).join(';')}`).join('&');
  return `https://fonts.googleapis.com/css2?${q}&display=swap`;
};

/** What the browser needs to draw post images. Plain data, safe to put in the page. */
export const brandRenderData = (brand: BrandConfig) => ({
  name: brand.name,
  wordmark: brand.logo?.wordmark?.text ?? brand.name,
  wordmarkFont: brand.logo?.wordmark?.font ?? 'display',
  wordmarkWeight: brand.logo?.wordmark?.weight ?? 600,
  defaultTheme: brand.theme?.default ?? 'light',
  light: brand.colors.light.hex, dark: brand.colors.dark.hex,
  textOnLight: brand.colors.textOnLight.hex, textOnDark: brand.colors.textOnDark.hex,
  accent: brand.colors.accent.hex,
  display: brand.fonts.display.family, displayWeight: Math.max(...(brand.fonts.display.weights.length ? brand.fonts.display.weights : [600])),
  body: brand.fonts.body.family,
  label: brand.fonts.label?.family ?? brand.fonts.body.family,
  labelWeight: brand.fonts.label?.weight ?? 600,
  labelMarker: brand.labelMarker ?? 'square',
  radius: brand.shape?.radius ?? 'soft',
  url: brand.url ?? '',
});
export type BrandRenderData = ReturnType<typeof brandRenderData>;
