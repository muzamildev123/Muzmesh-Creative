/**
 * Creates the Homepage document with the copy that is on the site today
 * (web/src/data/home.ts), so editors start from the real text.
 *
 *   cd studio && npm run seed:home              # only if it doesn't exist yet
 *   cd studio && npm run seed:home -- --fill    # add fields that are new on the site, keep everything else
 *   cd studio && npm run seed:home -- --replace # overwrite it with the defaults
 *
 * --fill is for after the site gets new editable text: it copies the site's current words
 * into the fields the document doesn't have yet (in the published document and in the
 * draft, if there is one), so they show in the Studio and can be clicked to edit.
 */
import { randomUUID } from 'node:crypto';
import { getCliClient } from 'sanity/cli';
import { homeDefaults } from '../../web/src/data/home';

const client = getCliClient({ apiVersion: '2026-10-01' });

// Sanity needs a _key on every object inside an array.
const withKeys = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === 'object' && !Array.isArray(x) ? { _key: randomUUID().slice(0, 12), ...(withKeys(x) as object) } : withKeys(x)));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, withKeys(x)]));
  return v;
};

const doc = { _id: 'homePage', _type: 'homePage', ...(withKeys(homeDefaults) as object) };

/** Every field in `defaults` that `current` doesn't have, as { 'a.b': value }. Lists are only added whole. */
function missing(defaults: Record<string, unknown>, current: Record<string, unknown> | undefined, prefix = ''): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(defaults)) {
    const path = prefix + k;
    const have = current?.[k];
    if (have === undefined || have === null) {
      if (v !== '' && v !== undefined) out[path] = withKeys(v);
    } else if (v && typeof v === 'object' && !Array.isArray(v) && typeof have === 'object' && !Array.isArray(have)) {
      Object.assign(out, missing(v as Record<string, unknown>, have as Record<string, unknown>, path + '.'));
    }
  }
  return out;
}

if (process.argv.includes('--fill')) {
  for (const id of ['homePage', 'drafts.homePage']) {
    const current = await client.getDocument(id);
    if (!current) {
      console.log(`${id}: not there, skipped.`);
      continue;
    }
    const add = missing(homeDefaults as Record<string, unknown>, current);
    const keys = Object.keys(add);
    if (!keys.length) {
      console.log(`${id}: nothing new.`);
      continue;
    }
    await client.patch(id).setIfMissing(add).commit();
    console.log(`${id}: added ${keys.join(', ')}`);
  }
  process.exit(0);
}

const replace = process.argv.includes('--replace');
const res = replace ? await client.createOrReplace(doc) : await client.createIfNotExists(doc);
console.log(`${replace ? 'Replaced' : 'Created (or kept)'} the Homepage document (${res._id}). Open it in the Studio: Content > Homepage.`);
