// The promise to every client: nobody outside your workspace can read or change your data.
import { beforeEach, describe, expect, it } from 'vitest';
import * as repo from '../src/lib/repo';
import * as service from '../src/lib/service';
import { thisMonth } from '../src/lib/util';
import { makeWorld, type World } from './helpers';

let w: World;
beforeEach(async () => { w = await makeWorld(); });

describe('workspace isolation', () => {
  it('a member of one workspace has no role in another', async () => {
    expect(await repo.roleIn(w.db, w.outsider, w.acme.id)).toBeNull();
    expect(await repo.roleIn(w.db, w.owner, w.other.id)).toBeNull();
    expect(await repo.roleIn(w.db, w.staff, w.other.id)).toBe('staff');
    expect((await repo.listWorkspacesForUser(w.db, w.outsider)).map((x) => x.slug)).toEqual(['other']);
    expect((await repo.listWorkspacesForUser(w.db, w.staff)).map((x) => x.slug)).toEqual(['acme', 'other']);
  });

  it('rows cannot be read or changed through the wrong workspace, even with the right id', async () => {
    const ed = await w.as(w.editor);
    const post = await service.createPost(w.db, w.acme, ed, { channel: 'linkedin', copy: 'Acme only.', scheduled_for: `${thisMonth()}-10` });
    const req = await service.createRequest(w.db, w.acme, ed, { title: 'Acme request' });
    if (!post.ok || !req.ok) throw new Error();
    await service.logTime(w.db, w.acme, await w.as(w.staff), req.value.id, { minutes: 45 });
    await service.saveContext(w.db, w.acme, await w.as(w.owner), { company: 'Acme secret plans' });
    const pid = post.value.post.id; const rid = req.value.id;

    // The outsider is a real owner, but of the other workspace.
    const out = await w.as(w.outsider, w.other);
    expect(await repo.getPost(w.db, w.other.id, pid)).toBeNull();
    expect(await repo.getRequest(w.db, w.other.id, rid)).toBeNull();
    expect(await repo.listPosts(w.db, w.other.id)).toEqual([]);
    expect(await repo.listRequests(w.db, w.other.id)).toEqual([]);
    expect(await repo.listActivity(w.db, w.other.id, 'post', pid)).toEqual([]);
    expect(await repo.listTimeEntries(w.db, w.other.id, rid)).toEqual([]);
    expect(await repo.latestContext(w.db, w.other.id)).toBeNull();
    expect(await repo.minutesInMonth(w.db, w.other.id, thisMonth())).toBe(0);
    expect((await repo.workspaceStats(w.db, w.other.id, thisMonth())).posts_planned).toBe(0);

    expect((await service.updatePost(w.db, w.other, out, pid, { copy: 'hijacked' })).ok).toBe(false);
    expect((await service.submitPost(w.db, w.other, out, pid)).ok).toBe(false);
    expect((await service.deleteDraft(w.db, w.other, out, pid)).ok).toBe(false);
    expect((await service.logTime(w.db, w.other, await w.as(w.staff, w.other), rid, { minutes: 5 })).ok).toBe(false);
    const entry = (await repo.listTimeEntries(w.db, w.acme.id, rid))[0]!;
    expect((await service.removeTime(w.db, w.other, await w.as(w.staff, w.other), rid, entry.id)).ok).toBe(false);
    const item = (await repo.listChecklist(w.db, w.acme.id))[0]!;
    expect((await service.toggleChecklist(w.db, w.other, out, item.id, true)).ok).toBe(false);

    expect((await repo.getPost(w.db, w.acme.id, pid))?.copy).toBe('Acme only.');
    expect(await repo.minutesInMonth(w.db, w.acme.id, thisMonth())).toBe(45);
  });

  it('removing a member removes their access', async () => {
    await repo.removeMember(w.db, w.acme.id, w.editor.id);
    expect(await repo.roleIn(w.db, w.editor, w.acme.id)).toBeNull();
  });

  it('every table that holds client data has a workspace_id column', async () => {
    const tables = (await w.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all<{ name: string }>()).results.map((t) => t.name);
    const global = new Set(['users', 'workspaces', 'login_tokens', 'sessions', 'oauth_clients', 'oauth_codes', 'oauth_tokens', 'rate_limits']);
    for (const t of tables.filter((n) => !global.has(n) && !n.startsWith('sqlite_') && !n.startsWith('d1_') && !n.startsWith('_cf'))) {
      const cols = (await w.db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all<{ name: string }>()).results.map((c) => c.name);
      expect(cols, `table ${t}`).toContain('workspace_id');
    }
  });
});
