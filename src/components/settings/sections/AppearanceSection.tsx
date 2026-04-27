import { useTheme } from '@/contexts/ThemeContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sun, Moon, Monitor } from 'lucide-react';

export function AppearanceSection() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <Label>Θέμα</Label>
        <div className="grid grid-cols-3 gap-3">
          <Button variant={theme === 'light' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => setTheme('light')}>
            <Sun className="h-5 w-5" />
            <span className="text-xs">Light</span>
          </Button>
          <Button variant={theme === 'dark' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => setTheme('dark')}>
            <Moon className="h-5 w-5" />
            <span className="text-xs">Dark</span>
          </Button>
          <Button variant={theme === 'system' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => setTheme('system')}>
            <Monitor className="h-5 w-5" />
            <span className="text-xs">System</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Τρέχον θέμα: {resolvedTheme === 'dark' ? 'Σκούρο' : 'Φωτεινό'}
        </p>
      </CardContent>
    </Card>
  );
}
