import React, { useState } from "react";
import { AlertCircle, ArrowLeft, FileText, X } from "lucide-react";
import { InvoiceDistribution, User } from "../../../types";
import { PER_DIEM_RATE } from "../../../config.ts";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { useMultiUserDistribution } from "../../../hooks/useMultiUserDistribution";
import { DatePickerInput } from "../../ui/date-picker-input";
import { MultiUserDistribution } from "../MultiUserDistribution";

interface PerDiemAllowanceFormData {
  vendor: string;
  amount: number;
  iva?: number;
  date: Date | null;
  description: string;
  type: "company" | "benefits" | "bonus" | "COMPANY" | "BENEFITS" | "BONUS";
  expense_type_id?: number;
  document_type?: string;
  file_id?: string;
  document_content?: string;
  days?: number; // Number of days for per diem allowance
  // Who paid for the expense
  payer?: "COMPANY" | "EMPLOYEE" | "SUPPLIER";
}

interface PerDiemAllowanceInvoiceFormProps {
  currentUser: User;
  initialData?: Partial<PerDiemAllowanceFormData>;
  onSubmit: (data: PerDiemAllowanceFormData) => void;
  onBatchSubmit?: (
    data: PerDiemAllowanceFormData,
    distribution: InvoiceDistribution,
  ) => void;
  onCancel: () => void;
  onExpenseTypeChange?: (
    expense_type_id: number,
    expense_type_name: string,
  ) => void;
  // File upload props
  hasUploadedFile?: boolean;
  onRemoveFile?: () => void;
}

export const PerDiemAllowanceInvoiceForm: React.FC<
  PerDiemAllowanceInvoiceFormProps
> = ({
  currentUser,
  initialData,
  onSubmit,
  onBatchSubmit,
  onCancel,
  hasUploadedFile,
  onRemoveFile,
}) => {
  const parseDateValue = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const [formData, setFormData] = useState<PerDiemAllowanceFormData>({
    vendor: initialData?.vendor || "Ajudas de Custo",
    amount: initialData?.amount || (initialData?.days || 1) * PER_DIEM_RATE,
    iva: initialData?.iva || 0,
    date: parseDateValue(initialData?.date) || new Date(),
    description: initialData?.description || "",
    type: initialData?.type || "benefits",
    expense_type_id: initialData?.expense_type_id,
    document_type: initialData?.document_type,
    file_id: initialData?.file_id,
    document_content: initialData?.document_content,
    days: initialData?.days || 1,
    // Default payer is COMPANY
    payer: initialData?.payer || "COMPANY",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showLimitWarning, setShowLimitWarning] = useState<boolean>(false);
  const [enableMultiUser, setEnableMultiUser] = useState(false);

  const distribution = useMultiUserDistribution({
    enabled: enableMultiUser,
    totalAmount: formData.amount,
  });

  React.useEffect(() => {
    if (!enableMultiUser && errors.distribution) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.distribution;
        return next;
      });
    }
  }, [enableMultiUser, errors.distribution]);

  // Field ID mapping for form validation
  const fieldIdMap = {
    days: "days",
    date: "date",
    description: "description",
    document: "document",
  };

  // Form validation hook for auto-scroll to first error
  const { formRef, scrollToFirstError, getFirstErrorKey } =
    useFormValidation(fieldIdMap);

  const handleInputChange = (
    field: keyof PerDiemAllowanceFormData,
    value: string | number | boolean | undefined | Date | null,
  ) => {
    if (field === "days") {
      // When days change, recalculate the amount
      if (value === undefined) {
        setFormData((prev) => ({
          ...prev,
          [field]: undefined,
          amount: 0,
        }));
      } else {
        const days = Number(value);
        const newAmount = days * PER_DIEM_RATE;

        setFormData((prev) => ({
          ...prev,
          [field]: days,
          amount: parseFloat(newAmount.toFixed(2)),
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleTypeChange = (type: "company" | "benefits" | "bonus") => {
    setFormData((prev) => ({ ...prev, type }));
    if (errors.type) {
      setErrors((prev) => ({ ...prev, type: "" }));
    }
  };

  const validateForm = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const newErrors: Record<string, string> = {};

    if (!formData.days || formData.days <= 0) {
      newErrors.days = "O número de dias deve ser superior a 0";
    }

    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }

    // We no longer block submission for exceeding accrued limits
    // Instead, we'll show a warning dialog when the form is submitted

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { isValid, errors: validationErrors } = validateForm();
    if (isValid) {
      // For BONUS type or multi-user distribution, skip the limit check
      if (formData.type.toLowerCase() === "bonus" || enableMultiUser) {
        // Reset the warning flag for future submissions
        setShowLimitWarning(false);
      } else {
        // Check if the invoice amount exceeds the accrued limit
        const limit =
          formData.type.toLowerCase() === "company"
            ? currentUser.limits.companyAccount
            : currentUser.limits.employeeBenefits;

        const exceedsAccruedLimit = formData.amount > limit.accrued_limit;

        if (exceedsAccruedLimit && !showLimitWarning) {
          // Show the warning dialog
          setShowLimitWarning(true);
          return; // Don't submit yet
        }
      }

      // Reset the warning flag for future submissions
      setShowLimitWarning(false);

      const submissionData = {
        ...formData,
        type: formData.type.toUpperCase() as "COMPANY" | "BENEFITS" | "BONUS",
        vendor: "Ajudas de Custo",
        amount: (formData.days ?? 0) * PER_DIEM_RATE,
        description: formData.description
          ? `${formData.description} - Dias (${formData.days})`
          : `Dias (${formData.days})`,
        iva: formData.iva || 0,
        // Set payer based on type and selected payer
        payer:
          formData.type.toLowerCase() === "company"
            ? formData.payer
            : "EMPLOYEE", // For benefits and bonus type, payer is always EMPLOYEE
      };
      if (enableMultiUser) {
        if (!onBatchSubmit) {
          setErrors((prev) => ({
            ...prev,
            distribution: "Distribuicao em batch indisponivel.",
          }));
          return;
        }

        if (distribution.selectedUserIds.length < 2) {
          setErrors((prev) => ({
            ...prev,
            distribution: "Selecione pelo menos dois utilizadores.",
          }));
          return;
        }

        if (Math.abs(distribution.remaining) > 0.001) {
          setErrors((prev) => ({
            ...prev,
            distribution: "O valor total deve estar totalmente distribuido.",
          }));
          return;
        }

        onBatchSubmit(submissionData, {
          userIds: distribution.selectedUserIds,
          allocations: distribution.allocations,
        });
        return;
      }

      onSubmit(submissionData);
    } else {
      // Scroll to first error field
      const firstErrorKey = getFirstErrorKey(validationErrors);
      scrollToFirstError(firstErrorKey);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Ajudas de Custo</h2>
          <button
            onClick={onCancel}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </button>
        </div>

        {/* File Upload Indicator */}
        {hasUploadedFile && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">
                    Documento Anexado
                  </h4>
                  <p className="text-sm text-blue-700">
                    Um documento foi carregado e processado
                  </p>
                </div>
              </div>
              {onRemoveFile && (
                <button
                  type="button"
                  onClick={onRemoveFile}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
                  aria-label="Remover documento"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Per Diem Allowance specific information */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 text-blue-500" />
            <div>
              <h4 className="text-sm font-medium mb-1 text-blue-800">
                Informação sobre Ajudas de Custo
              </h4>
              <p className="text-sm text-blue-700">
                As ajudas de custo são calculadas com base no número de dias,
                multiplicado por {PER_DIEM_RATE}€
              </p>
            </div>
          </div>
        </div>

        {currentUser.role === "APPROVER" && (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <label className="flex items-center gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={enableMultiUser}
                onChange={(e) => setEnableMultiUser(e.target.checked)}
                className="h-4 w-4"
              />
              Distribuir por vários colaboradores
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Use a distribuicao em batch quando esta despesa for partilhada.
            </p>
          </div>
        )}

        {currentUser.role === "APPROVER" && enableMultiUser && (
          <div className="mb-6">
            <MultiUserDistribution
              users={distribution.users}
              loading={distribution.loading}
              selectedUserIds={distribution.selectedUserIds}
              allocations={distribution.allocations}
              allocatedTotal={distribution.allocatedTotal}
              remaining={distribution.remaining}
              onToggleUser={distribution.toggleUser}
              onAllocationChange={distribution.updateAllocation}
              onDistributeEqually={distribution.distributeEqually}
              error={errors.distribution}
              onClearError={() =>
                setErrors((prev) => ({ ...prev, distribution: "" }))
              }
            />
          </div>
        )}

        <form ref={formRef} onSubmit={handleFormSubmit}>
          {/* Days field - specific to Per Diem Allowance */}
          <div className="mb-6">
            <label
              htmlFor="days"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Número de Dias
            </label>
            <input
              type="number"
              id="days"
              min="1"
              value={formData.days === undefined ? "" : formData.days}
              onChange={(e) =>
                handleInputChange(
                  "days",
                  e.target.value === "" ? undefined : parseInt(e.target.value),
                )
              }
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                errors.days
                  ? "border-red-300 ring-2 ring-red-500"
                  : "border-gray-300"
              }`}
              placeholder="1"
              aria-invalid={!!errors.days}
              aria-describedby={errors.days ? "days-error" : undefined}
            />
            {errors.days && (
              <p
                className="mt-1 text-sm text-red-600 flex items-center"
                id="days-error"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.days}
              </p>
            )}
          </div>

          {/* Amount field - calculated and read-only */}
          <div className="mb-6">
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Valor Total (calculado automaticamente)
            </label>
            <div className="relative">
              <input
                type="text"
                id="amount"
                value={`${formData.amount.toFixed(2)}`}
                readOnly
                className="block w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50"
                placeholder="0,00"
              />
              <span className="absolute right-3 top-2 text-gray-500">€</span>
            </div>
            {!enableMultiUser && (
              <p className="mt-1 text-sm text-gray-600">
                Calculado como: {formData.days} dias × 58,52€ ={" "}
                {formData.amount.toFixed(2)}€
              </p>
            )}
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.amount}
              </p>
            )}
          </div>

          {/* Date field */}
          <div className="mb-6">
            <DatePickerInput
              value={formData.date}
              onChange={(date) => handleInputChange("date", date)}
              label="Data da Despesa"
              placeholder="dd/mm/yyyy"
              error={errors.date}
              id="date"
            />
          </div>

          {/* Description field */}
          <div className="mb-6">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descrição (opcional)
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${
                errors.description ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="Introduza uma breve descrição da despesa (opcional)"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Invoice Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Despesa
            </label>
            <div
              className={`grid ${
                currentUser.can_use_bonus ? "grid-cols-3" : "grid-cols-2"
              } gap-4`}
            >
              <label className="relative">
                <input
                  type="radio"
                  name="type"
                  value="company"
                  checked={formData.type.toLowerCase() === "company"}
                  onChange={() => handleTypeChange("company")}
                  className="sr-only"
                />
                <div
                  className={`p-4 rounded-lg border-2 ${
                    formData.type.toLowerCase() === "company"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900">
                      Conta da Empresa
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Despesas empresariais
                    </p>
                    {!enableMultiUser && (
                      <p className="text-xs text-gray-500 mt-2">
                        Disponível:{" "}
                        {(
                          currentUser.limits.companyAccount.available ??
                          currentUser.limits.companyAccount.accrued_limit -
                            currentUser.limits.companyAccount.used -
                            currentUser.limits.companyAccount.pending
                        ).toFixed(2)}
                        €
                      </p>
                    )}
                  </div>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  name="type"
                  value="benefits"
                  checked={formData.type.toLowerCase() === "benefits"}
                  onChange={() => handleTypeChange("benefits")}
                  className="sr-only"
                />
                <div
                  className={`p-4 rounded-lg border-2 ${
                    formData.type.toLowerCase() === "benefits"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="text-center">
                    <h3 className="font-medium text-gray-900">
                      Benefícios de Funcionário
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Benefícios pessoais
                    </p>
                    {!enableMultiUser && (
                      <p className="text-xs text-gray-500 mt-2">
                        Disponível:{" "}
                        {(
                          currentUser.limits.employeeBenefits.available ??
                          currentUser.limits.employeeBenefits.accrued_limit -
                            currentUser.limits.employeeBenefits.used -
                            currentUser.limits.employeeBenefits.pending
                        ).toFixed(2)}
                        €
                      </p>
                    )}
                  </div>
                </div>
              </label>

              {currentUser.can_use_bonus && (
                <label className="relative">
                  <input
                    type="radio"
                    name="type"
                    value="bonus"
                    checked={formData.type.toLowerCase() === "bonus"}
                    onChange={() => handleTypeChange("bonus")}
                    className="sr-only"
                  />
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      formData.type.toLowerCase() === "bonus"
                        ? "border-yellow-500 bg-yellow-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900">Bónus</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Despesas de bónus
                      </p>
                      {!enableMultiUser && (
                        <p className="text-xs text-gray-500 mt-2">Sem limite</p>
                      )}
                    </div>
                  </div>
                </label>
              )}
            </div>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.type}
              </p>
            )}
          </div>

          {/* Monthly Limit Warning Dialog */}
          {showLimitWarning && (
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                <div>
                  <h4 className="text-sm font-medium mb-1 text-yellow-800">
                    Aviso: Despesa acima do limite mensal
                  </h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Esta despesa excede o seu limite mensal disponível. Se
                    continuar, a despesa será marcada como "SUBMETIDA" e não
                    estará disponível para pagamento imediato. Poderá ser
                    processada no próximo mês quando o seu plafond for maior.
                  </p>
                  <div className="flex space-x-3 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowLimitWarning(false)}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        // Submit the form with the warning acknowledged
                        handleFormSubmit(e as React.FormEvent);
                      }}
                      className="px-3 py-1 text-sm font-medium text-white bg-yellow-500 border border-transparent rounded-md hover:bg-yellow-600"
                    >
                      Submeter Mesmo Assim
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-end gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inline-flex w-full sm:w-auto items-center justify-center px-4 py-2 text-sm font-medium text-white bg-yellow-500 border border-transparent rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Submeter Despesa
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
