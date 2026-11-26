type Env = Record<string, unknown>;

/** Fail closed on conflicting target variables; never silently route previews to live data. */
export function resolveSanityEnvironment(env: Env, studio = false) {
  const deployment = env.VERCEL_ENV;
  if (studio && env.SANITY_STUDIO_ENVIRONMENT && env.TEAM_ENV && env.SANITY_STUDIO_ENVIRONMENT !== env.TEAM_ENV) throw new Error('Studio environment conflicts with TEAM_ENV.');
  const environment = String((studio && env.SANITY_STUDIO_ENVIRONMENT) || env.TEAM_ENV || (deployment === 'production' ? 'production' : deployment === 'preview' ? 'staging' : 'development'));
  if (!['development', 'staging', 'production'].includes(environment)) throw new Error('TEAM_ENV must be development, staging or production.');
  if (deployment === 'preview' && environment !== 'staging') throw new Error('Preview deployments must use staging.');
  if (deployment === 'production' && environment !== 'production') throw new Error('Production deployments must explicitly target production.');
  const candidates = (studio
    ? [env.SANITY_STUDIO_DATASET, env.SANITY_DATASET, env.SANITY_API_DATASET]
    : [env.SANITY_DATASET, env.SANITY_API_DATASET])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (candidates.some((v) => v !== environment)) throw new Error('Sanity dataset conflicts with TEAM_ENV/deployment environment.');
  if (studio && environment === 'production' && env.SANITY_STUDIO_PRODUCTION_ACCESS !== '1') {
    throw new Error('Production Studio access is disabled. A release owner must explicitly configure SANITY_STUDIO_PRODUCTION_ACCESS=1.');
  }
  const ids = (studio
    ? [env.SANITY_STUDIO_PROJECT_ID, env.SANITY_PROJECT_ID, env.SANITY_API_PROJECT_ID]
    : [env.SANITY_PROJECT_ID, env.SANITY_API_PROJECT_ID])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (new Set(ids).size > 1) throw new Error('Conflicting Sanity project IDs.');
  if (!ids[0]) throw new Error('Set the Sanity project ID for the selected environment.');
  return { projectId: ids[0], dataset: environment, environment };
}

/** Check the actual client immediately before any migration/seed can write. No live override. */
export function assertNonProductionMutation(config: {projectId?: string; dataset?: string}, env: Env) {
  const target = resolveSanityEnvironment(env, true);
  if (target.environment === 'production') throw new Error('Production seeds and migrations are blocked by this workflow.');
  if (config.projectId !== target.projectId || config.dataset !== target.dataset) throw new Error('Mutation client does not match the approved non-production target.');
  return target;
}
