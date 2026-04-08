import { useState } from "react";
import SecretaryChat from "@/components/secretary/SecretaryChat";
import { useVoiceCommand } from "@/components/secretary/VoiceCommandProvider";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import MemoryManager from "@/components/secretary/MemoryManager";

export default function Secretary() {
  const { registerSendHandler } = useVoiceCommand();
  const [memoryOpen, setMemoryOpen] = useState(false);

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <SecretaryChat
        mode="full"
        registerSendHandler={registerSendHandler}
        onOpenMemory={() => setMemoryOpen(true)}
      />

      <Dialog open={memoryOpen} onOpenChange={setMemoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden p-0">
          <MemoryManager onClose={() => setMemoryOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
