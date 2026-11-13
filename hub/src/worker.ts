// The Worker entry: Astro handles web requests; the cron trigger runs the scheduler and the stats refresh.
import { handle } from '@astrojs/cloudflare/handler';
import { runDuePosts } from './lib/publisher';
import { sweep } from './lib/ratelimit';
import * as repo from './lib/repo';
import { refreshStats } from './lib/stats';

export default {
  fetch: handle,
  async scheduled(controller: ScheduledController, env: Cloudflare.Env, ctx: ExecutionContext) {
    const origin = env.APP_ORIGIN ?? '';
    const results = await runDuePosts(env.DB, env, origin);
    if (results.length) console.log('scheduler', JSON.stringify(results));
    // Once a day (the 03:00 UTC run): fresh website stats and housekeeping.
    if (new Date(controller.scheduledTime).getUTCHours() === 3 && new Date(controller.scheduledTime).getUTCMinutes() < 5) {
      for (const ws of await repo.listAllWorkspaces(env.DB)) ctx.waitUntil(refreshStats(env.DB, env, ws).catch((e) => console.error('stats', ws.slug, e)));
      ctx.waitUntil(sweep(env.DB).catch(() => {}));
    }
  },
} satisfies ExportedHandler<Cloudflare.Env>;
