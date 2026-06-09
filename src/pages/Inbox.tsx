import { useMemo, useState } from 'react';
import { useGmailAccount } from '@/hooks/useGmailAccount';
import { useEmailMessages } from '@/hooks/useEmailMessages';
import { useAuth } from '@/contexts/AuthContext';
import { InboxThreadList } from '@/components/inbox/InboxThreadList';
import { InboxConversation } from '@/components/inbox/InboxConversation';
import { InboxEmptyState } from '@/components/inbox/InboxEmptyState';
import { InboxComposeInput } from '@/components/inbox/InboxComposeInput';
import { InboxFolderRail } from '@/components/inbox/InboxFolderRail';
import { FOLDERS, FolderKey, filterThreadsByFolder, folderCounts } from '@/components/inbox/inboxUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Loader2, Mail } from 'lucide-react';

export default function Inbox() {
  useAuth();
  const { account, loading: accountLoading } = useGmailAccount();
  const { threads, syncing, syncEmails, sendEmail, toggleStar } = useEmailMessages(account?.id || null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [activeFolder, setActiveFolder] = useState<FolderKey>('inbox');

  const counts = useMemo(() => folderCounts(threads), [threads]);
  const visibleThreads = useMemo(
    () => filterThreadsByFolder(threads, activeFolder),
    [threads, activeFolder]
  );
  const activeFolderLabel = FOLDERS.find((f) => f.key === activeFolder)?.label || 'Inbox';

  if (accountLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!account) return <InboxEmptyState />;

  const selectedThread = visibleThreads.find((t) => t.thread_id === selectedThreadId)
    || threads.find((t) => t.thread_id === selectedThreadId)
    || null;
  const userEmail = account.email_address;

  const handleFolderChange = (k: FolderKey) => {
    setActiveFolder(k);
    setSelectedThreadId(null);
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      {/* Mobile */}
      <div className="md:hidden flex h-full">
        {!selectedThread ? (
          <div className="w-full h-full flex">
            <InboxFolderRail active={activeFolder} onChange={handleFolderChange} counts={counts} />
            <div className="flex-1">
              <InboxThreadList
                threads={visibleThreads}
                selectedThreadId={selectedThreadId}
                onSelectThread={setSelectedThreadId}
                onSync={syncEmails}
                syncing={syncing}
                onCompose={() => setComposeOpen(true)}
                folderLabel={activeFolderLabel}
              />
            </div>
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

      {/* Desktop */}
      <div className="hidden md:flex h-full">
        <InboxFolderRail active={activeFolder} onChange={handleFolderChange} counts={counts} />
        <div className="flex-1 min-w-0">
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={26} minSize={20} maxSize={42}>
              <InboxThreadList
                threads={visibleThreads}
                selectedThreadId={selectedThreadId}
                onSelectThread={setSelectedThreadId}
                onSync={syncEmails}
                syncing={syncing}
                onCompose={() => setComposeOpen(true)}
                folderLabel={activeFolderLabel}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={74}>
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
      </div>

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

