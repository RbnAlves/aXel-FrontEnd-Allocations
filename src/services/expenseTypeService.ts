import { ExpenseType } from '../types';
import { authService } from './authService';
import { API_URL } from '../config';

/**
 * Service for handling expense type operations
 */
export const expenseTypeService = {
  /**
   * Get all expense types
   * @returns List of expense types
   */
  async getExpenseTypes(): Promise<ExpenseType[]> {
    try {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await authService.fetchWithAuth(`${API_URL}/api/expense-types/`, {
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get expense types');
      }

      return await response.json();
    } catch (error) {
      console.error('Get expense types error:', error);
      throw error;
    }
  },

  /**
   * Get a specific expense type by ID
   * @param id Expense type ID
   * @returns The expense type
   */
  async getExpenseType(id: number): Promise<ExpenseType> {
    try {
      // Create AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await authService.fetchWithAuth(`${API_URL}/api/expense-types/${id}`, {
        signal: controller.signal,
      });

      // Clear the timeout
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to get expense type');
      }

      return await response.json();
    } catch (error) {
      console.error('Get expense type error:', error);
      throw error;
    }
  },
};
