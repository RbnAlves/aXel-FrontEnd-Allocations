import {
  UnlockResponse,
  DoorStatus,
  DoorAccessLogsResponse,
  DoorAccessLogsFilters,
} from "../types";
import { authService } from "./authService";
import { API_URL } from "../config";

/**
 * Service for handling door access operations
 */
export const doorAccessService = {
  /**
   * Unlock the office door
   * @returns Unlock response with success status and message
   */
  async unlockDoor(): Promise<UnlockResponse> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/door/unlock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to unlock door");
      }

      return data;
    } catch (error) {
      console.error("Unlock door error:", error);
      throw error;
    }
  },

  /**
   * Get the current door/device status
   * @returns Door status information
   */
  async getDoorStatus(): Promise<DoorStatus> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/door/status`,
      );

      if (!response.ok) {
        throw new Error("Failed to get door status");
      }

      return await response.json();
    } catch (error) {
      console.error("Get door status error:", error);
      throw error;
    }
  },

  /**
   * Get door access logs (admin only)
   * @param filters - Optional filters for the logs
   * @returns Access logs response with pagination info
   */
  async getAccessLogs(
    filters?: DoorAccessLogsFilters,
  ): Promise<DoorAccessLogsResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.limit !== undefined)
          params.append("limit", filters.limit.toString());
        if (filters.offset !== undefined)
          params.append("offset", filters.offset.toString());
        if (filters.user_id) params.append("user_id", filters.user_id);
        if (filters.action) params.append("action", filters.action);
        if (filters.start_date) params.append("start_date", filters.start_date);
        if (filters.end_date) params.append("end_date", filters.end_date);
        if (filters.search) params.append("search", filters.search);
        if (filters.sort_by) params.append("sort_by", filters.sort_by);
        if (filters.sort_order) params.append("sort_order", filters.sort_order);
      }

      const url = `${API_URL}/api/door/access-logs${params.toString() ? `?${params.toString()}` : ""}`;

      const response = await authService.fetchWithAuth(url);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to fetch access logs");
      }

      return await response.json();
    } catch (error) {
      console.error("Get access logs error:", error);
      throw error;
    }
  },

  /**
   * Export door access logs to Excel (admin only)
   * @param filters - Optional filters/sorting
   */
  async exportAccessLogsToExcel(
    filters?: DoorAccessLogsFilters,
  ): Promise<void> {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.user_id) params.append("user_id", filters.user_id);
      if (filters.action) params.append("action", filters.action);
      if (filters.start_date) params.append("start_date", filters.start_date);
      if (filters.end_date) params.append("end_date", filters.end_date);
      if (filters.search) params.append("search", filters.search);
      if (filters.sort_by) params.append("sort_by", filters.sort_by);
      if (filters.sort_order) params.append("sort_order", filters.sort_order);
    }

    const url = `${API_URL}/api/door/access-logs/export/excel${params.toString() ? `?${params.toString()}` : ""}`;
    const response = await authService.fetchWithAuth(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to export access logs");
    }

    const blob = await response.blob();
    const contentDisposition =
      response.headers.get("Content-Disposition") || "";
    const filenameMatch = contentDisposition.match(/filename=([^;]+)/i);
    const filename = filenameMatch
      ? filenameMatch[1].replace(/['\"]/g, "")
      : `controlo_acessos_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
