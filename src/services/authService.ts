import { User } from "../types";
import * as msal from "@azure/msal-browser";
import { API_URL } from "../config";

// Configuration constants
const TOKEN_KEY = "invoice_approval_token";
// Detect real Safari only: has Version/X.X + Safari, excludes Chrome/Chromium and Android OEM browsers
const IS_SAFARI =
  /Version\/[\d.]+.*Safari/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Android/.test(navigator.userAgent);
const AUTH_TIMEOUT_MS = 10000;
const LOGOUT_TIMEOUT_MS = 5000;

// Azure AD Configuration
const AZURE_AD_CLIENT_ID =
  import.meta.env.VITE_APP_ENV === "production"
    ? "f72798d7-9845-40f8-8481-96c1cea84d40"
    : "4313237f-d970-405b-b031-27f58c212744";
const AZURE_AD_TENANT_ID = "faf35bc4-bf72-45db-8522-1f1e814d32c4";
const AZURE_AD_REDIRECT_URI = window.location.origin;
const AZURE_AD_AUTHORITY = `https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}`;
const AZURE_AD_SCOPES = ["https://graph.microsoft.com/User.Read"];

/**
 * Authentication service for handling login, logout, and token management
 */
export const authService = {
  msalInstance: null as msal.PublicClientApplication | null,

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Parse JSON response with fallback to text
   */
  async parseResponseData(response: Response): Promise<any> {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { detail: text };
    }
  },

  /**
   * Execute async operation with timeout
   */
  async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await promise;
    } finally {
      clearTimeout(timeoutId);
    }
  },

  /**
   * Check if error is CAE (Continuous Access Evaluation) error
   */
  isCAEError(error: any): boolean {
    if (!error || typeof error !== "object") return false;
    const msg = (error.message || error.detail || "").toLowerCase();
    return (
      msg.includes("token revoked") ||
      msg.includes("tokenissuedbeforerevocationtimestamp") ||
      msg.includes("interactionrequired")
    );
  },

  /**
   * Clean up legacy authentication data
   */
  cleanupLegacyAuthData(): void {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("msal.token.keys");
      localStorage.removeItem("msal.account.keys");

      // Remove old MSAL entries
      Object.keys(localStorage)
        .filter(
          (key) => key.startsWith("msal.") && !key.includes("sessionStorage"),
        )
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  },

  /**
   * Show CAE notification
   */
  showCAENotification(): void {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed; top: 20px; right: 20px;
      background: #f59e0b; color: white;
      padding: 16px 24px; border-radius: 8px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px; font-weight: 500;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      z-index: 10000; max-width: 400px;
      animation: slideIn 0.3s ease-out;
    `;
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>🔄</span>
        <span>Your session expired. Re-authenticating...</span>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `@keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }`;
    document.head.appendChild(style);
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
      style.remove();
    }, 5000);
  },

  // ============================================================================
  // MSAL Management
  // ============================================================================

  /**
   * Initialize MSAL instance
   */
  async initializeMsal(): Promise<msal.PublicClientApplication> {
    if (this.msalInstance) return this.msalInstance;

    this.cleanupLegacyAuthData();

    this.msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: AZURE_AD_CLIENT_ID,
        authority: AZURE_AD_AUTHORITY,
        redirectUri: AZURE_AD_REDIRECT_URI,
        protocolMode: "AAD",
        clientCapabilities: ["CP1"],
      },
      cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: true,
      },
      system: {
        allowRedirectInIframe: true,
        tokenRenewalOffsetSeconds: 300,
      },
    });

    await this.msalInstance.initialize();

    // Handle redirect callback
    try {
      const result = await this.msalInstance.handleRedirectPromise();
      if (result) console.log("Redirect auth successful");
    } catch (error) {
      console.error("Redirect handling error:", error);
    }

    return this.msalInstance;
  },

  // ============================================================================
  // Authentication Flow
  // ============================================================================

  /**
   * Attempt Azure AD login with fallback strategies
   */
  async loginWithAzureAD(): Promise<User> {
    const msal = await this.initializeMsal();

    // Try silent acquisition first
    const token = await this.getSilentToken(msal).catch(() =>
      this.getInteractiveToken(msal),
    );

    // Validate token with backend
    return await this.validateAndStoreToken(token);
  },

  /**
   * Get token silently from cache
   */
  async getSilentToken(msal: msal.PublicClientApplication): Promise<string> {
    const accounts = msal.getAllAccounts();
    if (accounts.length === 0) throw new Error("No cached account");

    const result = await msal.acquireTokenSilent({
      scopes: AZURE_AD_SCOPES,
      account: accounts[0],
    });

    return result.accessToken;
  },

  /**
   * Get token interactively (redirect for Safari, popup for others)
   */
  async getInteractiveToken(
    msal: msal.PublicClientApplication,
    promptType: "select_account" | "login" = "select_account",
  ): Promise<string> {
    if (IS_SAFARI) {
      console.log(`Safari: Using redirect flow (${promptType})`);
      await msal.loginRedirect({
        scopes: AZURE_AD_SCOPES,
        prompt: promptType,
      });
      throw new Error("Redirect in progress");
    }

    const result = await msal.loginPopup({
      scopes: AZURE_AD_SCOPES,
      prompt: promptType,
    });

    return result.accessToken;
  },

  /**
   * Validate token with backend and store it
   */
  async validateAndStoreToken(token: string): Promise<User> {
    try {
      const response = await this.withTimeout(
        fetch(`${API_URL}/api/auth/azure-login`, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: token,
          credentials: "include",
        }),
        AUTH_TIMEOUT_MS,
      );

      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem(TOKEN_KEY, data.access_token);
        return await this.getCurrentUser();
      }

      const errorData = await this.parseResponseData(response);

      // Handle CAE error
      if (this.isCAEError(errorData)) {
        console.log("CAE error during login, re-authenticating...");
        return await this.handleCAEError();
      }

      // Safari retry on first failure
      if (IS_SAFARI) {
        console.log("Safari login failed, retrying...");
        return await this.retryIOSLogin();
      }

      throw new Error(`Login failed: ${errorData.detail}`);
    } catch (error) {
      console.error("Token validation error:", error);
      throw error;
    }
  },

  /**
   * Retry Safari login with fallback to popup
   */
  async retryIOSLogin(): Promise<User> {
    const msal = await this.initializeMsal();
    this.cleanupLegacyAuthData();

    const accounts = msal.getAllAccounts();
    if (accounts.length > 0) {
      await msal.clearCache();
    }

    try {
      // Try with "login" prompt (forces re-authentication)
      const token = await this.getInteractiveToken(msal, "login");
      return await this.validateAndStoreToken(token);
    } catch (error) {
      if (error instanceof Error && error.message === "Redirect in progress") {
        throw error;
      }

      // Safari fallback: try popup if redirect failed
      if (IS_SAFARI) {
        console.log("Safari retry: Fallback to popup");
        const result = await msal.loginPopup({
          scopes: AZURE_AD_SCOPES,
          prompt: "login",
        });
        return await this.validateAndStoreToken(result.accessToken);
      }

      console.error("Retry failed:", error);
      throw new Error("Login retry failed");
    }
  },

  /**
   * Handle CAE (Continuous Access Evaluation) error
   */
  async handleCAEError(): Promise<User> {
    console.log("Handling CAE error...");
    this.showCAENotification();

    try {
      sessionStorage.removeItem(TOKEN_KEY);

      const msal = await this.initializeMsal();
      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        await msal.clearCache();
      }

      const result = await msal.loginPopup({
        scopes: AZURE_AD_SCOPES,
        prompt: "login",
      });

      return await this.validateAndStoreToken(result.accessToken);
    } catch (error) {
      console.error("CAE handling failed:", error);
      window.location.href = "/login";
      throw error;
    }
  },

  /**
   * Login user (entry point)
   */
  async login(): Promise<User> {
    this.cleanupLegacyAuthData();
    return await this.loginWithAzureAD();
  },

  // ============================================================================
  // User/Token Management
  // ============================================================================

  /**
   * Get current logged-in user
   */
  async getCurrentUser(): Promise<User> {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) throw new Error("Not authenticated");

    const response = await this.fetchWithAuth(`${API_URL}/api/auth/me`);
    if (!response.ok) throw new Error("Failed to get user info");

    return await response.json();
  },

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!sessionStorage.getItem(TOKEN_KEY);
  },

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = sessionStorage.getItem(TOKEN_KEY);
      if (token) {
        await this.withTimeout(
          fetch(`${API_URL}/api/auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }),
          LOGOUT_TIMEOUT_MS,
        );
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      this.cleanupLegacyAuthData();
    }
  },

  // ============================================================================
  // HTTP Utilities
  // ============================================================================

  /**
   * Authenticated fetch with automatic CAE handling and retry
   */
  async fetchWithAuth(
    url: string,
    options: RequestInit = {},
    retryCount: number = 0,
  ): Promise<Response> {
    const token = this.getToken();
    if (!token) {
      window.location.href = "/login";
      throw new Error("Not authenticated");
    }

    const response = await fetch(url, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
      credentials: "include",
    });

    // Handle 401 with CAE error
    if (response.status === 401 && retryCount === 0) {
      const errorData = await this.parseResponseData(response.clone());

      if (this.isCAEError(errorData)) {
        console.log("CAE error in API call, re-authenticating...");
        try {
          await this.handleCAEError();
          return await this.fetchWithAuth(url, options, retryCount + 1);
        } catch (error) {
          console.error("CAE retry failed:", error);
        }
      }
    }

    // Clear token on 401
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = "/login";
      throw new Error("Authentication failed");
    }

    return response;
  },
};
