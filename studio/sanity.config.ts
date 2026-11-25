import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool } from 'sanity/presentation';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';
import { PublishToStagingAction, asPublishToLive } from './publishActions';

// The Homepage is a single document: no "new Homepage", no delete or duplicate.
const singletons = new Set(['homePage']);

// Where the live preview is served from. It must be a deployment of the site that has the
// /preview route turned on (PUBLIC_SANITY_VISUAL_EDITING_ENABLED=true). Set SANITY_STUDIO_PREVIEW_URL
// to that deployment's address, for example https://muzmeshcreative.com
const previewOrigin = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:4321';

export default defineConfig({
  name: 'default',
  title: 'MuzMesh Creative',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            // One fixed Homepage document, opened directly.
            S.listItem()
              .title('Homepage')
              .id('homePage')
              .child(S.document().schemaType('homePage').documentId('homePage').title('Homepage')),
            S.divider(),
            S.documentTypeListItem('post').title('Blog posts'),
            S.documentTypeListItem('caseStudy').title('Projects'),
            S.divider(),
            S.documentTypeListItem('author').title('Authors'),
          ]),
    }),
    presentationTool({
      previewUrl: { origin: previewOrigin, previewMode: { enable: '/preview' } },
      resolve: {
        locations: {
          homePage: { select: { title: 'title' }, resolve: () => ({ locations: [{ title: 'Homepage', href: '/' }] }) },
        },
      },
    }),
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({ schemaType }) => !singletons.has(schemaType)),
  },
  document: {
    // Webflow-style: "Publish to staging" first (safe), "Publish to live" in the menu next to it.
    actions: (actions, { schemaType }) => {
      const kept = singletons.has(schemaType)
        ? actions.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions;
      const relabelled = kept.map((a) => (a.action === 'publish' ? asPublishToLive(a) : a));
      return [PublishToStagingAction, ...relabelled];
    },
  },
});
