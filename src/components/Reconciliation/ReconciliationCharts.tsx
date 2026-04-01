import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ReconciliationResultResponse as ReconciliationResultsType } from "../../types";

interface ReconciliationChartsProps {
  results: ReconciliationResultsType;
  discrepancyTypeLabelMap: Record<string, string>;
}

const COLORS = {
  matched: "#10b981", // green-500
  missing_system: "#ef4444", // red-500
  missing_efatura: "#f59e0b", // amber-500
  duplicates: "#8b5cf6", // violet-500
  high: "#dc2626", // red-600
  medium: "#f59e0b", // amber-500
  low: "#3b82f6", // blue-500
};

// Color gradient for discrepancy types
const GRADIENT_COLORS = [
  "#0ea5e9", // cyan-500
  "#06b6d4", // cyan-500
  "#14b8a6", // teal-500
  "#10b981", // emerald-500
  "#84cc16", // lime-500
  "#eab308", // yellow-400
  "#f59e0b", // amber-500
  "#f97316", // orange-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
];

export const ReconciliationCharts: React.FC<ReconciliationChartsProps> = ({
  results,
  discrepancyTypeLabelMap,
}) => {
  // Format currency for tooltips
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 1. Reconciliation Status Pie Data
  const reconciliationPieData = useMemo(() => {
    return [
      {
        name: "Reconciliadas",
        value: results.matched_count,
        color: COLORS.matched,
      },
      {
        name: "Faltam no aXel",
        value: results.missing_in_system_count,
        color: COLORS.missing_system,
      },
      {
        name: "Faltam no e-fatura",
        value: results.missing_in_efatura_count,
        color: COLORS.missing_efatura,
      },
      {
        name: "Duplicadas",
        value: results.duplicate_count,
        color: COLORS.duplicates,
      },
    ].filter((item) => item.value > 0);
  }, [
    results.matched_count,
    results.missing_in_system_count,
    results.missing_in_efatura_count,
    results.duplicate_count,
  ]);

  // 2. Severity Bar Data
  const severityBarData = useMemo(() => {
    return [
      {
        severity: "Crítica",
        count: results.discrepancies_high,
        color: COLORS.high,
      },
      {
        severity: "Média",
        count: results.discrepancies_medium,
        color: COLORS.medium,
      },
      {
        severity: "Baixa",
        count: results.discrepancies_low,
        color: COLORS.low,
      },
    ];
  }, [
    results.discrepancies_high,
    results.discrepancies_medium,
    results.discrepancies_low,
  ]);

  // 3. Discrepancy Types Bar Data
  const discrepancyTypesData = useMemo(() => {
    if (!results.discrepancies_by_type) {
      return [];
    }
    return Object.entries(results.discrepancies_by_type)
      .map(([type, count], index) => ({
        id: type,
        label: discrepancyTypeLabelMap[type] || type,
        count,
        color: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
      }))
      .slice(0, 10);
  }, [results.discrepancies_by_type, discrepancyTypeLabelMap]);

  // Custom label for pie chart
  const renderCustomLabel = (entry: any) => {
    const percent = (
      (entry.value /
        reconciliationPieData.reduce((sum, item) => sum + item.value, 0)) *
      100
    ).toFixed(1);
    return `${entry.name}: ${percent}%`;
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Visualizações Gráficas
        </h2>
        <p className="text-sm text-gray-600">
          Análise visual dos resultados da reconciliação
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Reconciliation Status Pie Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Estado da Reconciliação
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reconciliationPieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {reconciliationPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number | undefined) =>
                  value ? value.toLocaleString("pt-PT") : "0"
                }
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Total de faturas e-fatura:{" "}
              <span className="font-semibold">
                {(
                  results.matched_count +
                  results.missing_in_system_count +
                  results.duplicate_count
                ).toLocaleString("pt-PT")}
              </span>
            </p>
          </div>
        </div>

        {/* 2. Severity Distribution Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Incoerências por Severidade
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={severityBarData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="severity" />
              <YAxis />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value ? value.toLocaleString("pt-PT") : "0"
                }
              />
              <Bar dataKey="count" name="Quantidade">
                {severityBarData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Total de incoerências:{" "}
              <span className="font-semibold">
                {results.discrepancies.length}
              </span>
            </p>
          </div>
        </div>

        {/* 3. Amount Comparison */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Comparação de Valores
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                {
                  source: "e-fatura",
                  valor: results.total_efatura_amount,
                  color: "#3b82f6",
                },
                {
                  source: "aXel",
                  valor: results.total_system_amount,
                  color: "#10b981",
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="source" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                formatter={(value: number | undefined) =>
                  value ? formatCurrency(value) : "€0"
                }
              />
              <Legend />
              <Bar dataKey="valor" name="Valor Total">
                {[
                  { source: "e-fatura", color: "#3b82f6" },
                  { source: "aXel", color: "#10b981" },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Diferença:{" "}
              <span className="font-semibold">
                {formatCurrency(Math.abs(results.total_difference_amount))}
              </span>
            </p>
          </div>
        </div>

        {/* 4. Discrepancy Types (if available) */}
        {discrepancyTypesData.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Incoerências por Tipo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={discrepancyTypesData}
                margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  angle={-45}
                  textAnchor="end"
                  height={120}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Quantidade">
                  {discrepancyTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Top {Math.min(10, discrepancyTypesData.length)} tipos de
                incoerência
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
