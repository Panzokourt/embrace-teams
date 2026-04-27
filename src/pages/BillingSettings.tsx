import { Navigate } from 'react-router-dom';
export default function BillingSettings() {
  return <Navigate to="/settings?section=billing" replace />;
}
