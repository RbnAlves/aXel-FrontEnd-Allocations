import React from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { PageSizeSelector } from "./selectors";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageSizeChange,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
}) => {
  if (totalItems === 0) return null;

  return (
    <div className="px-6 py-4 border-t border-gray-200">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Page Size Selector */}
        <div className="flex items-center justify-start sm:justify-start space-x-1">
          <PageSizeSelector
            pageSize={itemsPerPage}
            setPageSize={onPageSizeChange}
          />
          <span className="text-sm text-gray-700 whitespace-nowrap">
            por página
          </span>
        </div>

        {/* Pagination Controls - Center */}
        <div className="flex items-center justify-end space-x-2">
          {/* First Page */}
          {totalPages > 1 && (
            <button
              onClick={onFirstPage}
              disabled={currentPage === 1}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Primeira página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          )}

          {/* Previous Page */}
          {totalPages > 1 && (
            <button
              onClick={onPreviousPage}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* Current Page Info */}
          <div className="px-4 py-1 text-sm text-gray-700 font-medium">
            {currentPage} / {totalPages}
          </div>

          {/* Next Page */}
          {totalPages > 1 && (
            <button
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Last Page */}
          {totalPages > 1 && (
            <button
              onClick={onLastPage}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
