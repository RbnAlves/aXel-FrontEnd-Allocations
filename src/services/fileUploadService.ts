import { API_URL, MOTE_NIF } from "../config";
import { authService } from "./authService";

// Interface definitions
interface OCRResult {
  vendor: string;
  vendor_nif?: string;
  vendor_name?: string;
  vendor_cae?: string;
  invoice_number?: string;
  buyer: string;
  amount: number;
  iva?: number;
  date: string;
  description: string;
  document_type?: string;
  file_id?: string;
  document_content?: string;
  rawText: string;
  suggested_expense_type_id: number;
  detectedFields: {
    vendor: { value: string; position: { x: number; y: number } };
    vendor_nif?: { value: string; position: { x: number; y: number } };
    vendor_name?: { value: string; position: { x: number; y: number } };
    vendor_cae?: { value: string; position: { x: number; y: number } };
    invoice_number?: { value: string; position: { x: number; y: number } };
    amount: { value: number; position: { x: number; y: number } };
    iva?: { value: number; position: { x: number; y: number } };
    date: { value: string; position: { x: number; y: number } };
    description: { value: string; position: { x: number; y: number } };
  };
}

interface FileUploadCallbacks {
  setScanStage: (stage: string) => void;
  setScanProgress: (progress: number) => void;
  setScannedImage: (image: string | null) => void;
  setIsPdf: (isPdf: boolean) => void;
}

export interface FileUploadResult extends Omit<OCRResult, "rawText"> {
  rawText?: string;
}

// Function to compress image if needed
const compressImageIfNeeded = async (file: File): Promise<File> => {
  // If it's not an image or it's already small enough, return the original file
  if (!file.type.startsWith("image/") || file.size <= 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 1600;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality 0.8 (80%)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            // Create a new file from the blob
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            console.log(
              `Image compressed from ${(file.size / 1024).toFixed(2)}KB to ${(
                compressedFile.size / 1024
              ).toFixed(2)}KB`,
            );
            resolve(compressedFile);
          },
          "image/jpeg",
          0.8,
        );
      };

      img.onerror = () => {
        reject(new Error("Failed to load image for compression"));
      };
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file for compression"));
    };
  });
};

// Process invoice document function
const processInvoiceDocument = async (
  file: File,
  callbacks: FileUploadCallbacks,
): Promise<FileUploadResult> => {
  const { setScanStage, setScanProgress, setScannedImage, setIsPdf } =
    callbacks;

  // Check if file is PDF
  const isPdfFile = file.type === "application/pdf";
  setIsPdf(isPdfFile);

  const imageUrl = URL.createObjectURL(file);
  setScannedImage(imageUrl);

  // Processing stages
  const stages = [
    { stage: "A inicializar processamento de imagem...", progress: 5 },
    { stage: "A enviar documento para processamento...", progress: 20 },
    { stage: "A processar documento...", progress: 35 },
    { stage: "A extrair dados...", progress: 50 },
    { stage: "A analisar resultados...", progress: 60 },
    { stage: "A finalizar...", progress: 70 },
  ];

  for (const { stage, progress } of stages) {
    setScanStage(stage);
    setScanProgress(progress);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Create form data for file upload
  const formData = new FormData();
  formData.append("file", file);

  // Function to fetch with timeout and retry
  const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    timeout = 30000,
    retries = 2,
  ): Promise<Response> => {
    // Create an AbortController to handle timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };

      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);

        // If we have retries left and it's a network error, retry
        if (
          retries > 0 &&
          error instanceof TypeError &&
          error.message.includes("fetch")
        ) {
          console.log(`Retry attempt, ${retries} retries left`);
          setScanStage(
            `Tentando novamente... (${retries} tentativas restantes)`,
          );
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return fetchWithRetry(url, options, timeout, retries - 1);
        }

        throw error;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // Send the document to the backend for processing with retry
  const response = await fetchWithRetry(
    `${API_URL}/api/files/process-invoice-document`,
    {
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type here, it will be set automatically with the boundary
        Authorization: `Bearer ${authService.getToken()}`,
      },
    },
  );

  // Handle HTTP errors
  if (response.status === 413) {
    throw new Error(
      "O ficheiro é demasiado grande. O tamanho máximo permitido é 10MB.",
    );
  }

  if (!response.ok) {
    throw new Error(`Error processing document: ${response.statusText}`);
  }

  const responseData = await response.json();

  if (!responseData.success) {
    throw new Error(responseData.message || "Error processing document");
  }

  const { invoice_data, suggested_expense_type_id, text } = responseData.data;

  // Extract data from the response
  const vendor = invoice_data.vendor || "Unknown Vendor";
  const vendor_nif = invoice_data.vendor_nif || "";
  const vendor_name = invoice_data.vendor_name || "";
  const vendor_cae = invoice_data.vendor_cae || "";
  const invoice_number = invoice_data.invoice_number || "";
  const buyer = invoice_data.buyer || "Unknown Buyer";
  const amount = parseFloat(invoice_data.amount) || 0;
  const iva = parseFloat(invoice_data.iva) || 0;
  const date = invoice_data.date || new Date().toISOString().split("T")[0];
  const description = invoice_data.description || "No description available";
  const document_type = invoice_data.document_type || undefined;
  const file_id = invoice_data.file_id || undefined;

  return {
    vendor,
    vendor_nif,
    vendor_name,
    vendor_cae,
    invoice_number,
    buyer,
    amount,
    iva,
    date,
    description,
    document_type,
    file_id,
    document_content: imageUrl,
    rawText: text || "",
    suggested_expense_type_id,
    detectedFields: {
      vendor: {
        value: vendor,
        position: { x: 20, y: 20 },
      },
      vendor_nif: {
        value: vendor_nif,
        position: { x: 20, y: 25 },
      },
      vendor_name: {
        value: vendor_name,
        position: { x: 20, y: 30 },
      },
      vendor_cae: {
        value: vendor_cae,
        position: { x: 20, y: 35 },
      },
      invoice_number: {
        value: invoice_number,
        position: { x: 20, y: 38 },
      },
      amount: {
        value: amount,
        position: { x: 20, y: 40 },
      },
      iva: {
        value: iva,
        position: { x: 20, y: 50 },
      },
      date: {
        value: date,
        position: { x: 20, y: 60 },
      },
      description: {
        value: description,
        position: { x: 20, y: 80 },
      },
    },
  };
};

// Main handle file upload function
export const handleFileUpload = async (
  file: File,
  callbacks: FileUploadCallbacks & {
    setIsScanning: (scanning: boolean) => void;
    setScanResults: (results: FileUploadResult | null) => void;
    setNifValidated: (validated: boolean) => void;
    setOcrApplied: (applied: boolean) => void;
    setErrors: (errors: any) => void;
    setFormData: (data: any) => void;
  },
  options: {
    isFromCamera?: boolean;
    cameraInputRef?: React.RefObject<HTMLInputElement>;
  } = {},
): Promise<void> => {
  const {
    setIsScanning,
    setScanProgress,
    setScanStage,
    setScanResults,
    setNifValidated,
    setOcrApplied,
    setErrors,
    setFormData,
  } = callbacks;

  setIsScanning(true);
  setScanProgress(0);
  setScanStage("A iniciar análise OCR...");

  try {
    // Check file size before uploading (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(
        `O ficheiro é demasiado grande. O tamanho máximo permitido é 10MB. Tamanho atual: ${(
          file.size /
          (1024 * 1024)
        ).toFixed(2)}MB`,
      );
    }

    // Compress image if it's from camera
    let fileToProcess = file;
    if (file.type.startsWith("image/") && options.isFromCamera) {
      setScanStage("A otimizar imagem...");
      try {
        fileToProcess = await compressImageIfNeeded(file);
      } catch (compressionError) {
        console.error("Error compressing image:", compressionError);
        // Continue with original file if compression fails
        fileToProcess = file;
      }
    }

    const results = await processInvoiceDocument(fileToProcess, callbacks);
    setScanResults(results);

    // Check if the scanned document contains the MOTE NIF
    const containsMoteBuyerNIF = results.buyer.includes(MOTE_NIF);

    // Update NIF validation state
    setNifValidated(containsMoteBuyerNIF);

    if (!containsMoteBuyerNIF) {
      // Set error if MOTE NIF is not found in the document
      setErrors((prev: any) => ({
        ...prev,
        document: `O NIF da MOTE (${MOTE_NIF}) não foi encontrado no documento. Por favor, verifique se o documento é válido.`,
      }));
      setOcrApplied(false);
      return;
    }

    // Clear any previous document errors
    setErrors((prev: any) => ({
      ...prev,
      document: "",
    }));

    // Update document-related fields in form data
    setFormData((prev: any) => ({
      ...prev,
      document_type: results.document_type,
      file_id: results.file_id,
      document_content: results.document_content,
      expense_type_id: results.suggested_expense_type_id,
    }));

    // Automatically apply OCR results to form data when successful
    setFormData((prev: any) => ({
      ...prev,
      vendor: results.vendor,
      vendor_nif: results.vendor_nif || "",
      vendor_name: results.vendor_name || "",
      vendor_cae: results.vendor_cae || "",
      invoice_number: results.invoice_number || "",
      amount: results.amount,
      iva: results.iva || 0,
      date: results.date,
      description: results.description,
    }));
    setOcrApplied(true);
  } catch (error) {
    console.error("Falha no processamento OCR:", error);

    // More detailed error logging for network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("Network error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });

      // Set a more user-friendly message for network errors
      setScanStage("Erro de conexão ao processar o documento");
      setErrors((prev: any) => ({
        ...prev,
        document:
          "Falha na conexão com o servidor. Verifique sua conexão de internet e tente novamente.",
      }));
    } else if (error instanceof DOMException && error.name === "AbortError") {
      console.error("Request timeout:", {
        message: error.message,
        name: error.name,
      });

      // Set a user-friendly message for timeout errors
      setScanStage("Tempo limite excedido ao processar o documento");
      setErrors((prev: any) => ({
        ...prev,
        document:
          "O processamento do documento demorou muito tempo. Tente novamente com uma conexão mais rápida ou uma imagem menor.",
      }));
    } else {
      // Handle other types of errors
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Falha no processamento OCR. Tente novamente.";
      setScanStage(errorMessage);
      setErrors((prev: any) => ({
        ...prev,
        document: errorMessage,
      }));
    }
  } finally {
    setIsScanning(false);
  }
};

export const fileUploadService = {
  handleFileUpload,
  compressImageIfNeeded,
  processInvoiceDocument,
};
