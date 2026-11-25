import { useState } from 'react';
import type { DocumentActionComponent, DocumentActionProps } from 'sanity';

// Webflow-style publishing.
//
// "Publish to staging" rebuilds https://staging.muzmeshcreative.com, which shows
// your unpublished drafts. The live site does not change.
// "Publish to live" is Sanity's normal Publish: it publishes the draft, and the
// Sanity webhook rebuilds https://muzmeshcreative.com.
//
// The staging rebuild uses a Vercel deploy hook for the `staging` branch, set at
// Studio build time in SANITY_STUDIO_STAGING_DEPLOY_HOOK. It can only start a
// staging build, nothing else.
const stagingHook = process.env.SANITY_STUDIO_STAGING_DEPLOY_HOOK;

export const PublishToStagingAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const label = {
    idle: 'Publish to staging',
    sending: 'Sending to staging…',
    sent: 'Sent to staging (ready in about 1 min)',
    error: 'Could not reach staging, try again',
  }[state];
  return {
    label,
    tone: 'primary',
    disabled: !stagingHook || state === 'sending',
    title: stagingHook
      ? 'Show this draft on staging.muzmeshcreative.com. The live site does not change.'
      : 'Staging is not set up (SANITY_STUDIO_STAGING_DEPLOY_HOOK is missing).',
    onHandle: async () => {
      setState('sending');
      try {
        // The deploy hook only needs a POST; no-cors because Vercel sends no CORS headers.
        await fetch(stagingHook as string, { method: 'POST', mode: 'no-cors' });
        setState('sent');
      } catch {
        setState('error');
      }
      props.onComplete();
    },
  };
};

// Sanity's own Publish button, renamed so it is clear it goes to the live site.
export function asPublishToLive(original: DocumentActionComponent): DocumentActionComponent {
  const PublishToLive: DocumentActionComponent = (props) => {
    const result = original(props);
    return result ? { ...result, label: 'Publish to live' } : result;
  };
  PublishToLive.action = 'publish';
  return PublishToLive;
}
