import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Users, Building2, BarChart3, Search, Shield, ShieldOff, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

// ─── Types ───────────────────────────────────────────────────────
interface PlatformProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  status: string;
  created_at: string;
}

interface CompanyRole {
  user_id: string;
  company_id: string;
  role: string;
  status: string;
  companies: { name: string } | null;
}

interface PlatformCompany {
  id: string;
  name: string;
  domain: string;
  logo_url: string | null;
  created_at: string;
  member_count: number;
}

interface PlatformStats {
  totalUsers: number;
  totalCompanies: number;
  recentSignups: number;
  activeUsers: number;
}

// ─── Constants ───────────────────────────────────────────────────
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const REAUTH_SESSION_KEY = 'pa_reauth_ts';
const REAUTH_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 60_000; // 60 seconds

// ─── API helpers ─────────────────────────────────────────────────
async function platformFetch(type: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/platform-admin-data?type=${type}`,
    { headers: { Authorization: `Bearer ${session.access_token}` } }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

async function platformAction(action: string, userId: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/platform-admin-data`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, userId }),
    }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Action failed');
  }
  return res.json();
}

// ─── Re-auth helpers ─────────────────────────────────────────────
function isReauthValid(): boolean {
  const ts = sessionStorage.getItem(REAUTH_SESSION_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < REAUTH_TTL_MS;
}

function markReauthValid() {
  sessionStorage.setItem(REAUTH_SESSION_KEY, Date.now().toString());
}

// ─── Re-auth Gate Component ──────────────────────────────────────
function ReauthGate({ userEmail, onSuccess }: { userEmail: string; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer for lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setLockCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) return;
    if (!password.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });

      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPassword('');

        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_MS;
          setLockedUntil(until);
          toast.error(`Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε ${LOCKOUT_MS / 1000} δευτερόλεπτα.`);
        } else {
          toast.error(`Λάθος κωδικός (${newAttempts}/${MAX_ATTEMPTS})`);
        }
        return;
      }

      markReauthValid();
      onSuccess();
    } catch {
      toast.error('Σφάλμα κατά την επαλήθευση');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  return (
    <Dialog open modal>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <DialogTitle>Επαλήθευση Ταυτότητας</DialogTitle>
          </div>
          <DialogDescription>
            Για λόγους ασφαλείας, εισάγετε τον κωδικό σας για πρόσβαση στο Platform Admin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Κωδικός πρόσβασης</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isLocked || loading}
              autoFocus
              autoComplete="current-password"
            />
          </div>

          {isLocked && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Κλειδώθηκε. Δοκιμάστε ξανά σε {lockCountdown} δευτερόλεπτα.</span>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLocked || loading || !password.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
            Επαλήθευση
          </Button>

          {attempts > 0 && !isLocked && (
            <p className="text-xs text-muted-foreground text-center">
              Προσπάθεια {attempts}/{MAX_ATTEMPTS}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function PlatformAdmin() {
  const { user, loading, isPlatformAdmin } = useAuth();
  const [authenticated, setAuthenticated] = useState(() => isReauthValid());
  const [tab, setTab] = useState('stats');
  const [profiles, setProfiles] = useState<PlatformProfile[]>([]);
  const [roles, setRoles] = useState<CompanyRole[]>([]);
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [searchUsers, setSearchUsers] = useState('');
  const [searchCompanies, setSearchCompanies] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check session timeout periodically
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => {
      if (!isReauthValid()) {
        setAuthenticated(false);
        toast.info('Η συνεδρία έληξε. Εισάγετε ξανά τον κωδικό σας.');
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [authenticated]);

  useEffect(() => {
    if (!isPlatformAdmin || !authenticated) return;
    loadData(tab);
  }, [isPlatformAdmin, authenticated, tab]);

  const loadData = async (currentTab: string) => {
    setLoadingData(true);
    try {
      if (currentTab === 'users') {
        const data = await platformFetch('users');
        setProfiles(data.profiles || []);
        setRoles(data.roles || []);
      } else if (currentTab === 'companies') {
        const data = await platformFetch('companies');
        setCompanies(data.companies || []);
      } else if (currentTab === 'stats') {
        const data = await platformFetch('stats');
        setStats(data);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const handleUserAction = async (action: 'suspend' | 'activate', userId: string) => {
    setActionLoading(userId);
    try {
      await platformAction(action, userId);
      toast.success(action === 'suspend' ? 'Ο χρήστης ανεστάλη' : 'Ο χρήστης ενεργοποιήθηκε');
      loadData('users');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isPlatformAdmin) return <Navigate to="/" replace />;

  // Show re-auth gate
  if (!authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <ReauthGate userEmail={user.email || ''} onSuccess={() => setAuthenticated(true)} />
      </div>
    );
  }

  const filteredProfiles = profiles.filter(p =>
    (p.email?.toLowerCase() || '').includes(searchUsers.toLowerCase()) ||
    (p.full_name?.toLowerCase() || '').includes(searchUsers.toLowerCase())
  );

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchCompanies.toLowerCase()) ||
    c.domain.toLowerCase().includes(searchCompanies.toLowerCase())
  );

  const getUserCompanies = (userId: string) =>
    roles
      .filter(r => r.user_id === userId)
      .map(r => ({ name: r.companies?.name || '—', role: r.role }));

  const statusColor = (status: string) => {
    if (status === 'active') return 'default';
    if (status === 'suspended') return 'destructive';
    return 'secondary';
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Admin</h1>
            <p className="text-sm text-muted-foreground">Διαχείριση όλων των χρηστών και εταιρειών</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Στατιστικά
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Χρήστες
            </TabsTrigger>
            <TabsTrigger value="companies" className="gap-2">
              <Building2 className="h-4 w-4" /> Εταιρείες
            </TabsTrigger>
          </TabsList>

          {/* Stats Tab */}
          <TabsContent value="stats">
            {loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Σύνολο Χρηστών</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{stats.totalUsers}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Σύνολο Εταιρειών</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{stats.totalCompanies}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Εγγραφές (30 ημέρες)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{stats.recentSignups}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground font-medium">Ενεργοί Χρήστες</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-foreground">{stats.activeUsers}</p>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="flex items-center gap-3 my-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Αναζήτηση χρήστη..."
                  value={searchUsers}
                  onChange={e => setSearchUsers(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="outline">{filteredProfiles.length} χρήστες</Badge>
            </div>
            {loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Χρήστης</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Κατάσταση</TableHead>
                      <TableHead>Εταιρείες</TableHead>
                      <TableHead>Εγγραφή</TableHead>
                      <TableHead className="text-right">Ενέργειες</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map(p => {
                      const userCompanies = getUserCompanies(p.id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.full_name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{p.email}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {userCompanies.length === 0 ? (
                              <span className="text-muted-foreground text-sm">Καμία</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {userCompanies.map((uc, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {uc.name} ({uc.role})
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy', { locale: el }) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {p.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={actionLoading === p.id}
                                onClick={() => handleUserAction('suspend', p.id)}
                              >
                                {actionLoading === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><ShieldOff className="h-4 w-4 mr-1" /> Αναστολή</>
                                )}
                              </Button>
                            ) : p.status === 'suspended' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary/80"
                                disabled={actionLoading === p.id}
                                onClick={() => handleUserAction('activate', p.id)}
                              >
                                {actionLoading === p.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <><Shield className="h-4 w-4 mr-1" /> Ενεργοποίηση</>
                                )}
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Companies Tab */}
          <TabsContent value="companies">
            <div className="flex items-center gap-3 my-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Αναζήτηση εταιρείας..."
                  value={searchCompanies}
                  onChange={e => setSearchCompanies(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="outline">{filteredCompanies.length} εταιρείες</Badge>
            </div>
            {loadingData ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Εταιρεία</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>Μέλη</TableHead>
                      <TableHead>Δημιουργία</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">{c.domain}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{c.member_count}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {c.created_at ? format(new Date(c.created_at), 'dd MMM yyyy', { locale: el }) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
