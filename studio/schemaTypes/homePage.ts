import { defineArrayMember, defineField, defineType } from 'sanity';
import { homeDefaults } from '../../web/src/data/home';

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

// The first time the Homepage is opened it starts from the copy on the site today.
// Objects inside arrays need a _key and their _type; empty text is left out.
const ITEM_TYPE: Record<string, string> = { notes: 'note', steps: 'note', cards: 'note', next: 'note', groups: 'faqGroup', 'groups.items': 'faqItem', 'list.items': 'listItem' };
const key = () => Math.random().toString(36).slice(2, 14);
function initial(v: unknown, path = ''): unknown {
  if (Array.isArray(v)) {
    const _type = ITEM_TYPE[path.split('.').slice(-2).join('.')] ?? ITEM_TYPE[path.split('.').pop() ?? ''];
    return v.map((x) => (x && typeof x === 'object' ? { _key: key(), ...(_type ? { _type } : {}), ...(initial(x, path) as object) } : x));
  }
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .filter(([, x]) => x !== '' && x != null)
        .map(([k, x]) => [k, initial(x, path.split('.').pop() + '.' + k)]),
    );
  return v;
}

const section = (name: string, title: string, group: string, fields: ReturnType<typeof defineField>[]) =>
  defineField({ name, title, type: 'object', group, options: { collapsible: false }, fields });

// Small words (labels, buttons) grouped in a box that starts closed, so the main copy stays on top.
const words = (name: string, title: string, fields: ReturnType<typeof defineField>[], description?: string) =>
  defineField({ name, title, type: 'object', description, options: { collapsible: true, collapsed: true }, fields });

export const homePage = defineType({
  name: 'homePage',
  title: 'Homepage',
  type: 'document',
  initialValue: () => initial(homeDefaults) as Record<string, unknown>,
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
    section('nav', 'Menu', 'story', [str('included', 'What’s included'), str('pricing', 'Pricing'), str('referral', 'Referral'), str('faq', 'FAQ')]),
    section('hero', 'Hero', 'story', [
      str('eyebrow', 'Small line above the headline'),
      str('headline'),
      str('placeholder', 'Prompt bar placeholder'),
      str('button', 'Prompt bar button'),
      str('inputLabel', 'Prompt bar label', 'Not shown on screen; read out by screen readers.'),
      strings('ideas', 'Example ideas', undefined, 'The chips under the prompt bar. 3 to 5 short ideas work best.'),
    ]),
    section('build', 'The build (after "Build my idea")', 'story', [
      str('building', 'Status while building'),
      str('ready', 'Status when done'),
      defineField({
        name: 'steps',
        title: 'Build log steps',
        type: 'array',
        validation: (rule) => rule.length(6).error('Needs exactly 6: the animation is built for 6.'),
        of: [defineArrayMember({ type: 'object', name: 'note', fields: [str('title', 'Step'), str('text', 'Small line under it')], preview: { select: { title: 'title', subtitle: 'text' } } })],
      }),
      str('doneTitle', 'Done line (bold part)'),
      str('doneText', 'Done line (after the startup name)'),
      str('launchButton', 'Launch button'),
      str('startOver', 'Start over button'),
    ]),
    section('sample', 'The generic AI page the build makes', 'story', [
      strings('links', 'Menu links', 3),
      str('navButton', 'Menu button'),
      str('badge', 'Badge above the headline'),
      str('primary', 'First button'),
      str('secondary', 'Second button'),
      defineField({
        name: 'cards',
        title: 'Feature cards',
        type: 'array',
        validation: (rule) => rule.length(3),
        of: [defineArrayMember({ type: 'object', name: 'note', fields: [str('title'), str('text')], preview: { select: { title: 'title', subtitle: 'text' } } })],
      }),
      str('booting', 'Loading line'),
    ]),
    section('launch', 'Launch moment', 'story', [str('headline'), str('subline')]),
    section('answer', '"Yours won’t"', 'story', [...lines, txt('intro'), str('secondary', 'Second button label')]),
    section('kit', 'What’s included (the kit)', 'story', [
      str('cue', 'Scroll cue'),
      ...lines,
      txt('intro'),
      str('lookTitle', 'Look column title'),
      str('launchTitle', 'Launch column title'),
      str('runTitle', 'Run column title'),
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
      words('pass', 'Launch pass (the ticket)', [
        str('title'),
        str('fromLabel', '"From" label'),
        str('fromValue', 'From'),
        str('fromWhen', 'From, when'),
        str('toLabel', '"To" label'),
        str('toValue', 'To'),
        str('toWhen', 'To, when'),
        str('passengerLabel', 'Passenger label'),
        str('passengerValue', 'Passenger', 'Replaced by the startup name the visitor typed in the hero.'),
        str('flightLabel', 'Flight time label'),
        str('flightValue', 'Flight time'),
        str('seatLabel', 'Class label'),
        str('seatValue', 'Class'),
        str('daysTitle', 'Days heading'),
        str('dayLabel', '"Day" word before each number'),
        str('perMonth', 'After the monthly price, after the slash ("mo" shows as /mo)'),
      ]),
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
      str('rewardLabel', 'Third card label', 'After the number, e.g. "03 · For you".'),
      str('rewardText', 'Third card line', 'Before the old and new monthly price.'),
    ]),

    // ---------- FAQ ----------
    section('faq', 'FAQ', 'faq', [
      str('eyebrow'),
      ...lines,
      str('answeredBy', 'Answered by', 'Name shown under every answer, e.g. "Muzamil, MuzMesh".'),
      str('personLabel', 'Small line under the name'),
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
      words('sentence', 'The fill-in sentence', [
        str('hi', 'Before the name box'),
        str('from', 'Before the startup box'),
        str('building', 'Before the "what you’re building" box'),
        str('launch', 'Before the timing box'),
        str('site', 'Before the site box'),
        str('reach', 'Before the email box'),
      ]),
      words('form', 'Box labels and hints', [
        str('nameLabel', 'Name: label (screen readers)'),
        str('namePlaceholder', 'Name: hint in the box'),
        str('startupLabel', 'Startup: label (screen readers)'),
        str('startupPlaceholder', 'Startup: hint in the box'),
        str('whatLabel', 'Building: label (screen readers)'),
        str('whatPlaceholder', 'Building: hint in the box'),
        str('whenLabel', 'Timing: label (screen readers)'),
        str('siteLabel', 'Site: label (screen readers)'),
        str('sitePlaceholder', 'Site: hint in the box'),
        str('emailLabel', 'Email: label (screen readers)'),
        str('emailPlaceholder', 'Email: hint in the box'),
      ]),
      str('needsLabel', 'Before the help chips'),
      str('allOfIt', '"All of it" chip'),
      defineField({
        name: 'next',
        title: 'What happens next (after sending)',
        type: 'array',
        validation: (rule) => rule.length(3),
        of: [defineArrayMember({ type: 'object', name: 'note', fields: [str('title', 'When'), str('text', undefined, '{startup} shows the startup name they typed.')], preview: { select: { title: 'title', subtitle: 'text' } } })],
      }),
      str('doneTitle', 'Thank-you heading', '{name} is their first name, {Startup} their startup name.'),
      str('pickTime', '"Pick a time" button'),
      str('changeAnswers', '"Change my answers" button'),
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
