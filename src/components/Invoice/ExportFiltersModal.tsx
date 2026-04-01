import React, { useState, useEffect } from "react";
import { Calendar, FileSpreadsheet, Filter, X } from "lucide-react";
import { ExpenseType, User } from "../../types";
import { expenseTypeService } from "../../services/expenseTypeService";
import { DatePickerInput } from "../ui/date-picker-input";
import { StatusSelector } from "../ui/selectors/status-selector";

type AllowedStatus =
  | "all"
  | "pending"
  | "rejected"
  | "payed"
  | "submitted"
  | "approved";

interface ExportFiltersModalProps {
  isVisible: boolean;
  onClose: () => void;
  onExport: (filters: ExportFilters) => void;
  users?: { id: string; name: string }[];
  currentUser: User;
  initialFilters?: ExportFilters;
}

export interface ExportFilters {
  submission_date_start?: string;
  submission_date_end?: string;
  invoice_date_start?: string;
  invoice_date_end?: string;
  expense_type_id?: number;
  vendor_nif?: string;
  user_id?: string;
  status?: string;
  min_amount?: number;
  max_amount?: number;
}

export const ExportFiltersModal: React.FC<ExportFiltersModalProps> = ({
  isVisible,
  onClose,
  onExport,
  users = [],
  currentUser,
  initialFilters,
}) => {
  const parseDateValue = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDateForApi = (value: Date | null): string | undefined => {
    if (!value) return undefined;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [filters, setFilters] = useState<ExportFilters>(initialFilters || {});
  const [submissionDateStart, setSubmissionDateStart] = useState<Date | null>(
    parseDateValue(initialFilters?.submission_date_start),
  );
  const [submissionDateEnd, setSubmissionDateEnd] = useState<Date | null>(
    parseDateValue(initialFilters?.submission_date_end),
  );
  const [invoiceDateStart, setInvoiceDateStart] = useState<Date | null>(
    parseDateValue(initialFilters?.invoice_date_start),
  );
  const [invoiceDateEnd, setInvoiceDateEnd] = useState<Date | null>(
    parseDateValue(initialFilters?.invoice_date_end),
  );
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Update filters when initialFilters changes and modal opens
  useEffect(() => {
    if (isVisible && initialFilters) {
      setFilters(initialFilters);
      setSubmissionDateStart(
        parseDateValue(initialFilters.submission_date_start),
      );
      setSubmissionDateEnd(parseDateValue(initialFilters.submission_date_end));
      setInvoiceDateStart(parseDateValue(initialFilters.invoice_date_start));
      setInvoiceDateEnd(parseDateValue(initialFilters.invoice_date_end));
    }
  }, [isVisible, initialFilters]);

  // Fetch expense types when component mounts
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        const types = await expenseTypeService.getExpenseTypes();
        setExpenseTypes(types);
      } catch (error) {
        console.error("Failed to fetch expense types:", error);
      }
    };

    if (isVisible) {
      fetchExpenseTypes();
    }
  }, [isVisible]);

  const handleFilterChange = (
    name: keyof ExportFilters,
    value: string | number,
  ) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value === "" ? undefined : value,
    }));
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const exportFilters: ExportFilters = {
        ...filters,
        submission_date_start: formatDateForApi(submissionDateStart),
        submission_date_end: formatDateForApi(submissionDateEnd),
        invoice_date_start: formatDateForApi(invoiceDateStart),
        invoice_date_end: formatDateForApi(invoiceDateEnd),
      };
      await onExport(exportFilters);
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSubmissionDateStart(null);
    setSubmissionDateEnd(null);
    setInvoiceDateStart(null);
    setInvoiceDateEnd(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <FileSpreadsheet className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Exportar Despesas para Excel
              </h3>
              <p className="text-sm text-gray-600">
                Configure os filtros para exportação dos dados.
              </p>
              <p className="text-sm text-gray-600">
                No máximo 5000 registros por exportação.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Filters */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                Filtros de Data
              </h4>

              {/* Submission Date Range */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Intervalo de Data de Submissão
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePickerInput
                    value={submissionDateStart}
                    onChange={(date) => {
                      setSubmissionDateStart(date);
                      handleFilterChange(
                        "submission_date_start",
                        formatDateForApi(date) || "",
                      );
                    }}
                    placeholder="dd/mm/yyyy"
                    id="submission-date-start"
                    className="text-sm"
                  />
                  <DatePickerInput
                    value={submissionDateEnd}
                    onChange={(date) => {
                      setSubmissionDateEnd(date);
                      handleFilterChange(
                        "submission_date_end",
                        formatDateForApi(date) || "",
                      );
                    }}
                    placeholder="dd/mm/yyyy"
                    id="submission-date-end"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Invoice Date Range */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Intervalo de Data da Fatura
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <DatePickerInput
                    value={invoiceDateStart}
                    onChange={(date) => {
                      setInvoiceDateStart(date);
                      handleFilterChange(
                        "invoice_date_start",
                        formatDateForApi(date) || "",
                      );
                    }}
                    placeholder="dd/mm/yyyy"
                    id="invoice-date-start"
                    className="text-sm"
                  />
                  <DatePickerInput
                    value={invoiceDateEnd}
                    onChange={(date) => {
                      setInvoiceDateEnd(date);
                      handleFilterChange(
                        "invoice_date_end",
                        formatDateForApi(date) || "",
                      );
                    }}
                    placeholder="dd/mm/yyyy"
                    id="invoice-date-end"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Other Filters */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900 flex items-center">
                <Filter className="w-4 h-4 mr-2 text-purple-600" />
                Outros Filtros
              </h4>

              {/* Expense Type */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Tipologia de Despesa
                </label>
                <select
                  value={filters.expense_type_id || ""}
                  onChange={(e) =>
                    handleFilterChange(
                      "expense_type_id",
                      e.target.value ? parseInt(e.target.value) : "",
                    )
                  }
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todas as tipologias</option>
                  {expenseTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Estado
                </label>
                <StatusSelector
                  filter={
                    (filters.status?.toLowerCase() as AllowedStatus) || "all"
                  }
                  setFilter={(value: AllowedStatus) =>
                    handleFilterChange("status", value === "all" ? "" : value)
                  }
                  className="w-full focus:outline-none focus:ring-0 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Collaborator - only show for approvers/admins */}
              {(currentUser.role === "APPROVER" ||
                currentUser.role === "ADMIN") &&
                users.length > 0 && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Colaborador
                    </label>
                    <select
                      value={filters.user_id || ""}
                      onChange={(e) =>
                        handleFilterChange("user_id", e.target.value)
                      }
                      className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Todos os colaboradores</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              {/* Vendor NIF */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  NIF do Fornecedor
                </label>
                <input
                  type="text"
                  value={filters.vendor_nif || ""}
                  onChange={(e) =>
                    handleFilterChange("vendor_nif", e.target.value)
                  }
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: 123456789"
                />
              </div>
            </div>

            {/* Value Range */}
            <div className="space-y-4 md:col-span-2">
              <h4 className="text-md font-medium text-gray-900">
                Intervalo de Valor
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Valor Mínimo (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={filters.min_amount || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "min_amount",
                        e.target.value ? parseFloat(e.target.value) : "",
                      )
                    }
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Valor Máximo (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={filters.max_amount || ""}
                    onChange={(e) =>
                      handleFilterChange(
                        "max_amount",
                        e.target.value ? parseFloat(e.target.value) : "",
                      )
                    }
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="999999.99"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Information Box */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="text-sm font-medium text-blue-900 mb-2">
              Campos incluídos na exportação:
            </h5>
            <p className="text-sm text-blue-700">
              Data Submissao | Colaborador | Número Fatura | Data Fatura |
              Fornecedor | NIF Fornecedor | Tipologia | Categoria | Pago por |
              Valor sem IVA | Valor IVA | Valor Total | Valor Retenção na Fonte
              | Estado
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Limpar Filtros
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exportando...
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
