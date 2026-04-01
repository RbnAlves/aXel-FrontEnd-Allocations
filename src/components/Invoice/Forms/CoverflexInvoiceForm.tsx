import React, { useState } from "react";
import { AlertCircle, ArrowLeft, FileText, X } from "lucide-react";
import { InvoiceDistribution, User } from "../../../types";
import { MOTE_NIF } from "../../../config";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { useMultiUserDistribution } from "../../../hooks/useMultiUserDistribution";
import { DatePickerInput } from "../../ui/date-picker-input";
import { MultiUserDistribution } from "../MultiUserDistribution";

interface CoverflexFormData {
  vendor: string;
  amount: number;
  date: Date | null;
  description: string;
  type: "benefits" | "BENEFITS"; // Coverflex can only be applied to employee benefits
  expense_type_id?: number;
  document_type?: string;
  file_id?: string;
  document_content?: string;
  buyer?: string;
  // For Coverflex, payer is always EMPLOYEE and cannot be chosen
  payer?: "EMPLOYEE";
  iva?: number;
}

interface CoverflexInvoiceFormProps {
  currentUser: User;
  initialData?: Partial<CoverflexFormData>;
  onSubmit: (data: CoverflexFormData) => void;
  onBatchSubmit?: (
    data: CoverflexFormData,
    distribution: InvoiceDistribution,
  ) => void;
  onCancel: () => void;
  // File upload props (optional for Coverflex)
  hasUploadedFile?: boolean;
  onRemoveFile?: () => void;
  isScanning?: boolean;
  scanProgress?: number;
  scanStage?: string;
  scannedImage?: string | null;
  isPdf?: boolean;
  nifValidated?: boolean;
  fileInputRef?: React.RefObject<HTMLInputElement>;
  cameraInputRef?: React.RefObject<HTMLInputElement>;
  onFileUpload?: (
    event: React.ChangeEvent<HTMLInputElement>,
    source: "file" | "camera",
  ) => Promise<void>;
}

export const CoverflexInvoiceForm: React.FC<CoverflexInvoiceFormProps> = ({
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

  const [formData, setFormData] = useState<CoverflexFormData>({
    vendor: initialData?.vendor || "Coverflex",
    amount: initialData?.amount || 0,
    date: parseDateValue(initialData?.date) || new Date(),
    description: initialData?.description || "Despesa Coverflex",
    // Always use benefits for Coverflex, ignore any other type from initialData
    type: "benefits",
    expense_type_id: initialData?.expense_type_id,
    document_type: initialData?.document_type,
    file_id: initialData?.file_id,
    document_content: initialData?.document_content,
    buyer: initialData?.buyer || MOTE_NIF,
    iva: initialData?.iva || 0,
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
    amount: "amount",
    date: "date",
    description: "description",
  };

  // Form validation hook for auto-scroll to first error
  const { formRef, scrollToFirstError, getFirstErrorKey } =
    useFormValidation(fieldIdMap);

  const handleInputChange = (
    field: keyof CoverflexFormData,
    value: string | number | boolean | undefined | Date | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const newErrors: Record<string, string> = {};

    if (formData.amount <= 0) {
      newErrors.amount = "O valor deve ser superior a 0";
    }

    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }

    // Description is optional for Coverflex expenses

    // Ensure type is always 'benefits' for Coverflex
    if (formData.type.toLowerCase() !== "benefits") {
      newErrors.type =
        "Despesas Coverflex só podem ser atribuídas aos benefícios do funcionário";
      // Force type to be benefits
      setFormData((prev) => ({ ...prev, type: "benefits" }));
    }

    // We no longer block submission for exceeding accrued limits
    // Instead, we'll show a warning dialog when the form is submitted

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure type is always benefits before validation
    setFormData((prev) => ({ ...prev, type: "benefits" }));
    const { isValid, errors: validationErrors } = validateForm();
    if (isValid) {
      // For multi-user distribution, skip the limit check
      if (!enableMultiUser) {
        // Check if the invoice amount exceeds the accrued limit
        const limit = currentUser.limits.employeeBenefits;
        const exceedsAccruedLimit = formData.amount > limit.accrued_limit;

        if (exceedsAccruedLimit && !showLimitWarning) {
          // Show the warning dialog
          setShowLimitWarning(true);
          return; // Don't submit yet
        }
      }

      // Reset the warning flag for future submissions
      setShowLimitWarning(false);

      const submissionData: CoverflexFormData = {
        ...formData,
        type: "BENEFITS", // Force uppercase for backend
        vendor: "Coverflex",
        payer: "EMPLOYEE", // For Coverflex, payer is always EMPLOYEE
        iva: formData.iva || 0,
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
          <h2 className="text-lg font-medium text-gray-900">
            Despesa Coverflex
          </h2>
          <button
            onClick={onCancel}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </button>
        </div>

        {/* File Upload Indicator (optional for Coverflex) */}
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
                    Um documento foi carregado
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

        {/* Coverflex specific information */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 text-blue-500" />
            <div>
              <h4 className="text-sm font-medium mb-1 text-blue-800">
                Informação sobre Despesas Coverflex
              </h4>
              <p className="text-sm text-blue-700">
                As despesas Coverflex são exclusivamente atribuídas aos
                benefícios do funcionário e não podem ser deduzidas das despesas
                da empresa. Não requerem documento de suporte.
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
          {/* Amount field - specific to Coverflex */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700"
              >
                Valor
              </label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Apenas Benefícios de Funcionário
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                id="amount"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) =>
                  handleInputChange("amount", parseFloat(e.target.value) || 0)
                }
                className={`block w-full pl-3 pr-8 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.amount
                    ? "border-red-300 ring-2 ring-red-500"
                    : "border-gray-300"
                }`}
                placeholder="0,00"
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "amount-error" : undefined}
              />
              <span className="absolute right-3 top-2 text-gray-500">€</span>
            </div>
            {errors.amount && (
              <p
                className="mt-1 text-sm text-red-600 flex items-center"
                id="amount-error"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.amount}
              </p>
            )}
            {!enableMultiUser && (
              <p className="mt-1 text-sm text-gray-600">
                Limite disponível:{" "}
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
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                errors.description
                  ? "border-red-300 ring-2 ring-red-500"
                  : "border-gray-300"
              }`}
              placeholder="Introduza uma breve descrição da despesa (opcional)"
              aria-invalid={!!errors.description}
              aria-describedby={
                errors.description ? "description-error" : undefined
              }
            />
            {errors.description && (
              <p
                className="mt-1 text-sm text-red-600 flex items-center"
                id="description-error"
              >
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.description}
              </p>
            )}
          </div>

          {/* Invoice Type - Read-only for Coverflex */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Tipo de Despesa (Empresa ou Funcionário)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <label className="relative opacity-50">
                <input
                  type="radio"
                  name="type"
                  value="company"
                  disabled
                  className="sr-only"
                />
                <div className="p-4 rounded-lg border-2 border-gray-300 cursor-not-allowed">
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
                  checked={true}
                  disabled
                  className="sr-only"
                />
                <div className="p-4 rounded-lg border-2 border-yellow-500 bg-yellow-50">
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
            </div>
          </div>

          {/* Accrued Limit Warning Dialog */}
          {showLimitWarning && (
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                <div>
                  <h4 className="text-sm font-medium mb-1 text-yellow-800">
                    Aviso: Despesa acima do limite acumulado
                  </h4>
                  <p className="text-sm text-yellow-700 mb-3">
                    Esta despesa excede o seu limite acumulado disponível. Se
                    continuar, a despesa será marcada como "GUARDADA" e não
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
