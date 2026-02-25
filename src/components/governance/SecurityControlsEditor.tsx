import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RiskBadge } from './RiskBadge';
import { calculateRisk, type GovSecurityControl } from '@/hooks/useGovernance';

interface Props {
  controls: Partial<GovSecurityControl> | null;
  assetId: string;
  companyId: string;
  onSave: (data: Partial<GovSecurityControl> & { company_id: string; asset_id: string }) => void;
}

export function SecurityControlsEditor({ controls, assetId, companyId, onSave }: Props) {
  const [form, setForm] = useState({
    mfa_enabled: controls?.mfa_enabled ?? false,
    mfa_method: controls?.mfa_method ?? 'none',
    backup_admin_present: controls?.backup_admin_present ?? false,
    personal_login_used: controls?.personal_login_used ?? false,
    recovery_email: controls?.recovery_email ?? '',
    recovery_phone: controls?.recovery_phone ?? '',
    last_password_change_date: controls?.last_password_change_date ?? '',
    password_rotation_policy: controls?.password_rotation_policy ?? 'none',
  });

  const risk = calculateRisk(form);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Security Controls</CardTitle>
        <RiskBadge level={risk.risk_level} score={risk.risk_score} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label>MFA Enabled</Label>
            <Switch checked={form.mfa_enabled} onCheckedChange={v => setForm(f => ({ ...f, mfa_enabled: v }))} />
          </div>
          <div className="space-y-1">
            <Label>MFA Method</Label>
            <Select value={form.mfa_method} onValueChange={v => setForm(f => ({ ...f, mfa_method: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="app">Authenticator App</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <Label>Backup Admin</Label>
            <Switch checked={form.backup_admin_present} onCheckedChange={v => setForm(f => ({ ...f, backup_admin_present: v }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Personal Login Used</Label>
            <Switch checked={form.personal_login_used} onCheckedChange={v => setForm(f => ({ ...f, personal_login_used: v }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Recovery Email</Label>
            <Input value={form.recovery_email} onChange={e => setForm(f => ({ ...f, recovery_email: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Recovery Phone</Label>
            <Input value={form.recovery_phone} onChange={e => setForm(f => ({ ...f, recovery_phone: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Last Password Change</Label>
            <Input type="date" value={form.last_password_change_date} onChange={e => setForm(f => ({ ...f, last_password_change_date: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Rotation Policy</Label>
            <Select value={form.password_rotation_policy} onValueChange={v => setForm(f => ({ ...f, password_rotation_policy: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">180 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => onSave({ ...form, company_id: companyId, asset_id: assetId })}>
          Αποθήκευση Security Controls
        </Button>
      </CardContent>
    </Card>
  );
}
