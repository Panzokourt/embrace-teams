import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Loader2, UserPlus, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface JoinRequest {
  id: string;
  user_id: string;
  company_id: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  user_email: string;
  user_name: string;
}

export function JoinRequestsManager() {
  const { company, isOwner, isCompanyAdmin } = useAuth();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canManage = isOwner || isCompanyAdmin;

  useEffect(() => {
    if (!company?.id) return;
    fetchRequests();
  }, [company?.id]);

  const fetchRequests = async () => {
    if (!company?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile info for each request
      const userIds = (data || []).map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      setRequests((data || []).map(r => ({
        ...r,
        user_email: profileMap.get(r.user_id)?.email || '',
        user_name: profileMap.get(r.user_id)?.full_name || '',
      })));
    } catch (error: any) {
      console.error('Error fetching join requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase.rpc('approve_join_request', {
        _request_id: requestId,
        _role: 'standard' as any
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        toast.error(result.error || 'Σφάλμα έγκρισης');
        return;
      }
      toast.success('Το αίτημα εγκρίθηκε');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase.rpc('reject_join_request', {
        _request_id: requestId
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        toast.error(result.error || 'Σφάλμα απόρριψης');
        return;
      }
      toast.success('Το αίτημα απορρίφθηκε');
      fetchRequests();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Αιτήματα Ένταξης</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingCount} εκκρεμή
            </Badge>
          )}
        </div>
      </div>

      {requests.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="text-center py-12">
            <UserPlus className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground">Δεν υπάρχουν αιτήματα ένταξης</p>
            <p className="text-sm text-muted-foreground mt-1">
              Όταν κάποιος εγγραφεί με email @{company?.domain}, θα εμφανιστεί εδώ
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/40">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Χρήστης</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ημερομηνία</TableHead>
                <TableHead>Κατάσταση</TableHead>
                {canManage && <TableHead className="text-right">Ενέργειες</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">
                    {req.user_name || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {req.user_email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(req.created_at), 'dd MMM yyyy, HH:mm', { locale: el })}
                  </TableCell>
                  <TableCell>
                    {req.status === 'pending' && (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
                        <Clock className="h-3 w-3" />Εκκρεμεί
                      </Badge>
                    )}
                    {req.status === 'approved' && (
                      <Badge variant="outline" className="gap-1 text-green-600 border-green-300 bg-green-50">
                        <CheckCircle className="h-3 w-3" />Εγκρίθηκε
                      </Badge>
                    )}
                    {req.status === 'rejected' && (
                      <Badge variant="outline" className="gap-1 text-red-600 border-red-300 bg-red-50">
                        <XCircle className="h-3 w-3" />Απορρίφθηκε
                      </Badge>
                    )}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:bg-green-50"
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === req.id}
                          >
                            {actionLoading === req.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><CheckCircle className="h-4 w-4 mr-1" />Έγκριση</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleReject(req.id)}
                            disabled={actionLoading === req.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />Απόρριψη
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

// Export a hook to get pending count for badge display
export function useJoinRequestsCount() {
  const { company, isOwner, isCompanyAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!company?.id || (!isOwner && !isCompanyAdmin)) return;

    const fetchCount = async () => {
      const { count: pendingCount } = await supabase
        .from('join_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('status', 'pending');
      setCount(pendingCount || 0);
    };

    fetchCount();
  }, [company?.id, isOwner, isCompanyAdmin]);

  return count;
}
