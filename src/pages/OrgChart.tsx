import { useState, useEffect, useCallback } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Network, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Building2, Users, Loader2, MoreVertical, ZoomIn, ZoomOut, 
  Download, Wand2, Shield, GripVertical, Database
} from 'lucide-react';
import { OrgChartWizard } from '@/components/org-chart/OrgChartWizard';

interface OrgPosition {
  id: string;
  company_id: string;
  user_id: string | null;
  parent_position_id: string | null;
  position_title: string;
  department: string | null;
  level: number;
  sort_order: number;
  color: string;
  user?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
  children?: OrgPosition[];
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export default function OrgChartPage() {
  const { isCompanyAdmin, company, isManager } = useAuth();
  const [positions, setPositions] = useState<OrgPosition[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<OrgPosition | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingDummyData, setLoadingDummyData] = useState(false);

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
        supabase
          .from('org_chart_positions')
          .select('*')
          .eq('company_id', company.id)
          .order('level', { ascending: true })
          .order('sort_order', { ascending: true }),
        supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
      ]);

      if (positionsRes.error) throw positionsRes.error;
      
      // Fetch user data for positions
      const userIds = positionsRes.data?.filter(p => p.user_id).map(p => p.user_id) || [];
      let usersMap = new Map<string, Profile>();
      
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url')
          .in('id', userIds);
        
        usersData?.forEach(u => usersMap.set(u.id, u));
      }

      const positionsWithUsers = (positionsRes.data || []).map(p => ({
        ...p,
        user: p.user_id ? usersMap.get(p.user_id) : undefined
      }));

      setPositions(positionsWithUsers);
      setProfiles(profilesRes.data || []);
      
      // Expand all by default
      setExpandedNodes(new Set(positionsWithUsers.map(p => p.id)));
    } catch (error) {
      console.error('Error fetching org chart:', error);
      toast.error('Σφάλμα κατά τη φόρτωση');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buildTree = (positions: OrgPosition[]): OrgPosition[] => {
    const map = new Map<string, OrgPosition>();
    const roots: OrgPosition[] = [];

    positions.forEach(p => {
      map.set(p.id, { ...p, children: [] });
    });

    positions.forEach(p => {
      const node = map.get(p.id)!;
      if (p.parent_position_id && map.has(p.parent_position_id)) {
        map.get(p.parent_position_id)!.children!.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const tree = buildTree(positions);

  const openCreateDialog = (parentId?: string) => {
    setEditingPosition(null);
    setPositionTitle('');
    setDepartment('');
    setSelectedUserId('');
    setParentPositionId(parentId || '');
    setPositionColor('#3B82F6');
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
    if (!company || !positionTitle.trim()) {
      toast.error('Συμπληρώστε τον τίτλο θέσης');
      return;
    }

    try {
      const data = {
        company_id: company.id,
        position_title: positionTitle.trim(),
        department: department.trim() || null,
        user_id: selectedUserId || null,
        parent_position_id: parentPositionId || null,
        color: positionColor,
        level: parentPositionId ? (positions.find(p => p.id === parentPositionId)?.level || 0) + 1 : 0
      };

      if (editingPosition) {
        const { error } = await supabase
          .from('org_chart_positions')
          .update(data)
          .eq('id', editingPosition.id);
        if (error) throw error;
        toast.success('Η θέση ενημερώθηκε');
      } else {
        const { error } = await supabase
          .from('org_chart_positions')
          .insert(data);
        if (error) throw error;
        toast.success('Η θέση δημιουργήθηκε');
      }

      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving position:', error);
      toast.error(error.message || 'Σφάλμα κατά την αποθήκευση');
    }
  };

  const handleDelete = async (positionId: string) => {
    if (!confirm('Είστε σίγουροι; Θα διαγραφούν και οι υποθέσεις.')) return;

    try {
      const { error } = await supabase
        .from('org_chart_positions')
        .delete()
        .eq('id', positionId);
      if (error) throw error;
      toast.success('Η θέση διαγράφηκε');
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή');
    }
  };

  const toggleExpand = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Dummy names for demo
  const DUMMY_NAMES = [
    'Αλέξανδρος Παπαδόπουλος', 'Μαρία Γεωργίου', 'Νίκος Κωνσταντίνου',
    'Ελένη Αντωνίου', 'Γιώργος Δημητρίου', 'Κατερίνα Νικολάου',
    'Δημήτρης Βασιλείου', 'Σοφία Παναγιώτου', 'Χρήστος Ιωάννου',
    'Αναστασία Χριστοδούλου', 'Θάνος Μιχαήλ', 'Εύα Σταματίου'
  ];

  const addDummyUsers = async () => {
    if (!company || positions.length === 0) {
      toast.error('Δεν υπάρχουν θέσεις για να προστεθούν dummy χρήστες');
      return;
    }
    
    setLoadingDummyData(true);
    
    try {
      // Create dummy profiles and assign to positions
      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const dummyName = DUMMY_NAMES[i % DUMMY_NAMES.length];
        const dummyEmail = `dummy${i + 1}@${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
        
        // Insert dummy profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: crypto.randomUUID(),
            email: dummyEmail,
            full_name: dummyName,
            status: 'active'
          }, { onConflict: 'email' })
          .select('id')
          .single();
        
        if (profileError) {
          console.log('Profile might exist:', profileError);
          // Try to find existing
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', dummyEmail)
            .single();
          
          if (existingProfile) {
            await supabase
              .from('org_chart_positions')
              .update({ user_id: existingProfile.id })
              .eq('id', pos.id);
          }
        } else if (profile) {
          await supabase
            .from('org_chart_positions')
            .update({ user_id: profile.id })
            .eq('id', pos.id);
        }
      }
      
      toast.success('Οι dummy χρήστες προστέθηκαν!');
      fetchData();
    } catch (error) {
      console.error('Error adding dummy users:', error);
      toast.error('Σφάλμα κατά την προσθήκη dummy χρηστών');
    } finally {
      setLoadingDummyData(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    try {
      // Update parent_position_id when dropped on another node
      const { error } = await supabase
        .from('org_chart_positions')
        .update({ parent_position_id: over.id as string })
        .eq('id', active.id as string);
      
      if (error) throw error;
      toast.success('Η θέση μετακινήθηκε');
      fetchData();
    } catch (error: any) {
      toast.error('Σφάλμα κατά τη μετακίνηση');
    }
  };

  const getInitials = (name: string | null | undefined, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email?.slice(0, 2).toUpperCase() || '?';
  };

  const renderNode = (node: OrgPosition, depth = 0): React.ReactNode => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="flex flex-col items-center">
        {/* Card */}
        <div
          className="relative group bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow min-w-[200px] max-w-[280px]"
          style={{ borderColor: node.color + '40' }}
        >
          {/* Actions */}
          {canEdit && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(node)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Επεξεργασία
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openCreateDialog(node.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Προσθήκη υφισταμένου
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(node.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Διαγραφή
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* User Avatar or Empty */}
          <div className="flex flex-col items-center text-center">
            {node.user ? (
              <>
                <Avatar className="h-14 w-14 ring-2 ring-offset-2" style={{ '--tw-ring-color': node.color } as React.CSSProperties}>
                  <AvatarImage src={node.user.avatar_url || undefined} />
                  <AvatarFallback className="text-lg" style={{ backgroundColor: node.color + '20', color: node.color }}>
                    {getInitials(node.user.full_name, node.user.email)}
                  </AvatarFallback>
                </Avatar>
                <h4 className="font-semibold mt-2">{node.user.full_name || 'Χωρίς όνομα'}</h4>
              </>
            ) : (
              <>
                <div 
                  className="h-14 w-14 rounded-full flex items-center justify-center border-2 border-dashed"
                  style={{ borderColor: node.color + '60' }}
                >
                  <Users className="h-6 w-6" style={{ color: node.color }} />
                </div>
                <h4 className="font-semibold mt-2 text-muted-foreground italic">Κενή θέση</h4>
              </>
            )}
            <Badge variant="outline" className="mt-1" style={{ borderColor: node.color, color: node.color }}>
              {node.position_title}
            </Badge>
            {node.department && (
              <span className="text-xs text-muted-foreground mt-1">{node.department}</span>
            )}
          </div>

          {/* Expand toggle */}
          {hasChildren && (
            <button
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-secondary border flex items-center justify-center hover:bg-muted"
              onClick={() => toggleExpand(node.id)}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>

        {/* Connector line */}
        {hasChildren && isExpanded && (
          <>
            <div className="w-px h-6 bg-border" />
            <div className="flex gap-8">
              {node.children!.map((child, idx) => (
                <div key={child.id} className="flex flex-col items-center">
                  {/* Horizontal connector */}
                  {node.children!.length > 1 && (
                    <div className="relative w-full h-4">
                      <div 
                        className={`absolute top-0 h-px bg-border ${
                          idx === 0 ? 'left-1/2 right-0' : 
                          idx === node.children!.length - 1 ? 'left-0 right-1/2' : 
                          'left-0 right-0'
                        }`} 
                      />
                      <div className="absolute left-1/2 top-0 w-px h-4 bg-border -translate-x-1/2" />
                    </div>
                  )}
                  {renderNode(child, depth + 1)}
                </div>
              ))}
            </div>
          </>
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
              <Network className="h-5 w-5 text-foreground" />
            </div>
            Οργανόγραμμα
          </h1>
          <p className="text-muted-foreground mt-1">
            {company?.name} • Ιεραρχική δομή της εταιρείας
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          {canEdit && (
            <>
              <Button 
                variant="outline" 
                onClick={addDummyUsers}
                disabled={loadingDummyData || positions.length === 0}
              >
                {loadingDummyData ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                Demo Data
              </Button>
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
      </div>

      {/* Org Chart */}
      <Card className="overflow-hidden">
        <CardContent className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
          ) : tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold">Δεν υπάρχει οργανόγραμμα</h3>
              <p className="text-muted-foreground mb-4">Ξεκινήστε προσθέτοντας την πρώτη θέση.</p>
              {canEdit && (
                <Button onClick={() => openCreateDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Προσθήκη Θέσης
                </Button>
              )}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <div 
                className="flex justify-center py-8 min-w-max transition-transform origin-top"
                style={{ transform: `scale(${zoom})` }}
              >
                <div className="flex flex-col items-center gap-2">
                  {tree.map(node => renderNode(node))}
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

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
              <Input
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="π.χ. CEO, CTO, Developer"
              />
            </div>

            <div className="space-y-2">
              <Label>Τμήμα</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="π.χ. Engineering, Marketing"
              />
            </div>

            <div className="space-y-2">
              <Label>Υπάλληλος</Label>
              <Select value={selectedUserId || "none"} onValueChange={(val) => setSelectedUserId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε χρήστη (προαιρετικό)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κενή θέση</SelectItem>
                  {profiles.filter(p => p.id).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Αναφέρεται σε</Label>
              <Select value={parentPositionId || "none"} onValueChange={(val) => setParentPositionId(val === "none" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε ανώτερη θέση" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Καμία (top-level)</SelectItem>
                  {positions
                    .filter(p => p.id && p.id !== editingPosition?.id)
                    .map(p => (
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
            <Button onClick={handleSave}>
              {editingPosition ? 'Αποθήκευση' : 'Δημιουργία'}
            </Button>
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
              onComplete={() => {
                setWizardOpen(false);
                fetchData();
                toast.success('Το οργανόγραμμα δημιουργήθηκε!');
              }}
              onCancel={() => setWizardOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
