import React, { useState, useMemo } from "react";
import {
  Clock,
  FileText,
  Search,
  X,
  FileSpreadsheet,
  Plus,
  Check,
} from "lucide-react";
import { Invoice, User } from "../../types";
import { invoiceService } from "../../services";
import { ExportFiltersModal, ExportFilters } from "./ExportFiltersModal";
import { ExcelExportUtils } from "../../utils/excelExport";
import { TooltipWrapper } from "../ui/tooltip";
import { StatusSelector } from "../ui/selectors";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ViewType } from "@/App";
import { useInvoiceFiltering } from "../../hooks/useInvoiceFiltering";
import { usePagination } from "../../hooks/usePagination";
import { InvoiceTableRow } from "./shared";
import { PaginationControls } from "../ui/pagination-controls";
import { TableSortIcon } from "../ui/table-sort-icon";

interface MyInvoiceListProps {
  invoices: Invoice[];
  currentUser: User;
  onEdit?: (invoice: Invoice) => void;
  onView?: (invoice: Invoice) => void;
  onSubmit?: (invoiceId: string) => void;
  onDelete?: (invoiceId: string) => void;
  onViewChange: (view: ViewType) => void;
  onRepeat?: (invoice: Invoice) => void;
}

export const MyInvoiceList: React.FC<MyInvoiceListProps> = ({
  invoices,
  currentUser,
  onView,
  onSubmit,
  onViewChange,
  onRepeat,
}) => {
  const [filter, setFilter] = useState<
    "all" | "pending" | "rejected" | "payed" | "submitted" | "approved"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);

  // Use custom hooks for filtering and pagination
  const { filteredInvoices, sortField, sortDirection, handleSort } =
    useInvoiceFiltering({
      invoices: invoices.filter((invoice) => invoice.userId === currentUser.id),
      currentUser,
      isApprovalMode: false,
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
    goToNextPage,
    goToPreviousPage,
  } = usePagination({
    items: filteredInvoices,
    initialPageSize: 10,
  });

  // Calculate totals by status
  const statusTotals = useMemo(() => {
    // Only calculate totals for user's own invoices
    const userInvoices = invoices.filter(
      (invoice) => invoice.userId === currentUser.id,
    );

    const totals = {
      pending: 0,
      approved: 0,
      payed: 0,
    };

    userInvoices.forEach((invoice) => {
      const status = invoice.status.toLowerCase();
      if (status === "pending") {
        totals.pending += invoice.amount;
      } else if (status === "payed") {
        totals.payed += invoice.amount;
      } else if (status === "approved") {
        totals.approved += invoice.amount;
      }
    });

    return totals;
  }, [invoices, currentUser.id]);

  // Handle export button click
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
      // Filter user's own invoices first
      const userInvoices = invoices.filter(
        (invoice) => invoice.userId === currentUser.id,
      );

      // Apply additional filters
      const filteredInvoices = ExcelExportUtils.filterInvoices(
        userInvoices,
        filters,
      );

      if (filteredInvoices.length === 0) {
        alert("Nenhuma despesa encontrada com os filtros aplicados.");
        return;
      }

      const filename = ExcelExportUtils.generateFilename("minhas_despesas");
      ExcelExportUtils.exportInvoicesToExcel(filteredInvoices, filename);
      setShowExportModal(false);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("Falha na exportação para Excel. Por favor tente novamente.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xl font-bold text-gray-900">As Minhas Despesas</p>
          <p className="text-gray-600 mt-1">
            Acompanhe as suas despesas submetidas e o seu estado
          </p>
        </div>
        <Button
          onClick={() => onViewChange("submit")}
          variant="yellow"
          className="w-full sm:w-auto"
        >
          <span className="flex items-center gap-1">
            <Plus className="w-4 h-4" />
            Submeter Despesa
          </span>
        </Button>
      </div>

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

          {/* Export button - full width on mobile, auto width on desktop */}
          <button
            onClick={handleExportClick}
            className="text-sm px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel</span>
          </button>

          {/* Reset button - full width on mobile, auto width on desktop */}
          <Button
            onClick={() => {
              setFilter("all");
              setSearchTerm("");
              setCurrentPage(1);
              setCurrentPage(1);
              setItemsPerPage(10);
            }}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4" />
            <span>Repor</span>
          </Button>
        </div>
      </div>

      {/* Totals by Status Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700 mb-2 sm:mb-0">
            Totalizadores por Estado
          </h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="flex items-center mr-2">
                <TooltipWrapper
                  tooltipTrigger={<Clock className="w-3 h-3 mr-1" />}
                  tooltipContent="Total de despesas pendentes de aprovação"
                  color="yellow"
                />
              </div>
              <span className="text-sm">
                <span className="font-medium">Pendente:</span>{" "}
                {statusTotals.pending.toFixed(2)} €
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex items-center mr-2">
                <TooltipWrapper
                  tooltipTrigger={<Check className="w-3 h-3 mr-1" />}
                  tooltipContent="Total de despesas aprovadas"
                  color="blue"
                />
              </div>
              <span className="text-sm">
                <span className="font-medium">Aprovado:</span>{" "}
                {statusTotals.approved.toFixed(2)} €
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex items-center mr-2">
                <TooltipWrapper
                  tooltipTrigger={<Check className="w-3 h-3 mr-1" />}
                  tooltipContent="Total de despesas pagas"
                  color="green"
                />
              </div>
              <span className="text-sm">
                <span className="font-medium">Pago:</span>{" "}
                {statusTotals.payed.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice List Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Nenhuma despesa encontrada
            </h3>
            <p className="text-lg text-gray-600">
              {searchTerm || filter !== "all"
                ? "Tente ajustar os critérios de pesquisa ou filtro"
                : "Ainda não foram submetidas despesas"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-gray-100">
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
                  isApprovalMode={false}
                  showUserColumn={false}
                  onView={onView}
                  onApprove={() => {}}
                  onReject={() => {}}
                  onSubmit={onSubmit}
                  onRepeat={onRepeat}
                />
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Controls - Bottom */}
        {filteredInvoices.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={filteredInvoices.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setItemsPerPage}
            onFirstPage={() => setCurrentPage(1)}
            onLastPage={() => setCurrentPage(totalPages)}
            onNextPage={goToNextPage}
            onPreviousPage={goToPreviousPage}
          />
        )}
      </div>

      {/* Export Filters Modal */}
      <ExportFiltersModal
        isVisible={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportSubmit}
        users={[]} // No users filter for personal expenses
        currentUser={currentUser}
        initialFilters={getInitialExportFilters()}
      />
    </div>
  );
};
