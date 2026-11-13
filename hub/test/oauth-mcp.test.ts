import { beforeEach, describe, expect, it } from 'vitest';
import { handleRpc, TOOLS, type McpContext } from '../src/lib/mcp';
import * as oauth from '../src/lib/oauth';
import * as repo from '../src/lib/repo';
import * as service from '../src/lib/service';
import { sha256B64Url } from '../src/lib/util';
import { makeWorld, type World } from './helpers';

let w: World;
beforeEach(async () => { w = await makeWorld(); });

const RESOURCE = 'https://hub.test/mcp';
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const VERIFIER = 'v'.repeat(64);

const register = async (uris = [REDIRECT]) => {
  const r = await oauth.registerClient(w.db, { client_name: 'Claude', redirect_uris: uris });
  if (!r.ok) throw new Error(r.description);
  return r.client;
};
const authorizeQuery = async (clientId: string, over: Record<string, string> = {}) =>
  new URLSearchParams({ client_id: clientId, redirect_uri: REDIRECT, response_type: 'code', state: 'abc', code_challenge: await sha256B64Url(VERIFIER), code_challenge_method: 'S256', resource: RESOURCE, ...over });
const getCode = async (user = w.editor, ws = w.acme) => {
  const client = await register();
  const check = await oauth.checkAuthorizeRequest(w.db, await authorizeQuery(client.client_id), RESOURCE);
  if (!check.ok) throw new Error('authorize failed');
  return { client, code: await oauth.issueCode(w.db, check.params, user, ws) };
};
const tokenForm = (client_id: string, code: string, over: Record<string, string> = {}) =>
  new URLSearchParams({ grant_type: 'authorization_code', client_id, code, redirect_uri: REDIRECT, code_verifier: VERIFIER, ...over });

describe('client registration', () => {
  it('accepts https and loopback redirects only', async () => {
    expect((await oauth.registerClient(w.db, { redirect_uris: ['http://localhost:3334/cb', 'http://127.0.0.1/cb'] })).ok).toBe(true);
    for (const bad of [['http://evil.test/cb'], ['javascript:alert(1)'], ['myapp://cb'], ['https://ok.test/cb#frag'], [], 'https://x.test', ['https://user:pw@x.test/']]) {
      expect((await oauth.registerClient(w.db, { redirect_uris: bad })).ok, JSON.stringify(bad)).toBe(false);
    }
    expect((await oauth.registerClient(w.db, { redirect_uris: [REDIRECT], token_endpoint_auth_method: 'client_secret_post' })).ok).toBe(false);
    const named = await oauth.registerClient(w.db, { redirect_uris: [REDIRECT], client_name: '<b>Claude</b>\n' });
    expect(named.ok && named.client.client_name).toBe('bClaude/b');
  });
});

describe('authorize', () => {
  it('never redirects to an unregistered address', async () => {
    const c = await register();
    const r = await oauth.checkAuthorizeRequest(w.db, await authorizeQuery(c.client_id, { redirect_uri: 'https://evil.test/cb' }), RESOURCE);
    expect(r).toMatchObject({ ok: false, kind: 'page' });
    expect(await oauth.checkAuthorizeRequest(w.db, await authorizeQuery('nope'), RESOURCE)).toMatchObject({ ok: false, kind: 'page' });
  });
  it('requires PKCE S256, response_type=code and the right resource', async () => {
    const c = await register();
    for (const over of [{ code_challenge_method: 'plain' }, { code_challenge: 'short' }, { response_type: 'token' }, { resource: 'https://other.test/mcp' }]) {
      expect(await oauth.checkAuthorizeRequest(w.db, await authorizeQuery(c.client_id, over), RESOURCE)).toMatchObject({ ok: false, kind: 'redirect', redirectUri: REDIRECT });
    }
  });
});

describe('token endpoint', () => {
  it('exchanges a code once; a replay revokes the whole grant', async () => {
    const { client, code } = await getCode();
    const first = await oauth.exchangeToken(w.db, tokenForm(client.client_id, code));
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(await oauth.identityForToken(w.db, first.body.access_token)).not.toBeNull();
    const replay = await oauth.exchangeToken(w.db, tokenForm(client.client_id, code));
    expect(replay.ok).toBe(false);
    expect(await oauth.identityForToken(w.db, first.body.access_token)).toBeNull();
  });
  it('rejects a wrong verifier, client, redirect or an expired code', async () => {
    for (const over of [{ code_verifier: 'w'.repeat(64) }, { redirect_uri: 'https://claude.ai/other' }]) {
      const { client, code } = await getCode();
      expect((await oauth.exchangeToken(w.db, tokenForm(client.client_id, code, over))).ok).toBe(false);
    }
    const a = await getCode(); const b = await register();
    expect((await oauth.exchangeToken(w.db, tokenForm(b.client_id, a.code))).ok).toBe(false);
    const c = await getCode();
    await w.db.prepare("UPDATE oauth_codes SET expires_at = '2000-01-01T00:00:00.000Z'").run();
    expect((await oauth.exchangeToken(w.db, tokenForm(c.client.client_id, c.code))).ok).toBe(false);
    expect((await oauth.exchangeToken(w.db, new URLSearchParams({ grant_type: 'password' }))).ok).toBe(false);
  });
  it('rotates refresh tokens and treats reuse as theft', async () => {
    const { client, code } = await getCode();
    const t1 = await oauth.exchangeToken(w.db, tokenForm(client.client_id, code));
    if (!t1.ok) throw new Error();
    const refresh = (token: string, id = client.client_id) => oauth.exchangeToken(w.db, new URLSearchParams({ grant_type: 'refresh_token', client_id: id, refresh_token: token }));
    expect((await refresh(t1.body.refresh_token, (await register()).client_id)).ok).toBe(false);
    const t2 = await refresh(t1.body.refresh_token);
    expect(t2.ok).toBe(true);
    if (!t2.ok) return;
    expect(t2.body.refresh_token).not.toBe(t1.body.refresh_token);
    expect(await oauth.identityForToken(w.db, t2.body.access_token)).not.toBeNull();
    expect((await refresh(t1.body.refresh_token)).ok).toBe(false);
    expect(await oauth.identityForToken(w.db, t2.body.access_token)).toBeNull();
    expect((await refresh(t2.body.refresh_token)).ok).toBe(false);
  });
  it('stores only hashes of codes and tokens', async () => {
    const { client, code } = await getCode();
    const t = await oauth.exchangeToken(w.db, tokenForm(client.client_id, code));
    if (!t.ok) throw new Error();
    const dump = JSON.stringify([(await w.db.prepare('SELECT * FROM oauth_codes').all()).results, (await w.db.prepare('SELECT * FROM oauth_tokens').all()).results]);
    for (const secret of [code, t.body.access_token, t.body.refresh_token]) expect(dump).not.toContain(secret);
  });
});

const connect = async (user = w.editor, ws = w.acme): Promise<{ ctx: McpContext; token: string }> => {
  const { client, code } = await getCode(user, ws);
  const t = await oauth.exchangeToken(w.db, tokenForm(client.client_id, code));
  if (!t.ok) throw new Error();
  const id = (await oauth.identityForToken(w.db, t.body.access_token))!;
  return { token: t.body.access_token, ctx: { db: w.db, workspace: id.workspace, actor: { userId: id.user.id, role: id.role, via: 'mcp' }, origin: 'https://hub.test' } };
};
let rpcId = 0;
const call = async (ctx: McpContext, name: string, args: Record<string, unknown> = {}) => {
  const res = (await handleRpc(ctx, { jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } })) as { result: { content: { text: string }[]; isError: boolean } };
  const text = res.result.content[0]!.text;
  let data: any = text; try { data = JSON.parse(text); } catch { /* plain text */ }
  return { isError: res.result.isError, text, data };
};

describe('connector access', () => {
  it('is cut off at once when the member is removed, the grant revoked or the token expires', async () => {
    const a = await connect();
    await repo.removeMember(w.db, w.acme.id, w.editor.id);
    expect(await oauth.identityForToken(w.db, a.token)).toBeNull();

    const b = await connect(w.owner);
    const grants = await oauth.listGrantsForUser(w.db, w.owner.id);
    expect(grants).toHaveLength(1);
    expect(await oauth.revokeGrantForUser(w.db, w.outsider.id, grants[0]!.id)).toBe(false);
    expect(await oauth.revokeGrantForUser(w.db, w.owner.id, grants[0]!.id)).toBe(true);
    expect(await oauth.identityForToken(w.db, b.token)).toBeNull();

    const c = await connect(w.viewer);
    await w.db.prepare("UPDATE oauth_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE kind = 'access'").run();
    expect(await oauth.identityForToken(w.db, c.token)).toBeNull();
    expect(await oauth.identityForToken(w.db, 'garbage')).toBeNull();
  });
  it('uses the role the person has right now', async () => {
    const { token } = await connect(w.editor);
    await repo.upsertMember(w.db, w.acme.id, w.editor.email, '', 'viewer');
    expect((await oauth.identityForToken(w.db, token))?.role).toBe('viewer');
  });
});

describe('MCP protocol', () => {
  it('initializes, negotiates the version and lists tools with schemas', async () => {
    const { ctx } = await connect();
    const init = (await handleRpc(ctx, { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } })) as any;
    expect(init.result.protocolVersion).toBe('2025-06-18');
    expect(init.result.instructions).toMatch(/get_context/);
    const future = (await handleRpc(ctx, { jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2099-01-01' } })) as any;
    expect(future.result.protocolVersion).toBe('2025-11-25');
    expect(await handleRpc(ctx, { jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    const list = (await handleRpc(ctx, { jsonrpc: '2.0', id: 3, method: 'tools/list' })) as any;
    expect(list.result.tools.map((t: any) => t.name)).toEqual(TOOLS.map((t) => t.name));
    for (const t of list.result.tools) { expect(t.inputSchema.type).toBe('object'); expect(t.run).toBeUndefined(); expect(t.description.length).toBeGreaterThan(20); }
    expect((await handleRpc(ctx, { jsonrpc: '2.0', id: 4, method: 'nope' }) as any).error.code).toBe(-32601);
    expect((await handleRpc(ctx, { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'nope' } }) as any).error.code).toBe(-32602);
    expect((await handleRpc(ctx, [1, 2]) as any).error.code).toBe(-32600);
    const prompt = (await handleRpc(ctx, { jsonrpc: '2.0', id: 6, method: 'prompts/get', params: { name: 'write_post', arguments: { topic: 'our launch' } } })) as any;
    expect(prompt.result.messages[0].content.text).toMatch(/our launch/);
  });
  it('has no tool that approves, publishes or deletes', () => {
    expect(TOOLS.map((t) => t.name).filter((n) => /approve|publish|delete|remove/.test(n))).toEqual([]);
  });
});

describe('MCP tools', () => {
  it('get_context returns the pack with rules, voice and the never-write list', async () => {
    await service.saveContext(w.db, w.acme, await w.as(w.owner), { company: 'Bookly turns books into ten-minute conversations.', claims: '4,200 readers', notYet: 'Android app' });
    const { ctx } = await connect();
    const r = await call(ctx, 'get_context');
    expect(r.text).toMatch(/context pack v1/);
    expect(r.text).toMatch(/Never invent customers/);
    expect(r.text).toMatch(/4,200 readers/);
    expect(r.text).toMatch(/Never write: .*ai-powered/);
    expect(r.text).toMatch(/Android app/);
  });
  it('drafts a post, reports the brand check, and the draft still needs a human', async () => {
    const { ctx } = await connect();
    const bad = await call(ctx, 'create_post_draft', { channel: 'x', copy: 'Unlock 10x reading. 300% more books!', scheduled_for: '2026-12-02', image: { template: 'announcement', headline: 'Read less.' } });
    expect(bad.isError).toBe(false);
    expect(bad.data.saved_as).toBe('draft');
    expect(bad.data.brand_check.passes).toBe(false);
    expect(bad.data.brand_check.should_check.join(' ')).toMatch(/300%/);
    expect(bad.data.review_link).toBe(`https://hub.test/w/acme/posts/${bad.data.id}`);
    expect((await call(ctx, 'submit_post_for_review', { id: bad.data.id })).isError).toBe(true);
    const fixed = await call(ctx, 'update_post_draft', { id: bad.data.id, copy: 'Finish the book you started in March.' });
    expect(fixed.data.brand_check.passes).toBe(true);
    expect(fixed.data.scheduled_for).toBe('2026-12-02');
    expect(fixed.data.image.headline).toBe('Read less.');
    expect((await call(ctx, 'submit_post_for_review', { id: bad.data.id })).data.status).toBe('In review');
    const saved = await repo.getPost(w.db, w.acme.id, bad.data.id);
    expect(saved).toMatchObject({ source: 'mcp', status: 'in_review', created_by: w.editor.id });
    const hist = await repo.listActivity(w.db, w.acme.id, 'post', bad.data.id);
    expect(hist.every((h) => h.via === 'mcp')).toBe(true);
  });
  it('a viewer can read but not write through the connector', async () => {
    const { ctx } = await connect(w.viewer);
    expect((await call(ctx, 'list_posts')).isError).toBe(false);
    expect((await call(ctx, 'create_post_draft', { channel: 'x', copy: 'hi' })).isError).toBe(true);
    expect((await call(ctx, 'create_request', { title: 'Do a thing' })).isError).toBe(true);
  });
  it('only ever sees its own workspace', async () => {
    const mine = await connect(w.editor);
    const made = await call(mine.ctx, 'create_post_draft', { channel: 'linkedin', copy: 'Acme only.' });
    await call(mine.ctx, 'create_request', { title: 'Acme request' });
    const theirs = await connect(w.outsider, w.other);
    expect((await call(theirs.ctx, 'list_posts')).data.count).toBe(0);
    expect((await call(theirs.ctx, 'list_requests')).data).toEqual([]);
    expect((await call(theirs.ctx, 'get_post', { id: made.data.id })).isError).toBe(true);
    expect((await call(theirs.ctx, 'update_post_draft', { id: made.data.id, copy: 'hijack' })).isError).toBe(true);
    expect((await call(theirs.ctx, 'get_context')).text).not.toMatch(/Bookly|bookly/);
  });
  it('requests and hours work, and bad arguments give clear errors', async () => {
    const { ctx } = await connect(w.owner);
    const r = await call(ctx, 'create_request', { title: 'Add a pricing page', page_url: 'javascript:alert(1)' });
    expect(r.isError).toBe(true);
    const ok = await call(ctx, 'create_request', { title: 'Add a pricing page', detail: 'Three tiers.' });
    expect(ok.data.status).toBe('open');
    expect((await call(ctx, 'get_hours')).data).toMatchObject({ minutes_used: 0, minutes_included: 120 });
    expect((await call(ctx, 'get_hours', { month: 'november' })).isError).toBe(true);
    expect((await call(ctx, 'check_copy', { channel: 'fax', copy: 'x' })).isError).toBe(true);
    expect((await call(ctx, 'list_posts', { status: 'weird' })).isError).toBe(true);
    expect((await call(ctx, 'get_brand_kit')).data.fonts.headlines).toBe('Fraunces');
  });
});
