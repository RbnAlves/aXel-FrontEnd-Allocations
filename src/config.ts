// API URL for backend services
const environment = import.meta.env.VITE_APP_ENV;

const envApiUrl = import.meta.env.VITE_API_URL;

export const API_URL =
  envApiUrl && typeof envApiUrl === "string"
    ? envApiUrl
    : environment === "production"
      ? "https://axel-mote-api.westeurope.cloudapp.azure.com"
      : environment === "uat"
        ? "https://uat-axel-api.westeurope.cloudapp.azure.com"
        : "http://localhost:8000";

// Force HTTPS for specific domains to prevent mixed content issues
if (typeof window !== "undefined" && window.location.protocol === "https:") {
  // If we're running in a browser and the page is loaded over HTTPS,
  // ensure all API calls also use HTTPS
  if (
    (API_URL.includes("axel-mote-api.westeurope.cloudapp.azure.com") ||
      API_URL.includes("uat-axel-api.westeurope.cloudapp.azure.com")) &&
    API_URL.startsWith("http:")
  ) {
    // Replace http: with https: for the production API URL
    const secureApiUrl = API_URL.replace("http:", "https:");
    Object.defineProperty(exports, "API_URL", {
      value: secureApiUrl,
    });
  }
}

// Company information
export const MOTE_NIF = "516238841";
export const PER_DIEM_RATE = 58.52; // Fixed rate for per diem allowance in euros
