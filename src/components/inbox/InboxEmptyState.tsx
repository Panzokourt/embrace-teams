import { Mail, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function InboxEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <Mail className="h-8 w-8 text-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Συνδέστε το email σας</h2>
        <p className="text-muted-foreground text-sm">
          Ρυθμίστε τον λογαριασμό email σας στις Ρυθμίσεις για να δείτε τα μηνύματά σας εδώ
          σε μορφή συνομιλίας.
        </p>
        <Button onClick={() => navigate('/settings')} variant="default">
          <Settings className="h-4 w-4 mr-2" />
          Μετάβαση στις Ρυθμίσεις
        </Button>
      </div>
    </div>
  );
}
