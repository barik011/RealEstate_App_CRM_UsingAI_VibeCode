import { readFileSync } from 'node:fs';
import { projectRef } from './supabase-admin.mjs';

if (!process.env.SUPABASE_ACCESS_TOKEN)
  throw new Error('Configure SUPABASE_ACCESS_TOKEN for function deployment.');
const body = new FormData();
body.set(
  'metadata',
  JSON.stringify({ name: 'agent-accounts', entrypoint_path: 'index.ts', verify_jwt: false }),
);
body.append(
  'file',
  new Blob([readFileSync('supabase/functions/agent-accounts/index.ts', 'utf8')], {
    type: 'application/typescript',
  }),
  'index.ts',
);
const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/functions/deploy?slug=agent-accounts`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
    body,
  },
);
const result = await response.json();
if (!response.ok)
  throw new Error(
    `Function deployment failed (${response.status}): ${result.message || 'Check Supabase project status.'}`,
  );
console.log(
  JSON.stringify({ function: result.slug, status: result.status, version: result.version }),
);
