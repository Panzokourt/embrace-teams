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

    // If we have a registered send handler (Secretary is mounted), use it
    if (sendHandler) {
      sendHandler(text);
      // Open the panel
      if (onOpenSecretaryPanel) {
        onOpenSecretaryPanel();
      }
    } else {
      // Open secretary panel via custom event
      window.dispatchEvent(new CustomEvent('open-secretary-panel'));
    }
  }, [sendHandler, navigate, location.pathname, onOpenSecretaryPanel]);

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
