import { useMemo } from "react";
import { User, UserRole } from "../types";
import {
  isModuleAccessible,
  hasViewRolePermission,
  isViewAccessible,
} from "../utils/featureFlags";
import { ModuleType, ViewType } from "@/App";

/**
 * Custom hook to determine module and view visibility based on environment and user role
 *
 * @param currentUser - The currently authenticated user
 * @returns Object with helper functions to check module and view visibility
 *
 * @example
 * const { isModuleVisible, isViewVisible } = useModuleVisibility(currentUser);
 *
 * {isModuleVisible('engagements') && (
 *   <div>Engagements Header</div>
 * )}
 *
 * {isViewVisible('expenses', 'reconciliation') && (
 *   <ReconciliationDashboard />
 * )}
 */
export const useModuleVisibility = (currentUser: User | null) => {
  const userRole = currentUser?.role as UserRole | undefined;

  /**
   * Check if a specific module should be visible
   */
  const isModuleVisible = useMemo(
    () => (module: ModuleType) => {
      if (!userRole) {
        return false;
      }
      return isModuleAccessible(module, userRole);
    },
    [userRole],
  );

  /**
   * Check if any of the provided modules are visible
   */
  const isAnyModuleVisible = useMemo(
    () => (modules: ModuleType[]) => {
      return modules.some((module) => isModuleVisible(module));
    },
    [isModuleVisible],
  );

  /**
   * Check if a specific view within a module is visible
   */
  const isViewVisible = useMemo(
    () => (module: ModuleType, view: ViewType) => {
      if (!userRole) {
        return false;
      }
      return isViewAccessible(module, view, userRole);
    },
    [userRole],
  );

  /**
   * Check if user has role permission for a view (without module/environment checks)
   */
  const hasViewPermission = useMemo(
    () => (module: ModuleType, view: ViewType) => {
      if (!userRole) {
        return false;
      }
      return hasViewRolePermission(module, view, userRole);
    },
    [userRole],
  );

  /**
   * Get a list of all visible modules
   */
  const visibleModules = useMemo(() => {
    if (!userRole) {
      return [];
    }

    const allModules: ModuleType[] = [
      "dashboard",
      "expenses",
      "doorlogs",
      "leaves",
      "allocations",
      "engagements",
    ];

    return allModules.filter((module) => isModuleVisible(module));
  }, [userRole, isModuleVisible]);

  return {
    isModuleVisible,
    isAnyModuleVisible,
    isViewVisible,
    hasViewPermission,
    visibleModules,
  };
};
