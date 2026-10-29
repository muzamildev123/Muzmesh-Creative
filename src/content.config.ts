import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// `placeholder: true` shows a visible "not verified" banner on the page.
// Anything with invented or unconfirmed content must keep it set.
const placeholder = z.boolean().default(false);

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    image: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    placeholder,
  }),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    client: z.string(),
    description: z.string(),
    industry: z.string(),
    pillars: z.array(z.enum(['design-brand', 'web-development', 'social-content', 'automation'])),
    stack: z.array(z.string()).default([]),
    // Only real, client-approved numbers go here.
    results: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    liveUrl: z.url().optional(),
    order: z.number().default(100),
    placeholder,
  }),
});

const industries = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/industries' }),
  schema: z.object({
    title: z.string(),
    headline: z.string(),
    description: z.string().max(160),
    order: z.number().default(100),
    placeholder,
  }),
});

export const collections = { blog, work, industries };
