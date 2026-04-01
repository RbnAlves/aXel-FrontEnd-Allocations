import { useCallback, useEffect, useState } from "react";
import { doorAccessService } from "../../services/doorAccessService";
import { DoorAccessLog, DoorAccessLogsFilters } from "../../types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
  Search,
  FileText,
  RefreshCw,
} from "lucide-react";
import { PaginationControls } from "../ui/pagination-controls";
import { format } from "date-fns";
import { TableSortIcon } from "../ui/table-sort-icon";

const SEARCH_DEBOUNCE_MS = 300;

export function DoorAccessLogs() {
  const [logs, setLogs] = useState<DoorAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<
    | "timestamp"
    | "action"
    | "user_name"
    | "ip_address"
    | "proximity_check_passed"
    | "unlock_duration_seconds"
  >("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [exporting, setExporting] = useState(false);

  const totalPages = Math.ceil(total / itemsPerPage);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: DoorAccessLogsFilters = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
        sort_by: sortField,
        sort_order: sortDirection,
      };

      if (actionFilter) filters.action = actionFilter;
      if (startDate) filters.start_date = new Date(startDate).toISOString();
      if (endDate) filters.end_date = new Date(endDate).toISOString();
      if (searchTerm) filters.search = searchTerm;

      const response = await doorAccessService.getAccessLogs(filters);
      setLogs(response.logs);
      setTotal(response.total);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Falha ao carregar os registos de acesso";
      setError(message);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, [
    itemsPerPage,
    currentPage,
    sortField,
    sortDirection,
    actionFilter,
    startDate,
    endDate,
    searchTerm,
  ]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionLabelMap: Record<string, string> = {
    UNLOCK_REQUEST: "Pedido de abertura",
    UNLOCK_SUCCESS: "Abertura com sucesso",
    UNLOCK_FAILED: "Abertura falhada",
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const filters: DoorAccessLogsFilters = {
        action: actionFilter || undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        search: searchInput.trim() || undefined,
        sort_by: sortField,
        sort_order: sortDirection,
      };
      await doorAccessService.exportAccessLogsToExcel(filters);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Falha na exportação dos registos";
      setError(message);
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (
    field:
      | "timestamp"
      | "action"
      | "user_name"
      | "ip_address"
      | "proximity_check_passed"
      | "unlock_duration_seconds",
  ) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "UNLOCK_SUCCESS":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "UNLOCK_FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    const baseClasses = "px-2 py-0.5 rounded-full text-xs font-medium";
    switch (action) {
      case "UNLOCK_SUCCESS":
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            Sucesso
          </span>
        );
      case "UNLOCK_FAILED":
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            Falha
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            Pedido
          </span>
        );
    }
  };

  if (loading && !hasLoadedOnce) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500 mt-1">
            Total de registos: {total}
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="text-sm px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "A exportar..." : "Exportar Excel"}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 xl:items-end">
          <div className="xl:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Utilizador, email, IP, motivo..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 w-full"
              />
              {loading && hasLoadedOnce && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ação
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:outline-none"
            >
              <option value="">Todas</option>
              <option value="UNLOCK_SUCCESS">Abertura com sucesso</option>
              <option value="UNLOCK_FAILED">Abertura falhada</option>
              <option value="UNLOCK_REQUEST">Pedido de abertura</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <Button
            onClick={() => {
              setActionFilter("");
              setStartDate("");
              setEndDate("");
              setSearchInput("");
              setSearchTerm("");
              setSortField("timestamp");
              setSortDirection("desc");
              setCurrentPage(1);
            }}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Repor
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>
                <button
                  onClick={() => handleSort("timestamp")}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  Data/Hora
                  <TableSortIcon
                    field="timestamp"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("user_name")}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  Utilizador
                  <TableSortIcon
                    field="user_name"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("action")}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  Ação
                  <TableSortIcon
                    field="action"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("ip_address")}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  Endereço IP
                  <TableSortIcon
                    field="ip_address"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("proximity_check_passed")}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  Proximidade
                  <TableSortIcon
                    field="proximity_check_passed"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort("unlock_duration_seconds")}
                  className="flex items-center hover:text-gray-900 transition-colors"
                >
                  Duração
                  <TableSortIcon
                    field="unlock_duration_seconds"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                  />
                </button>
              </TableHead>
              <TableHead>Motivo de Falha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-gray-500 py-8"
                >
                  <div className="flex flex-col items-center">
                    <FileText className="w-10 h-10 text-gray-400 mb-2" />
                    <span>Nenhum registo de acesso encontrado</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{log.user_name}</div>
                      <div className="text-xs text-gray-500">
                        {log.user_email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm">
                        {actionLabelMap[log.action] || log.action}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.ip_address}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.proximity_check_passed
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {log.proximity_check_passed ? "Sim" : "Não"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.unlock_duration_seconds
                      ? `${log.unlock_duration_seconds}s`
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-gray-600">
                    {log.failure_reason || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={total}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize: number) => {
            setItemsPerPage(newSize);
            setCurrentPage(1);
          }}
          onFirstPage={() => setCurrentPage(1)}
          onLastPage={() => setCurrentPage(totalPages)}
          onNextPage={() =>
            setCurrentPage(Math.min(currentPage + 1, totalPages))
          }
          onPreviousPage={() => setCurrentPage(Math.max(currentPage - 1, 1))}
        />
      )}
    </div>
  );
}
