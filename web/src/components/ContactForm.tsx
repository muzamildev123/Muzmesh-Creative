import { useRef, useState, type SubmitEvent } from 'react';

// Qualifying lead form. Posts JSON to PUBLIC_LEAD_ENDPOINT (n8n webhook or
// Supabase edge function). The honeypot and time check stop basic bots;
// add Cloudflare Turnstile verified server-side before launch.

const endpoint = import.meta.env.PUBLIC_LEAD_ENDPOINT;

const budgets = ['Under $1,500/mo', '$1,500 - $2,500/mo', '$2,500 - $4,000/mo', '$4,000+/mo', 'Not sure yet'];
const needs = ['Design & Brand', 'Website', 'Social & Content', 'Automation & Systems'];
const timelines = ['As soon as possible', 'Within 1 month', '1-3 months', 'Just exploring'];

type Status = 'idle' | 'sending' | 'sent' | 'error';

const field = 'mt-1 w-full rounded-lg border border-line px-3 py-2 focus:border-brand focus:outline-none';

export default function ContactForm() {
  const [status, setStatus] = useState<Status>('idle');
  const startedAt = useRef(Date.now());

  async function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    // Bots fill hidden fields and submit instantly. Pretend it worked.
    if (data.get('company_url') || Date.now() - startedAt.current < 3000) {
      setStatus('sent');
      return;
    }

    if (!endpoint) {
      console.warn('PUBLIC_LEAD_ENDPOINT is not set; form submission is disabled.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          company: data.get('company'),
          website: data.get('website'),
          industry: data.get('industry'),
          budget: data.get('budget'),
          needs: data.getAll('needs'),
          timeline: data.get('timeline'),
          message: data.get('message'),
          source: window.location.pathname,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus('sent');
      form.reset();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8">
        <h2 className="text-2xl font-bold">Thanks, we got it.</h2>
        <p className="mt-2 text-muted">We reply within one business day with a link to book your 20-minute call.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
      <label className="block">
        <span className="text-sm font-medium">Your name *</span>
        <input name="name" required autoComplete="name" className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Work email *</span>
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Company *</span>
        <input name="company" required autoComplete="organization" className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Current website</span>
        <input name="website" type="url" placeholder="https://" className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Industry *</span>
        <input name="industry" required className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium">Monthly budget *</span>
        <select name="budget" required defaultValue="" className={field}>
          <option value="" disabled>
            Choose one
          </option>
          {budgets.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </label>
      <fieldset className="md:col-span-2">
        <legend className="text-sm font-medium">What do you need?</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {needs.map((n) => (
            <label key={n} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="needs" value={n} /> {n}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium">Timeline *</span>
        <select name="timeline" required defaultValue="" className={field}>
          <option value="" disabled>
            Choose one
          </option>
          {timelines.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block md:col-span-2">
        <span className="text-sm font-medium">Anything else we should know?</span>
        <textarea name="message" rows={4} className={field} />
      </label>
      {/* Honeypot: hidden from people, filled by bots. */}
      <div aria-hidden="true" className="hidden">
        <label>
          Company URL
          <input name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={status === 'sending'}
          className="rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending...' : 'Send and book a call'}
        </button>
        {status === 'error' && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            Something went wrong. Please email us directly instead.
          </p>
        )}
      </div>
    </form>
  );
}
