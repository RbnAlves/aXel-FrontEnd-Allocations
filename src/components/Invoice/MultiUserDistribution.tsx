import React, { useEffect, useMemo, useState, forwardRef } from "react";
import { Search, Users } from "lucide-react";
import { User } from "../../types";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { TableSortIcon } from "../ui/table-sort-icon";
import { PaginationControls } from "../ui/pagination-controls";
import { Button } from "../ui/button";

interface MultiUserDistributionProps {
  users: User[];
  loading: boolean;
  selectedUserIds: string[];
  allocations: Record<string, number>;
  allocatedTotal: number;
  remaining: number;
  onToggleUser: (userId: string) => void;
  onAllocationChange: (userId: string, value: number) => void;
  onDistributeEqually: () => void;
  error?: string; // Add error prop for auto-scroll
  onClearError?: () => void; // Callback to clear error when user makes changes
}

export const MultiUserDistribution = forwardRef<
  HTMLDivElement,
  MultiUserDistributionProps
>(
  (
    {
      users,
      loading,
      selectedUserIds,
      allocations,
      allocatedTotal,
      remaining,
      onToggleUser,
      onAllocationChange,
      onDistributeEqually,
      error,
      onClearError,
    },
    ref,
  ) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<"name" | "department">("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll to this component when error appears
    useEffect(() => {
      if (error && containerRef.current) {
        // Use setTimeout to ensure scroll happens even if same error persists
        setTimeout(() => {
          containerRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 0);
      }
    }, [error]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(5);

    const filteredAndSortedUsers = useMemo(() => {
      let filtered = users;

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (user) =>
            user.name.toLowerCase().includes(lowerSearch) ||
            user.department.toLowerCase().includes(lowerSearch),
        );
      }

      const sorted = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (sortDirection === "asc") {
          return aValue.localeCompare(bValue);
        }
        return bValue.localeCompare(aValue);
      });

      return sorted;
    }, [users, searchTerm, sortField, sortDirection]);

    const totalUsers = filteredAndSortedUsers.length;
    const totalPages = Math.max(1, Math.ceil(totalUsers / itemsPerPage));

    const paginatedUsers = useMemo(() => {
      const start = (currentPage - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      return filteredAndSortedUsers.slice(start, end);
    }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

    useEffect(() => {
      if (currentPage > totalPages) {
        setCurrentPage(1);
      }
    }, [totalPages, currentPage]);

    const handleSort = (field: "name" | "department") => {
      if (sortField === field) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
    };

    return (
      <div
        ref={containerRef}
        className="grid grid-cols-1 gap-4"
        id="multi-user-distribution"
      >
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="flex flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="w-5 h-5" />
              <span className="font-semibold text-gray-900">
                Selecionar Utilizadores
              </span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <div className="text-red-600 mt-0.5">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou departamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 w-full"
              />
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                <p className="text-gray-500 mt-2">A carregar utilizadores...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-gray-100">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Nome
                        <TableSortIcon
                          field="name"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("department")}
                        className="flex items-center hover:text-gray-900 transition-colors"
                      >
                        Departamento
                        <TableSortIcon
                          field="department"
                          currentSortField={sortField}
                          sortDirection={sortDirection}
                        />
                      </button>
                    </TableHead>
                    <TableHead>Valor Atribuido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <TableRow
                        key={user.id}
                        className={
                          isSelected ? "bg-yellow-50 hover:bg-yellow-100" : ""
                        }
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              onToggleUser(user.id);
                              onClearError?.();
                            }}
                            className="h-4 w-4"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.name}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {user.department}
                        </TableCell>
                        <TableCell>
                          {isSelected ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={allocations[user.id] ?? ""}
                                onChange={(e) => {
                                  onAllocationChange(
                                    user.id,
                                    parseFloat(e.target.value || "0"),
                                  );
                                  onClearError?.();
                                }}
                                className="w-full"
                              />
                              <span className="text-sm text-gray-600">€</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {!loading && filteredAndSortedUsers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Nenhum utilizador encontrado com os criterios de pesquisa.
                </p>
              </div>
            )}

            {!loading && filteredAndSortedUsers.length > 0 && (
              <div className="pt-4">
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredAndSortedUsers.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setItemsPerPage}
                  onFirstPage={() => setCurrentPage(1)}
                  onLastPage={() => setCurrentPage(totalPages)}
                  onNextPage={() =>
                    setCurrentPage((page) => Math.min(page + 1, totalPages))
                  }
                  onPreviousPage={() =>
                    setCurrentPage((page) => Math.max(page - 1, 1))
                  }
                />
              </div>
            )}
          </div>

          {/* Horizontal separator */}
          <hr className="border-gray-200" />

          {/* Resumo section */}
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Distribuido</span>
              <span className="font-semibold">
                {allocatedTotal.toFixed(2)} €
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Em falta</span>
              <span className="font-semibold">
                {(Math.abs(remaining) < 0.001 ? 0 : remaining).toFixed(2)} €
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-700">
              <span>Utilizadores selecionados</span>
              <span className="font-semibold">{selectedUserIds.length}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                onDistributeEqually();
                onClearError?.();
              }}
              disabled={selectedUserIds.length === 0}
            >
              Distribuir igualmente
            </Button>
          </div>
        </div>
      </div>
    );
  },
);

MultiUserDistribution.displayName = "MultiUserDistribution";
