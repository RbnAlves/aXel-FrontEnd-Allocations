import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface SystemTableRowProps {
  row: any;
  index: number;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
}

export const SystemTableRow: React.FC<SystemTableRowProps> = ({
  row,
  index,
  formatCurrency,
  formatDate,
  getStatusBadge,
}) => {
  return (
    <tr key={index} className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-900">{row.vendor || "N/A"}</td>
      <td className="px-4 py-3 text-gray-900 font-medium">
        {formatCurrency(row.amount || 0)}
      </td>
      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
        {row.description || "N/A"}
      </td>
      <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
      <td className="px-4 py-3 text-gray-600">
        {row.submission_date ? formatDate(row.submission_date) : "N/A"}
      </td>
    </tr>
  );
};

// Header component for System table
interface SystemTableHeaderProps {
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}

export const SystemTableHeader: React.FC<SystemTableHeaderProps> = ({
  sortField,
  sortDirection,
  onSort,
}) => {
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  return (
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th
          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
          onClick={() => onSort("vendor")}
        >
          <div className="flex items-center">
            Fornecedor
            <SortIcon field="vendor" />
          </div>
        </th>
        <th
          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
          onClick={() => onSort("amount")}
        >
          <div className="flex items-center">
            Montante
            <SortIcon field="amount" />
          </div>
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Descrição
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Estado
        </th>
        <th
          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
          onClick={() => onSort("submission_date")}
        >
          <div className="flex items-center">
            Data Submissão
            <SortIcon field="submission_date" />
          </div>
        </th>
      </tr>
    </thead>
  );
};
