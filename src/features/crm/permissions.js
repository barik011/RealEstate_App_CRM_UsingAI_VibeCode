// Roles come from the authenticated profile, never from a login form selection.
export const ROLE_PERMISSIONS = Object.freeze({
  ADMIN: Object.freeze({
    leads: 'all',
    work: 'all',
    agents: 'all',
    properties: 'manage',
    reports: 'all',
    settings: 'manage',
  }),
  AGENT: Object.freeze({
    leads: 'assigned',
    work: 'assigned',
    agents: 'self',
    properties: 'read',
    reports: 'none',
    settings: 'none',
  }),
});

export const hasWorkspaceAccess = (user) =>
  Boolean(
    user?.id &&
    Object.hasOwn(ROLE_PERMISSIONS, user.role) &&
    (user.role !== 'AGENT' || (typeof user.agentId === 'string' && user.agentId.trim())),
  );

export const permissionFor = (user, resource) =>
  hasWorkspaceAccess(user) && Object.hasOwn(ROLE_PERMISSIONS[user.role], resource)
    ? ROLE_PERMISSIONS[user.role][resource]
    : 'none';

export const ownsRecord = (user, ownerId) =>
  hasWorkspaceAccess(user) && user.role === 'AGENT' && Boolean(ownerId) && ownerId === user.agentId;

export const PERMISSION_ROWS = [
  ['Leads, notes and conversations', 'leads'],
  ['Tasks, follow-ups and viewings', 'work'],
  ['Agent profiles', 'agents'],
  ['Property catalog', 'properties'],
  ['Team reports', 'reports'],
  ['Change company settings', 'settings'],
];

export const PERMISSION_LABELS = {
  all: 'All records',
  assigned: 'Assigned records only',
  self: 'Own profile only',
  manage: 'Manage',
  read: 'Read only',
  none: 'No access',
};
