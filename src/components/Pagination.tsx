import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  itemName = 'records',
  className = '',
}) => {
  if (totalItems === 0) {
    return null;
  }

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-800/80 text-xs ${className}`}
    >
      {/* Information text */}
      <div className="text-slate-400 font-medium text-center sm:text-left">
        Showing{' '}
        <span className="font-semibold text-slate-200 font-mono">
          {startItem}
        </span>{' '}
        to{' '}
        <span className="font-semibold text-slate-200 font-mono">
          {endItem}
        </span>{' '}
        of{' '}
        <span className="font-semibold text-indigo-400 font-mono">
          {totalItems}
        </span>{' '}
        {itemName}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-1.5 select-none">
        {/* First Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          title="First Page"
          className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
            currentPage <= 1
              ? 'opacity-30 cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-600'
              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white hover:border-slate-700 active:scale-95'
          }`}
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          title="Previous Page"
          className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center space-x-1 font-medium ${
            currentPage <= 1
              ? 'opacity-30 cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-600'
              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white hover:border-slate-700 active:scale-95'
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden md:inline">Prev</span>
        </button>

        {/* Numbered Page Buttons */}
        <div className="flex items-center space-x-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-slate-500 font-mono text-xs select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] h-8 px-2 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center font-mono ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold shadow-md shadow-indigo-600/30 border-indigo-400/50 scale-105'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white hover:border-slate-700 active:scale-95'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          title="Next Page"
          className={`px-2.5 py-1.5 rounded-lg border transition-all flex items-center space-x-1 font-medium ${
            currentPage >= totalPages
              ? 'opacity-30 cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-600'
              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white hover:border-slate-700 active:scale-95'
          }`}
        >
          <span className="hidden md:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          title="Last Page"
          className={`p-1.5 rounded-lg border transition-all flex items-center justify-center ${
            currentPage >= totalPages
              ? 'opacity-30 cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-600'
              : 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white hover:border-slate-700 active:scale-95'
          }`}
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
