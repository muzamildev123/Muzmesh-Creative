// Sends the sign-in email through Resend. Plain fetch, no SDK.
export interface MailEnv { RESEND_API_KEY?: string; EMAIL_FROM?: string; APP_NAME?: string }

export const sendLoginEmail = async (env: MailEnv, to: string, link: string): Promise<boolean> => {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false;
  const app = env.APP_NAME || 'Launch Room';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM, to: [to], subject: `Your ${app} sign-in link`,
      text: `Open this link to sign in to ${app}. It works once and expires in 15 minutes.\n\n${link}\n\nIf you did not ask for this, you can ignore this email.`,
    }),
  });
  if (!res.ok) console.error('login email failed', res.status);
  return res.ok;
};
