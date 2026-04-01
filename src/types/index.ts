export interface SpendingLimit {
  annual_limit: number;
  accrued_limit: number;
  used: number;
  pending: number;
  available: number;
  period_start?: string;
  period_end?: string;
}

export interface UserLimits {
  companyAccount: SpendingLimit;
  employeeBenefits: SpendingLimit;
  bonusAccount?: SpendingLimit;
}

export interface UserLimitsUpdate {
  companyAccount: { annual_limit: number };
  employeeBenefits: { annual_limit: number };
  bonusAccount?: { annual_limit: number };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  can_use_bonus: boolean;
  limits: UserLimits;
}

export type UserRole = "NORMAL" | "APPROVER" | "ADMIN";

export type DocumentType = "PDF" | "IMAGE";

export enum MealType {
  BREAKFAST = "Pequeno almoço",
  LUNCH = "Almoço",
  SNACK = "Lanche",
  DINNER = "Jantar",
  OTHER = "Outras",
}

export interface ExpenseType {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  userId: string;
  userName: string;
  type: "company" | "benefits" | "bonus";
  expense_type_id?: number;
  expense_type?: ExpenseType;
  amount: number;
  iva?: number;
  vendor: string;
  vendor_nif?: string;
  vendor_name?: string;
  vendor_cae?: string;
  invoice_number?: string;
  description: string;
  date: string;
  submissionDate: string;
  status:
    | "approved"
    | "pending"
    | "rejected"
    | "payed"
    | "submitted"
    | "APPROVED"
    | "PENDING"
    | "REJECTED"
    | "PAYED"
    | "SUBMITTED";
  document_type?: DocumentType;
  file_id?: string;
  rejectionReason?: string;
  approvalDate?: string;
  rejectionDate?: string;
  // Who paid for the expense
  payer?: "COMPANY" | "EMPLOYEE" | "SUPPLIER";
  // Travel specific fields
  origin?: string;
  destination?: string;
  kilometers?: number;
  license_plate?: string;
  // Meals specific fields
  meal_type?: MealType;
  number_of_persons?: number;
  // Per Diem Allowance specific fields
  days?: number;
  // Permission flags
  can_edit?: boolean;
  can_delete?: boolean;
}

export interface InvoiceQueryParams {
  status?: string;
  type?: string;
  dateStart?: string;
  dateEnd?: string;
  skip?: number;
  limit?: number;
}

export interface InvoiceDistribution {
  userIds: string[];
  allocations: Record<string, number>;
}

export interface ExpenseTypeStats {
  id: number;
  name: string;
  amount: number;
  count: number;
}

export interface DashboardStats {
  totalInvoices: number;
  pendingApprovals: number;
  payedThisMonth: number;
  rejectedThisMonth: number;
  submittedThisMonth: number;
  expenseTypeStats: ExpenseTypeStats[];
}

// ============================================
// RECONCILIATION TYPES
// ============================================

export interface ReconciliationUpload {
  upload_id: string;
  filename: string;
  file_size: number;
  expires_at: string; // ISO datetime
}

export interface FileInspectionHeader {
  index: number;
  name: string;
  sample_values: string[];
  data_type: string;
}

export interface FileInspection {
  upload_id: string;
  filename: string;
  row_count: number;
  column_count: number;
  headers: FileInspectionHeader[];
  sample_rows: Record<string, any>[];
  warnings: string[];
  earliest_date: string; // ISO date
  latest_date: string; // ISO date
}

export interface JobStatus {
  job_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  progress: number; // 0-100
  started_at?: string; // ISO datetime
  finished_at?: string; // ISO datetime
  error_message?: string;
  date_start: string;
  date_end: string;
}

export interface SourceMetrics {
  source: "efatura" | "system";
  total_invoices: number;
  total_amount: number;
  reconciled_count: number;
  unreconciled_count: number;
}

export interface DiscrepancyRow {
  key: string; // Chave única
  type: string; // Tipo de discrepância
  field: string; // Campo que difere
  invoice_number: string;
  value_efatura: any;
  value_system: any;
  severity: "INFO" | "WARNING" | "ERROR";
  suggestion: string; // Sugestão de resolução
}

// Backend response schema for reconciliation results
export interface ReconciliationResultResponse {
  job_id: string;
  status: string;
  date_start: string | null;
  date_end: string | null;
  processing_time_seconds: number;
  total_efatura: number;
  total_efatura_amount: number;
  total_system: number;
  total_system_amount: number;
  total_difference: number;
  total_difference_amount: number;
  matched_count: number;
  missing_in_system_count: number;
  missing_in_efatura_count: number;
  duplicate_count: number;
  discrepancies_high: number;
  discrepancies_medium: number;
  discrepancies_low: number;
  discrepancies_by_type: Record<string, number>;
  discrepancies: Array<Record<string, any>>;
}

// Chart.js-compatible dataset structure
export interface ChartDataset {
  label?: string | null;
  data: any[];
  backgroundColor?: any[] | null;
  borderColor?: any[] | null;
  borderWidth?: number | null;
}

// Chart.js-compatible chart data
export interface ChartData {
  labels: any[];
  datasets: ChartDataset[];
}

// Backend response for chart datasets
export interface ChartDatasetsResponse {
  pie_reconciliation: ChartData;
  bar_severity: ChartData;
  bar_suppliers: ChartData;
}

// ============================================
// BATCH INVOICE TYPES
// ============================================

export interface BatchInvoiceItem {
  user_id: string;
  amount: number;
}

export interface BatchInvoiceCreate {
  vendor: string;
  vendor_nif?: string;
  vendor_name?: string;
  vendor_cae?: string;
  invoice_number?: string; // Vendor's invoice number for reconciliation
  description: string;
  date: string; // ISO date string
  iva: number;
  expense_type_id?: number;
  payer?: "COMPANY" | "EMPLOYEE" | "SUPPLIER";
  origin?: string;
  destination?: string;
  kilometers?: number;
  meal_type?: MealType;
  number_of_persons?: number;
  days?: number;
  file_id?: string;
  document_type?: string;
  items: BatchInvoiceItem[];
}

export interface BatchInvoiceResponse {
  success: boolean;
  invoice_ids: string[];
  warnings?: string[];
  template_id?: string;
}

export interface BatchTemplate {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  item_count: number;
}

export interface BatchTemplateItem {
  user_id: string;
  allocated_amount: number;
}

export interface BatchTemplateDetail extends BatchTemplate {
  items: BatchTemplateItem[];
}

// DOOR ACCESS CONTROL TYPES
// ============================================

export interface UnlockResponse {
  success: boolean;
  message: string;
  duration?: number;
  unlock_until?: string;
}

export interface DoorStatus {
  enabled: boolean;
  on_office_network: boolean;
  device?: Record<string, unknown>;
  error?: string;
}

export interface DoorAccessLog {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  timestamp: string;
  action: "UNLOCK_REQUEST" | "UNLOCK_SUCCESS" | "UNLOCK_FAILED";
  ip_address: string;
  user_agent: string | null;
  proximity_check_passed: boolean;
  failure_reason: string | null;
  unlock_duration_seconds: number | null;
  shelly_response: Record<string, unknown> | null;
}

export interface DoorAccessLogsResponse {
  total: number;
  limit: number;
  offset: number;
  logs: DoorAccessLog[];
}

export interface DoorAccessLogsFilters {
  limit?: number;
  offset?: number;
  user_id?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?:
    | "timestamp"
    | "action"
    | "user_name"
    | "ip_address"
    | "proximity_check_passed"
    | "unlock_duration_seconds";
  sort_order?: "asc" | "desc";
}

// ============================================
// ALLOCATION & ENGAGEMENT TYPES
// ============================================

export type AllocationStatus = "active" | "planned" | "completed";
export type AllocationType = "projeto" | "ferias" | "formacao" | "interno";
export type EngagementStatus = "active" | "planning" | "completed";

// Worker categories matching mote.consulting seniority tiers
export type WorkerCategory =
  | "P" // Partner
  | "AP" // Associate Partner
  | "SM1" // Senior Manager 1
  | "M1" // Manager 1
  | "M2" // Manager 2
  | "SC1" // Senior Consultant 1
  | "SC2" // Senior Consultant 2
  | "C1" // Consultant 1
  | "C2" // Consultant 2
  | "AM" // Associate Manager
  | "A1" // Analyst 1
  | "Ext"; // External

// Resource Groups — UI-level grouping derived from WorkerCategory
export type ResourceGroup =
  | "leadership"
  | "management"
  | "senior"
  | "consultant"
  | "external";

export const RESOURCE_GROUP_CONFIG: Record<
  ResourceGroup,
  { label: string; categories: WorkerCategory[]; color: string }
> = {
  leadership: {
    label: "Leadership",
    categories: ["P", "AP"],
    color: "#7C3AED",
  },
  management: {
    label: "Management",
    categories: ["SM1", "M1", "M2", "AM"],
    color: "#2563EB",
  },
  senior: { label: "Senior", categories: ["SC1", "SC2"], color: "#0891B2" },
  consultant: {
    label: "Consultant",
    categories: ["C1", "C2", "A1"],
    color: "#059669",
  },
  external: { label: "External", categories: ["Ext"], color: "#6B7280" },
};

export const getResourceGroup = (category: WorkerCategory): ResourceGroup => {
  for (const [group, config] of Object.entries(RESOURCE_GROUP_CONFIG)) {
    if (config.categories.includes(category)) return group as ResourceGroup;
  }
  return "consultant";
};

export interface Worker {
  id: string;
  name: string;
  role: string;
  category: WorkerCategory;
  capacityFte: number;
}

export interface Engagement {
  id: string;
  name: string;
  code: string; // Short code for timeline display (e.g., "BA", "C", "E")
  client: string;
  color: string; // Hex color for timeline/calendar display
  capacityFte: number;
  status: EngagementStatus;
  startDate: string;
  endDate: string;
  notes?: string;
  allocatedFte?: number;
}

export interface Allocation {
  id: string;
  workerId: string;
  engagementId?: string;
  startDate: string;
  endDate: string;
  percent: number; // 0.0 to 1.0 (1.0 = 100% = 1 FTE)
  type: AllocationType;
  status: AllocationStatus;
  notes?: string;
  workerName?: string;
  engagementName?: string;
}

export interface AllocationCreate {
  workerId: string;
  engagementId?: string;
  startDate: string;
  endDate: string;
  percent: number;
  type: AllocationType;
  status: AllocationStatus;
  notes?: string;
}

export interface AllocationUpdate {
  startDate?: string;
  endDate?: string;
  percent?: number;
  status?: AllocationStatus;
  engagementId?: string;
  notes?: string;
}

export interface ConflictDetail {
  allocationId: string;
  workerName: string;
  engagementName: string;
  startDate: string;
  endDate: string;
  percent: number;
  overlapStart: string;
  overlapEnd: string;
}

export interface ConflictCheckResponse {
  hasConflicts: boolean;
  conflicts: ConflictDetail[];
  maxTotalPercent: number;
}

// Timeline view types (weekly grid - replaces the Excel matrix)
export interface TimelineWeek {
  weekNumber: number;
  label: string; // e.g., "Semana 6"
  startDate: string;
  endDate: string;
  month: string;
}

export interface TimelineCellAllocation {
  engagementCode: string;
  engagementColor: string;
  percent: number;
  type: AllocationType;
  engagementId?: string;
  allocationId: string;
}

export interface TimelineCell {
  workerId: string;
  week: TimelineWeek;
  allocations: TimelineCellAllocation[];
  totalPercent: number;
  isOverallocated: boolean;
}

export interface WorkerTimeline {
  worker: Worker;
  chargeability: number; // 0.0 to 1.0, calculated across visible weeks
  cells: TimelineCell[];
}

// Calendar view types
export interface CalendarDayAllocation {
  id: string;
  type: AllocationType;
  label: string;
  percent: number;
  color: string;
}

export interface CalendarDay {
  date: string;
  allocations: CalendarDayAllocation[];
  totalHours: number;
  isOverallocated: boolean;
  isWeekend: boolean;
}

// Stats & summaries
export interface AllocationStats {
  totalAllocations: number;
  activeAllocations: number;
  conflicts: number;
  upcomingEnd: number;
  avgChargeability: number;
}

export interface EngagementSummary {
  engagement: Engagement;
  allocatedFte: number;
  allocations: Allocation[];
  workerCount: number;
}

export interface EngagementCreate {
  name: string;
  code: string;
  client: string;
  color: string;
  capacityFte: number;
  status: EngagementStatus;
  startDate: string;
  endDate: string;
  notes?: string;
}
