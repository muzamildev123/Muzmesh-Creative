// The assets library: uploads and made images, stored in R2 (binding FILES), indexed in D1.
import { can } from './authz';
import { fail, ok, type Actor, type Result, type Workspace } from './types';
import { clampText, newId, nowIso } from './util';

type DB = D1Database;
export const MAX_UPLOAD = 10 * 1024 * 1024;

export interface Asset {
  id: string; workspace_id: string; r2_key: string; filename: string; content_type: string; size: number;
  width: number | null; height: number | null; alt: string; tags: string; kind: 'upload' | 'made'; created_by: string | null; created_at: string;
}

const TYPES: Record<string, { ext: string; sniff?: (b: Uint8Array) => boolean }> = {
  'image/png': { ext: 'png', sniff: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  'image/jpeg': { ext: 'jpg', sniff: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/webp': { ext: 'webp', sniff: (b) => b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
  'image/gif': { ext: 'gif', sniff: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  'image/svg+xml': { ext: 'svg' },
  'application/pdf': { ext: 'pdf', sniff: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
};
/** Images that LinkedIn and X accept as post images. */
export const POSTABLE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
export const ACCEPT = Object.keys(TYPES).join(',');

/** Width and height from the file header, for PNG, GIF and JPEG. */
export const imageSize = (b: Uint8Array, type: string): { w: number; h: number } | null => {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  try {
    if (type === 'image/png' && b.length > 24) return { w: dv.getUint32(16), h: dv.getUint32(20) };
    if (type === 'image/gif' && b.length > 10) return { w: dv.getUint16(6, true), h: dv.getUint16(8, true) };
    if (type === 'image/jpeg') {
      let i = 2;
      while (i + 9 < b.length) {
        if (b[i] !== 0xff) return null;
        const marker = b[i + 1]!;
        const len = dv.getUint16(i + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { h: dv.getUint16(i + 5), w: dv.getUint16(i + 7) };
        i += 2 + len;
      }
    }
  } catch { /* unreadable header */ }
  return null;
};

const cleanName = (name: string, ext: string): string => {
  const base = name.replace(/\.[^.]*$/, '').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 80) || 'file';
  return `${base}.${ext}`;
};
export const cleanTags = (raw: unknown): string =>
  [...new Set(clampText(raw, 300).toLowerCase().split(/[,\n]/).map((t) => t.trim().replace(/[^\p{L}\p{N} -]/gu, '')).filter(Boolean))].slice(0, 12).join(', ');

export const addAsset = async (db: DB, bucket: R2Bucket | undefined, ws: Workspace, actor: Actor, file: File | null, meta: { alt?: unknown; tags?: unknown; kind?: 'upload' | 'made' }): Promise<Result<Asset>> => {
  if (actor.via !== 'hub' || !can(actor, 'post.write')) return fail(403, 'Your role cannot add files.');
  if (!bucket) return fail(400, 'File storage is not set up yet (the FILES bucket).');
  if (!file || file.size === 0) return fail(400, 'Choose a file.');
  if (file.size > MAX_UPLOAD) return fail(400, 'Files can be up to 10 MB.');
  const t = TYPES[file.type];
  if (!t) return fail(400, 'Use PNG, JPG, WebP, GIF, SVG or PDF.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (t.sniff && !t.sniff(bytes)) return fail(400, 'That file is not what its name says it is.');
  if (file.type === 'image/svg+xml' && !/<svg[\s>]/i.test(new TextDecoder().decode(bytes.slice(0, 4096)))) return fail(400, 'That SVG file could not be read.');
  const id = newId();
  const key = `${ws.id}/${id}.${t.ext}`;
  await bucket.put(key, bytes, { httpMetadata: { contentType: file.type } });
  const size = imageSize(bytes, file.type);
  const a: Asset = {
    id, workspace_id: ws.id, r2_key: key, filename: cleanName(file.name, t.ext), content_type: file.type, size: file.size,
    width: size?.w ?? null, height: size?.h ?? null, alt: clampText(meta.alt, 500), tags: cleanTags(meta.tags), kind: meta.kind ?? 'upload',
    created_by: actor.userId, created_at: nowIso(),
  };
  await db.prepare('INSERT INTO assets (id, workspace_id, r2_key, filename, content_type, size, width, height, alt, tags, kind, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(a.id, a.workspace_id, a.r2_key, a.filename, a.content_type, a.size, a.width, a.height, a.alt, a.tags, a.kind, a.created_by, a.created_at).run();
  return ok(a);
};

export const listAssets = async (db: DB, workspaceId: string, opts: { tag?: string; postable?: boolean } = {}): Promise<Asset[]> => {
  const rows = (await db.prepare('SELECT * FROM assets WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 500').bind(workspaceId).all<Asset>()).results;
  return rows.filter((a) => (!opts.tag || a.tags.split(', ').includes(opts.tag)) && (!opts.postable || POSTABLE.has(a.content_type)));
};
export const getAsset = (db: DB, workspaceId: string, id: string) =>
  db.prepare('SELECT * FROM assets WHERE workspace_id = ? AND id = ?').bind(workspaceId, id).first<Asset>();

export const updateAsset = async (db: DB, ws: Workspace, actor: Actor, id: string, f: { alt?: unknown; tags?: unknown; filename?: unknown }): Promise<Result<true>> => {
  if (actor.via !== 'hub' || !can(actor, 'post.write')) return fail(403, 'Your role cannot edit files.');
  const a = await getAsset(db, ws.id, id);
  if (!a) return fail(404, 'File not found.');
  const ext = a.filename.split('.').pop() ?? '';
  const name = clampText(f.filename, 90);
  await db.prepare('UPDATE assets SET alt = ?, tags = ?, filename = ? WHERE workspace_id = ? AND id = ?')
    .bind(clampText(f.alt, 500), cleanTags(f.tags), name ? cleanName(name, ext) : a.filename, ws.id, id).run();
  return ok(true);
};

export const deleteAsset = async (db: DB, bucket: R2Bucket | undefined, ws: Workspace, actor: Actor, id: string): Promise<Result<true>> => {
  if (actor.via !== 'hub' || !can(actor, 'post.write')) return fail(403, 'Your role cannot delete files.');
  const a = await getAsset(db, ws.id, id);
  if (!a) return fail(404, 'File not found.');
  const used = await db.prepare("SELECT COUNT(*) AS n FROM posts WHERE workspace_id = ? AND (asset_id = ? OR render_asset_id = ?) AND status != 'published'").bind(ws.id, id, id).first<{ n: number }>();
  if ((used?.n ?? 0) > 0) return fail(409, 'A planned post uses this file. Change that post first.');
  await db.prepare('DELETE FROM assets WHERE workspace_id = ? AND id = ?').bind(ws.id, id).run();
  await bucket?.delete(a.r2_key);
  return ok(true);
};

export const allTags = (assets: Asset[]): string[] => [...new Set(assets.flatMap((a) => a.tags.split(', ').filter(Boolean)))].sort();
export const formatBytes = (n: number): string => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);
