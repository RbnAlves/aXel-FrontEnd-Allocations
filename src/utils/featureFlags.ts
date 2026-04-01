/**
 * Feature flags and environment utilities
 */

import { ModuleType } from "@/App";
import { UserRole } from "@/types";

/**
 * Detect environment at runtime based on hostname or build-time env var
 */
const detectEnvironment = (): "development" | "uat" | "production" => {
  // Check for build-time env var (if set in Azure App Settings before build)
  const buildEnv = import.meta.env.VITE_APP_ENV;
  if (buildEnv) {
    return buildEnv as "development" | "uat" | "production";
  }

  // Fallback to Vite's MODE
  return import.meta.env.MODE === "production" ? "production" : "development";
};

// Cache the environment detection
const currentEnvironment = detectEnvironment();

/**
 * Check if the app is running in development mode
 */
export const isDevelopment = (): boolean => {
  return currentEnvironment === "development";
};

/**
 * Check if the app is running in UAT/test mode
 */
export const isUAT = (): boolean => {
  return currentEnvironment === "uat";
};

/**
 * Check if the app is running in production mode
 */
export const isProduction = (): boolean => {
  return currentEnvironment === "production";
};

/**
 * Module visibility configuration
 * Define which modules are available in which environments and for which roles
 */
interface ViewConfig {
  showInProduction?: boolean; // Defaults to true if omitted
  allowedRoles?: UserRole[]; // If undefined or empty, all roles have access
}

interface ModuleConfig {
  showInProduction: boolean;
  allowedRoles?: UserRole[]; // If undefined, all roles have access
  views?: Record<string, ViewConfig>; // Map view names to their configs
}

const MODULE_CONFIG: Record<ModuleType, ModuleConfig> = {
  dashboard: {
    showInProduction: true,
  },
  expenses: {
    showInProduction: true,
    views: {
      dashboard: {},
      submit: {},
      form: {},
      myinvoices: { allowedRoles: ["NORMAL", "APPROVER"] },
      invoices: { allowedRoles: ["APPROVER"] },
      users: { allowedRoles: ["ADMIN"] },
      reconciliation: { showInProduction: true, allowedRoles: ["ADMIN"] },
    },
  },
  doorlogs: {
    showInProduction: true,
    allowedRoles: ["ADMIN"],
  },
  leaves: {
    showInProduction: false, // Only in development
  },
  allocations: {
    showInProduction: true, // Only in development
  },
  engagements: {
    showInProduction: true, // Only in development
  },
};

/**
 * Check if a module should be visible based on environment
 */
export const isModuleVisibleInEnvironment = (module: ModuleType): boolean => {
  const config = MODULE_CONFIG[module];

  if (isDevelopment() || isUAT()) {
    // In development and UAT, all modules are visible
    return true;
  }

  // In production, check the module config
  return config.showInProduction;
};

/**
 * Check if a user has permission to access a module based on their role
 */
export const hasModuleRolePermission = (
  module: ModuleType,
  userRole: UserRole,
): boolean => {
  const config = MODULE_CONFIG[module];

  // If no specific roles are defined, everyone has access
  if (!config.allowedRoles) {
    return true;
  }

  // Check if user's role is in the allowed list
  return config.allowedRoles.includes(userRole);
};

/**
 * Check if a module is accessible (both environment and role checks)
 */
export const isModuleAccessible = (
  module: ModuleType,
  userRole: UserRole,
): boolean => {
  return (
    isModuleVisibleInEnvironment(module) &&
    hasModuleRolePermission(module, userRole)
  );
};

/**
 * Check if a user has permission to access a specific view within a module
 */
export const hasViewRolePermission = (
  module: ModuleType,
  view: string,
  userRole: UserRole,
): boolean => {
  const config = MODULE_CONFIG[module];

  // If module doesn't have view configs, everyone has access
  if (!config.views) {
    return true;
  }

  const viewConfig = config.views[view];

  // If view doesn't exist, deny access
  if (!viewConfig) {
    return false;
  }

  // In production, respect view-level showInProduction if defined
  if (isProduction() && viewConfig.showInProduction === false) {
    return false;
  }

  // If no specific roles are defined for this view, everyone has access
  if (!viewConfig.allowedRoles || viewConfig.allowedRoles.length === 0) {
    return true;
  }

  // Check if user's role is in the allowed list
  return viewConfig.allowedRoles.includes(userRole);
};

/**
 * Check if a view is accessible (module + environment + role checks)
 */
export const isViewAccessible = (
  module: ModuleType,
  view: string,
  userRole: UserRole,
): boolean => {
  return (
    isModuleAccessible(module, userRole) &&
    hasViewRolePermission(module, view, userRole)
  );
};
