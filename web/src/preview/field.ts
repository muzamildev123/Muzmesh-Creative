/**
 * The document and field a click-to-edit marker points at. Reads both the short form the
 * preview writes (`?baseUrl=/&id=…&path=…`, see compactStega) and the Studio's full edit link.
 */
export function fieldOf(href: string): { id: string; type: string; path: string } | null {
  try {
    const q = new URL(href, 'https://x.invalid').searchParams;
    const id = q.get('id'), path = q.get('path');
    if (id && path) return { id, type: q.get('type') ?? '', path };
  } catch {
    // Fall through to the edit link form.
  }
  const m = decodeURIComponent(href).match(/(?:^|[;/])id=([^;]+);type=([^;]+);path=([^?]+)/);
  return m ? { id: m[1], type: m[2], path: m[3] } : null;
}
