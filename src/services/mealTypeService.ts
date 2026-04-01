import { MealType } from '../types';
import { authService } from './authService';
import { API_URL } from '../config';

/**
 * Service for handling meal type operations
 */
export const mealTypeService = {
  /**
   * Get all meal types
   * @returns List of meal types with key and value
   */
  async getMealTypes(): Promise<{ key: string; value: string }[]> {
    try {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await authService.fetchWithAuth(`${API_URL}/api/meal-types/`, {
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get meal types');
      }

      return await response.json();
    } catch (error) {
      console.error('Get meal types error:', error);
      throw error;
    }
  },

  /**
   * Convert meal type key to enum value
   * @param key The meal type key (e.g., "BREAKFAST")
   * @returns The corresponding MealType enum value or undefined if not found
   */
  getMealTypeFromKey(key: string): MealType | undefined {
    try {
      return MealType[key as keyof typeof MealType];
    } catch (error) {
      console.error(`Invalid meal type key: ${key}`, error);
      return undefined;
    }
  }
};
