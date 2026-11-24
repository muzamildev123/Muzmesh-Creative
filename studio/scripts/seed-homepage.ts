/**
 * Creates the Homepage document with the copy that is on the site today
 * (web/src/data/home.ts), so editors start from the real text.
 *
 *   cd studio && npm run seed:home              # only if it doesn't exist yet
 *   cd studio && npm run seed:home -- --replace # overwrite it with the defaults
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
const replace = process.argv.includes('--replace');
const res = replace ? await client.createOrReplace(doc) : await client.createIfNotExists(doc);
console.log(`${replace ? 'Replaced' : 'Created (or kept)'} the Homepage document (${res._id}). Open it in the Studio: Content > Homepage.`);
