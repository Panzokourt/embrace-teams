import SecretaryChat from "@/components/secretary/SecretaryChat";
import { useVoiceCommand } from "@/components/secretary/VoiceCommandProvider";

export default function Secretary() {
  const { registerSendHandler } = useVoiceCommand();

  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <SecretaryChat mode="full" registerSendHandler={registerSendHandler} />
    </div>
  );
}
