import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import VoiceCommandPopup from "./VoiceCommandPopup";

type ChatTargetHandler = (text: string) => void;

interface ChatTarget {
  id: string;
  label: string;
  handler: ChatTargetHandler;
}

interface VoiceCommandContextValue {
  openVoicePopup: () => void;
  sendToSecretary: (text: string) => void;
  registerSendHandler: (handler: (text: string) => void) => void;
  /**
   * Register an active chat as a possible voice target. Returns an unregister function.
   * Call this in a `useEffect` so the chat target is removed on unmount.
   */
  registerChatTarget: (id: string, label: string, handler: ChatTargetHandler) => () => void;
}

const VoiceCommandContext = createContext<VoiceCommandContextValue | null>(null);

export function useVoiceCommand() {
  const ctx = useContext(VoiceCommandContext);
  if (!ctx) throw new Error("useVoiceCommand must be used inside VoiceCommandProvider");
  return ctx;
}

interface Props {
  children: ReactNode;
  onOpenSecretaryPanel?: () => void;
}

export default function VoiceCommandProvider({ children, onOpenSecretaryPanel }: Props) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [sendHandler, setSendHandler] = useState<((text: string) => void) | null>(null);
  // Use a ref + state for chat targets so handlers remain referentially stable
  const targetsRef = useRef<ChatTarget[]>([]);
  const [activeTarget, setActiveTarget] = useState<{ id: string; label: string } | null>(null);

  const openVoicePopup = useCallback(() => setPopupOpen(true), []);

  const registerSendHandler = useCallback((handler: (text: string) => void) => {
    setSendHandler(() => handler);
  }, []);

  const refreshActiveTarget = useCallback(() => {
    const last = targetsRef.current[targetsRef.current.length - 1];
    setActiveTarget(last ? { id: last.id, label: last.label } : null);
  }, []);

  const registerChatTarget = useCallback(
    (id: string, label: string, handler: ChatTargetHandler) => {
      // Replace any existing entry with the same id, then push to end (newest = active)
      targetsRef.current = targetsRef.current.filter((t) => t.id !== id);
      targetsRef.current.push({ id, label, handler });
      refreshActiveTarget();
      return () => {
        targetsRef.current = targetsRef.current.filter((t) => t.id !== id);
        refreshActiveTarget();
      };
    },
    [refreshActiveTarget],
  );

  const sendToSecretary = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      // Priority 1: an active chat target (e.g. open channel chat)
      const last = targetsRef.current[targetsRef.current.length - 1];
      if (last) {
        last.handler(text);
        return;
      }

      // Priority 2: Secretary if mounted
      if (sendHandler) {
        sendHandler(text);
        if (onOpenSecretaryPanel) onOpenSecretaryPanel();
      } else if (onOpenSecretaryPanel) {
        onOpenSecretaryPanel();
      }
    },
    [sendHandler, onOpenSecretaryPanel],
  );

  // Global shortcut: Cmd/Ctrl + Shift + V
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "V") {
        e.preventDefault();
        setPopupOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <VoiceCommandContext.Provider
      value={{ openVoicePopup, sendToSecretary, registerSendHandler, registerChatTarget }}
    >
      {children}
      <VoiceCommandPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSend={(text) => {
          setPopupOpen(false);
          sendToSecretary(text);
        }}
        targetLabel={activeTarget?.label ?? "Secretary"}
      />
    </VoiceCommandContext.Provider>
  );
}
