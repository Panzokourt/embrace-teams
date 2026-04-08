import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Timer, Bot, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CCQuickActionsProps {
  isAdmin: boolean;
  isManager: boolean;
  isMember: boolean;
}

export default function CCQuickActions({ isAdmin, isManager, isMember }: CCQuickActionsProps) {
  const navigate = useNavigate();

  const actions = [
    ...(isAdmin || isManager ? [
      { label: 'Νέο Project', icon: FolderKanban, onClick: () => navigate('/work?tab=projects&action=new') },
      { label: 'Νέος Client', icon: Building2, onClick: () => navigate('/clients?action=new') },
    ] : []),
    ...(isAdmin || isManager || isMember ? [
      { label: 'Νέο Task', icon: Plus, onClick: () => navigate('/work?tab=tasks&action=new') },
      { label: 'Start Timer', icon: Timer, onClick: () => navigate('/timesheets') },
    ] : []),
    { label: 'Secretary', icon: Bot, onClick: () => navigate('/secretary') },
  ];

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap py-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          onClick={action.onClick}
          className="rounded-full border-border/40 bg-card/80 backdrop-blur-sm hover:bg-primary/10
            hover:border-primary/30 hover:shadow-[0_0_12px_hsl(var(--primary)/0.1)] transition-all duration-300
            gap-1.5 text-xs"
        >
          <action.icon className="h-3.5 w-3.5" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
