import { beforeEach, describe, expect, it } from 'vitest';
import * as repo from '../src/lib/repo';
import * as service from '../src/lib/service';
import { thisMonth, today } from '../src/lib/util';
import { makeWorld, type World } from './helpers';

let w: World;
beforeEach(async () => { w = await makeWorld(); });

const draft = async (copy = 'Finish the book you started in March.') => {
  const r = await service.createPost(w.db, w.acme, await w.as(w.editor), { channel: 'linkedin', copy });
  if (!r.ok) throw new Error(r.error);
  return r.value.post;
};

describe('roles', () => {
  it('viewers cannot write anything', async () => {
    const v = await w.as(w.viewer);
    expect((await service.createPost(w.db, w.acme, v, { channel: 'x', copy: 'hi' })).ok).toBe(false);
    expect((await service.createRequest(w.db, w.acme, v, { title: 'Change it' })).ok).toBe(false);
    expect((await service.saveContext(w.db, w.acme, v, { company: 'x' })).ok).toBe(false);
    const p = await draft();
    expect((await service.updatePost(w.db, w.acme, v, p.id, { copy: 'x' })).ok).toBe(false);
    expect((await service.submitPost(w.db, w.acme, v, p.id)).ok).toBe(false);
    expect((await service.deleteDraft(w.db, w.acme, v, p.id)).ok).toBe(false);
  });
  it('editors write but cannot approve; owners and staff approve', async () => {
    const p = await draft();
    expect((await service.submitPost(w.db, w.acme, await w.as(w.editor), p.id)).ok).toBe(true);
    const no = await service.reviewPost(w.db, w.acme, await w.as(w.editor), p.id, 'approve');
    expect(no.ok).toBe(false);
    expect((await service.reviewPost(w.db, w.acme, await w.as(w.owner), p.id, 'approve')).ok).toBe(true);
    const p2 = await draft();
    await service.submitPost(w.db, w.acme, await w.as(w.editor), p2.id);
    expect((await service.reviewPost(w.db, w.acme, await w.as(w.staff), p2.id, 'approve')).ok).toBe(true);
  });
  it('only staff manage requests, time and nobody but owner/staff edits context or checklist', async () => {
    const r = await service.createRequest(w.db, w.acme, await w.as(w.editor), { title: 'Add a pricing page', page_url: 'https://example.com/pricing' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const u of [w.owner, w.editor]) {
      expect((await service.logTime(w.db, w.acme, await w.as(u), r.value.id, { minutes: 30 })).ok).toBe(false);
      expect((await service.changeRequestStatus(w.db, w.acme, await w.as(u), r.value.id, 'done')).ok).toBe(false);
    }
    expect((await service.logTime(w.db, w.acme, await w.as(w.staff), r.value.id, { minutes: 80 })).ok).toBe(true);
    expect((await service.saveContext(w.db, w.acme, await w.as(w.editor), { company: 'x' })).ok).toBe(false);
    expect((await service.saveContext(w.db, w.acme, await w.as(w.owner), { company: 'x' })).ok).toBe(true);
    const item = (await repo.listChecklist(w.db, w.acme.id))[0]!;
    expect((await service.toggleChecklist(w.db, w.acme, await w.as(w.editor), item.id, true)).ok).toBe(false);
    expect((await service.toggleChecklist(w.db, w.acme, await w.as(w.owner), item.id, true)).ok).toBe(true);
  });
});

describe('post workflow', () => {
  it('blocks review while the brand check has errors', async () => {
    const p = await draft('Unlock 10x reading with this hack');
    const r = await service.submitPost(w.db, w.acme, await w.as(w.editor), p.id);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/avoid list/);
  });
  it('editing an approved post sends it back to draft; changing only the date does not', async () => {
    const p = await draft();
    const ed = await w.as(w.editor);
    await service.submitPost(w.db, w.acme, ed, p.id);
    await service.reviewPost(w.db, w.acme, await w.as(w.owner), p.id, 'approve');
    const dated = await service.updatePost(w.db, w.acme, ed, p.id, { scheduled_for: '2026-12-01' });
    expect(dated.ok && dated.value.post.status).toBe('approved');
    const edited = await service.updatePost(w.db, w.acme, ed, p.id, { copy: 'New words nobody approved.' });
    expect(edited.ok && edited.value.movedToDraft).toBe(true);
    expect((await repo.getPost(w.db, w.acme.id, p.id))?.status).toBe('draft');
    expect((await service.markPublished(w.db, w.acme, ed, p.id, 'https://linkedin.com/posts/1')).ok).toBe(false);
  });
  it('requires a note to request changes, and re-checks the brand rules at approval', async () => {
    const p = await draft('We are a calm reading app.');
    await service.submitPost(w.db, w.acme, await w.as(w.editor), p.id);
    const own = await w.as(w.owner);
    expect((await service.reviewPost(w.db, w.acme, own, p.id, 'changes', ' ')).ok).toBe(false);
    // The brand's avoid list gains a word after the post was sent.
    const cfg = JSON.parse(w.acme.brand_config); cfg.voice.avoid.push('calm');
    await repo.setBrandConfig(w.db, w.acme.id, JSON.stringify(cfg));
    const fresh = (await repo.getWorkspaceById(w.db, w.acme.id))!;
    expect((await service.reviewPost(w.db, fresh, own, p.id, 'approve')).ok).toBe(false);
    expect((await service.reviewPost(w.db, fresh, own, p.id, 'changes', 'Drop "calm".')).ok).toBe(true);
  });
  it('publishes only approved posts, only with an https link, and then locks them', async () => {
    const p = await draft();
    const ed = await w.as(w.editor);
    expect((await service.markPublished(w.db, w.acme, ed, p.id, 'https://x.com/1')).ok).toBe(false);
    await service.submitPost(w.db, w.acme, ed, p.id);
    await service.reviewPost(w.db, w.acme, await w.as(w.owner), p.id, 'approve');
    expect((await service.markPublished(w.db, w.acme, ed, p.id, 'javascript:alert(1)')).ok).toBe(false);
    const pub = await service.markPublished(w.db, w.acme, ed, p.id, 'https://www.linkedin.com/posts/abc');
    expect(pub.ok && pub.value.scheduled_for).toBe(today());
    expect((await service.updatePost(w.db, w.acme, ed, p.id, { copy: 'changed' })).ok).toBe(false);
    expect((await service.deleteDraft(w.db, w.acme, ed, p.id)).ok).toBe(false);
  });
  it('rejects bad input', async () => {
    const ed = await w.as(w.editor);
    expect((await service.createPost(w.db, w.acme, ed, { channel: 'tiktok', copy: 'x' })).ok).toBe(false);
    expect((await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'x', scheduled_for: '2026-02-31' })).ok).toBe(false);
    expect((await service.createPost(w.db, w.acme, ed, { channel: 'x', copy: 'a'.repeat(5001) })).ok).toBe(false);
    expect(service.cleanImage({ template: 'evil', headline: 'x' })).toBe('{}');
    expect(JSON.parse(service.cleanImage({ template: 'quote', headline: ' Hi ', theme: 'neon', extra: 1 }))).toEqual({ template: 'quote', theme: 'light', kicker: '', headline: 'Hi', sub: '' });
  });
  it('the connector cannot approve, publish or delete, whatever the role', async () => {
    const p = await draft();
    await service.submitPost(w.db, w.acme, await w.as(w.editor), p.id);
    for (const u of [w.owner, w.staff]) {
      const a = await w.as(u, w.acme, 'mcp');
      expect((await service.reviewPost(w.db, w.acme, a, p.id, 'approve')).ok).toBe(false);
      expect((await service.markPublished(w.db, w.acme, a, p.id, 'https://x.com/1')).ok).toBe(false);
      expect((await service.deleteDraft(w.db, w.acme, a, p.id)).ok).toBe(false);
      expect((await service.saveContext(w.db, w.acme, a, { company: 'x' })).ok).toBe(false);
    }
  });
});

describe('hours meter and context versions', () => {
  it('adds up the month and reports overage', async () => {
    const st = await w.as(w.staff);
    const r = await service.createRequest(w.db, w.acme, await w.as(w.owner), { title: 'Fix footer' });
    if (!r.ok) throw new Error();
    await service.logTime(w.db, w.acme, st, r.value.id, { minutes: 100 });
    await service.logTime(w.db, w.acme, st, r.value.id, { minutes: 50 });
    await service.logTime(w.db, w.acme, st, r.value.id, { minutes: 30, logged_on: '2020-01-05' });
    const m = await service.hoursMeter(w.db, w.acme, thisMonth());
    expect(m).toMatchObject({ used: 150, limit: 120, remaining: 0, over: 30 });
    expect((await service.logTime(w.db, w.acme, st, r.value.id, { minutes: 0 })).ok).toBe(false);
    expect((await service.logTime(w.db, w.acme, st, r.value.id, { minutes: 10, logged_on: '2999-01-01' })).ok).toBe(false);
  });
  it('bumps the context version only when something changed', async () => {
    const own = await w.as(w.owner);
    const a = await service.saveContext(w.db, w.acme, own, { company: 'Bookly reads with you.' });
    const b = await service.saveContext(w.db, w.acme, own, { company: 'Bookly reads with you.' });
    const c = await service.saveContext(w.db, w.acme, own, { company: 'Bookly reads with you.', claims: '4,200 readers' });
    expect([a, b, c].map((r) => r.ok && r.value.version)).toEqual([1, 1, 2]);
    // Approved numbers now pass the check.
    const issues = await service.checkPostCopy(w.db, w.acme, 'linkedin', 'Loved by 4,200 readers.');
    expect(issues).toEqual([]);
  });
});
