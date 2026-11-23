import type { APIRoute } from 'astro';
import { resourceMetadata } from '../../../lib/oauth';
import { publicJson, preflight } from '../../../lib/http';

export const GET: APIRoute = ({ url }) => publicJson(resourceMetadata(url.origin), 200, { 'cache-control': 'public, max-age=3600' });
export const OPTIONS: APIRoute = () => preflight('GET, OPTIONS');
