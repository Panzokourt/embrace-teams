import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export function NotificationsSection() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [taskReminders, setTaskReminders] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);

  const Row = ({ title, desc, value, onChange }: { title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) => (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>{title}</Label>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <Row title="Email Ειδοποιήσεις" desc="Λήψη ειδοποιήσεων μέσω email" value={emailNotifications} onChange={setEmailNotifications} />
        <Separator />
        <Row title="Υπενθυμίσεις Tasks" desc="Ειδοποιήσεις για επερχόμενα deadlines" value={taskReminders} onChange={setTaskReminders} />
        <Separator />
        <Row title="Ενημερώσεις Έργων" desc="Ειδοποιήσεις για αλλαγές σε έργα" value={projectUpdates} onChange={setProjectUpdates} />
      </CardContent>
    </Card>
  );
}
