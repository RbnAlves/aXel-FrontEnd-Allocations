import React from "react";
import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";

type SortDirection = "asc" | "desc";

interface TableSortIconProps {
  field: string;
  currentSortField: string;
  sortDirection: SortDirection;
}

export const TableSortIcon: React.FC<TableSortIconProps> = ({
  field,
  currentSortField,
  sortDirection,
}) => {
  if (currentSortField !== field) {
    return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
  }
  if (sortDirection === "asc") {
    return <ArrowDown className="w-4 h-4 ml-1 text-gray-700" />;
  }
  return <ArrowUp className="w-4 h-4 ml-1 text-gray-700" />;
};
