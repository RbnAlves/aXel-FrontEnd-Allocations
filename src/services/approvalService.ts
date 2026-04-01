import { Invoice } from "../types";
import { authService } from "./authService";
import { API_URL } from "../config";
import { invoiceService } from "./invoiceService";

/**
 * Service for handling approval operations
 */
export const approvalService = {
  /**
   * Get pending approvals
   * @param skip Number of records to skip (default: 0)
   * @param limit Number of records to return (default: 100)
   * @returns List of pending invoices
   */
  async getPendingApprovals(skip: number = 0, limit: number = 100): Promise<Invoice[]> {
    try {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const params = new URLSearchParams();
      params.append('skip', skip.toString());
      params.append('limit', limit.toString());

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/approvals/invoices?${params.toString()}`,
        {
          signal: controller.signal,
        },
      );

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to get pending approvals");
      }

      const data = await response.json();

      // Transform the backend response to match the frontend Invoice interface
      return data.map((invoice: any) => ({
        id: invoice.id,
        userId: invoice.user_id,
        userName: invoice.userName,
        type: invoice.type.toLowerCase(),
        amount: invoice.amount,
        vendor: invoice.vendor,
        description: invoice.description,
        date: invoice.date,
        submissionDate: invoice.submission_date,
        status: invoice.status.toLowerCase(),
        document_type: invoice.document_type,
        file_id: invoice.file_id,
        payer: invoice.payer,
        document_content: invoice.document_type
          ? invoiceService.getAuthenticatedDocumentUrl(
              invoice.file_id || invoice.id,
            )
          : undefined,
        rejectionReason: invoice.rejection_reason,
      }));
    } catch (error) {
      console.error("Get pending approvals error:", error);
      throw error;
    }
  },

  /**
   * Approve an invoice
   * @param invoiceId Invoice ID
   * @param comment Optional comment
   * @returns The approved invoice
   */
  async approveInvoice(invoiceId: string, comment?: string): Promise<Invoice> {
    try {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/approvals/${invoiceId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment }),
          signal: controller.signal,
        },
      );

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to approve invoice");
      }

      return await response.json();
    } catch (error) {
      console.error("Approve invoice error:", error);
      throw error;
    }
  },

  /**
   * Reject an invoice
   * @param invoiceId Invoice ID
   * @param reason Rejection reason
   * @returns The rejected invoice
   */
  async rejectInvoice(invoiceId: string, reason: string): Promise<Invoice> {
    try {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/approvals/${invoiceId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason }),
          signal: controller.signal,
        },
      );

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to reject invoice");
      }

      return await response.json();
    } catch (error) {
      console.error("Reject invoice error:", error);
      throw error;
    }
  },
  /**
   * Pay an invoice
   * @param invoiceId Invoice ID
   * @param comment Optional comment
   * @returns The payed invoice
   */
  async payInvoice(invoiceId: string, comment?: string): Promise<Invoice> {
    try {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/approvals/${invoiceId}/pay`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ comment }),
          signal: controller.signal,
        },
      );

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to pay invoice");
      }

      return await response.json();
    } catch (error) {
      console.error("Pay invoice error:", error);
      throw error;
    }
  },
};
