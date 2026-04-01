import {
  ReconciliationUpload,
  FileInspection,
  JobStatus,
  ReconciliationResultResponse as ReconciliationResults,
} from "../types";
import { authService } from "./authService";
import { API_URL } from "../config";

/**
 * Service for handling reconciliation operations
 * Handles e-fatura file uploads, inspection, job execution, and result export
 */
export const reconciliationService = {
  /**
   * Upload an e-fatura Excel file
   * @param file The .xlsx or .xls file to upload
   * @returns Upload metadata with upload_id for subsequent operations
   */
  async uploadFile(file: File): Promise<ReconciliationUpload> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const formData = new FormData();
      formData.append("file", file);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/upload-efatura`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || errorData.message || "Falha ao carregar ficheiro"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw error;
    }
  },

  /**
   * Inspect an uploaded e-fatura file to view its structure
   * @param uploadId The upload ID returned from uploadFile
   * @returns File inspection details including headers, row count, and sample data
   */
  async inspectFile(uploadId: string): Promise<FileInspection> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/inspect/${uploadId}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Falha ao inspecionar ficheiro"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error inspecting file:", error);
      throw error;
    }
  },

  /**
   * Run a reconciliation job for an uploaded file
   * @param uploadId The upload ID of the file
   * @param dateStart Start date for reconciliation range
   * @param dateEnd End date for reconciliation range
   * @returns Job status with job_id for polling
   */
  async runReconciliation(
    uploadId: string,
    dateStart: Date,
    dateEnd: Date
  ): Promise<JobStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const payload = {
        upload_id: uploadId,
        date_start: dateStart.toISOString(),
        date_end: dateEnd.toISOString(),
      };

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Falha ao iniciar reconciliação"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error running reconciliation:", error);
      throw error;
    }
  },

  /**
   * Get the current status of a reconciliation job
   * Use this endpoint for polling to check progress
   * @param jobId The job ID returned from runReconciliation
   * @returns Current job status including progress percentage
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/status/${jobId}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || errorData.message || "Falha ao obter status"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting job status:", error);
      throw error;
    }
  },

  /**
   * Cancel a running or pending reconciliation job
   * @param jobId The job ID to cancel
   * @returns Updated job status (should be FAILED)
   */
  async cancelJob(jobId: string): Promise<JobStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/cancel/${jobId}`,
        {
          method: "POST",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Falha ao cancelar reconciliação"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error canceling job:", error);
      throw error;
    }
  },

  /**
   * Get reconciliation results in JSON format
   * @param jobId The completed job ID
   * @returns Complete reconciliation results with summary and discrepancies
   */
  async getResults(jobId: string): Promise<ReconciliationResults> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/result/${jobId}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || errorData.message || "Falha ao obter resultados"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting results:", error);
      throw error;
    }
  },

  /**
   * Get Chart.js-compatible chart datasets
   * @param jobId The completed job ID
   * @returns Chart datasets for pie, bar, and other visualizations
   */
  async getChartData(jobId: string): Promise<any> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/result/${jobId}/charts`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Falha ao obter dados de gráficos"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting chart data:", error);
      throw error;
    }
  },

  /**
   * Export reconciliation results as an Excel file
   * @param jobId The completed job ID
   * @returns Blob containing the Excel file with 3 sheets
   */
  async exportResults(jobId: string): Promise<Blob> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for file download

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation/result/${jobId}/excel`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Falha ao exportar resultados"
        );
      }

      // Return the blob for download
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error("Error exporting results:", error);
      throw error;
    }
  },

  /**
   * Helper: Download exported file as user download
   * @param blob The blob from exportResults
   * @param filename Optional filename (default: "reconciliacao.xlsx")
   */
  downloadFile(blob: Blob, filename: string = "reconciliacao.xlsx"): void {
    try {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      throw error;
    }
  },
};
