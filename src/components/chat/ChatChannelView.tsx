import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useChatMessages, type ChatMessage } from '@/hooks/useChatMessages';
import ChatMessageItem from './ChatMessageItem';
import ChatMessageInput from './ChatMessageInput';
import ChatChannelHeader from './ChatChannelHeader';
import ChatThread from './ChatThread';
import type { ChatChannel } from '@/hooks/useChatChannels';
import { toast } from 'sonner';

interface ChatChannelViewProps {
  channel: ChatChannel | null;
  compact?: boolean;
  hideHeader?: boolean;
}

export default function ChatChannelView({ channel, compact, hideHeader }: ChatChannelViewProps) {
  const {
    messages, loading, sendMessage, editMessage, deleteMessage,
    togglePin, addReaction, removeReaction, markAsRead, uploadFile, addTag, removeTag,
  } = useChatMessages(channel?.id || null);

  const [replyingTo, setReplyingTo] = useState<{ id: string; content: string; senderName: string } | null>(null);
  const [threadMessage, setThreadMessage] = useState<ChatMessage | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    if (channel) markAsRead();
  }, [channel, markAsRead]);

  const handleSend = async (content: string, metadata?: Record<string, any>) => {
    await sendMessage(content, metadata, replyingTo?.id);
    setReplyingTo(null);
  };

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        await uploadFile(file);
        toast.success(`Αρχείο "${file.name}" ανέβηκε`);
      } catch (err) {
        toast.error(`Αποτυχία ανεβάσματος: ${file.name}`);
      }
    }
  };

  const handleReply = (message: ChatMessage) => {
    setReplyingTo({
      id: message.id,
      content: message.content.slice(0, 100),
      senderName: message.sender?.full_name || 'Unknown',
    });
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground/60">
        <div className="text-center">
          <p className="text-lg font-medium">Επιλέξτε μια συνομιλία</p>
          <p className="text-sm mt-1">ή ξεκινήστε μια νέα</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full">
      <div className="flex-1 flex flex-col h-full min-w-0">
        {!hideHeader && <ChatChannelHeader channel={channel} messages={messages} />}

        <div ref={containerRef} className="flex-1 overflow-y-auto">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground/60 text-sm">
              Δεν υπάρχουν μηνύματα ακόμα. Ξεκίνα τη συζήτηση!
            </div>
          ) : (
            <div className="py-2">
              {messages.map(msg => (
                <ChatMessageItem
                  key={msg.id}
                  message={msg}
                  compact={compact}
                  onReply={handleReply}
                  onPin={togglePin}
                  onDelete={deleteMessage}
                  onEdit={editMessage}
                  onReaction={addReaction}
                  onRemoveReaction={removeReaction}
                  onOpenThread={setThreadMessage}
                  onAddTag={addTag}
                  onRemoveTag={removeTag}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <ChatMessageInput
          onSend={handleSend}
          onFileUpload={handleFileUpload}
          compact={compact}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {threadMessage && (
        <ChatThread
          parentMessage={threadMessage}
          channelId={channel.id}
          onClose={() => setThreadMessage(null)}
        />
      )}
    </div>
  );
}
