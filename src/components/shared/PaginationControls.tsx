import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationHelpers } from '@/hooks/usePagination';

interface PaginationControlsProps {
  pagination: PaginationHelpers;
}

export function PaginationControls({ pagination }: PaginationControlsProps) {
  if (pagination.totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between py-4 px-1">
      <p className="text-sm text-muted-foreground">
        {pagination.from + 1}–{Math.min(pagination.to + 1, pagination.totalCount)} από {pagination.totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.prevPage}
          disabled={!pagination.hasPrevPage}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Προηγ.
        </Button>
        <span className="text-sm text-muted-foreground">
          {pagination.page} / {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={pagination.nextPage}
          disabled={!pagination.hasNextPage}
        >
          Επόμ.
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
