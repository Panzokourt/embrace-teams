import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

import { Checkbox } from '@/components/ui/checkbox';
import { 
  Settings as SettingsIcon, 
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Loader2,
  Save,
  Moon,
  Sun,
  Monitor,
  Key,
  Clock,
  FolderTree,
  LayoutGrid
} from 'lucide-react';
import { ProjectCategoriesManager } from '@/components/settings/ProjectCategoriesManager';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmailAccountSetup } from '@/components/settings/EmailAccountSetup';

const DAY_LABELS = ['Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο', 'Κυριακή'];
const DEFAULT_SCHEDULE = DAY_LABELS.map((_, i) => ({
  day_of_week: i,
  start_time: '09:00',
  end_time: '17:00',
  is_working_day: i < 5,
}));

function WorkScheduleCard() {
  const { user, company } = useAuth();
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('work_schedules').select('*').eq('user_id', user.id).then(({ data }) => {
      if (data && data.length > 0) {
        const merged = DEFAULT_SCHEDULE.map(def => {
          const found = data.find((d: any) => d.day_of_week === def.day_of_week);
          return found ? {
            day_of_week: found.day_of_week,
            start_time: (found as any).start_time?.substring(0, 5) || def.start_time,
            end_time: (found as any).end_time?.substring(0, 5) || def.end_time,
            is_working_day: (found as any).is_working_day ?? def.is_working_day,
          } : def;
        });
        setSchedule(merged);
      }
      setLoaded(true);
    });
  }, [user]);

  const updateDay = (idx: number, field: string, value: any) => {
    setSchedule(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const totalWeeklyHours = schedule.reduce((acc, s) => {
    if (!s.is_working_day) return acc;
    const [sh, sm] = s.start_time.split(':').map(Number);
    const [eh, em] = s.end_time.split(':').map(Number);
    return acc + (eh * 60 + em - sh * 60 - sm) / 60;
  }, 0);

  const handleSave = async () => {
    if (!user || !company) return;
    setSaving(true);
    try {
      for (const s of schedule) {
        await supabase.from('work_schedules').upsert({
          user_id: user.id,
          company_id: company.id,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
          is_working_day: s.is_working_day,
        }, { onConflict: 'user_id,day_of_week' });
      }
      toast.success('Το ωράριο αποθηκεύτηκε!');
    } catch {
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <CardTitle>Ωράριο Εργασίας</CardTitle>
        </div>
        <CardDescription>
          Ορίστε τις ημέρες και ώρες που εργάζεστε
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {schedule.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-32">
                <Checkbox
                  checked={s.is_working_day}
                  onCheckedChange={(v) => updateDay(i, 'is_working_day', !!v)}
                />
                <span className={cn('text-sm', !s.is_working_day && 'text-muted-foreground line-through')}>
                  {DAY_LABELS[i]}
                </span>
              </div>
              <Input
                type="time"
                value={s.start_time}
                onChange={(e) => updateDay(i, 'start_time', e.target.value)}
                disabled={!s.is_working_day}
                className="w-28 h-8 text-xs"
              />
              <span className="text-muted-foreground text-xs">—</span>
              <Input
                type="time"
                value={s.end_time}
                onChange={(e) => updateDay(i, 'end_time', e.target.value)}
                disabled={!s.is_working_day}
                className="w-28 h-8 text-xs"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm text-muted-foreground">
            Σύνολο: <strong>{totalWeeklyHours.toFixed(1)}</strong> ώρες/εβδομάδα
          </span>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Αποθήκευση
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { profile, isAdmin, user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [treeMode, setTreeMode] = useState(() => localStorage.getItem('sidebar-project-tree-mode') || 'auto');
  const [changingPassword, setChangingPassword] = useState(false);

  // Profile settings
  const [fullName, setFullName] = useState('');

  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification settings (local state for now)
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Το προφίλ ενημερώθηκε!');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Σφάλμα κατά την αποθήκευση');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Οι κωδικοί δεν ταιριάζουν');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;

      toast.success('Ο κωδικός άλλαξε επιτυχώς!');
      setPasswordDialogOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Σφάλμα κατά την αλλαγή κωδικού');
    } finally {
      setChangingPassword(false);
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'Ενεργός';
      case 'pending': return 'Εκκρεμεί';
      case 'inactive': return 'Ανενεργός';
      default: return status;
    }
  };

  const getStatusStyle = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20';
      case 'pending': return 'bg-warning/10 text-warning border-warning/20';
      case 'inactive': return 'bg-muted text-muted-foreground';
      default: return '';
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        icon={SettingsIcon}
        title="Ρυθμίσεις"
        subtitle="Διαχείριση λογαριασμού και προτιμήσεων"
        breadcrumbs={[{ label: 'Ρυθμίσεις' }]}
      />

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Προφίλ</CardTitle>
          </div>
          <CardDescription>
            Διαχειριστείτε τα στοιχεία του λογαριασμού σας
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Ονοματεπώνυμο</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Το όνομά σας"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label>Κατάσταση:</Label>
            <Badge variant="outline" className={getStatusStyle(profile?.status)}>
              {getStatusLabel(profile?.status)}
            </Badge>
          </div>

          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Αποθήκευση
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Εμφάνιση</CardTitle>
          </div>
          <CardDescription>
            Προσαρμόστε την εμφάνιση της εφαρμογής
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Θέμα</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-5 w-5" />
                <span className="text-xs">Light</span>
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">Dark</span>
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-xs">System</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Τρέχον θέμα: {resolvedTheme === 'dark' ? 'Σκούρο' : 'Φωτεινό'}
           </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Οργάνωση Έργων στο Sidebar</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={treeMode === 'auto' ? 'default' : 'outline'}
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => {
                  localStorage.setItem('sidebar-project-tree-mode', 'auto');
                  setTreeMode('auto');
                  toast.success('Αυτόματη οργάνωση ενεργοποιήθηκε');
                  window.dispatchEvent(new Event('storage'));
                }}
              >
                <FolderTree className="h-5 w-5" />
                <span className="text-xs">Αυτόματη</span>
              </Button>
              <Button
                variant={treeMode === 'manual' ? 'default' : 'outline'}
                className="flex flex-col gap-2 h-auto py-4"
                onClick={() => {
                  localStorage.setItem('sidebar-project-tree-mode', 'manual');
                  setTreeMode('manual');
                  toast.success('Χειροκίνητη οργάνωση ενεργοποιήθηκε');
                  window.dispatchEvent(new Event('storage'));
                }}
              >
                <LayoutGrid className="h-5 w-5" />
                <span className="text-xs">Χειροκίνητη</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Αυτόματη: Κατηγορία → Πελάτης → Έργα. Χειροκίνητη: Δικοί σας φάκελοι με drag & drop.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Ειδοποιήσεις</CardTitle>
          </div>
          <CardDescription>
            Ρυθμίστε πώς θέλετε να λαμβάνετε ειδοποιήσεις
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Ειδοποιήσεις</Label>
              <p className="text-sm text-muted-foreground">
                Λήψη ειδοποιήσεων μέσω email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Υπενθυμίσεις Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Ειδοποιήσεις για επερχόμενα deadlines
              </p>
            </div>
            <Switch
              checked={taskReminders}
              onCheckedChange={setTaskReminders}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ενημερώσεις Έργων</Label>
              <p className="text-sm text-muted-foreground">
                Ειδοποιήσεις για αλλαγές σε έργα
              </p>
            </div>
            <Switch
              checked={projectUpdates}
              onCheckedChange={setProjectUpdates}
            />
          </div>
        </CardContent>
      </Card>

      {/* Admin Only - Company Settings */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle>Ρυθμίσεις Εταιρείας</CardTitle>
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                Admin Only
              </Badge>
            </div>
            <CardDescription>
              Γενικές ρυθμίσεις για την εταιρεία
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="companyName">Επωνυμία Εταιρείας</Label>
                <Input
                  id="companyName"
                  placeholder="Agency Name"
                  defaultValue="Agency Command Center"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultFee">Default Agency Fee (%)</Label>
                <Input
                  id="defaultFee"
                  type="number"
                  placeholder="30"
                  defaultValue="30"
                />
              </div>
            </div>

            <Button disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Αποθήκευση
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Ασφάλεια</CardTitle>
          </div>
          <CardDescription>
            Διαχείριση κωδικού πρόσβασης
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
            <Key className="h-4 w-4 mr-2" />
            Αλλαγή Κωδικού
          </Button>
        </CardContent>
      </Card>

      {/* Project Categories (Admin only) */}
      {isAdmin && <ProjectCategoriesManager />}

      {/* Email / Inbox */}
      <EmailAccountSetup />

      {/* Work Schedule */}
      <WorkScheduleCard />

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Αλλαγή Κωδικού</DialogTitle>
            <DialogDescription>
              Εισάγετε τον νέο σας κωδικό πρόσβασης
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Νέος Κωδικός</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Επιβεβαίωση Κωδικού</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Ακύρωση
              </Button>
              <Button type="submit" disabled={changingPassword}>
                {changingPassword && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Αλλαγή Κωδικού
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
