import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

interface EfaturaTableRowProps {
  row: any;
  index: number;
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}

export const EfaturaTableRow: React.FC<EfaturaTableRowProps> = ({
  row,
  index,
  formatCurrency,
  formatDate,
}) => {
  return (
    <tr key={index} className="hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-900">{row.vendor_nif || "N/A"}</td>
      <td className="px-4 py-3 text-gray-900">{row.vendor_name || "N/A"}</td>
      <td className="px-4 py-3 text-gray-900">{row.invoice_number || "N/A"}</td>
      <td className="px-4 py-3 text-gray-900 font-medium">
        {formatCurrency(row.amount || 0)}
      </td>
      <td className="px-4 py-3 text-gray-600">
        {row.date ? formatDate(row.date) : "N/A"}
      </td>
      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
        {row.description || "N/A"}
      </td>
    </tr>
  );
};

// Header component for Efatura table
interface EfaturaTableHeaderProps {
  sortField: string;
  sortDirection: "asc" | "desc";
  onSort: (field: string) => void;
}

export const EfaturaTableHeader: React.FC<EfaturaTableHeaderProps> = ({
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
          onClick={() => onSort("vendor_nif")}
        >
          <div className="flex items-center">
            NIF
            <SortIcon field="vendor_nif" />
          </div>
        </th>
        <th
          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
          onClick={() => onSort("vendor_name")}
        >
          <div className="flex items-center">
            Fornecedor
            <SortIcon field="vendor_name" />
          </div>
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Nº Fatura
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
        <th
          className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
          onClick={() => onSort("date")}
        >
          <div className="flex items-center">
            Data
            <SortIcon field="date" />
          </div>
        </th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
          Descrição
        </th>
      </tr>
    </thead>
  );
};
