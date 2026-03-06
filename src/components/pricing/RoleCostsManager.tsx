import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRoleDefaults, useEmployeeOverrides, RoleDefaultCost, EmployeeCostOverride } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, UserCog, Users } from 'lucide-react';

const COMMON_ROLES = [
  'Account Manager', 'Project Manager', 'Creative Director', 'Art Director',
  'Graphic Designer', 'Copywriter', 'Social Media Manager', 'SEO Specialist',
  'Web Developer', 'UX Designer', 'Media Planner', 'Media Buyer',
  'Strategist', 'Data Analyst', 'Video Editor', 'Photographer',
];

const LEVELS = ['Junior', 'Mid', 'Senior', 'Lead', 'Director'];

export default function RoleCostsManager() {
  const { company, isAdmin, isManager } = useAuth();
  const { defaults, loading: loadingDefaults, refetch: refetchDefaults } = useRoleDefaults();
  const { overrides, loading: loadingOverrides, refetch: refetchOverrides } = useEmployeeOverrides();
  const [employees, setEmployees] = useState<any[]>([]);
  
  // Role default form
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ role_title: '', level: '', hourly_cost: '' });
  const [roleSaving, setRoleSaving] = useState(false);
  
  // Employee override form
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const [empForm, setEmpForm] = useState({ employee_id: '', hourly_cost: '' });
  const [empSaving, setEmpSaving] = useState(false);
  
  const canManage = isAdmin || isManager;

  useEffect(() => {
    if (company?.id) {
      supabase.from('profiles').select('id, full_name, email')
        .then(({ data }) => setEmployees(data || []));
    }
  }, [company?.id]);

  const handleSaveRole = async () => {
    if (!company?.id || !roleForm.role_title) return;
    setRoleSaving(true);
    try {
      const { error } = await supabase.from('role_default_costs' as any).upsert({
        company_id: company.id,
        role_title: roleForm.role_title,
        level: roleForm.level || null,
        hourly_cost: parseFloat(roleForm.hourly_cost) || 0,
      }, { onConflict: 'company_id,role_title,level' });
      if (error) throw error;
      toast.success('Default rate αποθηκεύτηκε');
      setRoleDialogOpen(false);
      setRoleForm({ role_title: '', level: '', hourly_cost: '' });
      refetchDefaults();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally { setRoleSaving(false); }
  };

  const handleDeleteRole = async (id: string) => {
    await supabase.from('role_default_costs' as any).delete().eq('id', id);
    toast.success('Διαγράφηκε');
    refetchDefaults();
  };

  const handleSaveOverride = async () => {
    if (!company?.id || !empForm.employee_id) return;
    setEmpSaving(true);
    try {
      const { error } = await supabase.from('employee_cost_overrides' as any).upsert({
        company_id: company.id,
        employee_id: empForm.employee_id,
        hourly_cost: parseFloat(empForm.hourly_cost) || 0,
      }, { onConflict: 'company_id,employee_id' });
      if (error) throw error;
      toast.success('Employee override αποθηκεύτηκε');
      setEmpDialogOpen(false);
      setEmpForm({ employee_id: '', hourly_cost: '' });
      refetchOverrides();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης');
    } finally { setEmpSaving(false); }
  };

  const handleDeleteOverride = async (id: string) => {
    await supabase.from('employee_cost_overrides' as any).delete().eq('id', id);
    toast.success('Διαγράφηκε');
    refetchOverrides();
  };

  const getEmployeeName = (id: string) => employees.find(e => e.id === id)?.full_name || id;

  if (loadingDefaults || loadingOverrides) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Role Default Costs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Default Rates</CardTitle>
              <CardDescription>Κόστος/ώρα ανά ρόλο και level</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setRoleDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Προσθήκη
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {defaults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Δεν έχουν οριστεί default rates.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ρόλος</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">€/ώρα</TableHead>
                  {canManage && <TableHead className="w-[50px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {defaults.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.role_title}</TableCell>
                    <TableCell>{d.level || '—'}</TableCell>
                    <TableCell className="text-right">€{d.hourly_cost.toFixed(2)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteRole(d.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Employee Overrides */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5" />Employee Overrides</CardTitle>
              <CardDescription>Εξατομικευμένο κόστος/ώρα ανά εργαζόμενο</CardDescription>
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setEmpDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />Προσθήκη
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν employee overrides.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Εργαζόμενος</TableHead>
                  <TableHead className="text-right">€/ώρα</TableHead>
                  {canManage && <TableHead className="w-[50px]" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{getEmployeeName(o.employee_id)}</TableCell>
                    <TableCell className="text-right">€{o.hourly_cost.toFixed(2)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteOverride(o.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Νέο Default Rate</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ρόλος</Label>
              <Select value={roleForm.role_title} onValueChange={v => setRoleForm(p => ({ ...p, role_title: v }))}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε ρόλο" /></SelectTrigger>
                <SelectContent>{COMMON_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={roleForm.level} onValueChange={v => setRoleForm(p => ({ ...p, level: v }))}>
                <SelectTrigger><SelectValue placeholder="Προαιρετικό" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">— Κανένα —</SelectItem>
                  {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>€/ώρα</Label>
              <Input type="number" step="0.01" value={roleForm.hourly_cost} onChange={e => setRoleForm(p => ({ ...p, hourly_cost: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleSaveRole} disabled={roleSaving}>
              {roleSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Employee Dialog */}
      <Dialog open={empDialogOpen} onOpenChange={setEmpDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Employee Override</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Εργαζόμενος</Label>
              <Select value={empForm.employee_id} onValueChange={v => setEmpForm(p => ({ ...p, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Επιλέξτε" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.full_name || e.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>€/ώρα</Label>
              <Input type="number" step="0.01" value={empForm.hourly_cost} onChange={e => setEmpForm(p => ({ ...p, hourly_cost: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmpDialogOpen(false)}>Ακύρωση</Button>
            <Button onClick={handleSaveOverride} disabled={empSaving}>
              {empSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Αποθήκευση
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
