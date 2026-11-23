import type { APIRoute } from 'astro';
import { can } from '../../../../../lib/authz';
import { isNetwork, setupProblem, startConnect } from '../../../../../lib/social';
import { appEnv, db, flash, loadWorkspace, notFound } from '../../../../../lib/web';

// A plain link (not a form), so the browser may follow the redirect to LinkedIn or X under the page's CSP.
export const GET: APIRoute = async (ctx) => {
  const access = await loadWorkspace(ctx);
  if (access instanceof Response) return access;
  const network = ctx.params.network;
  if (!isNetwork(network) || !can(access.actor, 'accounts.manage')) return notFound(ctx);
  const env = appEnv();
  const problem = setupProblem(env, network);
  if (problem) { flash(ctx, 'err', problem); return ctx.redirect(`${access.base}/accounts`, 303); }
  const origin = env.APP_ORIGIN && !ctx.url.hostname.match(/^(localhost|127\.0\.0\.1)$/) ? env.APP_ORIGIN : ctx.url.origin;
  return ctx.redirect(await startConnect(db(), env, access.ws, access.user, network, origin, `${access.base}/accounts`), 303);
};
