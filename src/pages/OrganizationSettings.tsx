import { Navigate } from 'react-router-dom';
export default function OrganizationSettings() {
  return <Navigate to="/settings?section=org-general" replace />;
}
