import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, FileText, X } from "lucide-react";
import { InvoiceDistribution, User } from "../../../types";
import { MOTE_NIF } from "../../../config";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { useMultiUserDistribution } from "../../../hooks/useMultiUserDistribution";
import { DatePickerInput } from "../../ui/date-picker-input";
import { MultiUserDistribution } from "../MultiUserDistribution";

interface TravelFormData {
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
  // Travel specific fields
  origin?: string;
  destination?: string;
  kilometers?: number;
  license_plate?: string;
  buyer?: string;
  // Who paid for the expense
  payer?: "COMPANY" | "EMPLOYEE" | "SUPPLIER";
}

interface TravelInvoiceFormProps {
  currentUser: User;
  initialData?: Partial<TravelFormData>;
  onSubmit: (data: TravelFormData) => void;
  onBatchSubmit?: (
    data: TravelFormData,
    distribution: InvoiceDistribution,
  ) => void;
  onCancel: () => void;
  // File upload props
  hasUploadedFile?: boolean;
  onRemoveFile?: () => void;
}

export const TravelInvoiceForm: React.FC<TravelInvoiceFormProps> = ({
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

  const [formData, setFormData] = useState<TravelFormData>({
    vendor: initialData?.vendor || "",
    amount: initialData?.amount || 0,
    iva: initialData?.iva || 0,
    date: parseDateValue(initialData?.date) || new Date(),
    description: initialData?.description || "",
    type: initialData?.type || "benefits",
    expense_type_id: initialData?.expense_type_id,
    document_type: initialData?.document_type,
    file_id: initialData?.file_id,
    document_content: initialData?.document_content,
    // Travel specific fields
    origin: initialData?.origin || "",
    destination: initialData?.destination || "",
    kilometers: initialData?.kilometers || 0,
    license_plate: initialData?.license_plate || "",
    buyer: initialData?.buyer || MOTE_NIF,
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

  useEffect(() => {
    if (!enableMultiUser && errors.distribution) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.distribution;
        return next;
      });
    }
  }, [enableMultiUser, errors.distribution]);

  // When batch invoicing is enabled, default to benefits type and COMPANY payer
  useEffect(() => {
    if (enableMultiUser) {
      setFormData((prev) => ({
        ...prev,
        type: "benefits",
        payer: "COMPANY",
      }));
    }
  }, [enableMultiUser]);

  // Field ID mapping for form validation
  const fieldIdMap = {
    origin: "origin",
    destination: "destination",
    kilometers: "kilometers",
    vendor: "vendor",
    amount: "amount",
    date: "date",
    description: "description",
    document: "document",
  };

  // Form validation hook for auto-scroll to first error
  const { formRef, scrollToFirstError, getFirstErrorKey } =
    useFormValidation(fieldIdMap);

  // Calculate amount based on kilometers
  useEffect(() => {
    if (formData.kilometers) {
      // Using a rate of 0.40€ per kilometer
      const calculatedAmount = formData.kilometers * 0.4;
      setFormData((prev) => ({
        ...prev,
        amount: parseFloat(calculatedAmount.toFixed(2)),
      }));
    }
  }, [formData.kilometers]);

  const handleInputChange = (
    field: keyof TravelFormData,
    value: string | number | Date | null | undefined,
  ) => {
    console.log(
      `handleInputChange called with field: ${field}, value: ${value}`,
    );
    setFormData((prev) => {
      const newFormData = { ...prev, [field]: value };
      console.log("Updated formData:", newFormData);
      return newFormData;
    });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = (): {
    isValid: boolean;
    errors: Record<string, string>;
  } => {
    const newErrors: Record<string, string> = {};

    if (!formData.origin?.trim()) {
      newErrors.origin = "Origem é obrigatória";
    }

    if (!formData.destination?.trim()) {
      newErrors.destination = "Destino é obrigatório";
    }

    if (!formData.kilometers || formData.kilometers <= 0) {
      newErrors.kilometers = "Quilómetros devem ser superiores a 0";
    }

    if (!formData.license_plate?.trim()) {
      newErrors.licensePlate = "Matrícula é obrigatória";
    }

    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }

    // Description is optional for travel expenses

    // We no longer block submission for exceeding accrued limits
    // Instead, we'll show a warning dialog when the form is submitted

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleFormSubmit called, current formData:", formData);
    console.log("Current payer value:", formData.payer);

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
        // Include travel-specific fields
        origin: formData.origin,
        destination: formData.destination,
        kilometers: formData.kilometers,
        license_plate: formData.license_plate,
        // Set vendor to a default value
        vendor: `${formData.origin} → ${formData.destination}`,
        description: `${formData.kilometers} kms [${formData.license_plate}]`,
        // Ensure IVA is included
        iva: formData.iva || 0,
        // Set payer based on type and selected payer
        payer:
          formData.type.toLowerCase() === "company"
            ? formData.payer
            : enableMultiUser
              ? "COMPANY" // For batch invoicing with benefits/bonus, use COMPANY
              : "EMPLOYEE", // For regular benefits and bonus type, payer is always EMPLOYEE
      };
      console.log("Submission data:", submissionData);
      console.log("Payer value in submission data:", submissionData.payer);

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
            Despesa de Viagem
          </h2>
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
          {/* Travel specific fields */}
          <div className="space-y-6 mb-6">
            <div>
              <label
                htmlFor="origin"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Origem
              </label>
              <input
                type="text"
                id="origin"
                value={formData.origin}
                onChange={(e) => handleInputChange("origin", e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.origin
                    ? "border-red-300 ring-2 ring-red-500"
                    : "border-gray-300"
                }`}
                placeholder="Introduza a origem da viagem"
                aria-invalid={!!errors.origin}
                aria-describedby={errors.origin ? "origin-error" : undefined}
              />
              {errors.origin && (
                <p
                  className="mt-1 text-sm text-red-600 flex items-center"
                  id="origin-error"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.origin}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="destination"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Destino
              </label>
              <input
                type="text"
                id="destination"
                value={formData.destination}
                onChange={(e) =>
                  handleInputChange("destination", e.target.value)
                }
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.destination
                    ? "border-red-300 ring-2 ring-red-500"
                    : "border-gray-300"
                }`}
                placeholder="Introduza o destino da viagem"
                aria-invalid={!!errors.destination}
                aria-describedby={
                  errors.destination ? "destination-error" : undefined
                }
              />
              {errors.destination && (
                <p
                  className="mt-1 text-sm text-red-600 flex items-center"
                  id="destination-error"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.destination}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="kilometers"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Quilómetros
              </label>
              <input
                type="number"
                id="kilometers"
                min="0"
                step="0.1"
                value={
                  formData.kilometers === undefined ? "" : formData.kilometers
                }
                onChange={(e) =>
                  handleInputChange(
                    "kilometers",
                    e.target.value === ""
                      ? undefined
                      : parseFloat(e.target.value),
                  )
                }
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.kilometers
                    ? "border-red-300 ring-2 ring-red-500"
                    : "border-gray-300"
                }`}
                placeholder="Introduza a distância em quilómetros"
                aria-invalid={!!errors.kilometers}
                aria-describedby={
                  errors.kilometers ? "kilometers-error" : undefined
                }
              />
              <p className="mt-1 text-sm text-gray-600">
                O valor será calculado automaticamente com base nos quilómetros
                (0.40€/km).
              </p>
              {errors.kilometers && (
                <p
                  className="mt-1 text-sm text-red-600 flex items-center"
                  id="kilometers-error"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.kilometers}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="licensePlate"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Matrícula
              </label>
              <input
                type="text"
                id="licensePlate"
                value={formData.license_plate || ""}
                onChange={(e) =>
                  handleInputChange("license_plate", e.target.value)
                }
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${
                  errors.licensePlate ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Introduza a matrícula do veículo"
              />
              {errors.licensePlate && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.licensePlate}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="calculatedAmount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Valor Calculado
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="calculatedAmount"
                  value={`${formData.amount.toFixed(2)} €`}
                  readOnly
                  className="block w-full px-3 py-2 border border-gray-300 bg-gray-100 rounded-md shadow-sm"
                />
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Valor calculado automaticamente com base nos quilómetros.
              </p>
            </div>

            <div>
              <label
                htmlFor="iva"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                IVA
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="iva"
                  min="0"
                  step="0.01"
                  value={formData.iva === undefined ? "" : formData.iva}
                  onChange={(e) =>
                    handleInputChange(
                      "iva",
                      e.target.value === "" ? 0 : parseFloat(e.target.value),
                    )
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">€</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Valor do IVA associado à despesa.
              </p>
            </div>
          </div>

          {/* Use DefaultInvoiceForm for common fields */}
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

          {/* Invoice Type */}
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
                  onChange={(e) =>
                    handleInputChange(
                      "type",
                      e.target.value as "company" | "benefits" | "bonus",
                    )
                  }
                  className="sr-only"
                />
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
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
                  onChange={(e) =>
                    handleInputChange(
                      "type",
                      e.target.value as "company" | "benefits" | "bonus",
                    )
                  }
                  className="sr-only"
                />
                <div
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
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
                    onChange={(e) =>
                      handleInputChange(
                        "type",
                        e.target.value as "company" | "benefits" | "bonus",
                      )
                    }
                    className="sr-only"
                  />
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
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
          </div>

          {/* Payer Selection - Show for COMPANY type or when batch invoicing is enabled */}
          {(formData.type.toLowerCase() === "company" || enableMultiUser) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Quem Pagou a Despesa
              </label>
              <div className="grid grid-cols-3 gap-4">
                <label className="relative">
                  <input
                    type="radio"
                    name="payer"
                    value="COMPANY"
                    checked={formData.payer === "COMPANY"}
                    onChange={() => {
                      console.log("COMPANY radio button selected");
                      handleInputChange("payer", "COMPANY");
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[120px] flex items-center justify-center ${
                      formData.payer === "COMPANY"
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900">Empresa</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Não será transferido para o colaborador
                      </p>
                    </div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    name="payer"
                    value="EMPLOYEE"
                    checked={formData.payer === "EMPLOYEE"}
                    onChange={() => {
                      console.log("EMPLOYEE radio button selected");
                      handleInputChange("payer", "EMPLOYEE");
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[120px] flex items-center justify-center ${
                      formData.payer === "EMPLOYEE"
                        ? "border-green-500 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900">Colaborador</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Será transferido para o colaborador
                      </p>
                    </div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    name="payer"
                    value="SUPPLIER"
                    checked={formData.payer === "SUPPLIER"}
                    onChange={() => {
                      console.log("SUPPLIER radio button selected");
                      handleInputChange("payer", "SUPPLIER");
                    }}
                    className="sr-only"
                  />
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all min-h-[120px] flex items-center justify-center ${
                      formData.payer === "SUPPLIER"
                        ? "border-purple-500 bg-purple-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <div className="text-center">
                      <h3 className="font-medium text-gray-900">Fornecedor</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Será pago ao fornecedor
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

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
