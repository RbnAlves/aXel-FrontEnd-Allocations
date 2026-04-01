import { authService } from "./authService";
import { API_URL } from "../config";

/**
 * Type definitions for reconciliation enums
 */
export interface DiscrepancyType {
  value: string;
  label: string;
  description: string;
}

export interface SeverityLevel {
  value: string;
  label: string;
  description: string;
}

/**
 * Service for fetching reconciliation enums (discrepancy types and severity levels)
 * These are used to provide descriptions and labels for reconciliation results
 */
export const reconciliationEnumsService = {
  /**
   * Get all discrepancy types with descriptions
   * @param lang Language code (en or pt-PT, default: pt-PT)
   * @returns Array of discrepancy types with descriptions
   */
  async getDiscrepancyTypes(
    lang: string = "pt-PT"
  ): Promise<DiscrepancyType[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation-enums/discrepancy-types?lang=${encodeURIComponent(
          lang
        )}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Falha ao obter tipos de incoerência"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting discrepancy types:", error);
      throw error;
    }
  },

  /**
   * Get all severity levels with descriptions
   * @param lang Language code (en or pt-PT, default: pt-PT)
   * @returns Array of severity levels with descriptions
   */
  async getSeverityLevels(lang: string = "pt-PT"): Promise<SeverityLevel[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await authService.fetchWithAuth(
        `${API_URL}/api/reconciliation-enums/severity-levels?lang=${encodeURIComponent(
          lang
        )}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail ||
            errorData.message ||
            "Falha ao obter níveis de severidade"
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting severity levels:", error);
      throw error;
    }
  },

  /**
   * Get a description for a specific discrepancy type
   * @param types Array of discrepancy types
   * @param typeId The ID of the discrepancy type
   * @returns The description or empty string if not found
   */
  getDiscrepancyTypeDescription(
    types: DiscrepancyType[],
    typeId: string
  ): string {
    const type = types.find((t) => t.value === typeId);
    return type?.description || "";
  },

  /**
   * Get a description for a specific severity level
   * @param levels Array of severity levels
   * @param levelId The ID of the severity level
   * @returns The description or empty string if not found
   */
  getSeverityLevelDescription(
    levels: SeverityLevel[],
    levelId: string
  ): string {
    const level = levels.find((l) => l.value === levelId);
    return level?.description || "";
  },

  /**
   * Create a map of discrepancy type IDs to descriptions for quick lookup
   * @param types Array of discrepancy types
   * @returns Object mapping type IDs to descriptions
   */
  createDiscrepancyTypeDescriptionMap(
    types: DiscrepancyType[]
  ): Record<string, string> {
    console.log("Creating discrepancy type map:", types);
    return types.reduce((acc, type) => {
      acc[type.value] = type.description;
      return acc;
    }, {} as Record<string, string>);
  },

  /**
   * Create a map of discrepancy type IDs to descriptions for quick lookup
   * @param types Array of discrepancy types
   * @returns Object mapping type IDs to descriptions
   */
  createDiscrepancyTypeLabelMap(
    types: DiscrepancyType[]
  ): Record<string, string> {
    console.log("Creating discrepancy type map:", types);
    return types.reduce((acc, type) => {
      acc[type.value] = type.label;
      return acc;
    }, {} as Record<string, string>);
  },

  /**
   * Create a map of severity level IDs to descriptions for quick lookup
   * @param levels Array of severity levels
   * @returns Object mapping level IDs to descriptions
   */
  createSeverityLevelDescriptionMap(
    levels: SeverityLevel[]
  ): Record<string, string> {
    return levels.reduce((acc, level) => {
      acc[level.value] = level.description;
      return acc;
    }, {} as Record<string, string>);
  },

  /**
   * Create a map of severity level IDs to descriptions for quick lookup
   * @param levels Array of severity levels
   * @returns Object mapping level IDs to descriptions
   */
  createSeverityLevelLabelMap(levels: SeverityLevel[]): Record<string, string> {
    return levels.reduce((acc, level) => {
      acc[level.value] = level.label;
      return acc;
    }, {} as Record<string, string>);
  },
};
