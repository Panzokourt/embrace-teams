import { useState } from 'react';
import { useGmailAccount } from '@/hooks/useGmailAccount';
import { useEmailMessages } from '@/hooks/useEmailMessages';
import { useAuth } from '@/contexts/AuthContext';
import { InboxThreadList } from '@/components/inbox/InboxThreadList';
import { InboxConversation } from '@/components/inbox/InboxConversation';
import { InboxEmptyState } from '@/components/inbox/InboxEmptyState';
import { InboxComposeInput } from '@/components/inbox/InboxComposeInput';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Loader2, Mail } from 'lucide-react';

export default function Inbox() {
  const { profile } = useAuth();
  const { account, loading: accountLoading } = useGmailAccount();
  const { threads, loading, syncing, syncEmails, sendEmail, toggleStar } = useEmailMessages(account?.id || null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) {
    return <InboxEmptyState />;
  }

  const selectedThread = threads.find(t => t.thread_id === selectedThreadId) || null;
  const userEmail = account.email_address;

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* Mobile view */}
      <div className="md:hidden flex h-full">
        {!selectedThread ? (
          <div className="w-full h-full">
            <InboxThreadList
              threads={threads}
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
              onSync={syncEmails}
              syncing={syncing}
              onCompose={() => setComposeOpen(true)}
            />
          </div>
        ) : (
          <div className="w-full h-full">
            <InboxConversation
              thread={selectedThread}
              userEmail={userEmail}
              onSend={sendEmail}
              onToggleStar={toggleStar}
              onBack={() => setSelectedThreadId(null)}
            />
          </div>
        )}
      </div>

      {/* Desktop view with resizable panels */}
      <div className="hidden md:flex h-full">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <InboxThreadList
              threads={threads}
              selectedThreadId={selectedThreadId}
              onSelectThread={setSelectedThreadId}
              onSync={syncEmails}
              syncing={syncing}
              onCompose={() => setComposeOpen(true)}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={70}>
            {selectedThread ? (
              <InboxConversation
                thread={selectedThread}
                userEmail={userEmail}
                onSend={sendEmail}
                onToggleStar={toggleStar}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
                <div className="text-center space-y-2">
                  <Mail className="h-12 w-12 mx-auto opacity-30" />
                  <p>Επιλέξτε ένα thread για να δείτε τη συνομιλία</p>
                </div>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Νέο Email</DialogTitle>
          </DialogHeader>
          <InboxComposeInput
            onSend={async (params) => {
              const result = await sendEmail(params);
              if (result) setComposeOpen(false);
              return result;
            }}
            isNewCompose
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
