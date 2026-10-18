import { admin, projectRef, url } from './supabase-admin.mjs';

// Paused projects have no working data-plane hostname. Check the control plane
// first so this read-only diagnostic explains the cause of DNS failures.
async function checkStatus() {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}`, {
      headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(15000),
    });
    if (response.ok) {
      const project = await response.json();
      console.log(JSON.stringify({ project: project.name, status: project.status }));
      if (project.status === 'INACTIVE') {
        throw new Error(
          'The Supabase project is paused. Resume this existing project in the Supabase dashboard, then rerun this check. Paused projects can return ERR_NAME_NOT_RESOLVED.',
        );
      }
      if (['COMING_UP', 'RESTORING', 'GOING_DOWN'].includes(project.status)) {
        throw new Error(
          `The Supabase project is ${project.status}. Wait for ACTIVE_HEALTHY before testing the application.`,
        );
      }
    } else {
      console.log(
        JSON.stringify({
          managementStatus: response.status,
          message: 'Project state could not be checked; continuing with API checks.',
        }),
      );
    }
  }
  if (!admin)
    throw new Error('Configure SUPABASE_SECRET_KEY in .env.supabase.local for API diagnostics.');
  const result = await admin.from('properties').select('id', { count: 'exact' }).limit(1);
  console.log(
    JSON.stringify({
      properties: {
        count: result.count,
        status: result.status,
        error: result.error?.message || null,
      },
    }),
  );
  if (result.error)
    throw new Error(
      'The property API is unreachable or returned an error. Check project status, DNS and the configured URL/key.',
    );
  const auth = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  console.log(
    JSON.stringify({ authAdminAvailable: !auth.error, error: auth.error?.message || null }),
  );
  if (auth.error) process.exitCode = 1;
  const response = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: process.env.SUPABASE_SECRET_KEY, Accept: 'application/openapi+json' },
    signal: AbortSignal.timeout(15000),
  });
  const spec = await response.json();
  console.log(
    JSON.stringify({
      apiStatus: response.status,
      tables: Object.keys(spec.definitions || {}),
      paths: Object.keys(spec.paths || {}),
      error: spec.message,
    }),
  );
  if (!response.ok) process.exitCode = 1;
}

checkStatus().catch((error) => {
  console.error(JSON.stringify({ error: error.message, cause: error.cause?.code }));
  process.exitCode = 1;
});
