// Single source for nav, pillars and plans. Copy comes from docs/positioning.md.

export const site = {
  name: 'MuzMesh Creative',
  tagline: 'Design, web, social and automation on one monthly plan.',
  email: 'hello@muzmeshcreative.com', // [CONFIRM] real inbox
  bookingUrl: import.meta.env.PUBLIC_BOOKING_URL || '/contact',
};

export const nav = [
  { label: 'Services', href: '/services' },
  { label: 'Plans', href: '/plans' },
  { label: 'Work', href: '/work' },
  { label: 'Industries', href: '/industries' },
  { label: 'How we work', href: '/how-we-work' },
  { label: 'Blog', href: '/blog' },
];

export const footerNav = [
  { label: 'About', href: '/about' },
  { label: 'Referral', href: '/referral' },
  { label: 'Contact', href: '/contact' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export type PillarSlug = 'design-brand' | 'web-development' | 'social-content' | 'automation';

export const pillars: {
  slug: PillarSlug;
  name: string;
  summary: string;
  includes: string[];
}[] = [
  {
    slug: 'design-brand',
    name: 'Design & Brand',
    summary: 'A brand that looks like one business everywhere: logo, colours, templates and design requests.',
    includes: ['Logo refresh or brand kit', 'Colours, type and basic guidelines', 'Social and ad templates', 'Ongoing design requests'],
  },
  {
    slug: 'web-development',
    name: 'Websites',
    summary: 'Fast, search-ready sites on the platform that fits you: Webflow, WordPress or custom code.',
    includes: ['Design and build', 'Webflow, WordPress or custom code (Shopify and Wix supported)', 'SEO and AEO (AI search) setup', 'Monthly updates and care'],
  },
  {
    slug: 'social-content',
    name: 'Social & Content',
    summary: 'A monthly content calendar and 12-16 finished posts, so your pages never go quiet.',
    includes: ['Monthly content calendar', '12-16 designed posts with captions', 'Blog posts', 'Basic community management'],
  },
  {
    slug: 'automation',
    name: 'Automation & Systems',
    summary: 'Every enquiry gets an instant reply, lands in your CRM and gets followed up. No lead forgotten.',
    includes: ['Lead capture forms', 'CRM setup', 'Instant replies and follow-up sequences', 'Monthly lead report'],
  },
];

// [CONFIRM] Prices are test values. Show "from" the low end only.
export const plans = [
  {
    name: 'Launch',
    price: 1500,
    blurb: 'Look credible and get found. A 3-month build-and-launch plan.',
    features: [
      'Brand kit',
      'Website design and build (up to 6-8 pages)',
      'Platform chosen for your business',
      'SEO and AEO setup, analytics',
      'Spam-protected contact form',
      'Light support after launch',
    ],
    recommended: false,
  },
  {
    name: 'Growth',
    price: 2500,
    blurb: 'Everything in Launch, plus a steady presence on social.',
    features: [
      'Everything in Launch',
      '12-16 social posts per month',
      'Monthly content calendar',
      'Design requests',
      'Monthly website updates',
    ],
    recommended: true,
  },
  {
    name: 'Scale',
    price: 4000,
    blurb: 'Everything in Growth, plus systems that turn visitors into booked calls.',
    features: [
      'Everything in Growth',
      'Lead capture connected to a CRM',
      'Instant reply and team notification',
      'Follow-up email sequence',
      'Monthly report',
      'Priority support and strategy call',
    ],
    recommended: false,
  },
];

export const team = [
  { name: 'Muzamil Awan', role: 'Development & Automation', placeholder: false },
  { name: '[Friend 1 name]', role: '[Role, e.g. Design & Brand]', placeholder: true },
  { name: '[Friend 2 name]', role: '[Role, e.g. Social & Content]', placeholder: true },
];
