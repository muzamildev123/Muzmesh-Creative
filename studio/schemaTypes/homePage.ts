import { defineArrayMember, defineField, defineType } from 'sanity';

// One fixed document (_id "homePage") with every word, price and FAQ on the homepage.
// An empty field falls back to the copy built into the site (web/src/data/home.ts),
// so editors only fill in what they want to change.
// Animated parts (the five days, the kit) need a fixed number of items.

const TOKENS =
  'Can use **bold**, and {setup}, {monthly} or {percent}, which show the current prices.';

const str = (name: string, title?: string, description?: string) =>
  defineField({ name, title, type: 'string', description });

const txt = (name: string, title?: string, description = TOKENS) =>
  defineField({ name, title, type: 'text', rows: 3, description });

const strings = (name: string, title: string, count?: number, description?: string) =>
  defineField({
    name,
    title,
    type: 'array',
    of: [defineArrayMember({ type: 'string' })],
    description,
    validation: (rule) => (count ? rule.length(count).error(`Needs exactly ${count}: the animation is built for ${count}.`) : rule.min(1)),
  });

const notes = (name: string, title: string, count: number) =>
  defineField({
    name,
    title,
    type: 'array',
    validation: (rule) => rule.length(count),
    of: [
      defineArrayMember({
        type: 'object',
        name: 'note',
        fields: [str('title'), txt('text')],
        preview: { select: { title: 'title', subtitle: 'text' } },
      }),
    ],
  });

// Two-line headings: the second line shows in grey.
const lines = [str('line1', 'Heading, first line'), str('line2', 'Heading, second line (grey)')];

const section = (name: string, title: string, group: string, fields: ReturnType<typeof defineField>[]) =>
  defineField({ name, title, type: 'object', group, options: { collapsible: false }, fields });

export const homePage = defineType({
  name: 'homePage',
  title: 'Homepage',
  type: 'document',
  groups: [
    { name: 'story', title: 'Story', default: true },
    { name: 'pricing', title: 'Pricing' },
    { name: 'referral', title: 'Referral' },
    { name: 'faq', title: 'FAQ' },
    { name: 'brief', title: 'Launch brief' },
    { name: 'footer', title: 'Footer & SEO' },
  ],
  fields: [
    // ---------- Story ----------
    defineField({ name: 'ctaLabel', title: 'Main button label', type: 'string', group: 'story', description: 'Used on every "Plan my launch" button.' }),
    section('hero', 'Hero', 'story', [
      str('eyebrow', 'Small line above the headline'),
      str('headline'),
      str('placeholder', 'Prompt bar placeholder'),
      str('button', 'Prompt bar button'),
      strings('ideas', 'Example ideas', undefined, 'The chips under the prompt bar. 3 to 5 short ideas work best.'),
    ]),
    section('launch', 'Launch moment', 'story', [str('headline'), str('subline')]),
    section('answer', '"Yours won’t"', 'story', [...lines, txt('intro'), str('secondary', 'Second button label')]),
    section('kit', 'What’s included (the kit)', 'story', [
      str('cue', 'Scroll cue'),
      ...lines,
      txt('intro'),
      strings('look', 'Look', 2),
      strings('launch', 'Launch', 3),
      strings('run', 'Run', 3),
    ]),

    // ---------- Pricing ----------
    defineField({
      name: 'prices',
      title: 'Prices',
      type: 'object',
      group: 'pricing',
      description: 'Changing these updates every {setup}, {monthly} and {percent} on the page, and the referral maths.',
      fields: [
        defineField({ name: 'setup', title: 'Setup, one time ($)', type: 'number', validation: (r) => r.min(0) }),
        defineField({ name: 'monthly', title: 'Monthly ($)', type: 'number', validation: (r) => r.min(0) }),
        defineField({ name: 'referralPercent', title: 'Referral discount (%)', type: 'number', validation: (r) => r.min(0).max(100) }),
      ],
    }),
    section('pricing', 'Pricing section', 'pricing', [
      str('eyebrow'),
      ...lines,
      txt('intro'),
      notes('notes', 'Notes under the button', 3),
      strings('days', 'The five days on the pass', 5),
      str('setupLabel', 'Setup label'),
      str('monthlyLabel', 'Monthly label'),
      txt('monthlyText', 'What the monthly plan covers'),
    ]),

    // ---------- Referral ----------
    section('referral', 'Referral', 'referral', [
      str('eyebrow'),
      ...lines,
      txt('intro'),
      notes('steps', 'Steps (the third card, the discount, is automatic)', 2),
    ]),

    // ---------- FAQ ----------
    section('faq', 'FAQ', 'faq', [
      str('eyebrow'),
      ...lines,
      str('answeredBy', 'Answered by', 'Name shown under every answer, e.g. "Muzamil, MuzMesh".'),
      defineField({
        name: 'groups',
        title: 'Question groups',
        type: 'array',
        of: [
          defineArrayMember({
            type: 'object',
            name: 'faqGroup',
            fields: [
              str('title'),
              defineField({
                name: 'items',
                title: 'Questions',
                type: 'array',
                of: [
                  defineArrayMember({
                    type: 'object',
                    name: 'faqItem',
                    fields: [
                      str('question', undefined, TOKENS),
                      defineField({
                        name: 'answer',
                        title: 'Answer paragraphs',
                        type: 'array',
                        of: [defineArrayMember({ type: 'text', rows: 3 })],
                        description: TOKENS + ' `code` shows as code.',
                        validation: (r) => r.min(1),
                      }),
                      defineField({
                        name: 'list',
                        title: 'List under the answer (optional)',
                        type: 'object',
                        fields: [
                          defineField({
                            name: 'style',
                            type: 'string',
                            options: {
                              list: [
                                { title: 'Days (Day 1, Day 2…)', value: 'days' },
                                { title: 'Label and text', value: 'labelled' },
                                { title: 'Owned by you (label + tag)', value: 'owned' },
                              ],
                              layout: 'radio',
                            },
                          }),
                          defineField({
                            name: 'items',
                            type: 'array',
                            of: [
                              defineArrayMember({
                                type: 'object',
                                name: 'listItem',
                                fields: [str('label'), str('text', 'Text (for "Owned", the tag, e.g. Yours)')],
                                preview: { select: { title: 'label', subtitle: 'text' } },
                              }),
                            ],
                          }),
                        ],
                      }),
                    ],
                    preview: { select: { title: 'question', subtitle: 'answer.0' } },
                  }),
                ],
              }),
            ],
            preview: { select: { title: 'title' } },
          }),
        ],
      }),
      txt('end', 'Line under the questions'),
    ]),

    // ---------- Launch brief ----------
    section('brief', 'Launch brief (final call to action)', 'brief', [
      str('eyebrow'),
      ...lines,
      strings('timings', 'Launch timing options', 4, 'The second one is pre-selected.'),
      strings('needs', 'What they need help with', undefined, '"All of it" is added automatically.'),
      txt('promise', 'Line next to the button', TOKENS + ' {startup} shows the startup name they typed.'),
      txt('thanks', 'Thank-you text'),
      str('reader', 'Line under your name'),
      defineField({
        name: 'bookingUrl',
        title: 'Booking link',
        type: 'url',
        description: 'Cal.com or Calendly link for "Pick a time". Empty uses the site setting, then email.',
      }),
    ]),

    // ---------- Footer & SEO ----------
    section('footer', 'Footer', 'footer', [
      txt('tagline'),
      defineField({ name: 'email', type: 'string', validation: (r) => r.email() }),
      str('location'),
      str('timeZone', 'Time zone', 'IANA name for the live clock, e.g. Asia/Karachi.'),
      str('status', 'Status line'),
    ]),
    section('seo', 'Search and sharing', 'footer', [
      str('title', 'Page title', 'Shown in Google and browser tabs. Aim for under 60 characters.'),
      txt('description', 'Meta description', TOKENS + ' Aim for 120-160 characters.'),
    ]),
  ],
  preview: { prepare: () => ({ title: 'Homepage' }) },
});
