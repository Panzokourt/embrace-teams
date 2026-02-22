import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Plus, 
  Building2, 
  Users, 
  Edit, 
  Trash2, 
  Loader2,
  Crown,
  ChevronRight,
  FolderTree,
  UserPlus,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { EditDeleteActions } from '@/components/dialogs/EditDeleteActions';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Department {
  id: string;
  name: string;
  description: string | null;
  color: string;
  head_user_id: string | null;
  parent_department_id: string | null;
  company_id: string;
  created_at: string;
  head?: Profile | null;
  parent?: Department | null;
  members_count?: number;
  children?: Department[];
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  department_id: string | null;
}

const DEPARTMENT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

export default function DepartmentsPage() {
  const { isAdmin, isManager, company } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [managingDepartment, setManagingDepartment] = useState<Department | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEPARTMENT_COLORS[0]);
  const [headUserId, setHeadUserId] = useState<string>('none');
  const [parentDepartmentId, setParentDepartmentId] = useState<string>('none');

  const canManage = isAdmin || isManager;

  const fetchDepartments = useCallback(async () => {
    if (!company?.id) return;
    
    try {
      // Fetch departments
      const { data: depts, error } = await supabase
        .from('departments')
        .select('*')
        .eq('company_id', company.id)
        .order('name');

      if (error) throw error;

      // Fetch profiles for heads and member counts
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, department_id');

      if (profs) {
        setProfiles(profs);
      }

      // Enrich departments with head info and member counts
      const enrichedDepts = (depts || []).map(dept => {
        const head = profs?.find(p => p.id === dept.head_user_id);
        const parent = depts?.find(d => d.id === dept.parent_department_id);
        const members_count = profs?.filter(p => p.department_id === dept.id).length || 0;
        return { ...dept, head, parent, members_count };
      });

      // Build tree structure
      const rootDepts = enrichedDepts.filter(d => !d.parent_department_id);
      const buildTree = (parent: Department): Department => {
        const children = enrichedDepts.filter(d => d.parent_department_id === parent.id);
        return { ...parent, children: children.map(buildTree) };
      };

      setDepartments(rootDepts.map(buildTree));
    } catch (error: any) {
      console.error('Error fetching departments:', error);
      toast.error('Σφάλμα κατά τη φόρτωση τμημάτων');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setColor(DEPARTMENT_COLORS[0]);
    setHeadUserId('none');
    setParentDepartmentId('none');
    setEditingDepartment(null);
  };

  const handleEdit = (dept: Department) => {
    setEditingDepartment(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setColor(dept.color);
    setHeadUserId(dept.head_user_id || 'none');
    setParentDepartmentId(dept.parent_department_id || 'none');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company?.id) return;

    setSaving(true);
    try {
      const deptData = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        head_user_id: headUserId === 'none' ? null : headUserId,
        parent_department_id: parentDepartmentId === 'none' ? null : parentDepartmentId,
        company_id: company.id,
      };

      if (editingDepartment) {
        const { error } = await supabase
          .from('departments')
          .update(deptData)
          .eq('id', editingDepartment.id);

        if (error) throw error;
        toast.success('Το τμήμα ενημερώθηκε');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert(deptData);

        if (error) throw error;
        toast.success('Το τμήμα δημιουργήθηκε');
      }

      setDialogOpen(false);
      resetForm();
      fetchDepartments();
    } catch (error: any) {
      console.error('Error saving department:', error);
      toast.error(error.message || 'Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDepartment) return;

    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', deletingDepartment.id);

      if (error) throw error;

      toast.success('Το τμήμα διαγράφηκε');
      setDeleteDialogOpen(false);
      setDeletingDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      console.error('Error deleting department:', error);
      toast.error(error.message || 'Σφάλμα κατά τη διαγραφή');
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleManageMembers = (dept: Department) => {
    setManagingDepartment(dept);
    const currentMembers = profiles.filter(p => p.department_id === dept.id).map(p => p.id);
    setSelectedMembers(currentMembers);
    setMembersDialogOpen(true);
  };

  const handleSaveMembers = async () => {
    if (!managingDepartment) return;
    setSaving(true);

    try {
      // Get current members of this department
      const currentMembers = profiles.filter(p => p.department_id === managingDepartment.id);
      
      // Remove users that are no longer selected
      for (const member of currentMembers) {
        if (!selectedMembers.includes(member.id)) {
          await supabase
            .from('profiles')
            .update({ department_id: null })
            .eq('id', member.id);
        }
      }
      
      // Add newly selected users
      for (const userId of selectedMembers) {
        const currentDept = profiles.find(p => p.id === userId)?.department_id;
        if (currentDept !== managingDepartment.id) {
          await supabase
            .from('profiles')
            .update({ department_id: managingDepartment.id })
            .eq('id', userId);
        }
      }

      toast.success('Τα μέλη ενημερώθηκαν');
      setMembersDialogOpen(false);
      setManagingDepartment(null);
      fetchDepartments();
    } catch (error: any) {
      console.error('Error saving members:', error);
      toast.error(error.message || 'Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Get flat list of all departments for parent selection
  const getAllDepartments = useCallback((): Department[] => {
    const flat: Department[] = [];
    const traverse = (depts: Department[]) => {
      depts.forEach(d => {
        flat.push(d);
        if (d.children) traverse(d.children);
      });
    };
    traverse(departments);
    return flat;
  }, [departments]);

  const renderDepartmentCard = (dept: Department, level: number = 0) => (
    <div key={dept.id} style={{ marginLeft: level * 24 }}>
      <Card className="mb-3 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: dept.color }}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{dept.name}</h3>
                  {dept.parent && (
                    <Badge variant="outline" className="text-xs">
                      <FolderTree className="h-3 w-3 mr-1" />
                      {dept.parent.name}
                    </Badge>
                  )}
                </div>
                {dept.description && (
                  <p className="text-sm text-muted-foreground">{dept.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Head */}
              {dept.head ? (
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={dept.head.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(dept.head.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {dept.head.full_name || dept.head.email}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Χωρίς επικεφαλή</span>
              )}

              {/* Member count - clickable to manage */}
              <Button
                variant="secondary"
                size="sm"
                className="gap-1"
                onClick={() => handleManageMembers(dept)}
              >
                <Users className="h-3 w-3" />
                {dept.members_count} μέλη
                {canManage && <UserPlus className="h-3 w-3 ml-1" />}
              </Button>

              {/* Actions */}
              {canManage && (
                <EditDeleteActions
                  onEdit={() => handleEdit(dept)}
                  onDelete={() => {
                    setDeletingDepartment(dept);
                    setDeleteDialogOpen(true);
                  }}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Render children */}
      {dept.children && dept.children.length > 0 && (
        <div className="border-l-2 border-muted ml-5 pl-4">
          {dept.children.map(child => renderDepartmentCard(child, level + 1))}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Τμήματα</h1>
          <p className="text-muted-foreground">
            Διαχείριση τμημάτων και οργανωτικής δομής
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Νέο Τμήμα
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-muted rounded-lg">
              <Building2 className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{getAllDepartments().length}</p>
              <p className="text-sm text-muted-foreground">Συνολικά Τμήματα</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg">
              <Crown className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {getAllDepartments().filter(d => d.head_user_id).length}
              </p>
              <p className="text-sm text-muted-foreground">Με Επικεφαλή</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {profiles.filter(p => p.department_id).length}
              </p>
              <p className="text-sm text-muted-foreground">Χρήστες σε Τμήματα</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Departments Tree */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Οργανόγραμμα Τμημάτων
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Δεν υπάρχουν τμήματα</h3>
              <p className="text-muted-foreground mb-4">
                Δημιουργήστε το πρώτο τμήμα για να οργανώσετε την ομάδα σας
              </p>
              {canManage && (
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Δημιουργία Τμήματος
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {departments.map(dept => renderDepartmentCard(dept))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? 'Επεξεργασία Τμήματος' : 'Νέο Τμήμα'}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment 
                ? 'Ενημερώστε τα στοιχεία του τμήματος'
                : 'Δημιουργήστε ένα νέο τμήμα στην εταιρεία σας'
              }
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Όνομα Τμήματος *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="π.χ. Marketing"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Περιγραφή</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Σύντομη περιγραφή του τμήματος..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Χρώμα</Label>
              <div className="flex gap-2 flex-wrap">
                {DEPARTMENT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-lg transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Επικεφαλής Τμήματος</Label>
              <Select value={headUserId} onValueChange={setHeadUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε επικεφαλή" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένας</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(profile.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        {profile.full_name || profile.email}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Γονικό Τμήμα</Label>
              <Select value={parentDepartmentId} onValueChange={setParentDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε γονικό τμήμα" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Κανένα (Root)</SelectItem>
                  {getAllDepartments()
                    .filter(d => d.id !== editingDepartment?.id)
                    .map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: dept.color }}
                          />
                          {dept.name}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingDepartment ? 'Αποθήκευση' : 'Δημιουργία'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Τμήματος</AlertDialogTitle>
            <AlertDialogDescription>
              Είστε σίγουροι ότι θέλετε να διαγράψετε το τμήμα "{deletingDepartment?.name}";
              Τα μέλη του τμήματος θα παραμείνουν χωρίς τμήμα.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={(open) => {
        setMembersDialogOpen(open);
        if (!open) {
          setManagingDepartment(null);
          setSelectedMembers([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {managingDepartment && (
                <div 
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: managingDepartment.color }}
                >
                  <Users className="h-4 w-4 text-white" />
                </div>
              )}
              Μέλη Τμήματος
            </DialogTitle>
            <DialogDescription>
              {managingDepartment?.name} - Επιλέξτε τους χρήστες που ανήκουν σε αυτό το τμήμα
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-80 pr-4">
            <div className="space-y-1">
              {profiles.map(profile => {
                const isSelected = selectedMembers.includes(profile.id);
                const currentDept = profile.department_id 
                  ? getAllDepartments().find(d => d.id === profile.department_id)
                  : null;
                const isInOtherDept = currentDept && currentDept.id !== managingDepartment?.id;

                return (
                  <label 
                    key={profile.id} 
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-muted' : 'hover:bg-secondary'
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleMember(profile.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {profile.full_name || profile.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {profile.email}
                      </p>
                    </div>
                    {isInOtherDept && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {currentDept.name}
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedMembers.length} επιλεγμένα
            </span>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setMembersDialogOpen(false)}
              >
                Ακύρωση
              </Button>
              <Button onClick={handleSaveMembers} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Αποθήκευση
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
