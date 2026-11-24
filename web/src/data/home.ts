// Homepage words, prices and FAQ. These are the defaults: anything filled in on
// the Homepage document in Sanity Studio replaces them at build time, so the
// page still builds (and looks the same) before Sanity is connected.
//
// Text can use **bold** and `code`, and these tokens, which follow the prices:
//   {setup}   one-time setup price, e.g. $500
//   {monthly} monthly price, e.g. $200
//   {percent} referral discount, e.g. 40%
//
// Keep this file free of Astro imports: studio/scripts/seed-homepage.ts reads it.

export type Note = { title: string; text: string };
export type FaqList = { style: 'days' | 'labelled' | 'owned'; items: { label: string; text?: string }[] };
export type FaqItem = { question: string; answer: string[]; list?: FaqList };

export const homeDefaults = {
  seo: {
    title: 'MuzMesh Creative · Launch your AI startup in five days',
    description:
      'Your AI startup’s whole launch kit, from brand to landing page to tracking, live in five business days. {setup} to set up, {monthly} a month.',
  },
  ctaLabel: 'Plan my launch',
  prices: { setup: 500, monthly: 200, referralPercent: 40 },
  hero: {
    eyebrow: 'Every AI founder starts here.',
    headline: 'You have the idea. Build it in seconds.',
    placeholder: 'Describe your startup idea…',
    button: 'Build my idea',
    ideas: ['AI note-taker for doctors', 'An agent that books my meetings', 'ChatGPT for lawyers', 'AI copilot for sales teams'],
  },
  launch: { headline: 'Can you still find yours?', subline: 'Neither can your customers.' },
  answer: {
    line1: 'Every AI startup looks the same.',
    line2: 'Yours won’t.',
    intro: '**MuzMesh** is the design partner for AI startups. Brand, landing page and launch kit, designed by people, ready in 5 days.',
    secondary: 'See what’s included',
  },
  kit: {
    cue: 'More than a website',
    line1: 'A website is one page of your launch.',
    line2: 'We design the rest.',
    intro:
      'Your logo, brand, social posts and intro video, plus the tracking, CRM and easy editor to run it. Designed together, so every piece looks like one company.',
    look: ['Logo', 'Brand guidelines'],
    launch: ['Landing page', 'Social post kit', 'Product intro video'],
    run: ['Analytics & tracking', 'CRM & waitlist', 'Site you can edit'],
  },
  pricing: {
    eyebrow: 'Pricing',
    line1: 'One price.',
    line2: 'No surprises.',
    intro: 'No tiers to compare and no “contact us”. Everything in the kit comes with the setup, and one monthly plan keeps it all running.',
    notes: [
      { title: 'Next to an agency', text: 'Agencies often quote $10k and up, and take eight weeks.' },
      { title: 'You own it all', text: 'Domain, hosting, CMS, CRM and analytics sit on your own accounts.' },
      { title: 'Refer a founder', text: 'Get {percent} off your next month when they launch with us.' },
    ] as Note[],
    days: [
      'Logo, brand guidelines',
      'Landing page, site you can edit',
      'Social post kit, product intro video',
      'Analytics & tracking, CRM & waitlist',
      'You’re live',
    ],
    setupLabel: 'Setup, one time',
    monthlyLabel: 'Then, monthly',
    monthlyText: 'Site edits, social posts, support and a monthly report. Starts the month after launch.',
  },
  referral: {
    eyebrow: 'Referral',
    line1: 'Know a founder?',
    line2: 'Send them our way.',
    intro: 'When a founder you refer launches with us, your next month is {percent} off. That’s it.',
    steps: [
      { title: 'Send your link', text: 'Share it with a founder who needs a launch. You’ll have it the day you go live.' },
      { title: 'They launch with us', text: 'Same kit, same five days, same price as you.' },
    ] as Note[],
  },
  faq: {
    eyebrow: 'FAQ',
    line1: 'Questions founders ask us.',
    line2: 'Answered by us.',
    answeredBy: 'Muzamil, MuzMesh',
    end: 'Still wondering about something? **Ask us on the 15-minute call.**',
    groups: [
      {
        title: 'Before you start',
        items: [
          {
            question: 'Is this for us?',
            answer: [
              'If you’re an AI startup, from pre-launch to seed, and you don’t have a designer or marketer yet, yes. That’s who we built this for.',
              'It’s not the right fit if you need a multi-page marketing site, app or product UI, paid ads or daily community management. We can quote those separately.',
            ],
          },
          {
            question: 'Is it really designed by people?',
            answer: [
              'Yes. A designer draws your logo, sets your brand and designs your page in Figma. No site generators, no stock templates, no sparkle icon.',
              'That’s the whole point. If your launch looks generated, people assume the product was too.',
            ],
          },
          {
            question: 'How can all of this cost {setup}?',
            answer: [
              'We reuse everything that doesn’t need to be yours: our own design system, site starter, tracking and CRM setup. You pay for the design decisions, not for us rebuilding the plumbing every time.',
              'Need more pages or a fully custom build? We’ll quote it before we start, never after.',
            ],
          },
          {
            question: 'What do you need from us?',
            answer: [
              'A 15-minute call, a rough draft of your copy, a few product screenshots and access to your accounts.',
              'We shape and edit your words, but we don’t write them from scratch. Nobody knows your product better than you.',
            ],
          },
        ] as FaqItem[],
      },
      {
        title: 'The 5 days',
        items: [
          {
            question: 'Is it really 5 days?',
            answer: ['**5 business days**, counted from the day we have your content and account access. The sooner you send them, the sooner you’re live.'],
            list: {
              style: 'days',
              items: [
                { label: 'Day 1', text: 'Logo and brand' },
                { label: 'Day 2', text: 'Page design' },
                { label: 'Day 3', text: 'Build and CMS' },
                { label: 'Day 4', text: 'Social kit, video, tracking' },
                { label: 'Day 5', text: 'You’re live' },
              ],
            },
          },
          {
            question: 'What if we don’t like the first design?',
            answer: [
              'Tell us. One round of changes fits inside the 5 days, on a live preview link, and you get a second round after launch.',
              'We show you the direction early, so nothing big changes at the last minute.',
            ],
          },
          {
            question: 'Will ChatGPT actually mention us?',
            answer: [
              'Nobody can promise that, and you should be wary of anyone who does.',
              'What we can do is set up everything that makes it more likely: clean structure, schema, an FAQ like this one, `llms.txt`, a sitemap and Search Console.',
            ],
          },
        ] as FaqItem[],
      },
      {
        title: 'After launch',
        items: [
          {
            question: 'What’s in the {monthly} a month?',
            answer: ['Everything that keeps your launch from going quiet. It starts the month after you’re live.'],
            list: {
              style: 'labelled',
              items: [
                { label: 'Site', text: 'Edits, updates, backups and CMS help' },
                { label: 'Social', text: 'Posts made in your brand and scheduled for you' },
                { label: 'Support', text: 'One channel, straight to the people doing the work' },
                { label: 'Report', text: 'One page a month: visits, sign-ups and leads' },
              ],
            },
          },
          {
            question: 'Who owns everything?',
            answer: ['You do. It all sits on your own accounts, so if you ever leave, it keeps working.'],
            list: {
              style: 'owned',
              items: [
                { label: 'Logo files', text: 'Yours' },
                { label: 'Brand guidelines', text: 'Yours' },
                { label: 'Domain', text: 'Yours' },
                { label: 'Hosting', text: 'Yours' },
                { label: 'CMS', text: 'Yours' },
                { label: 'CRM and analytics', text: 'Yours' },
              ],
            },
          },
          {
            question: 'Can we cancel?',
            answer: [
              'Yes. After the first three months it’s month to month, with 30 days’ notice.',
              'Your site, brand and accounts stay with you, exactly as they are.',
            ],
          },
        ] as FaqItem[],
      },
    ],
  },
  brief: {
    eyebrow: 'Every launch ends here. With a person.',
    line1: 'Tell us about your launch.',
    line2: 'We’ll plan it around you.',
    timings: ['this month', 'next month', 'in 2–3 months', 'when it’s ready'],
    needs: ['Logo & brand', 'Landing page', 'Social', 'Intro video', 'Tracking & CRM'],
    promise: 'A calendar link straight away, and a one-page proposal for {startup} the same day. {setup} to set up, {monthly} a month.',
    thanks: 'Pick a time for your 15-minute call. We’ll read what you sent before we talk, so the call is about your launch, not a pitch.',
    reader: 'Reads every brief',
    // Cal.com / Calendly link for "Pick a time". Empty uses PUBLIC_BOOKING_URL, then email.
    bookingUrl: '',
  },
  footer: {
    tagline: '**MuzMesh** is the design partner for AI startups. Logo, brand, landing page and launch kit, designed by people.',
    email: 'muzamilawez@gmail.com',
    location: 'Pakistan',
    timeZone: 'Asia/Karachi',
    status: 'Proposals the same day',
  },
};

export type HomeContent = typeof homeDefaults;
