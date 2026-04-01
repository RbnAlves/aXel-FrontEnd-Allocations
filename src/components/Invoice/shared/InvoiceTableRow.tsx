import React from "react";
import { Check, Clock, Copy, Download, EuroIcon, Eye, X } from "lucide-react";
import { Invoice, User } from "../../../types";
import { TableCell, TableRow } from "../../ui/table";
import { StatusBadge, TypeBadge, PayerBadge } from "./InvoiceBadges";
import { invoiceService } from "../../../services";

interface InvoiceTableRowProps {
  invoice: Invoice;
  currentUser: User;
  isApprovalMode?: boolean;
  showUserColumn?: boolean;
  onView?: (invoice: Invoice) => void;
  onApprove?: (invoiceId: string) => void;
  onReject?: (invoiceId: string) => void;
  onPay?: (invoiceId: string) => void;
  onSubmit?: (invoiceId: string) => void;
  onRepeat?: (invoice: Invoice) => void;
}

export const InvoiceTableRow: React.FC<InvoiceTableRowProps> = ({
  invoice,
  currentUser,
  isApprovalMode = false,
  showUserColumn = false,
  onView,
  onApprove,
  onReject,
  onPay,
  onSubmit,
  onRepeat,
}) => {
  // Helper function to determine if an expense is a travel expense
  const isTravelExpense = (invoice: Invoice): boolean => {
    return !!(invoice.origin || invoice.destination || invoice.kilometers);
  };

  // Handler for pay action
  const handlePay = () => {
    const isPendingOrApproved =
      invoice.status.toLowerCase() === "pending" ||
      invoice.status.toLowerCase() === "approved";
    if (isPendingOrApproved && onPay) {
      onPay(invoice.id);
    }
  };

  // Handler for approve action
  const handleApprove = () => {
    if (invoice.status.toLowerCase() === "pending" && onApprove) {
      onApprove(invoice.id);
    }
  };

  // Handler for reject action
  const handleReject = () => {
    if (invoice.status.toLowerCase() === "pending" && onReject) {
      onReject(invoice.id);
    }
  };

  return (
    <TableRow key={invoice.id}>
      <TableCell>
        <div>
          <div className="text-base font-medium text-gray-900">
            {invoice.vendor}
          </div>
          <div className="text-sm text-gray-500">{invoice.description}</div>
        </div>
      </TableCell>

      {showUserColumn && (
        <TableCell>
          <div className="text-base text-gray-900">{invoice.userName}</div>
        </TableCell>
      )}

      <TableCell>
        <div className="text-base font-medium text-gray-900">
          {invoice.amount.toFixed(2)}€
        </div>
        <div className="mt-2">
          <TypeBadge type={invoice.type} />
        </div>
        {invoice.expense_type && (
          <div className="text-sm text-gray-600 mt-1">
            {invoice.expense_type.name}
          </div>
        )}
      </TableCell>

      <TableCell className="px-6 py-4 whitespace-nowrap">
        {(invoice.type.toLowerCase() === "company" ||
          invoice.type.toLowerCase() === "bonus") &&
          invoice.payer && (
            <div>
              <PayerBadge payer={invoice.payer} />
            </div>
          )}
        {invoice.type.toLowerCase() !== "company" &&
          invoice.type.toLowerCase() !== "bonus" && (
            <div className="text-base text-gray-500">N/A</div>
          )}
      </TableCell>

      <TableCell className="px-6 py-4 whitespace-nowrap">
        <StatusBadge status={invoice.status} />
        {invoice.status.toLowerCase() === "rejected" &&
          invoice.rejectionReason && (
            <div className="text-sm text-red-600 mt-2">
              {invoice.rejectionReason}
            </div>
          )}
      </TableCell>

      <TableCell className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
        <div>
          {invoice.date
            ? new Date(invoice.date).toLocaleDateString("pt-PT")
            : "Data não disponível"}
        </div>
        {(invoice.status.toLowerCase() === "approved" ||
          invoice.status.toLowerCase() === "payed") &&
        invoice.approvalDate ? (
          <div className="text-sm text-green-600 mt-1">
            Aprovada em{" "}
            {new Date(invoice.approvalDate).toLocaleDateString("pt-PT")}
          </div>
        ) : invoice.status.toLowerCase() === "rejected" &&
          invoice.rejectionDate ? (
          <div className="text-sm text-red-600 mt-1">
            Rejeitada em{" "}
            {new Date(invoice.rejectionDate).toLocaleDateString("pt-PT")}
          </div>
        ) : null}
      </TableCell>

      <TableCell className="px-6 py-4 whitespace-nowrap text-base text-gray-500">
        <div>
          {invoice.date
            ? new Date(invoice.submissionDate).toLocaleDateString("pt-PT")
            : "Data não disponível"}
        </div>
      </TableCell>

      <TableCell className="text-right">
        <div className="flex items-center justify-start space-x-3">
          <button
            onClick={() => onView?.(invoice)}
            className="text-yellow-600 hover:text-yellow-800 transition-colors"
            title="Ver Detalhes"
          >
            <Eye className="w-5 h-5" />
          </button>

          {invoice.file_id && (
            <a
              href={invoiceService.getInvoiceDocumentUrl(invoice)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-800 inline-block transition-colors"
              title="Ver/Descarregar Documento"
            >
              <Download className="w-5 h-5" />
            </a>
          )}

          {/* Repeat button for travel expenses - only for current user's own expenses */}
          {!isApprovalMode &&
            isTravelExpense(invoice) &&
            invoice.userId === currentUser.id &&
            onRepeat && (
              <button
                onClick={() => onRepeat(invoice)}
                className="text-purple-600 hover:text-purple-800 transition-colors"
                title="Repetir"
              >
                <Copy className="w-5 h-5" />
              </button>
            )}

          {!isApprovalMode &&
            (invoice.status.toLowerCase() === "submitted" ||
              invoice.status === "SUBMITTED" ||
              invoice.status.toLowerCase() === "draft") &&
            onSubmit && (
              <button
                onClick={() => onSubmit(invoice.id)}
                className="text-yellow-600 hover:text-yellow-800 transition-colors"
                title="Submeter para Aprovação"
              >
                <Clock className="w-5 h-5" />
              </button>
            )}

          {/* ApprovalMode actions based on status */}
          {isApprovalMode && (
            <>
              {/* Pending: Approve or Pay */}
              {invoice.status.toLowerCase() === "pending" && (
                <>
                  <button
                    onClick={handleApprove}
                    className="text-green-600 hover:text-green-800 transition-colors"
                    title="Aprovar"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handlePay}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                    title="Marcar como Pago"
                  >
                    <EuroIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleReject}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Rejeitar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </>
              )}
              {/* Approved: Pay only */}
              {invoice.status.toLowerCase() === "approved" && (
                <button
                  onClick={handlePay}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="Marcar como Pago"
                >
                  <EuroIcon className="w-5 h-5" />
                </button>
              )}
              {/* Rejected and Payed: No actions */}
              {(invoice.status.toLowerCase() === "rejected" ||
                invoice.status.toLowerCase() === "payed") &&
                null}
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};
