import React, { useState, useEffect, useRef } from "react";
import { ExpenseType, User } from "../../types";
import { expenseTypeService, handleFileUpload, FileUploadResult } from "../../services";
import {
  CoverflexInvoiceForm,
  PerDiemAllowanceInvoiceForm,
  MealInvoiceForm,
  TravelInvoiceForm,
  DefaultInvoiceForm,
  EmptyInvoice,
} from "./Forms";

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
  // Who paid for the expense
  payer?: "COMPANY" | "EMPLOYEE" | "SUPPLIER";
}

interface ManualInvoiceProps {
  currentUser: User;
  initialData?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => void;
  onCancel: () => void;
  onExpenseTypeChange?: (
    expense_type_id: number,
    expense_type_name: string,
  ) => void;
  formData: InvoiceFormData;
  setFormData: React.Dispatch<React.SetStateAction<InvoiceFormData>>;
}

export const ManualInvoice: React.FC<ManualInvoiceProps> = ({
  currentUser,
  initialData,
  onSubmit,
  onCancel,
  formData,
  setFormData,
}) => {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loadingExpenseTypes, setLoadingExpenseTypes] =
    useState<boolean>(false);
  const [selectedExpenseTypeName, setSelectedExpenseTypeName] = useState<
    string | undefined
  >(undefined);
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState<
    number | undefined
  >(initialData?.expense_type_id);

  // File upload state
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStage, setScanStage] = useState("");
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [nifValidated, setNifValidated] = useState<boolean>(false);
  const [, setScanResults] = useState<FileUploadResult | null>(null);
  const [, setOcrApplied] = useState<boolean>(false);
  const [, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Computed: check if we have an uploaded file
  const hasUploadedFile = Boolean(formData.file_id || scannedImage);

  // Fetch expense types when component mounts
  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        setLoadingExpenseTypes(true);
        const types = await expenseTypeService.getExpenseTypes();
        setExpenseTypes(types);
      } catch (error) {
        console.error("Failed to fetch expense types:", error);
      } finally {
        setLoadingExpenseTypes(false);
      }
    };

    fetchExpenseTypes();
  }, []);

  // Set selected expense type name when initialData.expenseTypeId changes
  useEffect(() => {
    if (initialData?.expense_type_id && expenseTypes.length > 0) {
      const expenseType = expenseTypes.find(
        (type) => type.id === initialData.expense_type_id,
      );
      if (expenseType) {
        setSelectedExpenseTypeName(expenseType.name);
      }
    }
  }, [initialData?.expense_type_id, expenseTypes]);

  // Handle cancel button click in specific forms
  const handleFormCancel = () => {
    // Reset the selected expense type to return to the base form
    setSelectedExpenseTypeName(undefined);
    setSelectedExpenseTypeId(undefined);
  };

  // Handle expense type selection from the EmptyInvoiceForm
  const handleExpenseTypeChange = (
    expense_type_id: number,
    expense_type_name: string,
  ) => {
    // Find the expense type in the list
    const expenseType = expenseTypes.find(
      (type) => type.id === expense_type_id,
    );
    if (expenseType) {
      setSelectedExpenseTypeName(expense_type_name);
      setSelectedExpenseTypeId(expense_type_id);
    }
  };

  // Handle file upload
  const handleFileUploadForForms = async (
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
          setScanResults, // Capture OCR results
          setNifValidated,
          setOcrApplied, // Track if OCR was applied
          setErrors, // Capture errors
          setFormData, // Update parent formData with OCR results
        },
        {
          isFromCamera: source === "camera",
          cameraInputRef: source === "camera" ? cameraInputRef : undefined,
        },
      );
    } catch (error) {
      console.error("File upload error:", error);
      setScanStage("Erro ao carregar ficheiro");
      setErrors((prev) => ({
        ...prev,
        document:
          error instanceof Error ? error.message : "Erro ao carregar ficheiro",
      }));
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
        setScanStage("");
      }, 2000);
    }

    // Reset file input
    if (source === "file" && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (source === "camera" && cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setIsScanning(false);
    setScanProgress(0);
    setScanStage("");
    setScannedImage(null);
    setIsPdf(false);
    setNifValidated(false);
    setScanResults(null);
    setOcrApplied(false);
    setErrors({});

    // Clear file data from formData
    setFormData((prev) => ({
      ...prev,
      file_id: undefined,
      document_content: undefined,
      document_type: undefined,
    }));
  };

  // Determine which form to render based on the selected expense type
  const renderForm = () => {
    // Merge initialData with current formData (which includes OCR results after upload)
    const updatedInitialData = {
      ...initialData,
      ...formData, // Include all formData fields populated by OCR
      expense_type_id: selectedExpenseTypeId,
    };

    // If no expense type is selected yet, render the EmptyInvoiceForm
    if (!selectedExpenseTypeName) {
      return (
        <EmptyInvoice
          currentUser={currentUser}
          initialData={undefined}
          onSubmit={onSubmit}
          onCancel={onCancel}
          onExpenseTypeChange={handleExpenseTypeChange}
          hasUploadedFile={hasUploadedFile}
          onRemoveFile={handleRemoveFile}
        />
      );
    }

    // If we're still loading expense types, show a loading indicator
    if (loadingExpenseTypes) {
      return (
        <div className="max-w-2xl mx-auto mt-6 p-6">
          <p>A carregar tipos de despesa...</p>
        </div>
      );
    }

    // Render the appropriate form based on the selected expense type
    switch (selectedExpenseTypeName) {
      case "Viagens":
        return (
          <TravelInvoiceForm
            currentUser={currentUser}
            initialData={updatedInitialData}
            onSubmit={onSubmit}
            onCancel={handleFormCancel}
            hasUploadedFile={hasUploadedFile}
            onRemoveFile={handleRemoveFile}
          />
        );
      case "Refeições":
        return (
          <MealInvoiceForm
            currentUser={currentUser}
            initialData={updatedInitialData}
            onSubmit={onSubmit}
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
      case "Coverflex":
        return (
          <CoverflexInvoiceForm
            currentUser={currentUser}
            initialData={{
              vendor: updatedInitialData.vendor,
              amount: updatedInitialData.amount,
              date: updatedInitialData.date,
              description: updatedInitialData.description,
              type:
                updatedInitialData.type === "benefits" ||
                updatedInitialData.type === "BENEFITS"
                  ? updatedInitialData.type
                  : "BENEFITS",
              expense_type_id: updatedInitialData.expense_type_id,
              document_type: updatedInitialData.document_type,
              file_id: updatedInitialData.file_id,
              document_content: updatedInitialData.document_content,
              payer: "COMPANY",
            }}
            onSubmit={onSubmit}
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
      case "Ajudas de Custo":
        return (
          <PerDiemAllowanceInvoiceForm
            currentUser={currentUser}
            initialData={updatedInitialData}
            onSubmit={onSubmit}
            onCancel={handleFormCancel}
            onExpenseTypeChange={handleExpenseTypeChange}
            hasUploadedFile={hasUploadedFile}
            onRemoveFile={handleRemoveFile}
          />
        );
      default:
        return (
          <DefaultInvoiceForm
            currentUser={currentUser}
            initialData={updatedInitialData}
            onSubmit={onSubmit}
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
  };

  return renderForm();
};
