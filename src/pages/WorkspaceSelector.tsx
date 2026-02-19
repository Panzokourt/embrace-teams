import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, LogOut } from 'lucide-react';
import olsenyLogo from '@/assets/olseny-logo.png';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
  billing: 'Billing'
};

export default function WorkspaceSelector() {
  const navigate = useNavigate();
  const { allCompanyRoles, allCompanies, switchCompany, signOut } = useAuth();

  const activeRoles = allCompanyRoles.filter(r => r.status === 'active');

  const handleSelect = (companyId: string) => {
    switchCompany(companyId);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <img src={olsenyLogo} alt="Olseny" className="h-10 w-10 rounded-lg" />
          <span className="text-2xl font-bold text-foreground">OLSENY</span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Επιλέξτε workspace</h1>
          <p className="text-muted-foreground mt-1">Σε ποια εταιρεία θέλετε να εργαστείτε;</p>
        </div>

        <div className="space-y-3">
          {activeRoles.map((role) => {
            const company = allCompanies.find(c => c.id === role.company_id);
            if (!company) return null;

            return (
              <Card
                key={role.id}
                className="cursor-pointer hover:border-primary/40 transition-colors border-border/40"
                onClick={() => handleSelect(company.id)}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={company.logo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary rounded-xl">
                      <Building2 className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{company.name}</p>
                    <p className="text-sm text-muted-foreground">{company.domain}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {ROLE_LABELS[role.role] || role.role}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1 gap-2" onClick={() => navigate('/onboarding')}>
            <Plus className="h-4 w-4" />Νέα εταιρεία
          </Button>
          <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />Αποσύνδεση
          </Button>
        </div>
      </div>
    </div>
  );
}
