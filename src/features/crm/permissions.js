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
    reports: 'assigned',
    settings: 'none',
  }),
});

export const hasWorkspaceAccess = (user) =>
  Boolean(
    user?.id &&
    user.loginEnabled !== false &&
    Object.hasOwn(ROLE_PERMISSIONS, user.role) &&
    (user.role !== 'AGENT' || (typeof user.agentId === 'string' && user.agentId.trim())),
  );

export const AGENT_PRIVILEGES = Object.freeze([
  ['dashboard', 'Dashboard', 'See summaries of assigned leads.'],
  ['leads', 'View assigned leads', 'Read assigned customers, notes and conversations.'],
  ['leadUpdates', 'Update assigned leads', 'Change stages, notes, priorities and deal outcomes.'],
  ['tasks', 'View tasks', 'Read assigned tasks and follow-ups.'],
  ['taskUpdates', 'Manage tasks', 'Create, reschedule, complete and cancel assigned tasks.'],
  ['viewings', 'View viewings', 'Read assigned property viewings.'],
  ['viewingUpdates', 'Manage viewings', 'Schedule, reschedule and record viewing outcomes.'],
  ['calendar', 'Calendar', 'See assigned tasks and viewings in the calendar.'],
  ['reports', 'My reports', 'View and export reports for assigned leads only.'],
]);
export const ALL_AGENT_PERMISSIONS = Object.freeze(AGENT_PRIVILEGES.map(([key]) => key));
export const dependenciesFor = (key) =>
  key === 'leads'
    ? []
    : key === 'taskUpdates'
      ? ['leads', 'tasks']
      : key === 'viewingUpdates'
        ? ['leads', 'viewings']
        : key === 'calendar'
          ? ['leads', 'tasks', 'viewings']
          : ['leads'];
export function normalizePermissions(values) {
  const result = new Set(values.filter((key) => ALL_AGENT_PERMISSIONS.includes(key)));
  for (const key of result) for (const dependency of dependenciesFor(key)) result.add(dependency);
  return ALL_AGENT_PERMISSIONS.filter((key) => result.has(key));
}
export const can = (user, privilege) =>
  hasWorkspaceAccess(user) &&
  (user.role === 'ADMIN' ||
    (Array.isArray(user.permissions) && user.permissions.includes(privilege)));
export const commandPermission = (command) =>
  ({
    status: 'leadUpdates',
    priority: 'leadUpdates',
    note: 'leadUpdates',
    communication: 'leadUpdates',
    won: 'leadUpdates',
    lost: 'leadUpdates',
    createTask: 'taskUpdates',
    updateTask: 'taskUpdates',
    createViewing: 'viewingUpdates',
    updateViewing: 'viewingUpdates',
    readNotifications: 'leads',
  })[command];
export const canCommand = (user, command) =>
  hasWorkspaceAccess(user) &&
  (user.role === 'ADMIN' ||
    command === 'saveAgent' ||
    (Boolean(commandPermission(command)) && can(user, commandPermission(command))));
export const canLeadAction = (user, action) =>
  canCommand(
    user,
    {
      create: 'createLead',
      assign: 'assign',
      followUp: 'createTask',
      task: 'createTask',
      viewing: 'createViewing',
    }[action] || action,
  );
export const canVisit = (user, page) =>
  hasWorkspaceAccess(user) &&
  (user.role === 'ADMIN' || ['profile', 'permissions'].includes(page) || can(user, page));
export const permissionFor = (user, resource) => {
  if (!hasWorkspaceAccess(user) || !Object.hasOwn(ROLE_PERMISSIONS[user.role], resource))
    return 'none';
  if (user.role === 'ADMIN' || ['agents', 'properties'].includes(resource))
    return ROLE_PERMISSIONS[user.role][resource];
  if (resource === 'leads') return can(user, 'leads') ? 'assigned' : 'none';
  if (resource === 'work') return can(user, 'tasks') || can(user, 'viewings') ? 'assigned' : 'none';
  if (resource === 'reports') return can(user, 'reports') ? 'assigned' : 'none';
  return 'none';
};

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
