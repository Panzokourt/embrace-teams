import { useState, useCallback, useMemo } from 'react';

export interface PaginationState {
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface PaginationHelpers {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
  setTotalCount: (count: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  reset: () => void;
}

export function usePagination(pageSize = 50): PaginationHelpers {
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const nextPage = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage(p => Math.max(p - 1, 1));
  }, []);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return useMemo(() => ({
    page,
    pageSize,
    totalCount,
    totalPages,
    from,
    to,
    setPage,
    setTotalCount,
    nextPage,
    prevPage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    reset,
  }), [page, pageSize, totalCount, totalPages, from, to, nextPage, prevPage, reset]);
}
