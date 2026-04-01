import { useMemo, useState } from "react";
import { Invoice, User } from "../types";

export type SortField =
  | "vendor"
  | "userName"
  | "amount"
  | "type"
  | "payer"
  | "status"
  | "date"
  | "dateSubmitted";

export type SortDirection = "asc" | "desc";

interface UseInvoiceFilteringProps {
  invoices: Invoice[];
  currentUser: User;
  isApprovalMode?: boolean;
  filter: "all" | "pending" | "rejected" | "payed" | "submitted" | "approved";
  searchTerm: string;
}

export const useInvoiceFiltering = ({
  invoices,
  currentUser,
  isApprovalMode = false,
  filter,
  searchTerm,
}: UseInvoiceFilteringProps) => {
  const [sortField, setSortField] = useState<SortField>("dateSubmitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Handle sorting
  const handleSort = (field: SortField) => {
    if (sortDirection === "asc") {
      setSortField(field);
      setSortDirection("desc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort invoices
  const filteredInvoices = useMemo(() => {
    // First filter
    let filtered = invoices.filter((invoice) => {
      // In approval mode, show all invoices; otherwise, show only user's invoices
      const userFilter = isApprovalMode || invoice.userId === currentUser.id;

      // Status filter
      const statusFilter =
        filter === "all" || invoice.status.toLowerCase() === filter;

      // Search filter
      const searchFilter =
        searchTerm === "" ||
        invoice.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.userName.toLowerCase().includes(searchTerm.toLowerCase());

      return userFilter && statusFilter && searchFilter;
    });

    // Then sort
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case "vendor":
            aValue = a.vendor.toLowerCase();
            bValue = b.vendor.toLowerCase();
            break;
          case "userName":
            aValue = a.userName.toLowerCase();
            bValue = b.userName.toLowerCase();
            break;
          case "amount":
            aValue = a.amount;
            bValue = b.amount;
            break;
          case "type":
            aValue = a.type.toLowerCase();
            bValue = b.type.toLowerCase();
            break;
          case "payer":
            aValue = a.payer || "";
            bValue = b.payer || "";
            break;
          case "status":
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case "date":
            aValue = new Date(a.date).getTime();
            bValue = new Date(b.date).getTime();
            break;
          case "dateSubmitted":
            aValue = new Date(a.submissionDate).getTime();
            bValue = new Date(b.submissionDate).getTime();
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [
    invoices,
    isApprovalMode,
    currentUser.id,
    filter,
    searchTerm,
    sortField,
    sortDirection,
  ]);

  return {
    filteredInvoices,
    sortField,
    sortDirection,
    handleSort,
    setSortField,
    setSortDirection,
  };
};
