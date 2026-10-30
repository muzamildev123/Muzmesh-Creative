import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { sanityLoader } from '@/lib/sanity';

// `placeholder: true` shows a visible "not verified" banner on the page.
// Anything with invented or unconfirmed content must keep it set.
const placeholder = z.boolean().default(false);

// Blog posts and projects (case studies) are edited in Sanity Studio (../studio).
const blog = defineCollection({
  loader: sanityLoader(`*[_type == "post" && defined(slug.current)]{
    "slug": slug.current, title, description, "author": author->name,
    "image": coverImage.asset->url, pubDate, updatedDate, body, placeholder
  }`),
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
  loader: sanityLoader(`*[_type == "caseStudy" && defined(slug.current)]{
    "slug": slug.current, title, client, description, industry, pillars, stack,
    "results": results[]{label, value}, liveUrl, order, body, placeholder,
    "image": coverImage.asset->url, "imageAlt": coverImage.alt,
    "gallery": gallery[]{"src": asset->url, alt, caption}
  }`),
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
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    gallery: z.array(z.object({ src: z.string(), alt: z.string(), caption: z.string().nullish() })).default([]),
    order: z.number().default(100),
    placeholder,
  }),
});

// Industry pages are sales pages with designed sections, so they stay in code.
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
