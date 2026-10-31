import { defineField } from 'sanity';

// Same meaning as `placeholder: true` in the old frontmatter: the page shows a
// yellow "not verified" banner. Anything invented or unconfirmed keeps it on.
export const placeholderField = defineField({
  name: 'placeholder',
  title: 'Not verified yet',
  type: 'boolean',
  description: 'Shows a yellow "not verified" banner on the page. Turn off only when every claim is real and approved.',
  initialValue: true,
});

// The slug is the URL. Changing it on a published page breaks links and SEO,
// so only change it together with a 301 in vercel.json.
export const slugField = (prefix: string) =>
  defineField({
    name: 'slug',
    type: 'slug',
    description: `URL: ${prefix}/<slug>. Do not change after publishing without adding a redirect.`,
    options: { source: 'title', maxLength: 96 },
    validation: (rule) => rule.required(),
  });

export const descriptionField = defineField({
  name: 'description',
  type: 'text',
  rows: 3,
  description: 'Meta description and listing summary. Aim for 120-160 characters.',
  validation: (rule) => [rule.required(), rule.max(160).warning('Google cuts descriptions after about 160 characters.')],
});
