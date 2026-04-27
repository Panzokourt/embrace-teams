import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  ChevronRight,
  Settings,
  LogOut,
  Palette,
  Sun,
  Moon,
  Monitor,
  Keyboard,
  HelpCircle,
  Smile,
  BellOff,
  Plus,
  Briefcase,
  Timer,
  StickyNote,
  Bell,
  Calendar as CalendarIcon,
  Users as UsersIcon,
  Building2,
  Check,
  Trash2,
} from 'lucide-react';
import { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog';
import { toast } from 'sonner';

interface UserAvatarMenuProps {
  isMobile?: boolean;
}

const STATUS_PRESETS = [
  { emoji: '🟢', label: 'Διαθέσιμος', value: 'available' },
  { emoji: '🎯', label: 'Σε focus', value: 'focus' },
  { emoji: '🍔', label: 'Σε διάλειμμα', value: 'break' },
  { emoji: '🤒', label: 'Άρρωστος', value: 'sick' },
  { emoji: '🏖️', label: 'Εκτός γραφείου', value: 'ooo' },
] as const;

const MUTE_OPTIONS = [
  { label: '15 λεπτά', minutes: 15 },
  { label: '1 ώρα', minutes: 60 },
  { label: 'Μέχρι αύριο', minutes: 60 * 16 },
  { label: 'Μέχρι να το αναιρέσω', minutes: 60 * 24 * 365 },
] as const;

const MUTE_KEY = 'notifications.mutedUntil';

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function UserAvatarMenu({ isMobile = false }: UserAvatarMenuProps) {
  const navigate = useNavigate();
  const { user, profile, signOut, allCompanies, company, switchCompany } = useAuth();
  const { theme, setTheme } = useTheme();

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [workStatus, setWorkStatus] = useState<string | null>(null);
  const [mutedUntil, setMutedUntil] = useState<number | null>(null);

  // Load current status
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('work_status')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.work_status) setWorkStatus(data.work_status);
      });
  }, [user]);

  // Load mute state
  useEffect(() => {
    const raw = localStorage.getItem(MUTE_KEY);
    if (!raw) return;
    const ts = parseInt(raw, 10);
    if (Number.isFinite(ts) && ts > Date.now()) setMutedUntil(ts);
    else localStorage.removeItem(MUTE_KEY);
  }, []);

  const goProfile = () => {
    if (user?.id) navigate(`/hr/employee/${user.id}`);
  };

  const setStatus = async (value: string | null) => {
    if (!user) return;
    setWorkStatus(value);
    await supabase
      .from('profiles')
      .update({ work_status: value ?? 'online' })
      .eq('id', user.id);
    toast.success(value ? 'Status ενημερώθηκε' : 'Status καθαρίστηκε');
  };

  const muteFor = (minutes: number) => {
    const until = Date.now() + minutes * 60 * 1000;
    localStorage.setItem(MUTE_KEY, String(until));
    setMutedUntil(until);
    toast.success(`Ειδοποιήσεις σε σίγαση για ${minutes >= 60 * 24 ? 'μεγάλο διάστημα' : MUTE_OPTIONS.find(o => o.minutes === minutes)?.label ?? `${minutes} λεπτά`}`);
  };

  const unmute = () => {
    localStorage.removeItem(MUTE_KEY);
    setMutedUntil(null);
    toast.success('Ειδοποιήσεις ενεργές');
  };

  const activeStatus = STATUS_PRESETS.find((p) => p.value === workStatus);
  const otherCompanies = allCompanies.filter((c) => c.id !== company?.id);
  const isMuted = mutedUntil !== null && mutedUntil > Date.now();

  return (
    <>
      <DropdownMenu>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className="relative flex items-center justify-center rounded-lg p-1"
                aria-label="User menu"
              >
                <Avatar
                  className={cn(
                    'h-7 w-7',
                    isMobile ? 'ring-2 ring-border/50' : 'ring-2 ring-white/20'
                  )}
                >
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback
                    className={cn(
                      'text-[10px] font-medium',
                      isMobile ? 'bg-primary/10 text-primary' : 'bg-white/15 text-white'
                    )}
                  >
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                {/* Online indicator */}
                <span
                  className={cn(
                    'absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full ring-2',
                    isMobile ? 'ring-background' : 'ring-[#0a0a0a]',
                    'bg-emerald-500'
                  )}
                />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {profile?.full_name || 'User'}
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent
          align="end"
          side="right"
          sideOffset={8}
          className="w-72 rounded-xl border-border/50 shadow-soft-lg p-1"
        >
          {/* Header → Profile */}
          <button
            onClick={goProfile}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors group cursor-pointer text-left"
          >
            <Avatar className="h-10 w-10 ring-2 ring-border/40">
              <AvatarImage src={profile?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {profile?.full_name || 'User'}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {activeStatus ? (
                  <>
                    <span>{activeStatus.emoji}</span>
                    <span className="truncate">{activeStatus.label}</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Online</span>
                  </>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </button>

          <DropdownMenuSeparator className="bg-border/50 my-1" />

          {/* Status + Notifications */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg cursor-pointer">
              <Smile className="mr-2 h-4 w-4" /> Όρισε status
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56 rounded-xl">
              {STATUS_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.value}
                  onClick={() => setStatus(p.value)}
                  className="rounded-lg cursor-pointer"
                >
                  <span className="mr-2 text-base leading-none">{p.emoji}</span>
                  <span className="flex-1">{p.label}</span>
                  {workStatus === p.value && <Check className="h-4 w-4 text-primary" />}
                </DropdownMenuItem>
              ))}
              {workStatus && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setStatus(null)}
                    className="rounded-lg cursor-pointer text-muted-foreground"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Καθαρισμός status
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg cursor-pointer">
              <BellOff className="mr-2 h-4 w-4" />
              <span className="flex-1">Σίγαση ειδοποιήσεων</span>
              {isMuted && (
                <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-500 font-medium">
                  ON
                </span>
              )}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-52 rounded-xl">
              {MUTE_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.minutes}
                  onClick={() => muteFor(opt.minutes)}
                  className="rounded-lg cursor-pointer"
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
              {isMuted && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={unmute}
                    className="rounded-lg cursor-pointer text-primary"
                  >
                    Ενεργοποίηση ξανά
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator className="bg-border/50 my-1" />

          {/* App settings */}
          <DropdownMenuItem
            onClick={() => navigate('/settings')}
            className="rounded-lg cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span className="flex-1">Ρυθμίσεις</span>
            <kbd className="text-[10px] text-muted-foreground font-mono">⌘,</kbd>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="rounded-lg cursor-pointer">
              <Palette className="mr-2 h-4 w-4" /> Θέμα
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44 rounded-xl">
              <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as any)}>
                <DropdownMenuRadioItem value="light" className="rounded-lg cursor-pointer">
                  <Sun className="mr-2 h-4 w-4" /> Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" className="rounded-lg cursor-pointer">
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system" className="rounded-lg cursor-pointer">
                  <Monitor className="mr-2 h-4 w-4" /> System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem
            onClick={() => setShortcutsOpen(true)}
            className="rounded-lg cursor-pointer"
          >
            <Keyboard className="mr-2 h-4 w-4" />
            <span className="flex-1">Συντομεύσεις πληκτρολογίου</span>
            <kbd className="text-[10px] text-muted-foreground font-mono">⌘/</kbd>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.open('https://docs.lovable.dev', '_blank')}
            className="rounded-lg cursor-pointer"
          >
            <HelpCircle className="mr-2 h-4 w-4" /> Βοήθεια & Feedback
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border/50 my-1" />

          {/* Personal Tools group */}
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">
            Personal Tools
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={() => navigate('/?action=new-task')}
            className="rounded-lg cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" /> Νέο task
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/')}
            className="rounded-lg cursor-pointer"
          >
            <Briefcase className="mr-2 h-4 w-4" /> My Work
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/timesheets')}
            className="rounded-lg cursor-pointer"
          >
            <Timer className="mr-2 h-4 w-4" /> Παρακολούθηση χρόνου
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/?section=notes')}
            className="rounded-lg cursor-pointer"
          >
            <StickyNote className="mr-2 h-4 w-4" /> Σημειώσεις
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/calendar')}
            className="rounded-lg cursor-pointer"
          >
            <CalendarIcon className="mr-2 h-4 w-4" /> Ημερολόγιο
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate('/users')}
            className="rounded-lg cursor-pointer"
          >
            <UsersIcon className="mr-2 h-4 w-4" /> Ομάδα
          </DropdownMenuItem>

          {/* Workspace switcher */}
          {otherCompanies.length > 0 && (
            <>
              <DropdownMenuSeparator className="bg-border/50 my-1" />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-lg cursor-pointer">
                  <Building2 className="mr-2 h-4 w-4" />
                  <span className="flex-1 truncate">Εναλλαγή workspace</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 rounded-xl">
                  {allCompanies.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      onClick={() => switchCompany(c.id)}
                      className="rounded-lg cursor-pointer"
                    >
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{c.name}</span>
                      {c.id === company?.id && <Check className="h-4 w-4 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          )}

          <DropdownMenuSeparator className="bg-border/50 my-1" />

          {/* Sign out */}
          <DropdownMenuItem
            onClick={() => signOut()}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" /> Αποσύνδεση
          </DropdownMenuItem>

          {/* Email footer */}
          <div className="px-3 pt-2 pb-1 text-[10px] text-muted-foreground/70 truncate border-t border-border/40 mt-1">
            {profile?.email}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
