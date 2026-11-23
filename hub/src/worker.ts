// The Worker entry: Astro handles web requests; the cron trigger runs the scheduler and the stats refresh.
import { handle } from '@astrojs/cloudflare/handler';
import { runDuePosts } from './lib/publisher';
import { sweep } from './lib/ratelimit';
import { refreshStats, staleWorkspaces } from './lib/stats';

export default {
  fetch: handle,
  async scheduled(controller: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    const origin = env.APP_ORIGIN ?? '';
    const results = await runDuePosts(env.DB, env, origin);
    if (results.length) console.log('scheduler', JSON.stringify(results));
    // Website stats: two workspaces per run whose numbers are over 20 hours old, so each run stays
    // inside the Workers subrequest limit however many clients there are (about 11 calls each).
    for (const ws of await staleWorkspaces(env.DB, 2)) ctx.waitUntil(refreshStats(env.DB, env, ws).catch((e) => console.error('stats', ws.slug, e)));
    // Once a day (the 03:00 UTC run): housekeeping.
    if (new Date(controller.scheduledTime).getUTCHours() === 3 && new Date(controller.scheduledTime).getUTCMinutes() < 5) {
      ctx.waitUntil(sweep(env.DB).catch(() => {}));
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
