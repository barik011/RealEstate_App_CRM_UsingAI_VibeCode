import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessLead, canAccessWork, homeFor } from '../src/features/crm/constants.js';
import { hasWorkspaceAccess, permissionFor } from '../src/features/crm/permissions.js';
import { selectWorkspace } from '../src/features/crm/store.js';
import { createSeed } from '../src/repositories/seed.js';
import { applyCommand } from '../src/services/crmService.js';

const agent = { id: 'profile-agent', role: 'AGENT', agentId: 'agent-1' };
const admin = { id: 'profile-admin', role: 'ADMIN' };

test('unknown roles and incomplete identities fail closed, including matching or missing owners', () => {
  for (const user of [
    null,
    {},
    { ...agent, role: 'OWNER' },
    { ...agent, role: 'toString' },
    { ...agent, id: '' },
    { ...agent, agentId: null },
  ]) {
    assert.equal(hasWorkspaceAccess(user), false);
    assert.equal(permissionFor(user, 'leads'), 'none');
    assert.equal(canAccessLead(user, { assignedAgentId: user?.agentId }), false);
    assert.equal(canAccessWork(user, { agentId: user?.agentId }), false);
    assert.equal(homeFor(user), '/login');
    const data = createSeed();
    const before = structuredClone(data);
    assert.throws(() => applyCommand(data, 'readNotifications', {}, user), /authorized workspace/);
    assert.deepEqual(data, before);
    const workspace = selectWorkspace({ auth: { user }, crm: data });
    for (const key of [
      'leads',
      'tasks',
      'viewings',
      'agents',
      'notes',
      'activities',
      'notifications',
      'properties',
    ])
      assert.deepEqual(workspace[key], []);
  }
});

test('agents access assigned records only and administrators retain full access', () => {
  assert.equal(canAccessLead(agent, { assignedAgentId: 'agent-1' }), true);
  for (const owner of ['agent-2', null, undefined, '']) {
    assert.equal(canAccessLead(agent, { assignedAgentId: owner }), false);
    assert.equal(canAccessWork(agent, { agentId: owner }), false);
  }
  assert.equal(canAccessWork(agent, null), false);
  assert.equal(canAccessLead(admin, { assignedAgentId: null }), true);
  assert.equal(permissionFor(agent, 'settings'), 'none');
  assert.equal(permissionFor(admin, 'settings'), 'manage');
  assert.equal(permissionFor(admin, 'unknown'), 'none');
  assert.equal(permissionFor(admin, 'toString'), 'none');
});
