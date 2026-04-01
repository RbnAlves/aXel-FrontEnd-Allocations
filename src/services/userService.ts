import { User, UserLimitsUpdate } from "../types";
import { authService } from "./authService";
import { API_URL } from "../config";

/**
 * Service for handling user operations
 */
export const userService = {
  /**
   * Get all users (admin only)
   * @returns List of users
   */
  async getUsers(): Promise<User[]> {
    try {
      const response = await authService.fetchWithAuth(`${API_URL}/api/users/`);

      if (!response.ok) {
        throw new Error("Failed to get users");
      }

      return await response.json();
    } catch (error) {
      console.error("Get users error:", error);
      throw error;
    }
  },

  /**
   * Get a specific user by ID
   * @param userId User ID
   * @returns The user
   */
  async getUser(userId: string): Promise<User> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/users/${userId}`,
      );

      if (!response.ok) {
        throw new Error("Failed to get user");
      }

      return await response.json();
    } catch (error) {
      console.error("Get user error:", error);
      throw error;
    }
  },

  /**
   * Update a user's role (admin only)
   * @param userId User ID
   * @param role New role
   * @returns The updated user
   */
  async updateUserRole(userId: string, role: string): Promise<User> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/users/${userId}/role`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update user role");
      }

      return await response.json();
    } catch (error) {
      console.error("Update user role error:", error);
      throw error;
    }
  },

  /**
   * Update a user's spending limits (admin only)
   * @param userId User ID
   * @param limits New limits
   * @returns The updated user
   */
  async updateUserLimits(
    userId: string,
    limits: UserLimitsUpdate,
  ): Promise<User> {
    try {
      const response = await authService.fetchWithAuth(
        `${API_URL}/api/users/${userId}/limits`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(limits),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update user limits");
      }

      return await response.json();
    } catch (error) {
      console.error("Update user limits error:", error);
      throw error;
    }
  },
};
