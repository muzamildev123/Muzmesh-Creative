// Local date and time in a workspace's time zone, to and from exact UTC instants. Uses Intl only.

export const isTimeZone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch { return false; }
};

export const isTime = (s: unknown): s is string => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

const parts = (ms: number, tz: string) => {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
};
const offsetAt = (ms: number, tz: string): number => {
  const p = parts(ms, tz);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
};

/** "2026-11-20" + "09:30" in "Asia/Karachi" to the ISO instant in UTC. A time skipped by a clock change moves forward. */
export const zonedToUtc = (day: string, time: string, tz: string): string => {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const [h, mi] = time.split(':').map(Number) as [number, number];
  const wall = Date.UTC(y, m - 1, d, h, mi);
  let ms = wall - offsetAt(wall, tz);
  ms = wall - offsetAt(ms, tz);
  return new Date(ms).toISOString();
};

/** The local date ("YYYY-MM-DD") and time ("HH:MM") of an instant in a time zone. */
export const utcToZoned = (iso: string, tz: string): { day: string; time: string } => {
  const p = parts(Date.parse(iso), tz);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { day: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
};

export const todayIn = (tz: string, now = new Date()): string => utcToZoned(now.toISOString(), tz).day;

/** A short list for the settings picker. Any valid IANA name is accepted. */
export const COMMON_TIME_ZONES = [
  'UTC', 'Asia/Karachi', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Kolkata', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'Australia/Sydney',
];
