// A small D1 stand-in on top of better-sqlite3, so tests exercise the real SQL and migrations.
import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as repo from '../src/lib/repo';
import type { Actor, Role, User, Workspace } from '../src/lib/types';

class Stmt {
  constructor(private db: Database.Database, private sql: string, private args: unknown[] = []) {}
  bind(...args: unknown[]) { return new Stmt(this.db, this.sql, args.map((a) => (a === undefined ? null : a))); }
  private get reads() { return this.db.prepare(this.sql).reader; }
  async first<T>(): Promise<T | null> {
    const s = this.db.prepare(this.sql);
    if (s.reader) return (s.get(...this.args) as T) ?? null;
    s.run(...this.args); return null;
  }
  async all<T>(): Promise<{ results: T[] }> { return { results: this.db.prepare(this.sql).all(...this.args) as T[] }; }
  async run() { return this.exec(); }
  exec() {
    const s = this.db.prepare(this.sql);
    if (s.reader) { const rows = s.all(...this.args); return { results: rows, meta: { changes: rows.length } }; }
    const r = s.run(...this.args);
    return { results: [], meta: { changes: r.changes } };
  }
}

export const makeDb = (): D1Database => {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const dir = resolve(import.meta.dirname, '../migrations');
  for (const f of readdirSync(dir).sort()) db.exec(readFileSync(resolve(dir, f), 'utf8'));
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (stmts: Stmt[]) => db.transaction(() => stmts.map((s) => s.exec()))(),
  } as unknown as D1Database;
};

export const BOOKLY = readFileSync(resolve(import.meta.dirname, '../seed/bookly.brand.config.json'), 'utf8');

export interface World {
  db: D1Database;
  acme: Workspace; other: Workspace;
  staff: User; owner: User; editor: User; viewer: User; outsider: User;
  as: (u: User, ws?: Workspace, via?: 'hub' | 'mcp') => Promise<Actor>;
}

/** Two workspaces, one user per role in the first, and an owner of the second who must never see the first. */
export const makeWorld = async (): Promise<World> => {
  const db = makeDb();
  const mk = (slug: string) => repo.createWorkspace(db, { name: slug, slug, site_url: 'https://example.com', cms: 'sanity', cms_edit_url: '', monthly_minutes: 120, monthly_posts: 8 });
  const acme = await mk('acme');
  const other = await mk('other');
  await repo.setBrandConfig(db, acme.id, BOOKLY);
  acme.brand_config = BOOKLY;
  const staff = await repo.createUser(db, 'staff@muzmesh.test', 'Staff', true);
  const owner = await repo.upsertMember(db, acme.id, 'owner@acme.test', 'Owner', 'owner');
  const editor = await repo.upsertMember(db, acme.id, 'editor@acme.test', 'Editor', 'editor');
  const viewer = await repo.upsertMember(db, acme.id, 'viewer@acme.test', 'Viewer', 'viewer');
  const outsider = await repo.upsertMember(db, other.id, 'owner@other.test', 'Outsider', 'owner');
  const as = async (u: User, ws: Workspace = acme, via: 'hub' | 'mcp' = 'hub'): Promise<Actor> => {
    const role = await repo.roleIn(db, u, ws.id);
    if (!role) throw new Error('no access');
    return { userId: u.id, role: role as Role, via };
  };
  return { db, acme, other, staff, owner, editor, viewer, outsider, as };
};
