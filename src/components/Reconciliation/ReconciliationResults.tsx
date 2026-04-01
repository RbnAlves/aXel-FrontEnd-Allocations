import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";
import { ReconciliationResultResponse as ReconciliationResultsType } from "../../types";
import { usePagination } from "../../hooks/usePagination";
import { cn } from "../../lib/utils";
import { PaginationControls } from "../ui/pagination-controls";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { reconciliationEnumsService } from "../../services/reconciliationEnumsService";

interface ReconciliationResultsProps {
  results: ReconciliationResultsType;
  discrepancyTypeLabelMap: Record<string, string>;
  onExport?: () => void;
}

export const ReconciliationResults: React.FC<ReconciliationResultsProps> = ({
  results,
  discrepancyTypeLabelMap,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "discrepancies">(
    "summary"
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingEnums, setIsLoadingEnums] = useState(false);
  const [discrepancyTypeDescriptionMap, setDiscrepancyTypeDescriptionMap] =
    useState<Record<string, string>>({});
  const [severityLevelDescriptionMap, setSeverityLevelDescriptionMap] =
    useState<Record<string, string>>({});
  const [severityLevelLabelMap, setSeverityLevelLabelMap] = useState<
    Record<string, string>
  >({});
  const [showLoading, setShowLoading] = useState(false);
  const hasFetchedEnumsRef = useRef(false);

  // Fetch enums on component mount
  useEffect(() => {
    if (hasFetchedEnumsRef.current) return;
    hasFetchedEnumsRef.current = true;
    const fetchEnums = async () => {
      setIsLoadingEnums(true);
      try {
        const [types, severities] = await Promise.all([
          reconciliationEnumsService.getDiscrepancyTypes("pt-PT"),
          reconciliationEnumsService.getSeverityLevels("pt-PT"),
        ]);

        // Create maps for quick lookup without refetching types
        setDiscrepancyTypeDescriptionMap(
          reconciliationEnumsService.createDiscrepancyTypeDescriptionMap(types)
        );
        setSeverityLevelDescriptionMap(
          reconciliationEnumsService.createSeverityLevelDescriptionMap(
            severities
          )
        );
        setSeverityLevelLabelMap(
          reconciliationEnumsService.createSeverityLevelLabelMap(severities)
        );
      } catch (error) {
        console.error("Error fetching reconciliation enums:", error);
      } finally {
        setIsLoadingEnums(false);
      }
    };

    fetchEnums();
  }, []);

  // Avoid loading overlay flicker by delaying its visibility slightly
  useEffect(() => {
    let timeoutId: number | undefined;

    if (isLoadingEnums) {
      timeoutId = window.setTimeout(() => setShowLoading(true), 150);
    } else {
      setShowLoading(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoadingEnums]);

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Calculate reconciliation rate
  const reconciliationRate =
    results.total_efatura > 0
      ? (results.matched_count / results.total_efatura) * 100
      : 0;

  // Calculate reconciliation rate color
  const getRateColor = (rate: number): string => {
    if (rate >= 90) return "text-green-600";
    if (rate >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const severityLabels = {
    high: severityLevelLabelMap["HIGH"] || "Críticas",
    medium: severityLevelLabelMap["MEDIUM"] || "Médias",
    low: severityLevelLabelMap["LOW"] || "Baixas",
  };

  // Filter discrepancies
  const filteredDiscrepancies = useMemo(() => {
    let filtered = results.discrepancies;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Sort by severity: HIGH > MEDIUM > LOW
    return filtered.sort((a, b) => {
      const severityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const aOrder =
        severityOrder[a.severity as keyof typeof severityOrder] || 0;
      const bOrder =
        severityOrder[b.severity as keyof typeof severityOrder] || 0;
      return bOrder - aOrder;
    });
  }, [results.discrepancies, searchTerm]);

  // Pagination for discrepancies
  const discrepanciesPagination = usePagination({
    items: filteredDiscrepancies,
    initialPageSize: 5,
  });

  // Compute discrepancies by type and severity
  const discrepanciesByTypeAndSeverity = useMemo(() => {
    const grouped: Record<
      string,
      { HIGH: number; MEDIUM: number; LOW: number; total: number }
    > = {};

    results.discrepancies.forEach((row: any) => {
      const type = row.type || "UNKNOWN";
      const severity = (row.severity || "LOW") as "HIGH" | "MEDIUM" | "LOW";

      if (!grouped[type]) {
        grouped[type] = { HIGH: 0, MEDIUM: 0, LOW: 0, total: 0 };
      }

      if (severity === "HIGH" || severity === "MEDIUM" || severity === "LOW") {
        grouped[type][severity]++;
        grouped[type].total++;
      }
    });

    // Sort by severity level: HIGH first, then MEDIUM, then LOW
    return Object.fromEntries(
      Object.entries(grouped).sort((a, b) => {
        if (b[1].HIGH !== a[1].HIGH) return b[1].HIGH - a[1].HIGH;
        if (b[1].MEDIUM !== a[1].MEDIUM) return b[1].MEDIUM - a[1].MEDIUM;
        return b[1].LOW - a[1].LOW;
      })
    );
  }, [results.discrepancies]);

  if (showLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-xl flex items-center space-x-4 max-w-xs md:max-w-md mx-auto">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
          <p className="text-gray-700">A carregar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* E-fatura Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600 uppercase">
                Total e-fatura
              </p>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className="px-0 py-0 bg-transparent text-blue-500 hover:text-blue-600"
                >
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent color="gray" sideOffset={6}>
                  Valor total de todas as faturas carregadas do ficheiro
                  e-fatura
                </TooltipContent>
              </Tooltip>
            </div>
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(results.total_efatura_amount || 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {results.total_efatura} fatura(s)
          </p>
        </div>

        {/* System Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600 uppercase">
                Total aXel
              </p>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className="px-0 py-0 bg-transparent text-yellow-500 hover:text-yellow-600"
                >
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent color="gray" sideOffset={6}>
                  Valor total de todas as faturas registadas no aXel, no período
                  definido
                </TooltipContent>
              </Tooltip>
            </div>
            <FileText className="h-4 w-4 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(results.total_system_amount || 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {results.total_system} fatura(s)
          </p>
        </div>

        {/* Differences Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600 uppercase">
                Total Diferenças
              </p>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className="px-0 py-0 bg-transparent text-orange-500 hover:text-orange-600"
                >
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent color="gray" sideOffset={6}>
                  Valor total das diferenças encontradas entre e-fatura e aXel
                </TooltipContent>
              </Tooltip>
            </div>
            <FileText className="h-4 w-4 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(results.total_difference_amount || 0)}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {results.total_difference} fatura(s)
          </p>
        </div>

        {/* Reconciliation Rate Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600 uppercase">
                Taxa Reconciliação
              </p>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className="px-0 py-0 bg-transparent text-green-500 hover:text-green-600"
                >
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent color="gray" sideOffset={6}>
                  Percentagem de faturas que correspondem entre e-fatura e aXel
                </TooltipContent>
              </Tooltip>
            </div>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p
            className={cn(
              "text-2xl font-bold",
              getRateColor(reconciliationRate)
            )}
          >
            {reconciliationRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {results.matched_count} de{" "}
            {results.matched_count +
              results.missing_in_system_count +
              results.duplicate_count}
          </p>
        </div>

        {/* Discrepancies Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-600 uppercase">
                Incoerências
              </p>
              <Tooltip>
                <TooltipTrigger
                  asChild
                  className="px-0 py-0 bg-transparent text-red-500 hover:text-red-600"
                >
                  <HelpCircle className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent color="gray" sideOffset={6}>
                  Número total de incoerências detectadas na reconciliação
                </TooltipContent>
              </Tooltip>
            </div>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {results.discrepancies.length}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {results.discrepancies_high} críticas
          </p>
        </div>
      </div>

      {/* Export Button */}
      {onExport && (
        <div className="flex justify-center">
          <button
            onClick={onExport}
            className="flex items-center px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Relatório Completo</span>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => {
                setActiveTab("summary");
                setSearchTerm("");
              }}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors",
                activeTab === "summary"
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Resumo
            </button>
            <button
              onClick={() => {
                setActiveTab("discrepancies");
                setSearchTerm("");
              }}
              className={cn(
                "flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors",
                activeTab === "discrepancies"
                  ? "border-yellow-500 text-yellow-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Incoerências ({filteredDiscrepancies.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* General Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Estatísticas Gerais
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">
                        Diferença Total:
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {formatCurrency(results.total_difference_amount || 0)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">
                        Faturas reconciliadas:
                      </dt>
                      <dd className="text-sm font-semibold">
                        {results.matched_count}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">
                        Tempo Processamento:
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {results.processing_time_seconds.toFixed(2)}s
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Discrepancies by Severity */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Incoerências por Severidade
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-800 flex items-center gap-2">
                        {severityLevelDescriptionMap["HIGH"] && (
                          <Tooltip>
                            <TooltipTrigger
                              asChild
                              className="px-0 py-0 bg-transparent text-red-600 hover:text-red-700"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent color="red" sideOffset={6}>
                              {severityLevelDescriptionMap["HIGH"]}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {severityLabels.high}:
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {results.discrepancies_high}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-800 flex items-center gap-2">
                        {severityLevelDescriptionMap["MEDIUM"] && (
                          <Tooltip>
                            <TooltipTrigger
                              asChild
                              className="px-0 py-0 bg-transparent text-yellow-600 hover:text-yellow-700"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent color="yellow" sideOffset={6}>
                              {severityLevelDescriptionMap["MEDIUM"]}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {severityLabels.medium}:
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {results.discrepancies_medium}
                      </dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-sm text-gray-800 flex items-center gap-2">
                        {severityLevelDescriptionMap["LOW"] && (
                          <Tooltip>
                            <TooltipTrigger
                              asChild
                              className="px-0 py-0 bg-transparent text-blue-600 hover:text-blue-700"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </TooltipTrigger>
                            <TooltipContent color="blue" sideOffset={6}>
                              {severityLevelDescriptionMap["LOW"]}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {severityLabels.low}:
                      </dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {results.discrepancies_low}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* Distribution Stats */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Em falta por Sistema
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">aXel:</dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {results.missing_in_system_count}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-sm text-gray-600">e-fatura:</dt>
                      <dd className="text-sm font-semibold text-gray-900">
                        {results.missing_in_efatura_count}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Discrepancies by Type */}
              {Object.keys(discrepanciesByTypeAndSeverity).length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      Incoerências por Tipo e Severidade
                      <Tooltip>
                        <TooltipTrigger
                          asChild
                          className="px-0 py-0 bg-transparent text-gray-400 hover:text-gray-500"
                        >
                          <HelpCircle className="h-4 w-4" />
                        </TooltipTrigger>
                        <TooltipContent color="gray" sideOffset={6}>
                          Distribuição das incoerências por tipo e nível de
                          severidade (Críticas, Médias, Baixas)
                        </TooltipContent>
                      </Tooltip>
                    </h3>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {Object.entries(discrepanciesByTypeAndSeverity).map(
                        ([type, counts]) => {
                          const label = discrepancyTypeLabelMap[type] || type;
                          const description =
                            discrepancyTypeDescriptionMap[type] || "";
                          return (
                            <div
                              key={type}
                              className="border-b border-gray-100 last:border-0 pb-3 last:pb-0"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {label}
                                  </span>
                                  {description && (
                                    <Tooltip>
                                      <TooltipTrigger
                                        asChild
                                        className="px-0 py-0 bg-transparent text-gray-400 hover:text-gray-500"
                                      >
                                        <HelpCircle className="h-4 w-4" />
                                      </TooltipTrigger>
                                      <TooltipContent
                                        color="gray"
                                        sideOffset={6}
                                      >
                                        {description}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                <span className="text-sm font-semibold text-gray-900">
                                  {counts.total}
                                </span>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                {counts.HIGH > 0 && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    {severityLabels.high}: {counts.HIGH}
                                  </span>
                                )}
                                {counts.MEDIUM > 0 && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    {severityLabels.medium}: {counts.MEDIUM}
                                  </span>
                                )}
                                {counts.LOW > 0 && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {severityLabels.low}: {counts.LOW}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "discrepancies" && (
            <div className="space-y-4">
              {/* Search Filter */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Procurar incoerências..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                </div>
              </div>

              {/* Discrepancies Table */}
              {filteredDiscrepancies.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600">
                    Nenhuma incoerência encontrada
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            #
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ID fatura
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sugestão
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {discrepanciesPagination.paginatedItems.map(
                          (row: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {discrepanciesPagination.startIndex + idx + 1}
                              </td>
                              <td className="px-6 py-4">
                                <div className="space-y-2">
                                  {row.type && (
                                    <div className="text-sm font-medium text-gray-800">
                                      {discrepancyTypeLabelMap[row.type]}
                                    </div>
                                  )}
                                  {row.severity && (
                                    <div>
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                          row.severity === "HIGH"
                                            ? "bg-red-100 text-red-800"
                                            : row.severity === "MEDIUM"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-blue-100 text-blue-800"
                                        }`}
                                      >
                                        {severityLevelLabelMap[row.severity]}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="text-gray-500">
                                  {row.invoice_number && (
                                    <span>{row.invoice_number}</span>
                                  )}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className="text-gray-500">
                                  {row.suggestion && (
                                    <span>{row.suggestion}</span>
                                  )}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <PaginationControls
                    currentPage={discrepanciesPagination.currentPage}
                    totalPages={discrepanciesPagination.totalPages}
                    itemsPerPage={discrepanciesPagination.itemsPerPage}
                    totalItems={filteredDiscrepancies.length}
                    startIndex={discrepanciesPagination.startIndex}
                    endIndex={discrepanciesPagination.endIndex}
                    onPageChange={(page) =>
                      discrepanciesPagination.goToPage(page)
                    }
                    onPageSizeChange={(size) =>
                      discrepanciesPagination.setItemsPerPage(size)
                    }
                    onFirstPage={() => discrepanciesPagination.goToFirstPage()}
                    onLastPage={() => discrepanciesPagination.goToLastPage()}
                    onNextPage={() => discrepanciesPagination.goToNextPage()}
                    onPreviousPage={() =>
                      discrepanciesPagination.goToPreviousPage()
                    }
                  />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
