import { defineArrayMember, defineField, defineType } from 'sanity';
import { descriptionField, placeholderField, slugField } from './fields';

export const caseStudy = defineType({
  name: 'caseStudy',
  title: 'Project',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    slugField('/work'),
    defineField({ name: 'client', type: 'string', validation: (rule) => rule.required() }),
    descriptionField,
    defineField({ name: 'industry', type: 'string', validation: (rule) => rule.required() }),
    defineField({
      name: 'pillars',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: {
        list: [
          { title: 'Design & Brand', value: 'design-brand' },
          { title: 'Websites', value: 'web-development' },
          { title: 'Social & Content', value: 'social-content' },
          { title: 'Automation & Systems', value: 'automation' },
        ],
      },
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'stack',
      title: 'Tools used',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'results',
      type: 'array',
      description: 'Only real, client-approved numbers. Leave empty until confirmed.',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'value', type: 'string', validation: (rule) => rule.required() }),
          ],
          preview: { select: { title: 'value', subtitle: 'label' } },
        }),
      ],
    }),
    defineField({
      name: 'coverImage',
      type: 'image',
      description: 'Main image on the /work grid and at the top of the project page.',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
    defineField({
      name: 'gallery',
      title: 'Screenshots',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({ name: 'alt', title: 'Alt text', type: 'string', validation: (rule) => rule.required() }),
            defineField({ name: 'caption', type: 'string' }),
          ],
        }),
      ],
      options: { layout: 'grid' },
    }),
    defineField({ name: 'liveUrl', title: 'Live site URL', type: 'url' }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Lower numbers show first on /work and the homepage.',
      initialValue: 100,
    }),
    defineField({ name: 'body', type: 'blockContent' }),
    placeholderField,
  ],
  orderings: [{ title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] }],
  preview: { select: { title: 'client', subtitle: 'industry', media: 'coverImage' } },
});
