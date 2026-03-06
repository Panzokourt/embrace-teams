import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function ProposalsList() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-40" />
        <h3 className="text-lg font-medium mb-1">Proposal Builder</h3>
        <p className="text-sm">Δημιουργήστε προσφορές με live margin preview — Phase 2</p>
      </CardContent>
    </Card>
  );
}
