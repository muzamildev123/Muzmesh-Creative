import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

// The Homepage is a single document: no "new Homepage", no delete or duplicate.
const singletons = new Set(['homePage']);

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
    visionTool(),
  ],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({ schemaType }) => !singletons.has(schemaType)),
  },
  document: {
    actions: (actions, { schemaType }) =>
      singletons.has(schemaType)
        ? actions.filter(({ action }) => action && ['publish', 'discardChanges', 'restore'].includes(action))
        : actions,
  },
});
