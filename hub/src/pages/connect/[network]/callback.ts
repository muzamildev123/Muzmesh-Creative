import type { APIRoute } from 'astro';
import { can } from '../../../lib/authz';
import * as repo from '../../../lib/repo';
import { finishConnect, isNetwork } from '../../../lib/social';
import { appEnv, db, flash, loginRedirect, notFound } from '../../../lib/web';

// LinkedIn and X send the person back here after they allow (or refuse) access.
export const GET: APIRoute = async (ctx) => {
  const network = ctx.params.network;
  if (!isNetwork(network)) return notFound(ctx);
  const user = ctx.locals.user;
  if (!user) return loginRedirect(ctx);
  const env = appEnv();
  const origin = env.APP_ORIGIN && !ctx.url.hostname.match(/^(localhost|127\.0\.0\.1)$/) ? env.APP_ORIGIN : ctx.url.origin;
  const r = await finishConnect(db(), env, network, origin, ctx.url.searchParams, user, async (id) => {
    const ws = await repo.getWorkspaceById(db(), id);
    if (!ws) return null;
    // Their role is checked again now, in case it changed while they were away.
    const role = await repo.roleIn(db(), user, ws.id);
    return role && can({ role }, 'accounts.manage') ? ws : null;
  });
  const back = r.returnTo && r.returnTo.startsWith('/w/') ? r.returnTo : '/';
  if (r.ok) {
    await repo.logActivity(db(), r.workspaceId, 'workspace', r.workspaceId, 'account_connected', user.id, 'hub', r.added.join(', '));
    flash(ctx, 'ok', `Connected: ${r.added.join(', ')}.`);
  } else flash(ctx, 'err', r.error);
  return ctx.redirect(back, 303);
};
