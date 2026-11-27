import { defineCliConfig } from 'sanity/cli';
import { resolveSanityEnvironment } from '../scripts/sanity-environment';

const target = resolveSanityEnvironment(process.env, true);

export default defineCliConfig({
  api: {
    projectId: target.projectId,
    dataset: target.dataset,
  },
  // `npm run deploy` publishes the Studio to https://muzmesh.sanity.studio
  studioHost: target.environment === 'production' ? 'muzmesh' : `muzmesh-${target.environment}`,
  deployment: { autoUpdates: true },
});
