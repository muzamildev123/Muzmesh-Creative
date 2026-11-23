// The Context Pack: one shared set of facts and rules per workspace that every AI reads,
// whichever app it runs in. Stored as versioned JSON, compiled to Markdown on demand.
import type { BrandConfig } from './brand';
import { bannedPhrases } from './brand';

export const CONTEXT_FIELDS = [
  { key: 'company', label: 'What the company does', hint: 'Two or three plain sentences. What the product is and the problem it solves.', rows: 4 },
  { key: 'audience', label: 'Who it is for', hint: 'The customer, in their words. Who it is not for.', rows: 3 },
  { key: 'offer', label: 'Pricing and plans', hint: 'Exact prices and what each plan includes. An AI will quote these, so keep them current.', rows: 4 },
  { key: 'features', label: 'What exists today', hint: 'One feature per line. Only things a customer can use right now.', rows: 6 },
  { key: 'notYet', label: 'What does not exist yet', hint: 'Planned or often-assumed features. The AI is told never to claim these.', rows: 3 },
  { key: 'claims', label: 'Approved claims and numbers', hint: 'Every statistic, result or customer name that is verified and may be used. Anything not listed here gets flagged.', rows: 5 },
  { key: 'glossary', label: 'Names and spelling', hint: 'Product and feature names exactly as written. One per line.', rows: 3 },
  { key: 'campaign', label: 'Current focus', hint: 'What this month is about: a launch, a feature, a theme.', rows: 3 },
  { key: 'avoidTopics', label: 'Topics to avoid', hint: 'Competitors, politics, anything off limits.', rows: 2 },
  { key: 'rules', label: 'Extra rules', hint: 'Anything else an AI must always or never do for this company.', rows: 3 },
] as const;

export type ContextKey = (typeof CONTEXT_FIELDS)[number]['key'];
export type ContextPack = Record<ContextKey, string>;
export const CONTEXT_FIELD_MAX = 4000;

export const emptyContext = (): ContextPack =>
  Object.fromEntries(CONTEXT_FIELDS.map((f) => [f.key, ''])) as ContextPack;

export const readContext = (raw: string | null | undefined): ContextPack => {
  const pack = emptyContext();
  if (!raw) return pack;
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    for (const f of CONTEXT_FIELDS) {
      const v = json[f.key];
      if (typeof v === 'string') pack[f.key] = v.slice(0, CONTEXT_FIELD_MAX);
    }
  } catch { /* fall through to empty */ }
  return pack;
};

export const contextIsEmpty = (pack: ContextPack): boolean => CONTEXT_FIELDS.every((f) => !pack[f.key].trim());

/** Text the brand check treats as verified when it looks for numbers in a post. */
export const approvedFactsText = (pack: ContextPack): string =>
  [pack.claims, pack.offer, pack.features, pack.company].join('\n');

// The rules that apply to every workspace. Short on purpose: an AI follows five rules better than fifty.
export const CORE_RULES = [
  'Never invent customers, testimonials, results, statistics or prices. Use only what is in "Approved claims and numbers" and "Pricing and plans".',
  'If a fact you need is missing, say so and ask. Do not guess.',
  'Never describe anything under "What does not exist yet" as available.',
  'Write product and feature names exactly as in "Names and spelling".',
  'Everything you write is a draft. A person approves it before it is published.',
];

const section = (title: string, body: string): string => (body.trim() ? `## ${title}\n\n${body.trim()}\n` : '');
const bullets = (items: string[]): string => items.map((i) => `- ${i}`).join('\n');

export interface CompileInput {
  workspaceName: string;
  siteUrl: string;
  brand: BrandConfig | null;
  pack: ContextPack;
  version: number;
  updatedAt: string | null;
}

/** The whole pack as one Markdown document. This is what get_context returns and what the exports contain. */
export const compileContext = ({ workspaceName, siteUrl, brand, pack, version, updatedAt }: CompileInput): string => {
  const parts: string[] = [];
  parts.push(`# ${workspaceName}: context pack v${version}\n`);
  parts.push(`${updatedAt ? `Last updated ${updatedAt.slice(0, 10)}. ` : ''}This is the single source of truth for anything written or designed for ${workspaceName}. If it disagrees with your memory or with another document, this wins.\n`);
  parts.push(section('Rules', bullets([...CORE_RULES, ...pack.rules.split('\n').map((s) => s.trim()).filter(Boolean)])));
  parts.push(section('What the company does', pack.company));
  parts.push(section('Who it is for', pack.audience));
  parts.push(section('Pricing and plans', pack.offer));
  parts.push(section('What exists today', pack.features));
  parts.push(section('What does not exist yet (never claim these)', pack.notYet));
  parts.push(section('Approved claims and numbers', pack.claims || 'None yet. Do not use any statistic, result or customer name.'));
  parts.push(section('Names and spelling', pack.glossary));
  parts.push(section('Current focus', pack.campaign));
  parts.push(section('Topics to avoid', pack.avoidTopics));

  if (brand) {
    const v = brand.voice;
    const voice: string[] = [];
    if (v.summary) voice.push(v.summary);
    if (brand.idea?.personality) voice.push(`Personality: ${brand.idea.personality}`);
    if (v.use.length) voice.push(`Words we use: ${v.use.join(', ')}.`);
    voice.push(`Never write: ${bannedPhrases(brand).join(', ')}.`);
    if (v.write.length) voice.push(`Sounds like us:\n${bullets(v.write)}`);
    if (v.not.length) voice.push(`Does not sound like us:\n${bullets(v.not)}`);
    if (v.ctaPrimary) voice.push(`Main call to action: "${v.ctaPrimary}"${v.ctaSecondary ? `. Second: "${v.ctaSecondary}"` : ''}.`);
    if (v.names) voice.push(`Name: ${v.names}`);
    voice.push('No emoji. No more than 3 hashtags.');
    parts.push(section('Voice', voice.join('\n\n')));

    const c = brand.colors;
    const look = [
      `Colours: background ${c.light.hex} (${c.light.name}), dark ${c.dark.hex} (${c.dark.name}), text ${c.textOnLight.hex} on light and ${c.textOnDark.hex} on dark, one accent ${c.accent.hex} (${c.accent.name}).`,
      `Fonts: ${brand.fonts.display.family} for headlines, ${brand.fonts.body.family} for everything else. No other fonts or colours.`,
    ];
    if (brand.imagery?.summary) look.push(`Imagery: ${brand.imagery.summary}`);
    if (brand.imagery?.rules?.length) look.push(bullets(brand.imagery.rules));
    parts.push(section('Look', look.join('\n\n')));
  }
  if (siteUrl) parts.push(section('Links', `Website: ${siteUrl}`));
  return parts.filter(Boolean).join('\n').trim() + '\n';
};

export const EXPORT_TARGETS = [
  { key: 'claude', name: 'Claude Project', steps: ['Open your Project in Claude.', 'Paste the instructions below into "Project instructions".', 'Add the knowledge file to the Project\'s files, replacing the old one.'] },
  { key: 'chatgpt', name: 'ChatGPT Project or GPT', steps: ['Open your Project (or GPT) in ChatGPT.', 'Paste the instructions below into "Instructions".', 'Upload the knowledge file under "Files" (or "Knowledge"), replacing the old one.'] },
  { key: 'gemini', name: 'Gemini Gem', steps: ['Open your Gem in Gemini and choose Edit.', 'Paste the instructions below into "Instructions".', 'Add the knowledge file under "Knowledge", replacing the old one.'] },
  { key: 'other', name: 'Any other AI app', steps: ['Paste the instructions below as the system prompt or custom instructions.', 'Attach the knowledge file, or paste its text after the instructions.'] },
] as const;
export type ExportTarget = (typeof EXPORT_TARGETS)[number]['key'];
export const isExportTarget = (s: unknown): s is ExportTarget => EXPORT_TARGETS.some((t) => t.key === s);

export const knowledgeFileName = (slug: string, version: number): string => `${slug}-context-pack-v${version}.md`;

/** Short instructions that point the AI at the knowledge file. Same wording for every app, so behaviour matches. */
export const exportInstructions = (workspaceName: string, slug: string, version: number): string =>
  [
    `You write and design for ${workspaceName}.`,
    `The attached file "${knowledgeFileName(slug, version)}" is the context pack (v${version}). Read it before every task and follow it exactly. It wins over anything else you know about ${workspaceName}.`,
    '',
    ...CORE_RULES.map((r) => `- ${r}`),
    '',
    'When you draft a social post: say which channel it is for, keep X posts under 280 characters, and list any fact you could not find in the context pack instead of filling the gap.',
  ].join('\n');

/** llms.txt for the client's website, generated from the same facts. */
export const compileLlmsTxt = ({ workspaceName, siteUrl, pack }: Pick<CompileInput, 'workspaceName' | 'siteUrl' | 'pack'>): string => {
  const out = [`# ${workspaceName}`, ''];
  if (pack.company.trim()) out.push(`> ${pack.company.trim().replace(/\n+/g, ' ')}`, '');
  if (pack.audience.trim()) out.push('## Who it is for', '', pack.audience.trim(), '');
  if (pack.features.trim()) out.push('## What it does', '', pack.features.trim(), '');
  if (pack.offer.trim()) out.push('## Pricing', '', pack.offer.trim(), '');
  if (pack.glossary.trim()) out.push('## Names', '', pack.glossary.trim(), '');
  if (siteUrl) out.push('## Links', '', `- [Website](${siteUrl})`, '');
  return out.join('\n').trim() + '\n';
};
