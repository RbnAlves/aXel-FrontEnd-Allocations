import React, { useState, useEffect, useRef, useCallback } from "react";
import { User, ExpenseType, MealType } from "../../types";
import {
  expenseTypeService,
  handleFileUpload,
  FileUploadResult,
} from "../../services";
import {
  DefaultInvoiceForm,
  ManualInvoice,
  TravelInvoiceForm,
  MealInvoiceForm,
  PerDiemAllowanceInvoiceForm,
  CoverflexInvoiceForm,
} from "./Forms";
import {
  Scan,
  FileText,
  Check,
  X,
  Upload,
  Edit3,
  AlertTriangle,
  InfoIcon,
} from "lucide-react";
import {
  getFormTypeFromExpenseTypeName,
  FormType,
} from "../../utils/expenseTypeMapping";

interface InvoiceFormData {
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
  // Travel specific fields
  origin?: string;
  destination?: string;
  kilometers?: number;
  licensePlate?: string;
  // Meals specific fields
  meal_type?: MealType;
  number_of_persons?: number;
  // Per diem allowances specific fields
  days?: number;
  // Invoice specific fields
  buyerNIF?: string;
  payer?: "COMPANY" | "EMPLOYEE" | "SUPPLIER" | undefined;
}

interface InvoiceFlowHandlerProps {
  currentUser: User;
  initialData?: Partial<InvoiceFormData>;
  initialExpenseTypeName?: string;
  onSubmit: (data: InvoiceFormData) => void;
  onBatchSubmit?: (
    data: InvoiceFormData,
    distribution: import("../../types").InvoiceDistribution,
  ) => void;
  onCancel: () => void;
}

// Selected expense type IDs for quick access buttons
const SELECTED_EXPENSE_TYPE_IDS = [7, 11, 19, 20, 21];

export const InvoiceFlowHandler: React.FC<InvoiceFlowHandlerProps> = ({
  currentUser,
  initialData,
  initialExpenseTypeName,
  onSubmit,
  onBatchSubmit,
}) => {
  const parseDateValue = (value?: string | Date | null): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const normalizeFormData = useCallback(
    (
      data: Partial<FileUploadResult> | Partial<InvoiceFormData>,
    ): Partial<InvoiceFormData> => {
      const typed = data as Record<string, unknown>;
      return {
        vendor: (typed.vendor as string) || "",
        vendor_nif: typed.vendor_nif as string | undefined,
        vendor_name: typed.vendor_name as string | undefined,
        vendor_cae: typed.vendor_cae as string | undefined,
        invoice_number: typed.invoice_number as string | undefined,
        amount: (typed.amount as number) || 0,
        iva: typed.iva as number | undefined,
        date: parseDateValue(typed.date as string | Date | null) ?? null,
        description: (typed.description as string) || "",
        type: (typed.type as InvoiceFormData["type"]) || "benefits",
        expense_type_id: typed.expense_type_id as number | undefined,
        document_type: typed.document_type as string | undefined,
        file_id: typed.file_id as string | undefined,
        document_content: typed.document_content as string | undefined,
      };
    },
    [],
  );

  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState<
    number | undefined
  >(undefined);
  const [selectedFormType, setSelectedFormType] = useState<FormType>("default");

  // View states: 'upload' | 'select' | 'form' | 'manual'
  const [currentView, setCurrentView] = useState<
    "upload" | "select" | "form" | "manual"
  >("upload");

  const [formData, setFormData] = useState<InvoiceFormData>({
    vendor: "",
    vendor_nif: "",
    vendor_name: "",
    vendor_cae: "",
    invoice_number: "",
    amount: 0,
    iva: 0,
    date: new Date(),
    description: "",
    type: "benefits",
    payer: "COMPANY",
  });

  const [, setErrors] = useState<Record<string, string>>({});

  // Scanner related state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState("");
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [scanResults, setScanResults] = useState<FileUploadResult | null>(null);
  const [nifValidated, setNifValidated] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        const types = await expenseTypeService.getExpenseTypes();
        setExpenseTypes(types);
      } catch (error) {
        console.error("Failed to fetch expense types:", error);
        setErrors((prev) => ({
          ...prev,
          expenseType: "Erro ao carregar tipos de despesa.",
        }));
      }
    };
    fetchExpenseTypes();
  }, []);

  // Prefill data when initial data is provided (repeat flow) and jump straight to the correct form
  useEffect(() => {
    if (!initialData || Object.keys(initialData).length === 0) {
      return;
    }

    setFormData((prev) => ({
      ...prev,
      ...normalizeFormData(initialData),
      type: (initialData.type ?? prev.type) as typeof prev.type,
      payer: (initialData.payer ?? prev.payer) as typeof prev.payer,
      date: parseDateValue(initialData.date) ?? prev.date,
    }));

    if (initialData.expense_type_id) {
      setSelectedExpenseTypeId(initialData.expense_type_id);
    }

    let formType: FormType = "default";
    if (initialExpenseTypeName) {
      formType = getFormTypeFromExpenseTypeName(initialExpenseTypeName);
    } else if (initialData.expense_type_id && expenseTypes.length > 0) {
      const matchedType = expenseTypes.find(
        (type) => type.id === initialData.expense_type_id,
      );
      if (matchedType) {
        formType = getFormTypeFromExpenseTypeName(matchedType.name);
      }
    }

    setSelectedFormType(formType);
    setCurrentView("form");
  }, [initialData, initialExpenseTypeName, expenseTypes, normalizeFormData]);

  // Fetch expense type details when scan results contain suggested_expense_type_id
  useEffect(() => {
    const fetchExpenseTypeDetails = async () => {
      if (scanResults?.suggested_expense_type_id) {
        try {
          const expenseType = await expenseTypeService.getExpenseType(
            scanResults.suggested_expense_type_id,
          );
          setSelectedExpenseTypeId(scanResults.suggested_expense_type_id);

          // Determine form type
          const formType = getFormTypeFromExpenseTypeName(expenseType.name);
          setSelectedFormType(formType);

          // Apply OCR data to formData
          setFormData((prev) => ({
            ...prev,
            ...normalizeFormData(scanResults),
            expense_type_id: scanResults.suggested_expense_type_id,
          }));

          // Navigate to form
          setCurrentView("form");
        } catch (error) {
          console.error("Failed to fetch expense type details:", error);
          // If OCR detected a type but we can't fetch it, show selection
          setCurrentView("select");
        }
      } else if (scanResults) {
        // OCR completed but no expense type detected - show selection view
        setFormData((prev) => ({
          ...prev,
          ...normalizeFormData(scanResults),
        }));
        setCurrentView("select");
      }
    };

    if (scanResults) {
      fetchExpenseTypeDetails();
    }
  }, [scanResults, normalizeFormData]);

  const resetScanner = () => {
    setIsScanning(false);
    setScanProgress(0);
    setScanStage("");
    setScannedImage(null);
    setIsPdf(false);
    setScanResults(null);
    setNifValidated(false);
  };

  const onFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    source: "file" | "camera",
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await handleFileUpload(
        file,
        {
          setIsScanning,
          setScanProgress,
          setScanStage,
          setScannedImage,
          setIsPdf,
          setScanResults,
          setNifValidated,
          setOcrApplied: () => {}, // Not used in this component
          setErrors,
          setFormData: (
            updater:
              | InvoiceFormData
              | ((prev: InvoiceFormData) => InvoiceFormData),
          ) => {
            setFormData((prev) => {
              const next =
                typeof updater === "function" ? updater(prev) : updater;
              if (next?.date && typeof next.date === "string") {
                return { ...next, date: parseDateValue(next.date) };
              }
              return next;
            });
          },
        },
        {
          isFromCamera: source === "camera",
          cameraInputRef: source === "camera" ? cameraInputRef : undefined,
        },
      );
    } catch (error) {
      console.error("Scan error:", error);
      setScanStage("Erro ao processar documento");
      setTimeout(() => {
        resetScanner();
      }, 2000);
    }

    if (source === "file" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (source === "camera" && cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleExpenseTypeChange = (
    expenseTypeId: number,
    expenseTypeName: string,
  ) => {
    setSelectedExpenseTypeId(expenseTypeId);

    // Determine form type
    const formType = getFormTypeFromExpenseTypeName(expenseTypeName);
    setSelectedFormType(formType);

    // Update formData with expense type
    setFormData((prev) => ({
      ...prev,
      expense_type_id: expenseTypeId,
    }));

    // Navigate to form
    setCurrentView("form");
  };

  const handleRemoveFile = () => {
    // Clear all file-related state
    resetScanner();
    // Clear file data from formData
    setFormData({
      vendor: "",
      vendor_nif: "",
      vendor_name: "",
      vendor_cae: "",
      invoice_number: "",
      amount: 0,
      iva: 0,
      date: new Date(),
      description: "",
      type: "benefits",
      payer: "COMPANY",
    });
    // Clear expense type selection
    setSelectedExpenseTypeId(undefined);
    setSelectedFormType("default");
    // Return to upload view
    setCurrentView("upload");
  };

  const handleFormCancel = () => {
    // If we have a file, go back to selection view
    if (formData.file_id || scanResults) {
      setSelectedExpenseTypeId(undefined);
      setCurrentView("select");
    } else {
      // No file, return to upload
      handleRemoveFile();
    }
  };

  const handleManualSubmit = () => {
    setCurrentView("manual");
  };

  const filteredExpenseTypes = expenseTypes.filter((type) =>
    SELECTED_EXPENSE_TYPE_IDS.includes(type.id),
  );

  // Determine if a file has been uploaded
  const hasUploadedFile = !!(formData.file_id || scanResults || scannedImage);

  // File upload handlers shared across all forms
  const handleFileUploadForForms = async (
    event: React.ChangeEvent<HTMLInputElement>,
    source: "file" | "camera",
  ) => {
    await onFileChange(event, source);
  };

  // Render form based on selected type
  if (currentView === "form") {
    switch (selectedFormType) {
      case "travel":
        return (
          <TravelInvoiceForm
            currentUser={currentUser}
            initialData={formData}
            onSubmit={onSubmit}
            onBatchSubmit={onBatchSubmit}
            onCancel={handleFormCancel}
            hasUploadedFile={hasUploadedFile}
            onRemoveFile={handleRemoveFile}
          />
        );
      case "meal":
        return (
          <MealInvoiceForm
            currentUser={currentUser}
            initialData={formData}
            onSubmit={onSubmit}
            onBatchSubmit={onBatchSubmit}
            onCancel={handleFormCancel}
            onExpenseTypeChange={handleExpenseTypeChange}
            hasUploadedFile={hasUploadedFile}
            onRemoveFile={handleRemoveFile}
            isScanning={isScanning}
            scanProgress={scanProgress}
            scanStage={scanStage}
            scannedImage={scannedImage}
            isPdf={isPdf}
            nifValidated={nifValidated}
            fileInputRef={fileInputRef}
            cameraInputRef={cameraInputRef}
            onFileUpload={handleFileUploadForForms}
          />
        );
      case "perdiem":
        return (
          <PerDiemAllowanceInvoiceForm
            currentUser={currentUser}
            initialData={formData}
            onSubmit={onSubmit}
            onBatchSubmit={onBatchSubmit}
            onCancel={handleFormCancel}
            hasUploadedFile={hasUploadedFile}
            onRemoveFile={handleRemoveFile}
          />
        );
      case "coverflex":
        return (
          <CoverflexInvoiceForm
            currentUser={currentUser}
            initialData={{
              ...formData,
              type: "benefits" as const,
              payer: "COMPANY" as const,
            }}
            onSubmit={onSubmit}
            onBatchSubmit={onBatchSubmit}
            onCancel={handleFormCancel}
            hasUploadedFile={hasUploadedFile}
            onRemoveFile={handleRemoveFile}
            isScanning={isScanning}
            scanProgress={scanProgress}
            scanStage={scanStage}
            scannedImage={scannedImage}
            isPdf={isPdf}
            nifValidated={nifValidated}
            fileInputRef={fileInputRef}
            cameraInputRef={cameraInputRef}
            onFileUpload={handleFileUploadForForms}
          />
        );
      case "default":
      default:
        return (
          <DefaultInvoiceForm
            currentUser={currentUser}
            initialData={formData}
            onSubmit={onSubmit}
            onBatchSubmit={onBatchSubmit}
            onCancel={handleFormCancel}
            onExpenseTypeChange={handleExpenseTypeChange}
            hasUploadedFile={hasUploadedFile}
            onRemoveFile={handleRemoveFile}
            isScanning={isScanning}
            scanProgress={scanProgress}
            scanStage={scanStage}
            scannedImage={scannedImage}
            isPdf={isPdf}
            nifValidated={nifValidated}
            fileInputRef={fileInputRef}
            cameraInputRef={cameraInputRef}
            onFileUpload={handleFileUploadForForms}
          />
        );
    }
  }

  // Manual submission view
  if (currentView === "manual") {
    return (
      <ManualInvoice
        currentUser={currentUser}
        initialData={formData}
        onSubmit={onSubmit}
        onCancel={() => setCurrentView("upload")}
        onExpenseTypeChange={handleExpenseTypeChange}
        formData={formData}
        setFormData={setFormData}
      />
    );
  }

  // Expense type selection view
  if (currentView === "select") {
    return (
      <div className="max-w-2xl mx-auto mt-6">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              Selecione o Tipo de Despesa
            </h2>
          </div>

          <div className="p-6 space-y-6">
            {/* File Upload Indicator */}
            {(formData.file_id || scanResults) && (
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
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors"
                    aria-label="Remover documento"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Tipo de Despesa
              </label>
              {filteredExpenseTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {filteredExpenseTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                        handleExpenseTypeChange(type.id, type.name)
                      }
                      className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                        selectedExpenseTypeId === type.id
                          ? "bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-600"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {type.name}
                    </button>
                  ))}
                </div>
              )}
              {filteredExpenseTypes.length === 0 && (
                <div className="text-sm text-gray-500 italic">
                  A carregar tipos de despesa...
                </div>
              )}
            </div>

            {/* Alternative: Choose from all expense types */}
            <div className="pt-4 border-t border-gray-200">
              <label
                htmlFor="expenseType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Ou escolha de todos os tipos disponíveis
              </label>
              <select
                id="expenseType"
                value={selectedExpenseTypeId || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  const type = expenseTypes.find((t) => t.id === id);
                  if (type) {
                    handleExpenseTypeChange(id, type.name);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value="">Selecione um tipo</option>
                {expenseTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: File upload view
  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Submissão de Despesa
            </h2>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="p-6">
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

                <div className="w-full max-w-md space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {scanStage}
                    </span>
                    <span className="text-sm font-medium text-yellow-600">
                      {scanProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>

                  {!isPdf && scannedImage && (
                    <div className="mt-6">
                      <img
                        src={scannedImage}
                        alt="Scanned Invoice"
                        className="w-full rounded-lg shadow-md"
                      />
                    </div>
                  )}

                  {scanProgress === 100 && (
                    <div className="mt-4 flex items-center justify-center text-green-600">
                      <Check className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">
                        Processamento concluído!
                      </span>
                    </div>
                  )}

                  {nifValidated && (
                    <div className="mt-2 flex items-center justify-center text-green-600">
                      <Check className="w-5 h-5 mr-2" />
                      <span className="text-sm font-medium">
                        NIF da MOTE validado
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors cursor-pointer"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Carregar ficheiro
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, JPG, PNG
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 flex flex-col items-center justify-center px-6 py-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors cursor-pointer"
                  >
                    <Scan className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-gray-700">
                      Tirar foto
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      Usar câmara
                    </span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => onFileChange(e, "file")}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => onFileChange(e, "camera")}
                  className="hidden"
                />
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-start p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Fotos que não cubram toda a fatura
                    não serão aprovadas. Certifique-se de que todo o documento
                    está visível e legível.
                  </p>
                </div>
                <div className="flex items-start p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <InfoIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Dica:</p>
                    <p>
                      Carregue uma fatura ou recibo para preencher
                      automaticamente o formulário. O sistema irá extrair
                      informações como NIF, montante e data.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Manual Entry Option */}
        <div className="px-6 pb-6">
          <div className="pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleManualSubmit}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Submeter manualmente sem documento
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
