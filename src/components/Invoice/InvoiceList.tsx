import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  X,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { Invoice, User } from "../../types";
import { invoiceService } from "../../services";
import { ExportFiltersModal, ExportFilters } from "./ExportFiltersModal";
import { ExcelExportUtils } from "../../utils/excelExport";
import { StatusSelector } from "../ui/selectors";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useInvoiceFiltering } from "../../hooks/useInvoiceFiltering";
import { usePagination } from "../../hooks/usePagination";
import { PaginationControls } from "../ui/pagination-controls";
import { InvoiceTableRow } from "./shared/InvoiceTableRow";
import { TableSortIcon } from "../ui/table-sort-icon";

interface InvoiceListProps {
  invoices: Invoice[];
  currentUser: User;
  isApprovalMode?: boolean;
  onApprove?: (invoiceId: string) => void;
  onReject?: (invoiceId: string, reason: string) => void;
  onPay?: (invoiceId: string) => void;
  onEdit?: (invoice: Invoice) => void;
  onView?: (invoice: Invoice) => void;
  onSubmit?: (invoiceId: string) => void;
  onDelete?: (invoiceId: string) => void;
  onRepeat?: (invoice: Invoice) => void;
  onExitApprovalMode?: () => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({
  invoices,
  currentUser,
  isApprovalMode = false,
  onApprove,
  onReject,
  onPay,
  onView,
  onSubmit,
  onRepeat,
  onExitApprovalMode,
}) => {
  const [filter, setFilter] = useState<
    "all" | "pending" | "rejected" | "payed" | "submitted" | "approved"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // Use custom hooks for filtering and pagination
  const {
    filteredInvoices,
    sortField,
    sortDirection,
    handleSort,
    setSortField,
    setSortDirection,
  } = useInvoiceFiltering({
    invoices,
    currentUser,
    isApprovalMode,
    filter,
    searchTerm,
  });

  const {
    currentPage,
    itemsPerPage,
    totalPages,
    paginatedItems: paginatedInvoices,
    setCurrentPage,
    setItemsPerPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
  } = usePagination({
    items: filteredInvoices,
    initialPageSize: 10,
  });

  // Export related state
  const [showExportModal, setShowExportModal] = useState(false);
  const [usersForFilter, setUsersForFilter] = useState<
    { id: string; name: string }[]
  >([]);

  // Set filter to pending when entering approval mode
  useEffect(() => {
    if (isApprovalMode) {
      setFilter("pending");
    }
  }, [isApprovalMode]);

  // Extract users from invoices for filter purposes
  useEffect(() => {
    if (isApprovalMode && invoices.length > 0) {
      const uniqueUsers = Array.from(
        new Map(
          invoices
            .filter((invoice) => invoice.userId && invoice.userName)
            .map((invoice) => [
              invoice.userId,
              { id: invoice.userId, name: invoice.userName },
            ]),
        ).values(),
      );
      setUsersForFilter(uniqueUsers);
    }
  }, [isApprovalMode, invoices]);

  const handleReject = (invoiceId: string) => {
    if (rejectReason.trim() && onReject) {
      onReject(invoiceId, rejectReason);
      setRejectingId(null);
      setRejectReason("");
    }
  };

  // Helper function to determine if an expense is a travel expense
  const handleExportClick = () => {
    setShowExportModal(true);
  };

  // Create initial filters based on current state
  const getInitialExportFilters = (): ExportFilters => {
    const initialFilters: ExportFilters = {};

    // Pre-fill status filter if not 'all'
    if (filter !== "all") {
      initialFilters.status = filter.toUpperCase();
    }

    return initialFilters;
  };

  // Handle export submit
  const handleExportSubmit = async (filters: ExportFilters) => {
    try {
      // Try server-side export first
      try {
        await invoiceService.exportToExcel(filters);
        setShowExportModal(false);
        return;
      } catch (serverError) {
        console.warn(
          "Server-side export failed, falling back to client-side export:",
          serverError,
        );
      }

      // Fallback to client-side export
      const filteredInvoices = ExcelExportUtils.filterInvoices(
        invoices,
        filters,
      );
      const filename = ExcelExportUtils.generateFilename("despesas_export");

      ExcelExportUtils.exportInvoicesToExcel(filteredInvoices, filename);
      setShowExportModal(false);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Falha na exportação para Excel. Por favor tente novamente.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">
          {isApprovalMode ? "Aprovações de Despesas" : "As Minhas Despesas"}
        </h1>
        <p className="text-gray-600 mt-1">
          {isApprovalMode
            ? "Rever e gerir submissões de despesas"
            : "Acompanhe as suas despesas submetidas e o seu estado"}
        </p>
      </div>

      {/* Approval Mode Banner */}
      {isApprovalMode && (
        <div className="mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-lg shadow-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Modo de Aprovação Ativo
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
                    Ativo
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  Está a visualizar e pode aprovar/rejeitar despesas de outros
                  utilizadores
                </p>
              </div>
            </div>
            {onExitApprovalMode && (
              <Button
                onClick={onExitApprovalMode}
                variant="outline"
                className="ml-4 flex-shrink-0 border-yellow-600 text-yellow-700 hover:bg-yellow-100"
              >
                <X className="w-4 h-4 mr-1" />
                Sair
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          {/* Filter dropdown - full width on mobile, auto width on desktop */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <StatusSelector filter={filter} setFilter={setFilter} />
          </div>

          {/* Search field - full width on mobile, auto width on desktop */}
          <div className="relative w-full sm:w-auto">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar despesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 w-full"
            />
          </div>

          {/* Excel Export Button - full width on mobile, auto width on desktop */}
          {((isApprovalMode &&
            (currentUser.role === "APPROVER" ||
              currentUser.role === "ADMIN")) ||
            !isApprovalMode) && (
            <button
              onClick={handleExportClick}
              className="text-sm px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel</span>
            </button>
          )}

          {/* Reset button - full width on mobile, auto width on desktop */}
          <Button
            onClick={() => {
              setFilter("all");
              setSearchTerm("");
              setCurrentPage(1);
              setItemsPerPage(10);
              setSortField("dateSubmitted");
              setSortDirection("desc");
            }}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4" />
            <span>Repor</span>
          </Button>
        </div>
      </div>

      {/* Invoice List */}
      <div
        className={`bg-white shadow-sm rounded-lg border ${
          isApprovalMode ? "border-yellow-500" : "border-gray-200"
        }`}
      >
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhuma despesa encontrada
            </h3>
            <p className="text-lg text-gray-600">
              {searchTerm || filter !== "all"
                ? "Tente ajustar os critérios de pesquisa ou filtro"
                : isApprovalMode
                  ? "Nenhuma despesa pendente de aprovação"
                  : "Ainda não foram submetidas despesas"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader
              className={isApprovalMode ? "bg-yellow-50" : "bg-gray-100"}
            >
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort("vendor")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Detalhes da Despesa
                    <TableSortIcon
                      field="vendor"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                </TableHead>
                {isApprovalMode && (
                  <TableHead>
                    <button
                      onClick={() => handleSort("userName")}
                      className="flex items-center hover:text-gray-900 transition-colors"
                    >
                      Submetido Por
                      <TableSortIcon
                        field="userName"
                        currentSortField={sortField}
                        sortDirection={sortDirection}
                      />
                    </button>
                  </TableHead>
                )}
                <TableHead>
                  <button
                    onClick={() => handleSort("amount")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Valor e Tipo
                    <TableSortIcon
                      field="amount"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("payer")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Pagamento
                    <TableSortIcon
                      field="payer"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("status")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Estado
                    <TableSortIcon
                      field="status"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("date")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Data da Despesa
                    <TableSortIcon
                      field="date"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("dateSubmitted")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Data de Submissão
                    <TableSortIcon
                      field="dateSubmitted"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                    />
                  </button>
                </TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedInvoices.map((invoice) => (
                <InvoiceTableRow
                  key={invoice.id}
                  invoice={invoice}
                  currentUser={currentUser}
                  isApprovalMode={isApprovalMode}
                  showUserColumn={isApprovalMode}
                  onView={onView}
                  onApprove={onApprove}
                  onReject={(id) => setRejectingId(id)}
                  onPay={onPay}
                  onSubmit={onSubmit}
                  onRepeat={onRepeat}
                />
              ))}
            </TableBody>
          </Table>
        )}

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredInvoices.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={setItemsPerPage}
          onFirstPage={goToFirstPage}
          onLastPage={goToLastPage}
          onNextPage={goToNextPage}
          onPreviousPage={goToPreviousPage}
        />
      </div>

      {/* Export Filters Modal */}
      <ExportFiltersModal
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportSubmit}
        users={usersForFilter}
        currentUser={currentUser}
        initialFilters={getInitialExportFilters()}
      />

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Rejeitar Despesa
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Por favor, forneça um motivo para rejeitar esta despesa:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Introduza o motivo da rejeição..."
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Rejeitar Despesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
