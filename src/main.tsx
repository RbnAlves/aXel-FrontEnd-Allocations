import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { SidebarProvider } from "./components/ui/sidebar.tsx";
// import { ThemeProvider } from "./components/Layout/theme-provider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme"> */}
    <SidebarProvider>
      <App />
    </SidebarProvider>
    {/* </ThemeProvider> */}
  </StrictMode>
);
