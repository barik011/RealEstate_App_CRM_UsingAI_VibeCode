import { useSelector } from 'react-redux';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectUser } from '../crm/store';
import { homeFor } from '../crm/constants';
import { hasWorkspaceAccess, canVisit } from '../crm/permissions';
export function ProtectedRoute() {
  const user = useSelector(selectUser);
  const loading = useSelector((state) => state.auth.loading);
  const crmLoading = useSelector((state) => state.crm.loading);
  const crmError = useSelector((state) => state.crm.error);
  const wrongScope = useSelector(
    (state) =>
      Object.hasOwn(state.crm, 'scopeUserId') && state.crm.scopeUserId !== (user?.id || null),
  );
  const agentActive = useSelector((state) =>
    state.crm.agents.some((agent) => agent.id === user?.agentId && agent.status === 'ACTIVE'),
  );
  const location = useLocation();
  if (loading || (user?.role === 'AGENT' && (crmLoading || (!crmError && wrongScope))))
    return (
      <div className="crm-skeleton" role="status">
        Restoring your session…
      </div>
    );
  if (user?.role === 'AGENT' && crmError)
    return (
      <div className="crm crm-denied" dir="ltr">
        <h1>Unable to verify workspace access</h1>
        <p role="alert">Your account status could not be checked. Please retry.</p>
        <button className="crm-button" onClick={() => window.location.reload()}>
          Retry
        </button>
        <Link to="/login">Back to login</Link>
      </div>
    );
  return hasWorkspaceAccess(user) && (user.role !== 'AGENT' || agentActive) ? (
    <Outlet />
  ) : (
    <Navigate
      to="/login"
      state={{ from: location.pathname + location.search + location.hash }}
      replace
    />
  );
}
export function RoleGuard({ role }) {
  const user = useSelector(selectUser);
  const location = useLocation();
  const page = location.pathname.split('/')[2];
  return user?.role === role && (!page || canVisit(user, page)) ? (
    <Outlet />
  ) : (
    <div className="crm crm-denied" dir="ltr">
      <h1>Access restricted</h1>
      <p>
        Your account does not have access to this area. Contact your administrator to request
        permission.
      </p>
      <Link className="crm-button" to={homeFor(user)}>
        Return to your dashboard
      </Link>
      <Link className="crm-button secondary" to="/login">
        Switch account
      </Link>
    </div>
  );
}
export function WorkspaceHome() {
  const user = useSelector(selectUser);
  return <Navigate to={homeFor(user)} replace />;
}
