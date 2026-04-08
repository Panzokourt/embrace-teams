import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';

interface Props {
  backlinks: { id: string; title: string }[];
  isLoading?: boolean;
}

export function KBBacklinks({ backlinks, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) return null;
  if (backlinks.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Backlinks ({backlinks.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {backlinks.map(link => (
          <button
            key={link.id}
            onClick={() => navigate(`/knowledge/articles/${link.id}`)}
            className="flex items-center gap-1.5 text-xs text-primary hover:underline w-full text-left"
          >
            <ArrowUpRight className="h-3 w-3" /> {link.title}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
