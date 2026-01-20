import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
  Sun
} from 'lucide-react';

export default function SettingsPage() {
  const { profile, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);

  // Profile settings
  const [fullName, setFullName] = useState(profile?.full_name || '');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);

  // Theme settings
  const [darkMode, setDarkMode] = useState(true);

  const handleSaveProfile = async () => {
    setSaving(true);
    // Simulated save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success('Οι ρυθμίσεις αποθηκεύτηκαν!');
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
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
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              {profile?.status === 'active' ? 'Ενεργός' : profile?.status}
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
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                {darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                Dark Mode
              </Label>
              <p className="text-sm text-muted-foreground">
                Χρήση σκούρου θέματος
              </p>
            </div>
            <Switch
              checked={darkMode}
              onCheckedChange={setDarkMode}
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
          <Button variant="outline">
            Αλλαγή Κωδικού
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
