import type { Channel } from './brand-check';

export type Role = 'viewer' | 'editor' | 'owner' | 'staff';
export type MemberRole = Exclude<Role, 'staff'>;
export type Via = 'hub' | 'mcp';
export type PostStatus = 'draft' | 'in_review' | 'approved' | 'published';
export type RequestStatus = 'open' | 'in_progress' | 'done' | 'declined';
export type Cms = 'sanity' | 'webflow' | 'other';

export interface User { id: string; email: string; name: string; is_staff: number; created_at: string }

export interface Workspace {
  id: string; slug: string; name: string; site_url: string; cms: Cms; cms_edit_url: string;
  monthly_minutes: number; monthly_posts: number; brand_config: string; created_at: string;
}

/** Who is acting, and with what rights in the current workspace. Built once per request. */
export interface Actor { userId: string; role: Role; via: Via }

export interface PostImage { template: string; theme: 'light' | 'dark'; kicker: string; headline: string; sub: string }

export interface Post {
  id: string; workspace_id: string; channel: Channel; copy: string; image: string; status: PostStatus;
  scheduled_for: string | null; published_url: string; published_at: string | null; source: Via;
  created_by: string | null; created_at: string; updated_at: string;
}

export interface WorkRequest {
  id: string; workspace_id: string; title: string; detail: string; page_url: string; status: RequestStatus;
  source: Via; created_by: string | null; created_at: string; updated_at: string; done_at: string | null;
}

export interface TimeEntry { id: string; request_id: string; minutes: number; note: string; logged_on: string; user_id: string | null; created_at: string }
export interface ChecklistItem { id: string; label: string; position: number; done_at: string | null }
export interface ActivityRow { id: string; action: string; note: string; via: Via; created_at: string; user_name: string | null; user_email: string | null }

export type Result<T> = { ok: true; value: T } | { ok: false; status: 400 | 403 | 404 | 409; error: string };
export const ok = <T>(value: T): Result<T> => ({ ok: true, value });
export const fail = (status: 400 | 403 | 404 | 409, error: string): Result<never> => ({ ok: false, status, error });

export const POST_STATUS_LABEL: Record<PostStatus, string> = { draft: 'Draft', in_review: 'In review', approved: 'Approved', published: 'Published' };
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = { open: 'Open', in_progress: 'In progress', done: 'Done', declined: 'Declined' };
export const ROLE_LABEL: Record<Role, string> = { viewer: 'Viewer', editor: 'Editor', owner: 'Owner', staff: 'MuzMesh' };
