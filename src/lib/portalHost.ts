// Detects whether the current browser host is a "client portal" deployment.
// On portal hosts, App.tsx renders ONLY the /portal/* routes and redirects
// everything else to /portal/access. This lets us run the same codebase as:
//   - app.olseny.com  → full staff workspace (login required by app guards)
//   - portal.olseny.com → public client portal (token + PIN gated)
//
// Configurable via Vite env `VITE_PORTAL_HOSTNAMES` (comma-separated).

const DEFAULT_PORTAL_HOSTS = ['portal.olseny.com'];

function getConfiguredHosts(): string[] {
  const raw = (import.meta as any)?.env?.VITE_PORTAL_HOSTNAMES as string | undefined;
  if (!raw) return DEFAULT_PORTAL_HOSTS;
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isPortalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const hosts = getConfiguredHosts();
  return hosts.includes(host);
}
