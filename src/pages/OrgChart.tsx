import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Network, Plus, Building2, Loader2, Wand2, Shield, Database,
  LayoutGrid, List, GitBranch
} from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { OrgChartCanvas } from '@/components/org-chart/OrgChartCanvas';
import { OrgNodeCard } from '@/components/org-chart/OrgNodeCard';
import { OrgConnectors } from '@/components/org-chart/OrgConnectors';
import { OrgDetailPanel } from '@/components/org-chart/OrgDetailPanel';
import { OrgDepartmentView } from '@/components/org-chart/OrgDepartmentView';
import { OrgListView } from '@/components/org-chart/OrgListView';
import { OrgChartWizard } from '@/components/org-chart/OrgChartWizard';
import type { OrgPosition, Profile } from '@/components/org-chart/types';

type ViewMode = 'hierarchy' | 'department' | 'list';

export default function OrgChartPage() {
  const { isCompanyAdmin, company, isManager } = useAuth();
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<OrgPosition | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loadingDummyData, setLoadingDummyData] = useState(false);
  const treeContainerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [positionTitle, setPositionTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [parentPositionId, setParentPositionId] = useState<string>('');
  const [positionColor, setPositionColor] = useState('#3B82F6');

  const canEdit = isCompanyAdmin || isManager;

  const fetchData = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    try {
      const [positionsRes, profilesRes] = await Promise.all([
        supabase.from('org_chart_positions').select('*').eq('company_id', company.id)
          .order('level', { ascending: true }).order('sort_order', { ascending: true }),
        supabase.from('profiles').select('id, full_name, email, avatar_url, job_title, department, phone'),
      ]);
      if (positionsRes.error) throw positionsRes.error;

      const userIds = positionsRes.data?.filter(p => p.user_id).map(p => p.user_id) || [];
      let usersMap = new Map<string, Profile>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('profiles').select('id, full_name, email, avatar_url, job_title, department, phone')
          .in('id', userIds);
        usersData?.forEach(u => usersMap.set(u.id, u));
      }

      const positionsWithUsers = (positionsRes.data || []).map(p => ({
        ...p,
        user: p.user_id ? usersMap.get(p.user_id) : undefined,
      }));

      setPositions(positionsWithUsers);
      setProfiles(profilesRes.data || []);
      setExpandedNodes(new Set(positionsWithUsers.map(p => p.id)));
    } catch (error) {
      console.error('Error fetching org chart:', error);
      toast.error('Σφάλμα κατά τη φόρτωση');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buildTree = useCallback((items: OrgPosition[]): OrgPosition[] => {
    const map = new Map<string, OrgPosition>();
    const roots: OrgPosition[] = [];
    items.forEach(p => map.set(p.id, { ...p, children: [] }));
    items.forEach(p => {
      const node = map.get(p.id)!;
      if (p.parent_position_id && map.has(p.parent_position_id)) {
        map.get(p.parent_position_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });
    return roots;
  }, []);

  const tree = useMemo(() => buildTree(positions), [buildTree, positions]);

  // Count children for a node
  const childCountMap = useMemo(() => {
    const map = new Map<string, number>();
    positions.forEach(p => {
      if (p.parent_position_id) {
        map.set(p.parent_position_id, (map.get(p.parent_position_id) || 0) + 1);
      }
    });
    return map;
  }, [positions]);

  // Connector lines for SVG
  const connectorLines = useMemo(() => {
    const lines: { parentId: string; childId: string; color: string }[] = [];
    const addLines = (nodes: OrgPosition[]) => {
      for (const node of nodes) {
        if (node.children && expandedNodes.has(node.id)) {
          for (const child of node.children) {
            lines.push({ parentId: node.id, childId: child.id, color: node.color });
          }
          addLines(node.children);
        }
      }
    };
    addLines(tree);
    return lines;
  }, [tree, expandedNodes]);

  const openCreateDialog = (parentId?: string) => {
    setEditingPosition(null);
    setPositionTitle(''); setDepartment(''); setSelectedUserId('');
    setParentPositionId(parentId || ''); setPositionColor('#3B82F6');
    setEditDialogOpen(true);
  };

  const openEditDialog = (position: OrgPosition) => {
    setEditingPosition(position);
    setPositionTitle(position.position_title);
    setDepartment(position.department || '');
    setSelectedUserId(position.user_id || '');
    setParentPositionId(position.parent_position_id || '');
    setPositionColor(position.color || '#3B82F6');
    setEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!company || !positionTitle.trim()) { toast.error('Συμπληρώστε τον τίτλο θέσης'); return; }
    try {
      const data = {
        company_id: company.id,
        position_title: positionTitle.trim(),
        department: department.trim() || null,
        user_id: selectedUserId || null,
        parent_position_id: parentPositionId || null,
        color: positionColor,
        level: parentPositionId ? (positions.find(p => p.id === parentPositionId)?.level || 0) + 1 : 0,
      };
      if (editingPosition) {
        const { error } = await supabase.from('org_chart_positions').update(data).eq('id', editingPosition.id);
        if (error) throw error;
        toast.success('Η θέση ενημερώθηκε');
      } else {
        const { error } = await supabase.from('org_chart_positions').insert(data);
        if (error) throw error;
        toast.success('Η θέση δημιουργήθηκε');
      }
      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά την αποθήκευση');
    }
  };

  const handleDelete = async (positionId: string) => {
    if (!confirm('Είστε σίγουροι; Θα διαγραφούν και οι υποθέσεις.')) return;
    try {
      const { error } = await supabase.from('org_chart_positions').delete().eq('id', positionId);
      if (error) throw error;
      toast.success('Η θέση διαγράφηκε');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή');
    }
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const handleNodeClick = (node: OrgPosition) => {
    setSelectedNode(node);
    setDetailOpen(true);
  };

  // Dummy data
  const DUMMY_NAMES = [
    'Αλέξανδρος Παπαδόπουλος', 'Μαρία Γεωργίου', 'Νίκος Κωνσταντίνου',
    'Ελένη Αντωνίου', 'Γιώργος Δημητρίου', 'Κατερίνα Νικολάου',
    'Δημήτρης Βασιλείου', 'Σοφία Παναγιώτου', 'Χρήστος Ιωάννου',
    'Αναστασία Χριστοδούλου', 'Θάνος Μιχαήλ', 'Εύα Σταματίου',
  ];

  const addDummyUsers = async () => {
    if (!company || positions.length === 0) { toast.error('Δεν υπάρχουν θέσεις'); return; }
    setLoadingDummyData(true);
    try {
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const dummyName = DUMMY_NAMES[i % DUMMY_NAMES.length];
        const dummyEmail = `dummy${i + 1}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
        const { data: profile } = await supabase
          .from('profiles').upsert({ id: crypto.randomUUID(), email: dummyEmail, full_name: dummyName, status: 'active' }, { onConflict: 'email' })
          .select('id').single();
        if (profile) {
          await supabase.from('org_chart_positions').update({ user_id: profile.id }).eq('id', pos.id);
        } else {
          const { data: ep } = await supabase.from('profiles').select('id').eq('email', dummyEmail).single();
          if (ep) await supabase.from('org_chart_positions').update({ user_id: ep.id }).eq('id', pos.id);
        }
      }
      toast.success('Demo data προστέθηκαν!');
      fetchData();
    } catch { toast.error('Σφάλμα'); } finally { setLoadingDummyData(false); }
  };

  // Gap stats
  const stats = useMemo(() => {
    const total = positions.length;
    const filled = positions.filter(p => p.user_id).length;
    const departments = new Set(positions.map(p => p.department).filter(Boolean)).size;
    return { total, filled, vacant: total - filled, departments };
  }, [positions]);

  // Render hierarchy tree recursively
  const renderNode = (node: OrgPosition): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center" data-node-id={node.id}>
        <OrgNodeCard
          node={node}
          isExpanded={isExpanded}
          canEdit={canEdit}
          childCount={childCountMap.get(node.id) || 0}
          onClick={handleNodeClick}
          onToggleExpand={toggleExpand}
          onEdit={openEditDialog}
          onAddChild={openCreateDialog}
          onDelete={handleDelete}
        />
        {hasChildren && isExpanded && (
          <div className="flex gap-10 mt-2 pt-2">
            {node.children!.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (!isCompanyAdmin && !isManager) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardHeader>
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Δεν έχετε πρόσβαση</CardTitle>
            <CardDescription>Μόνο Admins και Managers μπορούν να δουν το οργανόγραμμα.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 lg:p-8 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <Network className="h-5 w-5 text-foreground" />
              </div>
              Οργανόγραμμα
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {company?.name} • {stats.total} θέσεις · {stats.filled} στελεχωμένες · {stats.vacant} κενές · {stats.departments} τμήματα
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="h-9">
                <TabsTrigger value="hierarchy" className="gap-1.5 text-xs px-3">
                  <GitBranch className="h-3.5 w-3.5" />
                  Ιεραρχία
                </TabsTrigger>
                <TabsTrigger value="department" className="gap-1.5 text-xs px-3">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Τμήματα
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5 text-xs px-3">
                  <List className="h-3.5 w-3.5" />
                  Λίστα
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={addDummyUsers} disabled={loadingDummyData || positions.length === 0}>
                  {loadingDummyData ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  <span className="ml-1.5 hidden sm:inline">Demo</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
                  <Wand2 className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Wizard</span>
                </Button>
                <Button size="sm" onClick={() => openCreateDialog()}>
                  <Plus className="h-4 w-4" />
                  <span className="ml-1.5 hidden sm:inline">Νέα Θέση</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : positions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Δεν υπάρχει οργανόγραμμα</h3>
              <p className="text-muted-foreground mb-4">Ξεκινήστε με τον Wizard ή προσθέστε μια θέση χειροκίνητα.</p>
              <div className="flex gap-2">
                {canEdit && (
                  <>
                    <Button variant="outline" onClick={() => setWizardOpen(true)}>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Wizard
                    </Button>
                    <Button onClick={() => openCreateDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Νέα Θέση
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'hierarchy' && (
              <OrgChartCanvas className="min-h-[calc(100vh-220px)]">
                <div ref={treeContainerRef} className="relative inline-flex flex-col items-center gap-4 p-12">
                  <OrgConnectors lines={connectorLines} containerRef={treeContainerRef} />
                  {tree.map(node => renderNode(node))}
                </div>
              </OrgChartCanvas>
            )}
            {viewMode === 'department' && (
              <OrgDepartmentView positions={positions} onNodeClick={handleNodeClick} />
            )}
            {viewMode === 'list' && (
              <OrgListView positions={positions} onNodeClick={handleNodeClick} />
            )}
          </>
        )}

        {/* Detail Panel */}
        <OrgDetailPanel
          position={selectedNode}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          childCount={selectedNode ? (childCountMap.get(selectedNode.id) || 0) : 0}
          canEdit={canEdit}
          onEdit={(node) => { setDetailOpen(false); openEditDialog(node); }}
          onAddChild={(id) => { setDetailOpen(false); openCreateDialog(id); }}
          onDelete={handleDelete}
        />

        {/* Edit/Create Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPosition ? 'Επεξεργασία Θέσης' : 'Νέα Θέση'}</DialogTitle>
              <DialogDescription>
                {editingPosition ? 'Τροποποιήστε τα στοιχεία της θέσης' : 'Προσθέστε μια νέα θέση στο οργανόγραμμα'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Τίτλος Θέσης *</Label>
                <Input value={positionTitle} onChange={(e) => setPositionTitle(e.target.value)} placeholder="π.χ. CEO, CTO, Developer" />
              </div>
              <div className="space-y-2">
                <Label>Τμήμα</Label>
                <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="π.χ. Engineering, Marketing" />
              </div>
              <div className="space-y-2">
                <Label>Υπάλληλος</Label>
                <Select value={selectedUserId || 'none'} onValueChange={(val) => setSelectedUserId(val === 'none' ? '' : val)}>
                  <SelectTrigger><SelectValue placeholder="Επιλέξτε χρήστη (προαιρετικό)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Κενή θέση</SelectItem>
                    {profiles.filter(p => p.id).map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Αναφέρεται σε</Label>
                <Select value={parentPositionId || 'none'} onValueChange={(val) => setParentPositionId(val === 'none' ? '' : val)}>
                  <SelectTrigger><SelectValue placeholder="Επιλέξτε ανώτερη θέση" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Καμία (top-level)</SelectItem>
                    {positions.filter(p => p.id !== editingPosition?.id).map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.position_title} {p.user?.full_name ? `(${p.user.full_name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Χρώμα</Label>
                <div className="flex gap-2">
                  {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'].map(color => (
                    <button
                      key={color}
                      className={`h-8 w-8 rounded-full border-2 transition-transform ${positionColor === color ? 'scale-110 border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setPositionColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Ακύρωση</Button>
              <Button onClick={handleSave}>{editingPosition ? 'Αποθήκευση' : 'Δημιουργία'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Wizard Dialog */}
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Οδηγός Δημιουργίας Οργανογράμματος
              </DialogTitle>
              <DialogDescription>
                Δημιουργήστε γρήγορα τη δομή της εταιρείας σας με έτοιμα templates
              </DialogDescription>
            </DialogHeader>
            {company && (
              <OrgChartWizard
                companyId={company.id}
                onComplete={() => { setWizardOpen(false); fetchData(); toast.success('Το οργανόγραμμα δημιουργήθηκε!'); }}
                onCancel={() => setWizardOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
