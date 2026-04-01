import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Save,
  Scan,
  Upload,
  X,
} from "lucide-react";
import { InvoiceDistribution, MealType, User } from "../../../types";
import { MOTE_NIF } from "../../../config";
import { mealTypeService } from "../../../services";
import { useFormValidation } from "../../../hooks/useFormValidation";
import { useMultiUserDistribution } from "../../../hooks/useMultiUserDistribution";
import { DatePickerInput } from "../../ui/date-picker-input";
import { MultiUserDistribution } from "../MultiUserDistribution";

interface MealFormData {
  vendor: string;
  vendor_nif?: string;
  vendor_name?: string;
  vendor_cae?: string;
  invoice_number?: string;
  amount: number;
  iva?: number;
  date: Date | null;
  description: string;
  type: "company" | "benefits" | "bonus" | "COMPANY" | "BENEFITS" | "BONUS";
  expense_type_id?: number;
  document_type?: string;
  file_id?: string;
  document_content?: string;
  // Meals specific fields
  meal_type?: MealType;
  number_of_persons?: number;
  buyer?: string;
  // Who paid for the expense
  payer?: "COMPANY" | "EMPLOYEE" | "SUPPLIER";
}

interface MealInvoiceFormProps {
  currentUser: User;
  initialData?: Partial<MealFormData>;
  onSubmit: (data: MealFormData) => void;
  onBatchSubmit?: (
    data: MealFormData,
    distribution: InvoiceDistribution,
  ) => void;
  onCancel: () => void;
  onExpenseTypeChange?: (
    expense_type_id: number,
    expenseTypeName: string,
  ) => void;
  // File upload props
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

export const MealInvoiceForm: React.FC<MealInvoiceFormProps> = ({
  currentUser,
  initialData,
  onSubmit,
  onBatchSubmit,
  onCancel,
  hasUploadedFile,
  onRemoveFile,
  isScanning: isScanningScanProgress,
  scanProgress: scanProgressProp,
  scanStage: scanStageProp,
  scannedImage: scannedImageProp,
  isPdf: isPdfProp,
  nifValidated: nifValidatedProp,
  fileInputRef: fileInputRefProp,
  cameraInputRef: cameraInputRefProp,
  onFileUpload,
}) => {
  // Always call useRef at the top level
  const localFileInputRef = useRef<HTMLInputElement>(null);
  const localCameraInputRef = useRef<HTMLInputElement>(null);

  const parseDateValue = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const [formData, setFormData] = useState<MealFormData>({
    vendor: initialData?.vendor || "",
    vendor_nif: initialData?.vendor_nif || "",
    vendor_name: initialData?.vendor_name || "",
    vendor_cae: initialData?.vendor_cae || "",
    invoice_number: initialData?.invoice_number || "",
    amount: initialData?.amount || 0,
    iva: initialData?.iva || 0,
    date: parseDateValue(initialData?.date) || new Date(),
    description: initialData?.description || "",
    type: initialData?.type || "benefits",
    expense_type_id: initialData?.expense_type_id,
    document_type: initialData?.document_type,
    file_id: initialData?.file_id,
    document_content: initialData?.document_content,
    // Meals specific fields
    meal_type: initialData?.meal_type || undefined,
    number_of_persons: initialData?.number_of_persons || 1,
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

  // Update number_of_persons when multi-user distribution is enabled and users are selected
  useEffect(() => {
    if (enableMultiUser && distribution.selectedUserIds.length > 0) {
      setFormData((prev) => ({
        ...prev,
        number_of_persons: distribution.selectedUserIds.length,
      }));
    }
  }, [enableMultiUser, distribution.selectedUserIds.length]);

  // Field ID mapping for form validation
  const fieldIdMap = {
    mealType: "mealType",
    numberOfPersons: "numberOfPersons",
    vendor: "vendor",
    amount: "amount",
    date: "date",
    description: "description",
    document: "document",
  };

  // Form validation hook for auto-scroll to first error
  const { formRef, scrollToFirstError, getFirstErrorKey } = useFormValidation(
    fieldIdMap,
    { scrollOnDesktop: true },
  );

  // Meal types state
  const [mealTypes, setMealTypes] = useState<{ key: string; value: string }[]>(
    [],
  );
  const [isLoadingMealTypes, setIsLoadingMealTypes] = useState<boolean>(false);

  // Use props from parent or fallback to local refs (for backward compatibility)
  const isScanning = isScanningScanProgress ?? false;
  const scanProgress = scanProgressProp ?? 0;
  const scanStage = scanStageProp ?? "";
  const scannedImage = scannedImageProp ?? null;
  const isPdf = isPdfProp ?? false;
  const nifValidated = nifValidatedProp ?? false;
  const fileInputRef = fileInputRefProp ?? localFileInputRef;
  const cameraInputRef = cameraInputRefProp ?? localCameraInputRef;

  // Fetch meal types on component mount
  useEffect(() => {
    const fetchMealTypes = async () => {
      try {
        setIsLoadingMealTypes(true);
        const types = await mealTypeService.getMealTypes();
        setMealTypes(types);
      } catch (error) {
        console.error("Failed to fetch meal types:", error);
        // Fallback to enum values if API fails
        const fallbackTypes = Object.entries(MealType).map(([key, value]) => ({
          key,
          value,
        }));
        setMealTypes(fallbackTypes);
      } finally {
        setIsLoadingMealTypes(false);
      }
    };

    fetchMealTypes();
  }, []);

  // Use parent's file upload handler if available
  const handleFileUploadEvent = async (
    event: React.ChangeEvent<HTMLInputElement>,
    source: "file" | "camera",
  ) => {
    if (onFileUpload) {
      await onFileUpload(event, source);
    }
  };

  const handleInputChange = (
    field: keyof MealFormData,
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

    if (!formData.vendor.trim()) {
      newErrors.vendor = "Nome do fornecedor é obrigatório";
    }

    if (formData.amount <= 0) {
      newErrors.amount = "O valor deve ser superior a 0";
    }

    if (!formData.date) {
      newErrors.date = "Data é obrigatória";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Descrição é obrigatória";
    }

    if (!formData.meal_type) {
      newErrors.mealType = "Tipo de refeição é obrigatório";
    }

    if (!formData.number_of_persons || formData.number_of_persons < 1) {
      newErrors.numberOfPersons = "Número de pessoas deve ser pelo menos 1";
    }

    // Check if document is required
    if (!formData.file_id && !formData.document_type && !hasUploadedFile) {
      newErrors.document =
        "Documento de suporte é obrigatório para este tipo de despesa";
    }

    // Validate NIF if nifValidated prop is available
    if (nifValidated === false && hasUploadedFile) {
      newErrors.document = `O NIF da MOTE (${MOTE_NIF}) não foi encontrado no documento. Por favor, verifique se o documento é válido.`;
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

      // Ensure meal-specific fields are included
      const submissionData = {
        ...formData,
        type: formData.type.toUpperCase() as "COMPANY" | "BENEFITS" | "BONUS",
        meal_type: formData.meal_type,
        number_of_persons: formData.number_of_persons,
        description: `${formData.meal_type} : ${formData.number_of_persons} px - ${formData.description}`,
        iva: formData.iva || 0,
        // Explicitly include invoice_number to ensure it's not lost
        invoice_number: formData.invoice_number || "",
        // Set payer based on type and selected payer
        payer:
          formData.type.toLowerCase() === "company"
            ? formData.payer
            : enableMultiUser
              ? "COMPANY" // For batch invoicing with benefits/bonus, use COMPANY
              : "EMPLOYEE", // For regular benefits and bonus type, payer is always EMPLOYEE
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
            Despesa de Refeição
          </h2>
          <button
            onClick={onCancel}
            className="flex items-center text-sm text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </button>
        </div>

        {/* File Upload Section */}
        {hasUploadedFile ? (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Documento de Suporte
            </h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
          </div>
        ) : (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Documento de Suporte
            </h3>

            {isScanning ? (
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex flex-col items-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin"></div>
                    <Scan className="w-6 h-6 text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>

                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    A Processar Despesa
                  </h3>
                  <p className="text-gray-600 mb-6 text-center">{scanStage}</p>

                  {/* Progress Bar */}
                  <div className="w-full max-w-md mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progresso</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${scanProgress}%` }}
                      ></div>
                    </div>
                  </div>

                  {scannedImage && !isPdf && (
                    <div className="max-w-xs">
                      <img
                        src={scannedImage}
                        alt="A processar"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200 opacity-75"
                      />
                    </div>
                  )}

                  {nifValidated && scanProgress === 100 && (
                    <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-md">
                      <div className="flex items-center">
                        <Check className="w-4 h-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-700">
                          NIF da MOTE validado
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-yellow-400 transition-colors">
                {/* File input for device files */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileUploadEvent(e, "file")}
                  className="hidden"
                />

                {/* File input for camera capture */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileUploadEvent(e, "camera")}
                  className="hidden"
                />

                <div className="text-center space-y-4">
                  <div className="flex justify-center space-x-2">
                    <Upload className="w-10 h-10 text-gray-400" />
                    <Scan className="w-10 h-10 text-gray-400" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Arraste e largue o seu documento aqui, ou escolha uma
                      opção:
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-2">
                      {/* Button for file selection */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 transition-colors"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Escolher Ficheiro
                      </button>

                      {/* Button for camera capture */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 transition-colors"
                      >
                        <Scan className="w-4 h-4 mr-2" />
                        Usar Câmera
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Suporta: Fotos da câmera, JPEG, PNG, PDF (Máx. 10MB)
                  </p>
                </div>
              </div>
            )}
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
          {/* Meal specific fields */}
          <div className="space-y-6 mb-6">
            <div>
              <label
                htmlFor="mealType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Tipo de Refeição
              </label>
              <select
                id="mealType"
                value={formData.meal_type || ""}
                onChange={(e) =>
                  handleInputChange("meal_type", e.target.value as MealType)
                }
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.mealType
                    ? "border-red-300 ring-2 ring-red-500"
                    : "border-gray-300"
                }`}
                disabled={isLoadingMealTypes}
                aria-invalid={!!errors.mealType}
                aria-describedby={
                  errors.mealType ? "mealType-error" : undefined
                }
              >
                <option value="">Selecione o tipo de refeição</option>
                {isLoadingMealTypes ? (
                  <option value="" disabled>
                    A carregar tipos de refeição...
                  </option>
                ) : (
                  mealTypes.map((type) => (
                    <option key={type.key} value={type.value}>
                      {type.value}
                    </option>
                  ))
                )}
              </select>
              {errors.mealType && (
                <p
                  className="mt-1 text-sm text-red-600 flex items-center"
                  id="mealType-error"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.mealType}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="numberOfPersons"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Número de Pessoas
              </label>
              <input
                type="number"
                id="numberOfPersons"
                min="1"
                value={
                  formData.number_of_persons === undefined
                    ? ""
                    : formData.number_of_persons
                }
                onChange={(e) =>
                  handleInputChange(
                    "number_of_persons",
                    e.target.value === ""
                      ? undefined
                      : parseInt(e.target.value),
                  )
                }
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 transition-all ${
                  errors.numberOfPersons
                    ? "border-red-300 ring-2 ring-red-500"
                    : "border-gray-300"
                }`}
                aria-invalid={!!errors.numberOfPersons}
                aria-describedby={
                  errors.numberOfPersons ? "numberOfPersons-error" : undefined
                }
              />
              {errors.numberOfPersons && (
                <p
                  className="mt-1 text-sm text-red-600 flex items-center"
                  id="numberOfPersons-error"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.numberOfPersons}
                </p>
              )}
            </div>
          </div>

          {/* Common fields */}
          <div className="space-y-6">
            {/* Vendor */}
            <div>
              <label
                htmlFor="vendor"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nome do Fornecedor
              </label>
              <input
                type="text"
                id="vendor"
                value={formData.vendor}
                onChange={(e) => handleInputChange("vendor", e.target.value)}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${
                  errors.vendor ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Introduza o nome do fornecedor"
              />
              {errors.vendor && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.vendor}
                </p>
              )}
            </div>

            {/* Vendor NIF */}
            <div>
              <label
                htmlFor="vendor_nif"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                NIF do Fornecedor
              </label>
              <input
                type="text"
                id="vendor_nif"
                value={formData.vendor_nif}
                onChange={(e) =>
                  handleInputChange("vendor_nif", e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Introduza o NIF do fornecedor"
              />
            </div>

            {/* Vendor Name */}
            <div>
              <label
                htmlFor="vendor_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nome Completo do Fornecedor
              </label>
              <input
                type="text"
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) =>
                  handleInputChange("vendor_name", e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Introduza o nome completo do fornecedor"
              />
            </div>

            {/* Vendor CAE */}
            <div>
              <label
                htmlFor="vendor_cae"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                CAE do Fornecedor
              </label>
              <input
                type="text"
                id="vendor_cae"
                value={formData.vendor_cae}
                onChange={(e) =>
                  handleInputChange("vendor_cae", e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Introduza o CAE do fornecedor"
              />
            </div>

            {/* Invoice Number */}
            <div>
              <label
                htmlFor="invoice_number"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Número da Fatura
              </label>
              <input
                type="text"
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) =>
                  handleInputChange("invoice_number", e.target.value)
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Introduza o número da fatura"
              />
            </div>

            {/* Amount */}
            <div>
              <label
                htmlFor="amount"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Valor
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="amount"
                  step="0.01"
                  value={formData.amount || ""}
                  onChange={(e) =>
                    handleInputChange("amount", parseFloat(e.target.value) || 0)
                  }
                  className={`block w-full pl-3 pr-8 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${
                    errors.amount ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="0,00"
                />
                <span className="absolute right-3 top-2 text-gray-500">€</span>
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.amount}
                </p>
              )}
              {!enableMultiUser && (
                <p className="mt-1 text-sm text-gray-600">
                  Limite disponível:{" "}
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

            {/* IVA */}
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
                  step="0.01"
                  min="0"
                  value={formData.iva === undefined ? "" : formData.iva}
                  onChange={(e) =>
                    handleInputChange("iva", parseFloat(e.target.value) || 0)
                  }
                  className="block w-full pl-3 pr-8 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="0,00"
                />
                <span className="absolute right-3 top-2 text-gray-500">€</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Valor do IVA associado à despesa.
              </p>
            </div>

            {/* Date */}
            <div>
              <DatePickerInput
                value={formData.date}
                onChange={(date) => handleInputChange("date", date)}
                label="Data da Despesa"
                placeholder="dd/mm/yyyy"
                error={errors.date}
                id="date"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Descrição
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${
                  errors.description ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Introduza uma breve descrição da despesa"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Invoice Type */}
            <div>
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
                          <p className="text-xs text-gray-500 mt-2">
                            Sem limite
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Payer Selection - Only show for COMPANY type */}
            {/* Payer Selection - Show for COMPANY type or when batch invoicing is enabled */}
            {(formData.type.toLowerCase() === "company" || enableMultiUser) && (
              <div>
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
                      onChange={(e) =>
                        handleInputChange(
                          "payer",
                          e.target.value as "COMPANY" | "EMPLOYEE" | "SUPPLIER",
                        )
                      }
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
                      onChange={(e) =>
                        handleInputChange(
                          "payer",
                          e.target.value as "COMPANY" | "EMPLOYEE" | "SUPPLIER",
                        )
                      }
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
                        <h3 className="font-medium text-gray-900">
                          Colaborador
                        </h3>
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
                      onChange={(e) =>
                        handleInputChange(
                          "payer",
                          e.target.value as "COMPANY" | "EMPLOYEE" | "SUPPLIER",
                        )
                      }
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
                        <h3 className="font-medium text-gray-900">
                          Fornecedor
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Será pago ao fornecedor
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Document Requirements Message */}
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                <div>
                  <h4 className="text-sm font-medium mb-1 text-yellow-800">
                    Documento de suporte obrigatório
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Para este tipo de despesa, é obrigatório anexar um documento
                    de suporte (fatura, recibo, etc.).
                  </p>
                </div>
              </div>
            </div>

            {/* Document Error Message */}
            {errors.document && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                  <div>
                    <p className="text-sm text-red-700">{errors.document}</p>
                    <p className="text-sm text-red-700 mt-1">
                      Por favor, volte ao passo anterior e digitalize um
                      documento de suporte.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                          handleFormSubmit(
                            e as React.MouseEvent<HTMLButtonElement>,
                          );
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

            {/* Error banner (desktop-only) and actions separated */}
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
                  <Save className="w-4 h-4 mr-2" />
                  Submeter Despesa
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
