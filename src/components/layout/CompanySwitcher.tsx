import { useState } from 'react';
import { Building2, ChevronDown, Plus, Check } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import CreateCompanyDialog from './CreateCompanyDialog';

interface CompanySwitcherProps {
  compact?: boolean;
  iconOnly?: boolean;
}

export default function CompanySwitcher({ compact, iconOnly }: CompanySwitcherProps) {
  const { company, allCompanies, switchCompany } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);

  const handleSwitch = (companyId: string) => {
    if (companyId !== company?.id) {
      switchCompany(companyId);
      // Force reload to reset all data contexts
      window.location.reload();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 h-8 max-w-[200px] shrink-0",
              compact && "max-w-[140px] px-1.5",
              iconOnly && "h-9 w-9 p-0 max-w-none"
            )}>
            
            {company?.logo_url ?
            <img src={company.logo_url} alt="" className="h-4 w-4 rounded-sm object-contain shrink-0" /> :

            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground bg-inherit" />
            }
            {!iconOnly && <span className="truncate text-xs font-medium">{company?.name || 'Εταιρεία'}</span>}
            {!iconOnly && <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          {allCompanies.map((c) =>
          <DropdownMenuItem
            key={c.id}
            onClick={() => handleSwitch(c.id)}
            className="gap-2 cursor-pointer">
            
              {c.logo_url ?
            <img src={c.logo_url} alt="" className="h-4 w-4 rounded-sm object-contain shrink-0" /> :

            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            }
              <span className="truncate text-sm">{c.name}</span>
              {c.id === company?.id &&
            <Check className="h-3.5 w-3.5 ml-auto shrink-0 text-primary" />
            }
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateOpen(true)} className="gap-2 cursor-pointer text-muted-foreground">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="text-sm">Νέα εταιρεία</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateCompanyDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>);

}