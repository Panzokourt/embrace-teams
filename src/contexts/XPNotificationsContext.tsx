import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useUserXP } from '@/hooks/useUserXP';

export interface XPGainEvent {
  id: string;
  points: number;
  reason: string;
  skillTag?: string | null;
}

export interface AchievementUnlockedEvent {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xpReward: number;
}

export interface LevelUpEvent {
  id: string;
  oldLevel: number;
  newLevel: number;
  newTitle: string;
}

interface XPNotificationsContextValue {
  xpGains: XPGainEvent[];
  achievementUnlocks: AchievementUnlockedEvent[];
  levelUp: LevelUpEvent | null;
  pushXPGain: (gain: Omit<XPGainEvent, 'id'>) => void;
  pushAchievement: (a: Omit<AchievementUnlockedEvent, 'id'>) => void;
  dismissXPGain: (id: string) => void;
  dismissAchievement: (id: string) => void;
  dismissLevelUp: () => void;
}

const XPNotificationsContext = createContext<XPNotificationsContextValue | null>(null);

const noop: XPNotificationsContextValue = {
  xpGains: [], achievementUnlocks: [], levelUp: null,
  pushXPGain: () => {}, pushAchievement: () => {},
  dismissXPGain: () => {}, dismissAchievement: () => {}, dismissLevelUp: () => {},
};

export function XPNotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { level, levelTitle } = useUserXP(user?.id);
  const prevLevelRef = useRef<number | null>(null);

  const [xpGains, setXpGains] = useState<XPGainEvent[]>([]);
  const [achievementUnlocks, setAchievementUnlocks] = useState<AchievementUnlockedEvent[]>([]);
  const [levelUp, setLevelUp] = useState<LevelUpEvent | null>(null);

  // Detect level-up
  useEffect(() => {
    if (!level) return;
    const prev = prevLevelRef.current;
    if (prev !== null && level > prev) {
      setLevelUp({
        id: crypto.randomUUID(),
        oldLevel: prev,
        newLevel: level,
        newTitle: levelTitle,
      });
    }
    prevLevelRef.current = level;
  }, [level, levelTitle]);

  const pushXPGain = useCallback((gain: Omit<XPGainEvent, 'id'>) => {
    const id = crypto.randomUUID();
    setXpGains((prev) => [...prev, { ...gain, id }].slice(-5));
    setTimeout(() => {
      setXpGains((prev) => prev.filter((g) => g.id !== id));
    }, 2800);
  }, []);

  const pushAchievement = useCallback((a: Omit<AchievementUnlockedEvent, 'id'>) => {
    const id = crypto.randomUUID();
    setAchievementUnlocks((prev) => [...prev, { ...a, id }].slice(-3));
    setTimeout(() => {
      setAchievementUnlocks((prev) => prev.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  const dismissXPGain = useCallback((id: string) => {
    setXpGains((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const dismissAchievement = useCallback((id: string) => {
    setAchievementUnlocks((prev) => prev.filter((g) => g.id !== id));
  }, []);

  const dismissLevelUp = useCallback(() => setLevelUp(null), []);

  return (
    <XPNotificationsContext.Provider value={{
      xpGains, achievementUnlocks, levelUp,
      pushXPGain, pushAchievement, dismissXPGain, dismissAchievement, dismissLevelUp,
    }}>
      {children}
    </XPNotificationsContext.Provider>
  );
}

export function useXPNotifications() {
  return useContext(XPNotificationsContext) ?? noop;
}
