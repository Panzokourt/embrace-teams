import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookUser, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  category: string | null;
  tags: string[] | null;
}

interface Props {
  contacts: Contact[];
}

export function ClientContactsCard({ contacts }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookUser className="h-4 w-4" /> Client Contacts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Δεν υπάρχουν επαφές</p>
        ) : (
          contacts.slice(0, 5).map(c => (
            <Link
              key={c.id}
              to={`/contacts/${c.id}`}
              className="block p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{c.name}</span>
                {c.tags?.includes('decision_maker') && (
                  <Badge variant="default" className="text-xs">Decision Maker</Badge>
                )}
              </div>
              {c.category && <p className="text-xs text-muted-foreground mb-1">{c.category}</p>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {c.email && (
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                )}
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
