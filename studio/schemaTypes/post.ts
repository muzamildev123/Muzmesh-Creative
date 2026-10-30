import { defineField, defineType } from 'sanity';
import { descriptionField, placeholderField, slugField } from './fields';

export const post = defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (rule) => rule.required() }),
    slugField('/blog'),
    descriptionField,
    defineField({
      name: 'author',
      type: 'reference',
      to: [{ type: 'author' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'coverImage',
      type: 'image',
      options: { hotspot: true },
      fields: [defineField({ name: 'alt', title: 'Alt text', type: 'string' })],
    }),
    defineField({ name: 'pubDate', title: 'Published', type: 'date', validation: (rule) => rule.required() }),
    defineField({ name: 'updatedDate', title: 'Updated', type: 'date' }),
    defineField({ name: 'body', type: 'blockContent' }),
    placeholderField,
  ],
  orderings: [{ title: 'Newest first', name: 'pubDateDesc', by: [{ field: 'pubDate', direction: 'desc' }] }],
  preview: {
    select: { title: 'title', author: 'author.name', date: 'pubDate', media: 'coverImage' },
    prepare: ({ title, author, date, media }) => ({ title, subtitle: [author, date].filter(Boolean).join(' · '), media }),
  },
});
