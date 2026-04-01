import { useCallback, useEffect, useState } from "react";
import { LoginForm } from "./components/Auth/LoginForm";
import { HomePage } from "./components/Dashboard/HomePage";
import { Dashboard } from "./components/Invoice/InvoiceDashboard";
import { InvoiceFlowHandler } from "./components/Invoice/Forms";
import { InvoiceList } from "./components/Invoice/InvoiceList";
import { MyInvoiceList } from "./components/Invoice/MyInvoiceList";
import { UserManagement } from "./components/Admin/UserManagement";
import { LeavesDashboard } from "./components/Leaves/LeavesDashboard";
import { AllocationsDashboard } from "./components/Allocations/AllocationsDashboard";
import { EngagementsDashboard } from "./components/Engagements/EngagementsDashboard";
import { ReconciliationDashboard } from "./components/Reconciliation";
import { AppSidebar } from "./components/Layout/app-sidebar";
import {
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "./components/ui/sidebar";
import { DatePickerInput } from "./components/ui/date-picker-input";
import { DoorAccessLogs } from "./components/DoorControl/DoorAccessLogs";

import {
  BatchInvoiceCreate,
  DashboardStats,
  Invoice,
  InvoiceDistribution,
  User,
} from "./types";
import { approvalService, authService, invoiceService } from "./services";
import { useModuleVisibility } from "./hooks/useModuleVisibility";

import {
  User as UserIcon,
  Settings,
  AlertCircle,
  Calendar,
  DollarSign,
  Download,
  Edit,
  FileText,
  Tag,
  Trash,
  X,
  Euro,
} from "lucide-react";

export type ModuleType =
  | "dashboard"
  | "expenses"
  | "doorlogs"
  | "leaves"
  | "allocations"
  | "engagements";
export type ViewType =
  | "dashboard"
  | "submit"
  | "invoices"
  | "myinvoices"
  | "form"
  | "users"
  | "reconciliation";

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentModule, setCurrentModule] = useState<ModuleType>("dashboard");
  const [currentView, setCurrentView] = useState<ViewType>("dashboard");
  const [isApprovalMode, setIsApprovalMode] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [initialInvoiceData, setInitialInvoiceData] = useState<any>({});
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalInvoices: 0,
    pendingApprovals: 0,
    payedThisMonth: 0,
    rejectedThisMonth: 0,
    submittedThisMonth: 0,
    expenseTypeStats: [],
  });
  const [, setScannedData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewedInvoice, setViewedInvoice] = useState<Invoice | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedInvoice, setEditedInvoice] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  const { setOpenMobile } = useSidebar();
  const { isModuleVisible, isViewVisible, hasViewPermission } =
    useModuleVisibility(currentUser);

  const parseDateValue = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const formatDateForApi = (value?: string | Date | null): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const buildInvoicePayload = (formData: any) => ({
    vendor: formData.vendor,
    vendor_name: formData.vendor_name,
    vendor_nif: formData.vendor_nif,
    vendor_cae: formData.vendor_cae,
    invoice_number: formData.invoice_number,
    amount: formData.amount,
    iva: formData.iva,
    description: formData.description,
    date: formatDateForApi(formData.date),
    type: formData.type,
    document_type: formData.document_type,
    file_id: formData.file_id,
    expense_type_id: formData.expense_type_id,
    // Include Travel specific fields if present
    origin: formData.origin,
    destination: formData.destination,
    kilometers: formData.kilometers,
    // Include Meals specific fields if present
    meal_type: formData.meal_type,
    number_of_persons: formData.number_of_persons,
    // Include Per Diem Allowance specific fields if present
    days: formData.days,
    payer: formData.payer,
  });

  // Fetch invoices from the API
  const fetchInvoices = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      let fetchedInvoices;
      if (isApprovalMode && currentUser.role === "APPROVER") {
        // If in approval mode, fetch pending approvals with pagination
        const limit = 500; // Reasonable default limit for batch fetching
        let skip = 0;
        let allInvoices: Invoice[] = [];
        let hasMore = true;

        while (hasMore) {
          const batch = await approvalService.getPendingApprovals(skip, limit);
          allInvoices = allInvoices.concat(batch);
          // Continue fetching if we got a full batch (indicates more data available)
          hasMore = batch.length === limit;
          skip += limit;
        }

        fetchedInvoices = allInvoices;
      } else {
        // Otherwise fetch all invoices (the API will filter based on user role)
        fetchedInvoices = await invoiceService.getInvoices();
      }
      setInvoices(fetchedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      alert("Failed to fetch invoices. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isApprovalMode]);

  // Fetch dashboard stats from the API
  const fetchDashboardStats = useCallback(async () => {
    if (!currentUser) return;

    try {
      const stats = await invoiceService.getDashboardStats();
      setDashboardStats(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  }, [currentUser]);

  // Fetch invoices when user logs in or approval mode changes
  useEffect(() => {
    if (currentUser) {
      fetchInvoices();
    }
  }, [currentUser, isApprovalMode, fetchInvoices]);

  // Fetch dashboard stats when user logs in or approval mode changes
  useEffect(() => {
    if (currentUser) {
      fetchDashboardStats();
    }
  }, [currentUser, isApprovalMode, fetchDashboardStats]);

  // Reset edit mode when viewed invoice changes
  useEffect(() => {
    setIsEditMode(false);
    setEditedInvoice(null);
  }, [viewedInvoice]);

  // Helper function to extract license plate from description
  const extractLicensePlate = (description: string): string => {
    // Look for pattern like [AA-12-BB] or [12-AA-34] in the description
    const licensePlateMatch = description.match(/\[([A-Z0-9-]+)\]/);
    return licensePlateMatch ? licensePlateMatch[1] : "";
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setScannedData(null);
  };

  const handleModuleChange = (module: ModuleType) => {
    setCurrentModule(module);
    if (module === "expenses") {
      setOpenMobile(false);
      setCurrentView("dashboard");
    } else if (module === "doorlogs") {
      setOpenMobile(false);
      setCurrentView("dashboard");
    } else if (module === "leaves") {
      setOpenMobile(false);
      setCurrentView("dashboard");
    } else {
      setOpenMobile(false);
      setCurrentView("dashboard");
    }
    setScannedData(null);
  };

  const handleInvoiceSubmit = async (formData: any) => {
    setIsLoading(true);
    try {
      // Prepare invoice data for API
      const invoiceData = buildInvoicePayload(formData);

      // Log the invoice data before sending to the backend
      console.log("Sending invoice data to backend:", invoiceData);
      console.log("Invoice number being sent:", invoiceData.invoice_number);

      // Create invoice via API
      const newInvoice = await invoiceService.createInvoice(invoiceData);

      // Add to local state
      setInvoices((prev) => [newInvoice, ...prev]);

      // Refresh user data to get updated limits
      if (currentUser) {
        const updatedUser = await authService.getCurrentUser();
        setCurrentUser(updatedUser);
      }

      // Refresh dashboard stats
      await fetchDashboardStats();

      // Clear initial data and scanned data, then navigate to invoices
      setInitialInvoiceData({});
      setCurrentView("myinvoices");
      setScannedData(null);
    } catch (error: any) {
      console.error("Error submitting invoice:", error);
      // Display the specific error message if available, otherwise show a generic message
      const errorMessage =
        error.message && !error.message.startsWith("Failed to create invoice: ")
          ? error.message
          : "Failed to submit invoice. Please try again.";
      setErrorMessage(errorMessage);
      setShowError(true);
      // Hide the error message after 5 seconds
      setTimeout(() => {
        setShowError(false);
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchInvoiceSubmit = async (
    formData: any,
    distribution: InvoiceDistribution,
  ) => {
    setIsLoading(true);
    try {
      const invoiceData = buildInvoicePayload(formData);

      const batchData: BatchInvoiceCreate = {
        vendor: invoiceData.vendor,
        vendor_nif: invoiceData.vendor_nif,
        vendor_name: invoiceData.vendor_name,
        vendor_cae: invoiceData.vendor_cae,
        invoice_number: invoiceData.invoice_number,
        description: invoiceData.description,
        date: invoiceData.date,
        iva: invoiceData.iva || 0,
        expense_type_id: invoiceData.expense_type_id,
        payer: invoiceData.payer,
        origin: invoiceData.origin,
        destination: invoiceData.destination,
        kilometers: invoiceData.kilometers,
        meal_type: invoiceData.meal_type,
        number_of_persons: invoiceData.number_of_persons,
        days: invoiceData.days,
        items: distribution.userIds.map((userId) => ({
          user_id: userId,
          amount: distribution.allocations[userId] || 0,
        })),
      };

      const result = await invoiceService.createBatchInvoices(batchData);
      if (result.warnings && result.warnings.length > 0) {
        console.warn("Batch invoice warnings:", result.warnings);
      }

      await fetchInvoices();

      if (currentUser) {
        const updatedUser = await authService.getCurrentUser();
        setCurrentUser(updatedUser);
      }

      await fetchDashboardStats();

      setInitialInvoiceData({});
      setCurrentView("myinvoices");
      setScannedData(null);
    } catch (error: any) {
      console.error("Error submitting batch invoice:", error);
      const errorMessage =
        error.message &&
        !error.message.startsWith("Failed to create batch invoices")
          ? error.message
          : "Failed to submit batch invoices. Please try again.";
      setErrorMessage(errorMessage);
      setShowError(true);
      setTimeout(() => {
        setShowError(false);
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      // Approve invoice via API
      const updatedInvoice = await approvalService.approveInvoice(invoiceId);

      // Update local state
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === invoiceId ? updatedInvoice : invoice,
        ),
      );

      // Refresh dashboard stats
      await fetchDashboardStats();
    } catch (error) {
      console.error("Error approving invoice:", error);
      alert("Failed to approve invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (invoiceId: string, reason: string) => {
    setIsLoading(true);
    try {
      // Reject invoice via API
      const updatedInvoice = await approvalService.rejectInvoice(
        invoiceId,
        reason,
      );

      // Update local state
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === invoiceId ? updatedInvoice : invoice,
        ),
      );

      // Refresh dashboard stats
      await fetchDashboardStats();
    } catch (error) {
      console.error("Error rejecting invoice:", error);
      alert("Failed to reject invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      // Pay invoice via API
      const updatedInvoice = await approvalService.payInvoice(invoiceId);

      // Update local state
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === invoiceId ? updatedInvoice : invoice,
        ),
      );

      // Refresh dashboard stats
      await fetchDashboardStats();
    } catch (error) {
      console.error("Error paying invoice:", error);
      alert("Failed to pay invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvoiceEdit = (invoice: Invoice) => {
    setScannedData({
      vendor: invoice.vendor,
      vendor_nif: invoice.vendor_nif,
      vendor_name: invoice.vendor_name,
      vendor_cae: invoice.vendor_cae,
      invoice_number: invoice.invoice_number,
      amount: invoice.amount,
      iva: invoice.iva,
      date: invoice.date,
      description: invoice.description,
      type: invoice.type,
      expense_type_id: invoice.expense_type_id,
      document_type: invoice.document_type,
      file_id: invoice.file_id,
      // Travel specific fields
      origin: invoice.origin,
      destination: invoice.destination,
      kilometers: invoice.kilometers,
      // Meals specific fields
      meal_type: invoice.meal_type,
      number_of_persons: invoice.number_of_persons,
      // Per Diem Allowance specific fields
      days: invoice.days,
    });
    setCurrentView("form");
  };

  // Toggle edit mode in the view popup
  const toggleEditMode = (invoice: Invoice) => {
    setIsEditMode(!isEditMode);
    setEditedInvoice({
      vendor: invoice.vendor,
      amount: invoice.amount,
      date: parseDateValue(invoice.date),
      description: invoice.description,
      type: invoice.type,
      expense_type_id: invoice.expense_type_id,
      // Travel specific fields
      origin: invoice.origin,
      destination: invoice.destination,
      kilometers: invoice.kilometers,
      // Meals specific fields
      meal_type: invoice.meal_type,
      number_of_persons: invoice.number_of_persons,
      // Per Diem Allowance specific fields
      days: invoice.days,
    });
  };

  // Handle changes to the edited invoice fields
  const handleEditChange = (field: string, value: any) => {
    // Ignore changes to the 'type' field - it should not be editable
    if (field === "type") return;

    setEditedInvoice((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save the edited invoice
  const handleSaveEdit = async () => {
    if (!viewedInvoice || !editedInvoice) return;

    setIsLoading(true);
    try {
      // Prepare invoice data for API
      // Convert type to uppercase to match backend enum values (COMPANY, BENEFITS, BONUS)
      const normalizedType = editedInvoice.type.toUpperCase();

      const invoiceData = {
        vendor: editedInvoice.vendor,
        amount: editedInvoice.amount,
        description: editedInvoice.description,
        date: formatDateForApi(editedInvoice.date),
        type: normalizedType,
        // Travel specific fields
        origin: editedInvoice.origin,
        destination: editedInvoice.destination,
        kilometers: editedInvoice.kilometers,
        // Meals specific fields
        meal_type: editedInvoice.meal_type,
        number_of_persons: editedInvoice.number_of_persons,
        // Per Diem Allowance specific fields
        days: editedInvoice.days,
      };

      // Update invoice via API
      const updatedInvoice = await invoiceService.updateInvoice(
        viewedInvoice.id,
        invoiceData,
      );

      // Update local state
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === updatedInvoice.id ? updatedInvoice : invoice,
        ),
      );

      // Update viewed invoice
      setViewedInvoice(updatedInvoice);

      // Exit edit mode
      setIsEditMode(false);
      setEditedInvoice(null);

      // Refresh dashboard stats
      await fetchDashboardStats();
    } catch (error) {
      console.error("Error updating invoice:", error);
      alert("Failed to update invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitInvoice = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      // Submit invoice via API
      const updatedInvoice = await invoiceService.submitInvoice(invoiceId);

      // Update local state
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === invoiceId ? updatedInvoice : invoice,
        ),
      );

      // Refresh dashboard stats
      await fetchDashboardStats();

      // Return the updated invoice to indicate success
      return updatedInvoice;
    } catch (error) {
      console.error("Error submitting invoice:", error);
      // Display the specific error message to the user
      const message =
        error instanceof Error
          ? error.message
          : "Falha no envio da Despesa, por favor tente novamente.";
      console.log("Error message to display:", message);
      setErrorMessage(message);
      setShowError(true);

      // Auto-hide the error after 5 seconds
      setTimeout(() => {
        setShowError(false);
      }, 5000);

      // Rethrow the error so the caller can handle it
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    setIsLoading(true);
    try {
      // Delete invoice via API
      await invoiceService.deleteInvoice(invoiceId);

      // Update local state
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== invoiceId));

      // Refresh dashboard stats
      await fetchDashboardStats();
    } catch (error) {
      console.error("Error deleting invoice:", error);
      alert("Failed to delete invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprovalModeToggle = () => {
    const newApprovalMode = !isApprovalMode;
    setIsApprovalMode(newApprovalMode);
    if (newApprovalMode) {
      // If enabling approval mode, automatically show the invoices view
      setCurrentView("invoices");
    } else {
      // When disabling approval mode, leave approvals view
      if (currentView === "invoices") {
        setCurrentView("myinvoices");
      }
    }
  };

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} />;
  }

  const renderContent = () => {
    // Handle different modules first
    if (currentModule === "dashboard") {
      return (
        <HomePage
          currentUser={currentUser}
          onModuleChange={handleModuleChange}
          onViewChange={handleViewChange}
          onApprovalModeChange={setIsApprovalMode}
        />
      );
    }

    if (currentModule === "leaves" && isModuleVisible("leaves")) {
      return (
        <LeavesDashboard
          currentUser={currentUser}
          currentView={currentView}
          onViewChange={handleViewChange}
        />
      );
    }

    if (currentModule === "allocations" && isModuleVisible("allocations")) {
      return <AllocationsDashboard currentUser={currentUser} />;
    }

    if (currentModule === "engagements" && isModuleVisible("engagements")) {
      return <EngagementsDashboard currentUser={currentUser} />;
    }

    if (currentModule === "doorlogs" && isModuleVisible("doorlogs")) {
      return <DoorAccessLogs />;
    }

    // Expenses module views
    if (currentModule === "expenses" && isModuleVisible("expenses")) {
      switch (currentView) {
        case "dashboard":
          return (
            isViewVisible("expenses", "dashboard") &&
            hasViewPermission("expenses", "dashboard") && (
              <Dashboard
                currentUser={currentUser}
                stats={dashboardStats}
                recentInvoices={
                  currentUser.role === "ADMIN"
                    ? invoices // Show all invoices for admin users
                    : isApprovalMode
                      ? invoices
                      : invoices.filter((i) => i.userId === currentUser.id)
                }
                isApprovalMode={isApprovalMode}
                onViewChange={handleViewChange}
              />
            )
          );

        case "myinvoices":
          return (
            isViewVisible("expenses", "myinvoices") &&
            hasViewPermission("expenses", "myinvoices") && (
              <MyInvoiceList
                invoices={invoices}
                currentUser={currentUser}
                onEdit={handleInvoiceEdit}
                onView={(invoice) => {
                  console.log("Viewing invoice:", invoice);
                  setViewedInvoice(invoice);
                }}
                onSubmit={handleSubmitInvoice}
                onDelete={handleDeleteInvoice}
                onViewChange={handleViewChange}
                onRepeat={(invoice) => {
                  console.log("Repeating invoice:", invoice);
                  const licensePlate =
                    invoice.license_plate ||
                    extractLicensePlate(invoice.description);
                  console.log("Extracted license plate:", licensePlate);
                  setInitialInvoiceData({
                    vendor: invoice.vendor,
                    amount: invoice.amount,
                    description: invoice.description,
                    date: "",
                    type: invoice.type,
                    expense_type_id: invoice.expense_type_id,
                    expense_type_name: invoice.expense_type?.name,
                    origin: invoice.origin,
                    destination: invoice.destination,
                    kilometers: invoice.kilometers,
                    license_plate: licensePlate,
                    meal_type: invoice.meal_type,
                    number_of_persons: invoice.number_of_persons,
                    days: invoice.days,
                    payer: invoice.payer,
                    file_id: undefined,
                    document_type: undefined,
                  });
                  handleViewChange("submit");
                }}
              />
            )
          );

        case "submit":
          // Show the file upload section directly
          return (
            isViewVisible("expenses", "submit") &&
            hasViewPermission("expenses", "submit") && (
              <InvoiceFlowHandler
                currentUser={currentUser}
                initialData={initialInvoiceData}
                initialExpenseTypeName={initialInvoiceData?.expense_type_name}
                onSubmit={handleInvoiceSubmit}
                onBatchSubmit={handleBatchInvoiceSubmit}
                onCancel={() => {
                  setCurrentView("dashboard");
                  setInitialInvoiceData({}); // Clear the initial data when canceling
                }}
              />
            )
          );

        case "form":
          return (
            isViewVisible("expenses", "form") &&
            hasViewPermission("expenses", "form") && (
              <InvoiceFlowHandler
                currentUser={currentUser}
                initialData={initialInvoiceData}
                initialExpenseTypeName={initialInvoiceData?.expense_type_name}
                onSubmit={handleInvoiceSubmit}
                onBatchSubmit={handleBatchInvoiceSubmit}
                onCancel={() => {
                  setCurrentView("dashboard");
                  setScannedData(null);
                  setInitialInvoiceData({});
                }}
              />
            )
          );

        case "users":
          return (
            isViewVisible("expenses", "users") &&
            hasViewPermission("expenses", "users") && (
              <UserManagement currentUser={currentUser} />
            )
          );

        case "reconciliation":
          return (
            isViewVisible("expenses", "reconciliation") &&
            hasViewPermission("expenses", "reconciliation") && (
              <ReconciliationDashboard currentUser={currentUser} />
            )
          );

        case "invoices":
          if (
            !isViewVisible("expenses", "invoices") ||
            !hasViewPermission("expenses", "invoices")
          ) {
            return (
              <Dashboard
                currentUser={currentUser}
                stats={dashboardStats}
                recentInvoices={
                  currentUser.role === "ADMIN"
                    ? invoices
                    : invoices.filter((i) => i.userId === currentUser.id)
                }
                isApprovalMode={isApprovalMode}
                onViewChange={handleViewChange}
              />
            );
          }

          // Approvals list: only when in approval mode and user is APPROVER
          if (!isApprovalMode || currentUser.role !== "APPROVER") {
            return (
              <Dashboard
                currentUser={currentUser}
                stats={dashboardStats}
                recentInvoices={
                  currentUser.role === "ADMIN"
                    ? invoices
                    : invoices.filter((i) => i.userId === currentUser.id)
                }
                isApprovalMode={isApprovalMode}
                onViewChange={handleViewChange}
              />
            );
          }

          return (
            <InvoiceList
              invoices={invoices}
              currentUser={currentUser}
              isApprovalMode={isApprovalMode}
              onApprove={handleApprove}
              onReject={handleReject}
              onPay={handlePay}
              onEdit={handleInvoiceEdit}
              onView={(invoice) => setViewedInvoice(invoice)}
              onSubmit={handleSubmitInvoice}
              onDelete={handleDeleteInvoice}
              onExitApprovalMode={handleApprovalModeToggle}
              onRepeat={(invoice) => {
                console.log("Repeating invoice:", invoice);
                const licensePlate =
                  invoice.license_plate ||
                  extractLicensePlate(invoice.description);
                console.log("Extracted license plate:", licensePlate);
                setInitialInvoiceData({
                  vendor: invoice.vendor,
                  amount: invoice.amount,
                  description: invoice.description,
                  date: "",
                  type: invoice.type,
                  expense_type_id: invoice.expense_type_id,
                  expense_type_name: invoice.expense_type?.name,
                  origin: invoice.origin,
                  destination: invoice.destination,
                  kilometers: invoice.kilometers,
                  license_plate: licensePlate,
                  meal_type: invoice.meal_type,
                  number_of_persons: invoice.number_of_persons,
                  days: invoice.days,
                  payer: invoice.payer,
                  file_id: undefined,
                  document_type: undefined,
                });
                handleViewChange("submit");
              }}
            />
          );

        default:
          return (
            <Dashboard
              currentUser={currentUser}
              stats={dashboardStats}
              recentInvoices={
                currentUser.role === "ADMIN"
                  ? invoices // Show all invoices for admin users
                  : isApprovalMode
                    ? invoices
                    : invoices.filter((i) => i.userId === currentUser.id)
              }
              isApprovalMode={isApprovalMode}
              onViewChange={handleViewChange}
            />
          );
      }
    }

    // Default fallback
    return (
      <HomePage
        currentUser={currentUser}
        onModuleChange={handleModuleChange}
        onViewChange={handleViewChange}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <AppSidebar
        user={currentUser}
        currentModule={currentModule}
        onModuleChange={handleModuleChange}
      />

      <SidebarInset>
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Header for Expenses Module */}
          {currentModule === "expenses" && (
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger />
                  <h1 className="text-xl font-semibold text-gray-900">
                    Gestão de Despesas
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  {/* Expenses specific navigation */}
                  <button
                    onClick={() => handleViewChange("dashboard")}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === "dashboard"
                        ? "bg-yellow-100 text-yellow-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Vista Geral
                  </button>

                  {!isApprovalMode &&
                    isViewVisible("expenses", "myinvoices") &&
                    hasViewPermission("expenses", "myinvoices") && (
                      <button
                        onClick={() => handleViewChange("myinvoices")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === "myinvoices"
                            ? "bg-yellow-100 text-yellow-700"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        As Minhas Despesas
                      </button>
                    )}

                  {isApprovalMode &&
                    isViewVisible("expenses", "invoices") &&
                    hasViewPermission("expenses", "invoices") && (
                      <button
                        onClick={() => handleViewChange("invoices")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === "invoices"
                            ? "bg-yellow-100 text-yellow-700"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Aprovar Despesas
                      </button>
                    )}

                  {isViewVisible("expenses", "users") &&
                    hasViewPermission("expenses", "users") && (
                      <button
                        onClick={() => handleViewChange("users")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === "users"
                            ? "bg-yellow-100 text-yellow-700"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Gestão de Limites
                      </button>
                    )}

                  {isViewVisible("expenses", "reconciliation") &&
                    hasViewPermission("expenses", "reconciliation") && (
                      <button
                        onClick={() => handleViewChange("reconciliation")}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          currentView === "reconciliation"
                            ? "bg-yellow-100 text-yellow-700"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Reconciliação
                      </button>
                    )}
                </div>

                {/* Approver Mode toggle button for APPROVER users */}
                {currentUser.role === "APPROVER" && (
                  <button
                    onClick={handleApprovalModeToggle}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                      isApprovalMode
                        ? "bg-yellow-100 text-yellow-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    {isApprovalMode
                      ? "Sair do Modo Aprovação"
                      : "Modo Aprovação"}
                  </button>
                )}
              </div>
            </div>
          )}

          {currentModule === "doorlogs" && isModuleVisible("doorlogs") && (
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger />
                  <h1 className="text-xl font-semibold text-gray-900">
                    Controlo de Acessos
                  </h1>
                </div>
              </div>
            </div>
          )}

          {/* Top Header for Engagements Module */}
          {currentModule === "engagements" &&
            isModuleVisible("engagements") && (
              <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center space-x-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-semibold text-gray-900">
                      Gestão de Projetos
                    </h1>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Demonstração
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Top Header for Allocations Module */}
          {currentModule === "allocations" &&
            isModuleVisible("allocations") && (
              <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-center space-x-4">
                    <SidebarTrigger />
                    <h1 className="text-xl font-semibold text-gray-900">
                      Gestão de Alocação
                    </h1>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Demonstração
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Top Header for Leaves Module */}
          {currentModule === "leaves" && isModuleVisible("leaves") && (
            <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <SidebarTrigger />
                  <h1 className="text-xl font-semibold text-gray-900">
                    Gestão de Ausências
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:gap-4">
                  {/* Leaves specific navigation */}
                  <button
                    onClick={() => handleViewChange("dashboard")}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === "dashboard"
                        ? "bg-yellow-100 text-yellow-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Vista Geral
                  </button>
                  <button
                    onClick={() => handleViewChange("invoices")}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentView === "invoices"
                        ? "bg-yellow-100 text-yellow-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Histórico
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-auto">{renderContent()}</div>
        </div>

        {/* Error Notification */}
        {showError && errorMessage && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] max-w-md w-[95%] md:w-full">
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3 flex-grow">
                  <p className="text-sm font-medium text-red-800">Erro</p>
                  <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
                </div>
                <div className="ml-auto pl-3">
                  <div className="-mx-1.5 -my-1.5">
                    <button
                      onClick={() => setShowError(false)}
                      className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <span className="sr-only">Dismiss</span>
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 md:p-6 rounded-lg shadow-xl flex items-center space-x-4 max-w-xs md:max-w-md mx-auto">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
              <p className="text-gray-700">A carregar...</p>
            </div>
          </div>
        )}

        {/* Invoice Detail Modal */}
        {viewedInvoice &&
          (console.log("Viewed invoice:", viewedInvoice),
          (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 md:p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detalhes da Despesa
                  </h3>
                  <button
                    onClick={() => {
                      setViewedInvoice(null);
                      setIsEditMode(false);
                      setEditedInvoice(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-4">
                  {/* Invoice Header */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
                    <div>
                      {isEditMode ? (
                        <div className="mb-4">
                          <label
                            htmlFor="vendor"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Fornecedor
                          </label>
                          <input
                            type="text"
                            id="vendor"
                            value={editedInvoice.vendor}
                            onChange={(e) =>
                              handleEditChange("vendor", e.target.value)
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                          />
                        </div>
                      ) : (
                        <h2 className="text-xl font-bold text-gray-900">
                          {viewedInvoice.vendor}
                        </h2>
                      )}

                      {isEditMode ? (
                        <div>
                          <label
                            htmlFor="description"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Descrição
                          </label>
                          <textarea
                            id="description"
                            value={editedInvoice.description}
                            onChange={(e) =>
                              handleEditChange("description", e.target.value)
                            }
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            rows={2}
                          />
                        </div>
                      ) : (
                        <p className="text-gray-600">
                          {viewedInvoice.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-2 sm:mt-0">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          viewedInvoice.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : viewedInvoice.status === "submitted" ||
                                viewedInvoice.status === "SUBMITTED"
                              ? "bg-blue-100 text-blue-800"
                              : viewedInvoice.status === "payed" ||
                                  viewedInvoice.status === "PAYED"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {viewedInvoice.status === "rejected"
                          ? "Rejeitada"
                          : viewedInvoice.status === "submitted" ||
                              viewedInvoice.status === "SUBMITTED"
                            ? "Guardada"
                            : viewedInvoice.status === "payed" ||
                                viewedInvoice.status === "PAYED"
                              ? "Paga"
                              : "Pendente"}
                      </span>
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
                    <div className="flex items-start">
                      <Euro className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Valor
                        </p>
                        {isEditMode &&
                        viewedInvoice.expense_type?.name !==
                          "Ajudas de Custo" ? (
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              value={editedInvoice.amount}
                              onChange={(e) =>
                                handleEditChange(
                                  "amount",
                                  parseFloat(e.target.value),
                                )
                              }
                              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                            />
                            <span className="absolute right-3 top-2 text-gray-500">
                              €
                            </span>
                          </div>
                        ) : (
                          <p className="text-lg font-semibold text-gray-900">
                            {viewedInvoice.amount.toFixed(2)}€
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Tag className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                      <div className="w-full">
                        <p className="text-sm font-medium text-gray-500">
                          Tipo
                        </p>
                        {isEditMode ? (
                          <p className="text-lg font-semibold text-gray-900">
                            {editedInvoice.type === "company"
                              ? "Empresa"
                              : editedInvoice.type === "bonus" ||
                                  editedInvoice.type === "BONUS"
                                ? "Bónus"
                                : "Benefícios"}
                          </p>
                        ) : (
                          <p className="text-lg font-semibold text-gray-900">
                            {viewedInvoice.type === "company"
                              ? "Empresa"
                              : viewedInvoice.type === "bonus"
                                ? "Bónus"
                                : "Benefícios"}
                          </p>
                        )}
                        {viewedInvoice.expense_type && (
                          <p className="text-sm text-gray-600">
                            {viewedInvoice.expense_type.name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                      <div className="w-full">
                        <p className="text-sm font-medium text-gray-500">
                          Data da Despesa
                        </p>
                        {isEditMode ? (
                          <DatePickerInput
                            value={editedInvoice.date || null}
                            onChange={(date) => handleEditChange("date", date)}
                            placeholder="dd/mm/yyyy"
                            id="edited-invoice-date"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-gray-900">
                            {new Date(viewedInvoice.date).toLocaleDateString(
                              "pt-PT",
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Data de Submissão
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {new Date(
                            viewedInvoice.submissionDate,
                          ).toLocaleDateString("pt-PT")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <UserIcon className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">
                          Submetido Por
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {viewedInvoice.userName}
                        </p>
                      </div>
                    </div>

                    {/* Travel specific fields */}
                    {(viewedInvoice.expense_type?.name === "Viagens" ||
                      viewedInvoice.origin ||
                      viewedInvoice.destination ||
                      viewedInvoice.kilometers) && (
                      <>
                        <div className="flex items-start">
                          <Tag className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Origem
                            </p>
                            {isEditMode ? (
                              <input
                                type="text"
                                value={editedInvoice.origin || ""}
                                onChange={(e) =>
                                  handleEditChange("origin", e.target.value)
                                }
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                              />
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">
                                {viewedInvoice.origin}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Tag className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Destino
                            </p>
                            {isEditMode ? (
                              <input
                                type="text"
                                value={editedInvoice.destination || ""}
                                onChange={(e) =>
                                  handleEditChange(
                                    "destination",
                                    e.target.value,
                                  )
                                }
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                              />
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">
                                {viewedInvoice.destination}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Tag className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Quilómetros
                            </p>
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                value={editedInvoice.kilometers || ""}
                                onChange={(e) =>
                                  handleEditChange(
                                    "kilometers",
                                    parseInt(e.target.value),
                                  )
                                }
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                              />
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">
                                {viewedInvoice.kilometers}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Meals specific fields */}
                    {(viewedInvoice.expense_type?.name === "Refeições" ||
                      viewedInvoice.meal_type ||
                      viewedInvoice.number_of_persons) && (
                      <>
                        <div className="flex items-start">
                          <Tag className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Tipo de Refeição
                            </p>
                            {isEditMode ? (
                              <select
                                value={editedInvoice.meal_type || ""}
                                onChange={(e) =>
                                  handleEditChange("meal_type", e.target.value)
                                }
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                              >
                                <option value="Almoço">Almoço</option>
                                <option value="Jantar">Jantar</option>
                                <option value="Pequeno-almoço">
                                  Pequeno-almoço
                                </option>
                                <option value="Lanche">Lanche</option>
                              </select>
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">
                                {viewedInvoice.meal_type}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <Tag className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Número de Pessoas
                            </p>
                            {isEditMode ? (
                              <input
                                type="number"
                                min="1"
                                value={editedInvoice.number_of_persons || ""}
                                onChange={(e) =>
                                  handleEditChange(
                                    "number_of_persons",
                                    parseInt(e.target.value),
                                  )
                                }
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                              />
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">
                                {viewedInvoice.number_of_persons}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Per Diem Allowance specific fields */}
                    {viewedInvoice.expense_type?.name === "Ajudas de Custo" && (
                      <>
                        <div className="flex items-start">
                          <Tag className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Número de Dias
                            </p>
                            {isEditMode ? (
                              <div>
                                <input
                                  type="number"
                                  min="1"
                                  value={editedInvoice.days}
                                  onChange={(e) => {
                                    const days = parseInt(e.target.value);
                                    const amount = days * 58.52;
                                    handleEditChange("days", days);
                                    handleEditChange(
                                      "amount",
                                      parseFloat(amount.toFixed(2)),
                                    );
                                  }}
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                                />
                                <p className="text-sm text-gray-600 mt-1">
                                  {editedInvoice.days} dias × 58,52€ ={" "}
                                  {(editedInvoice.days * 58.52).toFixed(2)}€
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-lg font-semibold text-gray-900">
                                  {viewedInvoice.days}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {viewedInvoice.days} dias × 58,52€ ={" "}
                                  {viewedInvoice.days &&
                                    (viewedInvoice.days * 58.52).toFixed(2)}
                                  €
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Coverflex specific fields */}
                    {viewedInvoice.expense_type?.name === "Coverflex" && (
                      <>
                        <div className="flex items-start">
                          <DollarSign className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Valor
                            </p>
                            {isEditMode ? (
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editedInvoice.amount}
                                  onChange={(e) =>
                                    handleEditChange(
                                      "amount",
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                                />
                                <span className="absolute right-3 top-2 text-gray-500">
                                  €
                                </span>
                              </div>
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">
                                {viewedInvoice.amount.toFixed(2)}€
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start">
                          <FileText className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                          <div className="w-full">
                            <p className="text-sm font-medium text-gray-500">
                              Descrição
                            </p>
                            {isEditMode ? (
                              <textarea
                                value={editedInvoice.description}
                                onChange={(e) =>
                                  handleEditChange(
                                    "description",
                                    e.target.value,
                                  )
                                }
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                                rows={2}
                              />
                            ) : (
                              <p className="text-lg font-semibold text-gray-900">
                                {viewedInvoice.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}

                    {/* Others - Generic expense types that don't have specific handling */}
                    {viewedInvoice.expense_type &&
                      viewedInvoice.expense_type.name !== "Viagens" &&
                      viewedInvoice.expense_type.name !== "Refeições" &&
                      viewedInvoice.expense_type.name !== "Ajudas de Custo" &&
                      viewedInvoice.expense_type.name !== "Coverflex" && (
                        <>
                          <div className="flex items-start">
                            <Calendar className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                            <div className="w-full">
                              <p className="text-sm font-medium text-gray-500">
                                Data da Despesa
                              </p>
                              {isEditMode ? (
                                <DatePickerInput
                                  value={editedInvoice.date || null}
                                  onChange={(date) =>
                                    handleEditChange("date", date)
                                  }
                                  placeholder="dd/mm/yyyy"
                                  id="edited-invoice-date-generic"
                                />
                              ) : (
                                <p className="text-lg font-semibold text-gray-900">
                                  {new Date(
                                    viewedInvoice.date,
                                  ).toLocaleDateString("pt-PT")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-start">
                            <DollarSign className="w-5 h-5 text-gray-400 mr-2 mt-0.5" />
                            <div className="w-full">
                              <p className="text-sm font-medium text-gray-500">
                                Valor
                              </p>
                              {isEditMode ? (
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editedInvoice.amount}
                                    onChange={(e) =>
                                      handleEditChange(
                                        "amount",
                                        parseFloat(e.target.value),
                                      )
                                    }
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                                  />
                                  <span className="absolute right-3 top-2 text-gray-500">
                                    €
                                  </span>
                                </div>
                              ) : (
                                <p className="text-lg font-semibold text-gray-900">
                                  {viewedInvoice.amount.toFixed(2)}€
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                    {viewedInvoice.status === "rejected" &&
                      viewedInvoice.rejectionReason && (
                        <div className="flex items-start col-span-2">
                          <X className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-500">
                              Motivo da Rejeição
                            </p>
                            <p className="text-lg font-semibold text-red-600">
                              {viewedInvoice.rejectionReason}
                            </p>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Document Section */}
                  {viewedInvoice.file_id && (
                    <div className="border-t border-gray-200 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          Documento
                        </h3>
                        <a
                          href={invoiceService.getInvoiceDocumentUrl(
                            viewedInvoice,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Ver/Descarregar
                        </a>
                      </div>

                      {viewedInvoice.document_type === "IMAGE" ? (
                        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                          <img
                            src={invoiceService.getInvoiceDocumentUrl(
                              viewedInvoice,
                            )}
                            alt="Documento da despesa"
                            className="max-w-full max-h-96 object-contain"
                          />
                        </div>
                      ) : (
                        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-center">
                          <FileText className="w-12 h-12 text-gray-400" />
                          <p className="ml-3 text-gray-600">
                            {viewedInvoice.document_type === "PDF"
                              ? "Documento PDF"
                              : viewedInvoice.document_type === "IMAGE"
                                ? "Imagem"
                                : "Documento"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 px-4 md:px-6 py-4 flex flex-wrap justify-between gap-3">
                  <div>
                    <button
                      onClick={() => {
                        setViewedInvoice(null);
                        setIsEditMode(false);
                        setEditedInvoice(null);
                      }}
                      className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                    >
                      Fechar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {viewedInvoice.status.toLowerCase() === "pending" &&
                      !isEditMode && (
                        <button
                          onClick={() => toggleEditMode(viewedInvoice)}
                          className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-green-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm mr-2"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </button>
                      )}
                    {isEditMode && (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-green-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm mr-2"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setIsEditMode(false);
                            setEditedInvoice(null);
                          }}
                          className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm mr-2"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </button>
                      </>
                    )}
                    {(viewedInvoice.status === "submitted" ||
                      viewedInvoice.status === "SUBMITTED") && (
                      <button
                        onClick={async () => {
                          try {
                            await handleSubmitInvoice(viewedInvoice.id);
                          } catch (error) {
                            console.log("Error submitting invoice :", error);
                          }
                          setViewedInvoice(null);
                        }}
                        className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-blue-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm mr-2"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Submeter
                      </button>
                    )}
                    {viewedInvoice.can_delete && (
                      <button
                        onClick={() => {
                          handleDeleteInvoice(viewedInvoice.id);
                          setViewedInvoice(null);
                        }}
                        className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-red-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                      >
                        <Trash className="w-4 h-4 mr-2" />
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </SidebarInset>
    </div>
  );
}

export default App;
