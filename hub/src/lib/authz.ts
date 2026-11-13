// One place that says who may do what. Routes and MCP tools both go through src/lib/service.ts,
// which calls can() before every change.
import type { Actor, Role } from './types';

const RANK: Record<Role, number> = { viewer: 0, editor: 1, owner: 2, staff: 3 };

export type Action =
  | 'read'
  | 'post.write'      // create, edit, send for review, schedule, mark published
  | 'post.approve'    // approve or send back
  | 'request.create'
  | 'request.manage'  // change status, log time
  | 'checklist.toggle'
  | 'context.edit'
  | 'workspace.manage'; // settings, brand kit, members

const NEEDS: Record<Action, Role> = {
  'read': 'viewer',
  'post.write': 'editor',
  'post.approve': 'owner',
  'request.create': 'editor',
  'request.manage': 'staff',
  'checklist.toggle': 'owner',
  'context.edit': 'owner',
  'workspace.manage': 'staff',
};

export const can = (actor: Pick<Actor, 'role'>, action: Action): boolean => RANK[actor.role] >= RANK[NEEDS[action]];
