import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useRoleCosts, ServiceRoleCost, resolveHourlyCost } from '@/hooks/usePricingData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';

const LEVELS = ['Junior', 'Mid', 'Senior', 'Lead', 'Director'];

const COMMON_ROLES = [
  'Account Manager', 'Project Manager', 'Creative Director', 'Art Director',
  'Graphic Designer', 'Copywriter', 'Social Media Manager', 'SEO Specialist',
  'Web Developer', 'UX Designer', 'Media Planner', 'Media Buyer',
  'Strategist', 'Data Analyst', 'Video Editor', 'Photographer',
];

interface Props {
  serviceId: string;
}

interface EditableRow {
  id?: string;
  role_title: string;
  level: string;
  estimated_hours: string;
  hourly_cost: string;
  cost_source: string;
  employee_id: string;
  isNew?: boolean;
}

export default function ServiceCostingTable({ serviceId }: Props) {
  const { company } = useAuth();
  const { roleCosts, loading, refetch } = useRoleCosts(serviceId);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setRows(roleCosts.map(rc => ({
        id: rc.id,
        role_title: rc.role_title,
        level: rc.level || '',
        estimated_hours: rc.estimated_hours.toString(),
        hourly_cost: rc.hourly_cost.toString(),
        cost_source: rc.cost_source,
        employee_id: rc.employee_id || '',
      })));
    }
  }, [roleCosts, loading]);

  const addRow = () => {
    setRows(prev => [...prev, {
      role_title: '', level: '', estimated_hours: '0',
      hourly_cost: '0', cost_source: 'manual', employee_id: '', isNew: true,
    }]);
  };

  const updateRow = (index: number, field: string, value: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const removeRow = (index: number) => {
    setRows(prev => prev.filter((_, i) => i !== index));
  };

  const resolveRate = async (index: number) => {
    const row = rows[index];
    if (!company?.id || !row.role_title) return;
    
    const result = await resolveHourlyCost(
      company.id, row.role_title,
      row.level || null, row.employee_id || null
    );
    
    setRows(prev => prev.map((r, i) => i === index ? {
      ...r, hourly_cost: result.cost.toString(), cost_source: result.source,
    } : r));
    
    if (result.source === 'manual' && result.cost === 0) {
      toast.info('Δεν βρέθηκε default rate — εισάγετε χειροκίνητα');
    } else {
      toast.success(`Rate: €${result.cost}/ώρα (${result.source === 'employee' ? 'employee override' : 'role default'})`);
    }
  };

  const handleSave = async () => {
    if (!company?.id) return;
    setSaving(true);
    
    try {
      // Delete existing
      await supabase.from('service_role_costs' as any).delete().eq('service_id', serviceId);
      
      // Insert all rows
      const validRows = rows.filter(r => r.role_title.trim());
      if (validRows.length > 0) {
        const inserts = validRows.map(r => ({
          service_id: serviceId,
          company_id: company.id,
          role_title: r.role_title,
          level: r.level || null,
          estimated_hours: parseFloat(r.estimated_hours) || 0,
          hourly_cost: parseFloat(r.hourly_cost) || 0,
          cost_source: r.cost_source,
          employee_id: r.employee_id || null,
        }));
        
        const { error } = await supabase.from('service_role_costs' as any).insert(inserts);
        if (error) throw error;
      }
      
      toast.success('Η κοστολόγηση αποθηκεύτηκε');
      refetch();
    } catch (err) {
      console.error(err);
      toast.error('Σφάλμα αποθήκευσης κοστολόγησης');
    } finally {
      setSaving(false);
    }
  };

  const totalHours = rows.reduce((s, r) => s + (parseFloat(r.estimated_hours) || 0), 0);
  const totalCost = rows.reduce((s, r) => s + (parseFloat(r.estimated_hours) || 0) * (parseFloat(r.hourly_cost) || 0), 0);

  if (loading) return <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Κόστος ομάδας — ρόλοι, ώρες, hourly rates</p>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-4 w-4 mr-1" />Γραμμή
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Προσθέστε γραμμές κοστολόγησης για να υπολογίσετε το labor cost.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Ρόλος</TableHead>
                <TableHead className="min-w-[100px]">Level</TableHead>
                <TableHead className="min-w-[90px] text-right">Ώρες</TableHead>
                <TableHead className="min-w-[100px] text-right">€/ώρα</TableHead>
                <TableHead className="min-w-[60px]">Πηγή</TableHead>
                <TableHead className="min-w-[90px] text-right">Σύνολο</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => {
                const lineCost = (parseFloat(row.estimated_hours) || 0) * (parseFloat(row.hourly_cost) || 0);
                return (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={row.role_title} onValueChange={v => updateRow(idx, 'role_title', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ρόλος..." /></SelectTrigger>
                        <SelectContent>
                          {COMMON_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={row.level} onValueChange={v => updateRow(idx, 'level', v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Level" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">—</SelectItem>
                          {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input type="number" className="h-8 text-xs text-right w-20" value={row.estimated_hours}
                        onChange={e => updateRow(idx, 'estimated_hours', e.target.value)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input type="number" step="0.01" className="h-8 text-xs text-right w-20" value={row.hourly_cost}
                          onChange={e => { updateRow(idx, 'hourly_cost', e.target.value); updateRow(idx, 'cost_source', 'manual'); }} />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => resolveRate(idx)} title="Auto-resolve rate">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {row.cost_source === 'employee' ? 'EMP' : row.cost_source === 'role_default' ? 'DEF' : 'MAN'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      €{lineCost.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeRow(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex gap-6 text-sm">
          <div><span className="text-muted-foreground">Σύνολο ωρών:</span> <span className="font-semibold">{totalHours}h</span></div>
          <div><span className="text-muted-foreground">Labor Cost:</span> <span className="font-semibold">€{totalCost.toFixed(2)}</span></div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Αποθήκευση Κοστολόγησης
        </Button>
      </div>
    </div>
  );
}
