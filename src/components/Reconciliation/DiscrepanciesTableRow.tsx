import React from "react";
import { DiscrepancyRow } from "../../types";
import { cn } from "../../lib/utils";

interface DiscrepanciesTableRowProps {
  row: DiscrepancyRow;
  index: number;
  getSeverityColor: (severity: string) => string;
}

export const DiscrepanciesTableRow: React.FC<DiscrepanciesTableRowProps> = ({
  row,
  index,
  getSeverityColor,
}) => {
  const getSeverityBadge = (severity: string) => {
    const severityMap: Record<
      string,
      { color: string; label: string; bg: string }
    > = {
      ERROR: { color: "text-red-800", label: "Erro", bg: "bg-red-100" },
      WARNING: {
        color: "text-yellow-800",
        label: "Aviso",
        bg: "bg-yellow-100",
      },
      INFO: { color: "text-blue-800", label: "Info", bg: "bg-blue-100" },
    };

    const info = severityMap[severity] || {
      color: "text-gray-800",
      label: severity,
      bg: "bg-gray-100",
    };

    return (
      <span
        className={cn(
          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
          info.bg,
          info.color
        )}
      >
        {info.label}
      </span>
    );
  };

  return (
    <tr
      key={index}
      className={cn(
        "hover:bg-gray-50 border-l-4",
        getSeverityColor(row.severity)
      )}
    >
      <td className="px-4 py-3 text-gray-900 font-mono text-xs">{row.key}</td>
      <td className="px-4 py-3 text-gray-700">{row.type}</td>
      <td className="px-4 py-3 text-gray-700">{row.field}</td>
      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
        {row.value_efatura || "N/A"}
      </td>
      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
        {row.value_system || "N/A"}
      </td>
      <td className="px-4 py-3">{getSeverityBadge(row.severity)}</td>
      <td className="px-4 py-3 text-gray-600 max-w-xs">
        {row.suggestion || "N/A"}
      </td>
    </tr>
  );
};

// Header component for Discrepancies table
export const DiscrepanciesTableHeader: React.FC = () => {
  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Chave
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Tipo
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Campo
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Valor e-fatura
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Valor aXel
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Severidade
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Sugestão
        </th>
      </tr>
    </thead>
  );
};
