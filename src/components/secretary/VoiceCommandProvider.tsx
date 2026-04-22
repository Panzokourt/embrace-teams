import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import VoiceCommandPopup from "./VoiceCommandPopup";

interface VoiceCommandContextValue {
  openVoicePopup: () => void;
  sendToSecretary: (text: string) => void;
  registerSendHandler: (handler: (text: string) => void) => void;
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
  const navigate = useNavigate();
  const location = useLocation();

  const openVoicePopup = useCallback(() => setPopupOpen(true), []);

  const registerSendHandler = useCallback((handler: (text: string) => void) => {
    setSendHandler(() => handler);
  }, []);

  const sendToSecretary = useCallback((text: string) => {
    if (!text.trim()) return;

    // Only act if Secretary is mounted (handler registered).
    // Never dispatch a global open event — that caused auto-open on refresh.
    if (sendHandler) {
      sendHandler(text);
      if (onOpenSecretaryPanel) {
        onOpenSecretaryPanel();
      }
    } else if (onOpenSecretaryPanel) {
      // Open panel so user can type manually
      onOpenSecretaryPanel();
    }
  }, [sendHandler, onOpenSecretaryPanel]);

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
    <VoiceCommandContext.Provider value={{ openVoicePopup, sendToSecretary, registerSendHandler }}>
      {children}
      <VoiceCommandPopup
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        onSend={(text) => {
          setPopupOpen(false);
          sendToSecretary(text);
        }}
      />
    </VoiceCommandContext.Provider>
  );
}
