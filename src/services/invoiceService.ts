import { DashboardStats, Invoice, InvoiceQueryParams } from "../types";
import { authService } from "./authService";
import { API_URL } from "../config";

/**
 * Service for handling invoice operations
 */
export const invoiceService = {
  /**
   * Get authenticated document URL
   * @param documentId Document ID or full document URL
   * @returns Authenticated document URL
   */
  getAuthenticatedDocumentUrl(documentId: string): string {
    const token = authService.getToken();

    if (!token) {
      console.error("No authentication token found for document URL");
      return "";
    }

    // If it's already a full URL, add the token as a query parameter
    if (documentId.startsWith(API_URL)) {
      const url = new URL(documentId);
      url.searchParams.append("token", token);
      return url.toString();
    }

    // Use the document-with-token endpoint which accepts a token query parameter
    return `${API_URL}/api/files/document-with-token/${documentId}?token=${token}`;
  },

  /**
   * Get authenticated document URL for an invoice
   * @param invoice The invoice object
   * @returns The authenticated document URL or empty string if no document
   */
  getInvoiceDocumentUrl(invoice: Invoice): string {
    if (!invoice) return "";

    // Use the file_id if available, otherwise use the id
    const fileId = invoice.file_id || invoice.id;

    // If no file ID, return empty string
    if (!fileId) {
      return "";
    }

    // Use the file ID
    return this.getAuthenticatedDocumentUrl(fileId);
  },

  /**
   * Get all invoices
   * @param filters Optional filter parameters
   * @returns List of invoices
   */
  async getInvoices(filters: InvoiceQueryParams = {}): Promise<Invoice[]> {
    try {
      let url = `${API_URL}/api/invoices/`;
      const params = new URLSearchParams();

      const { status, type, dateStart, dateEnd, skip, limit } = filters;

      if (status) {
        params.append("invoice_status", status);
      }

      if (type) {
        params.append("type", type);
      }

      if (dateStart) {
        params.append("date_start", dateStart);
      }

      if (dateEnd) {
        params.append("date_end", dateEnd);
      }

      if (typeof skip === "number") {
        params.append("skip", skip.toString());
      }

      if (typeof limit === "number") {
        params.append("limit", limit.toString());
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Use the new fetchWithAuth function which handles 401 errors
      const response = await authService.fetchWithAuth(url, {
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to get invoices");
      }

      const data = await response.json();

      // Transform the backend response to match the frontend Invoice interface
      return data.map((invoice: any) => {
        // Format the date to YYYY-MM-DD if it exists
        let formattedDate = invoice.date;
        if (formattedDate) {
          // Check if the date is in ISO format or another format that needs conversion
          const dateObj = new Date(formattedDate);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString().split("T")[0];
          }
        }

        return {
          id: invoice.id,
          userId: invoice.user_id,
          userName: invoice.userName,
          type: invoice.type.toLowerCase(),
          expense_type_id: invoice.expense_type_id,
          expense_type: invoice.expense_type,
          amount: invoice.amount,
          iva: invoice.iva,
          vendor: invoice.vendor,
          vendor_nif: invoice.vendor_nif,
          description: invoice.description,
          date: formattedDate,
          submissionDate: invoice.submission_date,
          rejectionDate: invoice.rejection_date,
          approvalDate: invoice.approval_date,
          status: invoice.status.toLowerCase(),
          document_type: invoice.document_type,
          file_id: invoice.file_id,
          rejectionReason: invoice.rejection_reason,
          // Travel specific fields
          origin: invoice.origin,
          destination: invoice.destination,
          kilometers: invoice.kilometers,
          license_plate: invoice.license_plate,
          // Meals specific fields
          meal_type: invoice.meal_type,
          number_of_persons: invoice.number_of_persons,
          // Per Diem Allowance specific fields
          days: invoice.days,
          // Who paid for the expense
          payer: invoice.payer,
          // Permission flags
          can_edit: invoice.can_edit,
          can_delete: invoice.can_delete,
        };
      });
    } catch (error) {
      console.error("Get invoices error:", error);
      throw error;
    }
  },

  /**
   * Get a specific invoice by ID
   * @param id Invoice ID
   * @returns The invoice
   */
  async getInvoice(id: string): Promise<Invoice> {
    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/invoices/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to get invoice");
      }

      const invoice = await response.json();

      // Transform the backend response to match the frontend Invoice interface
      // Generate document URLs with authentication token
      invoice.document_type
        ? this.getAuthenticatedDocumentUrl(invoice.id)
        : undefined;
      // Format the date to YYYY-MM-DD if it exists
      let formattedDate = invoice.date;
      if (formattedDate) {
        // Check if the date is in ISO format or another format that needs conversion
        const dateObj = new Date(formattedDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      }

      return {
        id: invoice.id,
        userId: invoice.user_id,
        userName: invoice.userName,
        type: invoice.type.toLowerCase(),
        expense_type_id: invoice.expense_type_id,
        expense_type: invoice.expense_type,
        amount: invoice.amount,
        iva: invoice.iva,
        vendor: invoice.vendor,
        vendor_nif: invoice.vendor_nif,
        description: invoice.description,
        date: formattedDate,
        submissionDate: invoice.submission_date,
        rejectionDate: invoice.rejection_date,
        approvalDate: invoice.approval_date,
        status: invoice.status.toLowerCase(),
        document_type: invoice.document_type,
        file_id: invoice.file_id,
        rejectionReason: invoice.rejection_reason,
        // Travel specific fields
        origin: invoice.origin,
        destination: invoice.destination,
        kilometers: invoice.kilometers,
        license_plate: invoice.license_plate,
        // Meals specific fields
        meal_type: invoice.meal_type,
        number_of_persons: invoice.number_of_persons,
        // Per Diem Allowance specific fields
        days: invoice.days,
        // Who paid for the expense
        payer: invoice.payer,
        // Permission flags
        can_edit: invoice.can_edit,
        can_delete: invoice.can_delete,
      };
    } catch (error) {
      console.error("Get invoice error:", error);
      throw error;
    }
  },

  /**
   * Create a new invoice
   * @param invoice Invoice data
   * @returns The created invoice
   */
  async createInvoice(invoice: any): Promise<Invoice> {
    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      // Log the request body to check if payer field is included
      console.log("Request body (createInvoice):", invoice);
      console.log("Payer field in request:", invoice.payer);

      const response = await fetch(`${API_URL}/api/invoices/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoice),
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get detailed error message from response
        const errorText = await response.text();
        console.log("Raw error response:", errorText);

        let errorMessage = "Falha na criação da Despesa";
        try {
          // Try to parse the response as JSON
          const errorData = JSON.parse(errorText);
          console.log("Parsed error data:", errorData);

          if (errorData && errorData.detail) {
            console.log("Using detail field:", errorData.detail);
            errorMessage = errorData.detail;
          } else if (errorData && errorData.message) {
            console.log("Using message field:", errorData.message);
            errorMessage = errorData.message;
          } else {
            console.log("No detail or message field found");
          }
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
        }
        throw new Error(errorMessage);
      }

      const createdInvoice = await response.json();

      // Log the response from the backend to check if payer field is included
      console.log("Response from backend (createInvoice):", createdInvoice);
      console.log("Payer field in response:", createdInvoice.payer);

      // Format the date to YYYY-MM-DD if it exists
      let formattedDate = createdInvoice.date;
      if (formattedDate) {
        // Check if the date is in ISO format or another format that needs conversion
        const dateObj = new Date(formattedDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      }

      return {
        ...createdInvoice,
        type: createdInvoice.type.toLowerCase(),
        status: createdInvoice.status.toLowerCase(),
        userId: createdInvoice.user_id,
        userName: createdInvoice.userName,
        iva: createdInvoice.iva,
        vendor_nif: createdInvoice.vendor_nif,
        date: formattedDate,
        submissionDate: createdInvoice.submission_date,
        rejectionReason: createdInvoice.rejection_reason,
        // Travel specific fields
        origin: createdInvoice.origin,
        destination: createdInvoice.destination,
        kilometers: createdInvoice.kilometers,
        license_plate: createdInvoice.license_plate,
        // Meals specific fields
        meal_type: createdInvoice.meal_type,
        number_of_persons: createdInvoice.number_of_persons,
        // Per Diem Allowance specific fields
        days: createdInvoice.days,
        // Who paid for the expense
        payer: createdInvoice.payer,
        // Permission flags
        can_edit: createdInvoice.can_edit,
        can_delete: createdInvoice.can_delete,
      };
    } catch (error) {
      console.error("Create invoice error:", error);
      throw error;
    }
  },

  /**
   * Update an existing invoice
   * @param id Invoice ID
   * @param invoice Invoice data
   * @returns The updated invoice
   */
  async updateInvoice(id: string, invoice: any): Promise<Invoice> {
    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/invoices/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(invoice),
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to update invoice");
      }

      const updatedInvoice = await response.json();

      // Format the date to YYYY-MM-DD if it exists
      let formattedDate = updatedInvoice.date;
      if (formattedDate) {
        // Check if the date is in ISO format or another format that needs conversion
        const dateObj = new Date(formattedDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      }

      return {
        ...updatedInvoice,
        type: updatedInvoice.type.toLowerCase(),
        status: updatedInvoice.status.toLowerCase(),
        userId: updatedInvoice.user_id,
        userName: updatedInvoice.userName,
        iva: updatedInvoice.iva,
        vendor_nif: updatedInvoice.vendor_nif,
        date: formattedDate,
        submissionDate: updatedInvoice.submission_date,
        rejectionReason: updatedInvoice.rejection_reason,
        // Travel specific fields
        origin: updatedInvoice.origin,
        destination: updatedInvoice.destination,
        kilometers: updatedInvoice.kilometers,
        license_plate: updatedInvoice.license_plate,
        // Meals specific fields
        meal_type: updatedInvoice.meal_type,
        number_of_persons: updatedInvoice.number_of_persons,
        // Per Diem Allowance specific fields
        days: updatedInvoice.days,
        // Who paid for the expense
        payer: updatedInvoice.payer,
        // Permission flags
        can_edit: updatedInvoice.can_edit,
        can_delete: updatedInvoice.can_delete,
      };
    } catch (error) {
      console.error("Update invoice error:", error);
      throw error;
    }
  },

  /**
   * Delete an invoice
   * @param id Invoice ID
   * @returns Success message
   */
  async deleteInvoice(id: string): Promise<any> {
    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/invoices/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to delete invoice");
      }

      return await response.json();
    } catch (error) {
      console.error("Delete invoice error:", error);
      throw error;
    }
  },

  /**
   * Submit a draft invoice for approval
   * @param id Invoice ID
   * @returns The updated invoice
   */
  async submitInvoice(id: string): Promise<Invoice> {
    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/invoices/${id}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get detailed error message from response
        const errorText = await response.text();
        console.log("Raw error response:", errorText);

        let errorMessage = "Falha no envio da Despesa";
        try {
          // Try to parse the response as JSON
          const errorData = JSON.parse(errorText);
          console.log("Parsed error data:", errorData);

          if (errorData && errorData.detail) {
            console.log("Using detail field:", errorData.detail);
            errorMessage = errorData.detail;
          } else if (errorData && errorData.message) {
            console.log("Using message field:", errorData.message);
            errorMessage = errorData.message;
          } else {
            console.log("No detail or message field found");
          }
        } catch (jsonError) {
          console.error("Error parsing JSON:", jsonError);
        }
        throw new Error(errorMessage);
      }

      const submittedInvoice = await response.json();

      // Log the response from the backend to check if payer field is included
      console.log("Response from backend (submitInvoice):", submittedInvoice);
      console.log("Payer field in response:", submittedInvoice.payer);

      // Format the date to YYYY-MM-DD if it exists
      let formattedDate = submittedInvoice.date;
      if (formattedDate) {
        // Check if the date is in ISO format or another format that needs conversion
        const dateObj = new Date(formattedDate);
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      }

      return {
        ...submittedInvoice,
        type: submittedInvoice.type.toLowerCase(),
        status: submittedInvoice.status.toLowerCase(),
        userId: submittedInvoice.user_id,
        userName: submittedInvoice.userName,
        iva: submittedInvoice.iva,
        vendor_nif: submittedInvoice.vendor_nif,
        date: formattedDate,
        submissionDate: submittedInvoice.submission_date,
        rejectionReason: submittedInvoice.rejection_reason,
        // Travel specific fields
        origin: submittedInvoice.origin,
        destination: submittedInvoice.destination,
        kilometers: submittedInvoice.kilometers,
        license_plate: submittedInvoice.license_plate,
        // Meals specific fields
        meal_type: submittedInvoice.meal_type,
        number_of_persons: submittedInvoice.number_of_persons,
        // Per Diem Allowance specific fields
        days: submittedInvoice.days,
        // Who paid for the expense
        payer: submittedInvoice.payer,
        // Permission flags
        can_edit: submittedInvoice.can_edit,
        can_delete: submittedInvoice.can_delete,
      };
    } catch (error) {
      console.error("Submit invoice error:", error);
      throw error;
    }
  },

  /**
   * Get dashboard statistics
   * @returns Dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_URL}/api/invoices/stats/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to get dashboard stats");
      }

      return await response.json();
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      throw error;
    }
  },
  /**
   * Export invoices to Excel with filter criteria
   * @param filters Filter criteria for the export
   * @returns URL to download the Excel file
   */
  exportToExcel: async (filters: any = {}): Promise<string> => {
    try {
      const token = authService.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      // Build query parameters
      const params = new URLSearchParams();

      // Add all filter parameters if they exist
      if (filters.submission_date_start) {
        params.append("submission_date_start", filters.submission_date_start);
      }

      if (filters.submission_date_end) {
        params.append("submission_date_end", filters.submission_date_end);
      }

      if (filters.invoice_date_start) {
        params.append("invoice_date_start", filters.invoice_date_start);
      }

      if (filters.invoice_date_end) {
        params.append("invoice_date_end", filters.invoice_date_end);
      }

      if (filters.expense_type_id) {
        params.append("expense_type_id", filters.expense_type_id.toString());
      }

      if (filters.vendor_nif) {
        params.append("vendor_nif", filters.vendor_nif);
      }

      if (filters.user_id) {
        params.append("user_id", filters.user_id);
      }

      if (filters.status) {
        params.append("status", filters.status);
      }

      if (filters.min_amount !== undefined) {
        params.append("min_amount", filters.min_amount.toString());
      }

      if (filters.max_amount !== undefined) {
        params.append("max_amount", filters.max_amount.toString());
      }

      // Make authenticated request to get the Excel file
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/invoices/export/excel?${params.toString()}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to export to Excel");
      }

      // Create blob URL for download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `despesas_export_${
        new Date().toISOString().split("T")[0]
      }.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL
      window.URL.revokeObjectURL(url);

      return url;
    } catch (error) {
      console.error("Export to Excel error:", error);
      throw error;
    }
  },

  /**
   * Create multiple invoices at once distributed across users
   * @param batchData Batch invoice data with vendor details and user allocations
   * @returns Response with created invoice IDs and any warnings
   */
  async createBatchInvoices(
    batchData: import("../types").BatchInvoiceCreate,
  ): Promise<import("../types").BatchInvoiceResponse> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/invoices/batch`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(batchData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create batch invoices");
      }

      return await response.json();
    } catch (error) {
      console.error("Create batch invoices error:", error);
      throw error;
    }
  },

  /**
   * List saved batch invoice templates
   * @returns List of batch templates
   */
  async listBatchTemplates(): Promise<import("../types").BatchTemplate[]> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/invoices/batch/templates`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch batch templates");
      }

      return await response.json();
    } catch (error) {
      console.error("List batch templates error:", error);
      throw error;
    }
  },

  /**
   * Get detailed template data to prefill batch invoice form
   * @param templateId Template ID
   * @returns Full template details with items
   */
  async getBatchTemplate(
    templateId: string,
  ): Promise<import("../types").BatchTemplateDetail> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/invoices/batch/templates/${templateId}`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch batch template");
      }

      return await response.json();
    } catch (error) {
      console.error("Get batch template error:", error);
      throw error;
    }
  },
};
