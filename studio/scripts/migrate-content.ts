/**
 * One-off import of the old Markdown/HTML blog posts and case studies into Sanity.
 *
 *   cd studio && npm run migrate
 *
 * Safe to run more than once: every document gets a fixed _id from its slug,
 * so a re-run replaces instead of duplicating. Slugs are the old file names,
 * which keeps /blog/<slug> and /work/<slug> (and every 301 in vercel.json) intact.
 * Cover images are downloaded from Webflow's CDN and uploaded to Sanity, so
 * nothing depends on Webflow after it is cancelled.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { getCliClient } from 'sanity/cli';
import { Schema } from '@sanity/schema';
import { htmlToBlocks } from '@portabletext/block-tools';
import { JSDOM } from 'jsdom';
import matter from 'gray-matter';
import { blockContent } from '../schemaTypes/blockContent';

const client = getCliClient({ apiVersion: '2026-10-01' });
const legacyDir = path.join(import.meta.dirname, 'legacy');

// Only text blocks are needed for the import (the old bodies have no inline
// images), and leaving the image member out avoids compiling Sanity's built-in types.
const textOnly = { ...blockContent, of: blockContent.of.filter((m) => m.type === 'block') };
const blockContentType = Schema.compile({ name: 'migration', types: [textOnly] }).get('blockContent');

const toBlocks = (html: string) =>
  htmlToBlocks(html.replace(/<!--[\s\S]*?-->/g, ''), blockContentType, {
    parseHtml: (h) => new JSDOM(h).window.document,
  });

const idFrom = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const isoDate = (d: unknown) => (d ? new Date(d as string).toISOString().slice(0, 10) : undefined);

async function readEntries(folder: string) {
  const dir = path.join(legacyDir, folder);
  const files = (await readdir(dir)).filter((f) => /\.mdx?$/.test(f));
  return Promise.all(
    files.map(async (file) => {
      const { data, content } = matter(await readFile(path.join(dir, file), 'utf8'));
      return { slug: file.replace(/\.mdx?$/, ''), data, body: toBlocks(content) };
    }),
  );
}

async function uploadImage(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image download failed (${res.status}): ${url}`);
  const asset = await client.assets.upload('image', Buffer.from(await res.arrayBuffer()), {
    filename: decodeURIComponent(url.split('/').pop() ?? 'image'),
    source: { name: 'webflow', id: url },
  });
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}

async function migrate() {
  const tx = client.transaction();

  const posts = await readEntries('blog');
  for (const name of new Set(posts.map((p) => String(p.data.author)))) {
    tx.createOrReplace({ _id: `author-${idFrom(name)}`, _type: 'author', name });
  }
  for (const { slug, data, body } of posts) {
    tx.createOrReplace({
      _id: `post-${slug}`,
      _type: 'post',
      title: data.title,
      slug: { _type: 'slug', current: slug },
      description: data.description,
      author: { _type: 'reference', _ref: `author-${idFrom(String(data.author))}` },
      coverImage: data.image ? { ...(await uploadImage(data.image)), alt: data.title } : undefined,
      pubDate: isoDate(data.pubDate),
      updatedDate: isoDate(data.updatedDate),
      body,
      placeholder: data.placeholder ?? false,
    });
    console.log(`post      /blog/${slug}`);
  }

  for (const { slug, data, body } of await readEntries('work')) {
    tx.createOrReplace({
      _id: `caseStudy-${slug}`,
      _type: 'caseStudy',
      title: data.title,
      slug: { _type: 'slug', current: slug },
      client: data.client,
      description: data.description,
      industry: data.industry,
      pillars: data.pillars ?? [],
      stack: data.stack ?? [],
      results: (data.results ?? []).map((r: { label: string; value: string }, i: number) => ({ _key: `r${i}`, ...r })),
      liveUrl: data.liveUrl,
      order: data.order ?? 100,
      body,
      placeholder: data.placeholder ?? false,
    });
    console.log(`caseStudy /work/${slug}`);
  }

  await tx.commit();
  console.log('Done. Check the Studio, then delete studio/scripts/legacy in a follow-up PR.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
