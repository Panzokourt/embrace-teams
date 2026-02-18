import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
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
import { ProjectTemplatesManager } from '@/components/settings/ProjectTemplatesManager';
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
  Key
} from 'lucide-react';

export default function SettingsPage() {
  const { profile, isAdmin, user } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
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
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon className="h-8 w-8" />
          Ρυθμίσεις
        </h1>
        <p className="text-muted-foreground mt-1">
          Διαχείριση λογαριασμού και προτιμήσεων
        </p>
      </div>

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

      {/* Project Templates - Admin Only */}
      {isAdmin && <ProjectTemplatesManager />}

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
