# AXEL Frontend - AI Coding Assistant Instructions

## Project Overview

**AXEL** (Allocation · eXpenses · Engagements · Leaves) is an enterprise invoice approval and expense management platform for mote.consulting. Built with React 18 + TypeScript + Vite, featuring Azure AD authentication and a modular dashboard architecture.

## Repository Information

- **Azure DevOps**: Project `Axel`, repo `axel-frontend`. Repo ID: `dd4fc789-a14a-4fc2-9fdc-979aa54fe387`
- **Git Flow**: Follow git flow branching model:
  - **`main`**: Production-ready code (merge from release branches)
  - **`master`**: Legacy main branch (deprecated, migrate to main)
  - **`release/YYYY-MM`**: Release branches (e.g., `release/2026-01`). Create from main, merge back after release.
  - **`feature/*`**: Feature branches from main (e.g., `feature/125-multiuser-expense`). Create PR to release or main for review.
  - **`test`**: Test/staging branch for pre-release validation.
  - Naming: use feature/`<issue-number>-<description>` for feature branches; release PRs target release branches.

## Architecture & Key Patterns

### Monolithic App Component (`src/App.tsx`)

- **1683 lines** - All routing, state, and business logic lives in `App.tsx`
- No React Router for routing - uses view state (`currentModule`, `currentView`, `isApprovalMode`)
- State management: Vanilla React `useState` hooks (no Redux/Zustand)
- Module switching controlled by sidebar navigation (`ModuleType`: dashboard, expenses, leaves, allocations, engagements)
- View types: dashboard, submit, invoices, myinvoices, form, users, **reconciliation** (new)

### Authentication Pattern (Azure AD + MSAL)

- **Token-based auth** with Azure MSAL (`@azure/msal-browser`)
- Critical: All API calls must use `authService.fetchWithAuth()` - handles token injection and 401 retries
- CAE (Continuous Access Evaluation) support - tokens can be revoked mid-session
- Token stored in `localStorage` under key `invoice_approval_token`
- Configuration in [src/services/authService.ts](../src/services/authService.ts) (lines 1-20)

### API Integration Strategy

- Backend URL: `config.ts` switches between production (`axel-mote-api`), UAT (`uat-axel-api`), and localhost based on `VITE_APP_ENV`
- **Production**: `VITE_APP_ENV === "production"` → `axel-mote-api.westeurope.cloudapp.azure.com`
- **UAT**: `VITE_APP_ENV === "uat"` → `uat-axel-api.westeurope.cloudapp.azure.com`
- **Development**: Neither production nor UAT → `http://localhost:8000`
- **HTTPS enforcement**: Runtime protocol upgrade for Azure endpoints (see [src/config.ts](../src/config.ts) lines 16-27)
- Document URLs require authenticated tokens: `invoiceService.getAuthenticatedDocumentUrl()` or `invoiceService.getInvoiceDocumentUrl()`
- 10-second timeout on all invoice fetches using `AbortController`

### Component Structure Conventions

1. **Interface naming**: Always `[ComponentName]Props` (e.g., `DefaultInvoiceFormProps`)
2. **Barrel exports**: Each feature folder has `index.ts` re-exporting all components (see [src/components/Invoice/Forms/index.ts](../src/components/Invoice/Forms/index.ts))
3. **Service organization**: All services exported from [src/services/index.ts](../src/services/index.ts) - import via `import { authService, invoiceService } from './services'`
4. **Type definitions**: Centralized in [src/types/index.ts](../src/types/index.ts) - **never** define types inline in components

### UI Component System (shadcn/ui)

- Radix UI primitives + TailwindCSS with custom design tokens
- **cn() utility**: Use `cn()` from [src/lib/utils.ts](../src/lib/utils.ts) for conditional classNames (never raw string concatenation)
- Button variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, **`yellow`** (custom)
- Theme system: CSS variables in [src/index.css](../src/index.css), configured via [tailwind.config.js](../tailwind.config.js)
- Path aliasing: `@/*` resolves to `src/*` (configured in [tsconfig.json](../tsconfig.json))

### Invoice Form Pattern

- **5 specialized forms** in `src/components/Invoice/Forms/`:
  - `DefaultInvoiceForm` - General expenses
  - `TravelInvoiceForm` - Travel expenses (origin, destination, kilometers, license_plate)
  - `MealInvoiceForm` - Meal allowances (meal_type, number_of_persons)
  - `PerDiemAllowanceInvoiceForm` - Per diem (58.52€ fixed rate from `config.ts`, days field)
  - `CoverflexInvoiceForm` - Coverflex benefits
- Form data includes `payer` field: `COMPANY | EMPLOYEE | SUPPLIER`
- **Accrued limit validation**: Forms validate against `limit.accrued_limit` instead of monthly limits
- Expense types fetched dynamically via `expenseTypeService`
- File upload pattern: Use `handleFileUpload` from [src/services/fileUploadService.ts](../src/services/fileUploadService.ts)

### Spending Limits Architecture

```typescript
// User has 3 spending limit accounts (see src/types/index.ts)
interface UserLimits {
  companyAccount: SpendingLimit; // Annual & accrued limits
  employeeBenefits: SpendingLimit;
  bonusAccount?: SpendingLimit; // Optional
}

interface SpendingLimit {
  annual_limit: number; // Total annual allocation
  accrued_limit: number; // Amount accrued so far (1/12 per month with carry-over)
  used: number; // Total used (PENDING + APPROVED + PAYED)
  pending: number; // Pending approval amount (PENDING + APPROVED)
  available: number; // Remaining accrued - used - pending
}
```

- **Accrued limits**: Users accrue 1/12 of annual limit each month; unused amounts carry over within the year
- Dashboard shows **two limit cards**: Accrued Limit (left) and Annual Limit (right)
- Both cards display percentage indicators with color-coded tooltips (green ≤60%, yellow 60-80%, red >80%)
- Forms validate against `accrued_limit`, not `annual_limit`
- Invoice statuses affecting limits: `PENDING`, `APPROVED`, `PAYED` (not `SUBMITTED` or `REJECTED`)

## Development Workflows

### Build & Run

```bash
npm run dev       # Dev server on port 8080 (not 5174 - see vite.config.ts)
npm run build     # Production build to dist/
npm run preview   # Preview build on 0.0.0.0:8080
npm run lint      # ESLint check
```

### Environment Variables

- `VITE_APP_ENV`: Environment selector (`production` | `uat` | default to localhost)
- `VITE_API_URL`: Optional override for API URL (takes precedence over `VITE_APP_ENV`)

### Key Configuration Files

- [vite.config.ts](../vite.config.ts): Port 8080, `strictPort: true`, `vite-tsconfig-paths` plugin
- [web.config](../web.config): IIS deployment with SPA rewrite rules
- [startup.cmd](../startup.cmd): Windows deployment script

### Testing Strategy

- **No test framework configured** - no Jest/Vitest setup currently
- When adding tests, install Vitest (matches Vite ecosystem)

## Common Gotchas

1. **Document URLs Expire**: Never store `documentUrl` - always regenerate with `getAuthenticatedDocumentUrl()` or `getInvoiceDocumentUrl()`
2. **Mobile Sidebar**: Uses `useIsMobile()` hook + `setOpenMobile()` from sidebar context for responsive behavior
3. **CAE Token Revocation**: Handle `TokenIssuedBeforeRevocationTimestamp` errors via `authService.isCAEError()`
4. **Lucide Icons**: Use `lucide-react` for all icons (excluded from Vite optimizeDeps to avoid issues)
5. **APPROVED Status**: New invoice status (PENDING → APPROVED → PAYED workflow) - handle in status checks and UI rendering
6. **Accrued vs Annual Limits**: Always validate against `accrued_limit` in forms, not `annual_limit`
7. **Reconciliation Module**: Approvers-only module for e-fatura reconciliation with async job processing## Code Style Preferences

- **No optional chaining spam**: Use it judiciously, not on every property access
- **Portuguese labels**: All user-facing text in Portuguese (e.g., "Pequeno almoço", "Almoço")
- **Explicit interfaces**: Always define props interfaces, never inline types
- **Service pattern**: Keep business logic in services, components stay thin
- **Error handling**: Use `errorMessage` state + `showError` boolean pattern (see App.tsx)

## Adding New Features

### New Module (e.g., "Expenses V2")

1. Add `ModuleType` to [src/App.tsx](../src/App.tsx) type union (line 39)
2. Create component in `src/components/[Module]/`
3. Add navigation entry in [src/components/Layout/app-sidebar.tsx](../src/components/Layout/app-sidebar.tsx) `navMain` array
4. Add conditional render in `App.tsx` based on `currentModule` state
5. Update `useModuleVisibility` hook if role-based access is needed

### New View (e.g., "Reconciliation")

1. Add `ViewType` to [src/App.tsx](../src/App.tsx) type union (line 48)
2. Create component in `src/components/[Module]/`
3. Add view button/link in module's navigation section
4. Add conditional render in `App.tsx` based on `currentView` state
5. Update `useModuleVisibility` hook permissions if needed

### New Invoice Type

1. Create form component in `src/components/Invoice/Forms/`
2. Export from `Forms/index.ts`
3. Add type-specific validation logic against `accrued_limit`
4. Update `InvoiceFormData` interface if new fields needed (e.g., `origin`, `destination`, `meal_type`)
5. Handle new status transitions (consider APPROVED status in workflows)

### New API Service

1. Create `src/services/[feature]Service.ts`
2. Export from `src/services/index.ts`
3. Always use `authService.fetchWithAuth()` for authenticated requests
4. Handle errors with `isCAEError()` check

## Environment-Specific Notes

- **Deployment**: IIS with URL rewriting (see [web.config](../web.config))
- **Azure AD Tenant**: Hardcoded in authService (tenant ID: `faf35bc4-bf72-45db-8522-1f1e814d32c4`)
- **Company NIF**: `516238841` (see [src/config.ts](../src/config.ts))
- **Per Diem Rate**: €58.52 fixed (regulatory requirement)
- **Environments**: Supports production, UAT, and local development via `VITE_APP_ENV`

## Key Components & Features

### Reconciliation Module (`src/components/Reconciliation/`)

- **Approvers-only** feature for e-fatura reconciliation
- Components: `ReconciliationDashboard`, `FileUploadZone`, `FileInspectionPanel`, `JobExecutor`, `ReconciliationResults`, `ReconciliationCharts`
- Async job processing with progress tracking and cancellation support
- Table components: `EfaturaTableRow`, `SystemTableRow`, `DiscrepanciesTableRow`
- Date range filtering with `DateRangePicker`
- Export results to Excel with charts

### Invoice Status Flow

```
User submits → PENDING (editable, affects limits)
  ├─ Approve → APPROVED (editable, affects limits, awaiting payment)
  │   └─ Pay → PAYED (final, no edits)
  ├─ Pay directly → PAYED (final, no edits)
  ├─ Reject → REJECTED (limits refunded, final)
  └─ Over accrued limit → SUBMITTED (doesn't affect limits, editable)
```

### User Management (`src/components/Admin/UserManagement.tsx`)

- Admin-only module for managing user annual limits
- Expandable user rows showing detailed limits with `LimitsSection` component
- Inline editing of annual limits (accrued limits computed automatically by backend)
- Displays user-specific invoice lists in expanded view
- Styling via `UserManagement.module.css`

## Priority Reading for New Developers

1. [src/App.tsx](../src/App.tsx) (1565 lines - understand state flow)
2. [src/services/authService.ts](../src/services/authService.ts) (authentication patterns)
3. [src/types/index.ts](../src/types/index.ts) (data model)
4. [src/config.ts](../src/config.ts) (environment configuration)
5. [src/components/Invoice/Forms/DefaultInvoiceForm.tsx](../src/components/Invoice/Forms/DefaultInvoiceForm.tsx) (form patterns)
