import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export interface FloatingWindow {
  channelId: string;
  channelName: string;
  channelType: 'public' | 'private' | 'direct' | 'group';
  minimized: boolean;
}

interface ChatContextType {
  floatingWindows: FloatingWindow[];
  openFloatingWindow: (channelId: string, channelName: string, channelType: FloatingWindow['channelType']) => void;
  closeFloatingWindow: (channelId: string) => void;
  minimizeFloatingWindow: (channelId: string) => void;
  restoreFloatingWindow: (channelId: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const MAX_WINDOWS = 3;
const STORAGE_KEY = 'chat-floating-windows';

export function ChatProvider({ children }: { children: ReactNode }) {
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindow[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  const persist = (windows: FloatingWindow[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(windows)); } catch {}
  };

  const openFloatingWindow = useCallback((channelId: string, channelName: string, channelType: FloatingWindow['channelType']) => {
    setFloatingWindows(prev => {
      // Already open? Just restore
      const existing = prev.find(w => w.channelId === channelId);
      if (existing) {
        const updated = prev.map(w => w.channelId === channelId ? { ...w, minimized: false } : w);
        persist(updated);
        return updated;
      }
      // Max windows? Close oldest
      let next = [...prev];
      if (next.length >= MAX_WINDOWS) {
        next = next.slice(1);
      }
      next.push({ channelId, channelName, channelType, minimized: false });
      persist(next);
      return next;
    });
  }, []);

  const closeFloatingWindow = useCallback((channelId: string) => {
    setFloatingWindows(prev => {
      const updated = prev.filter(w => w.channelId !== channelId);
      persist(updated);
      return updated;
    });
  }, []);

  const minimizeFloatingWindow = useCallback((channelId: string) => {
    setFloatingWindows(prev => {
      const updated = prev.map(w => w.channelId === channelId ? { ...w, minimized: true } : w);
      persist(updated);
      return updated;
    });
  }, []);

  const restoreFloatingWindow = useCallback((channelId: string) => {
    setFloatingWindows(prev => {
      const updated = prev.map(w => w.channelId === channelId ? { ...w, minimized: false } : w);
      persist(updated);
      return updated;
    });
  }, []);

  return (
    <ChatContext.Provider value={{
      floatingWindows,
      openFloatingWindow,
      closeFloatingWindow,
      minimizeFloatingWindow,
      restoreFloatingWindow,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}
