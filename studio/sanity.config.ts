import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';

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
            S.documentTypeListItem('post').title('Blog posts'),
            S.documentTypeListItem('caseStudy').title('Case studies'),
            S.divider(),
            S.documentTypeListItem('author').title('Authors'),
          ]),
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
});
