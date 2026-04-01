import React, { useState, useRef } from "react";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Loader,
  FileIcon,
  ArrowBigRight,
} from "lucide-react";
import { FileInspection } from "../../types";
import { reconciliationService } from "../../services";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface FileUploadZoneProps {
  onUploadSuccess: (inspection: FileInspection, uploadId: string) => void;
  onError: (message: string) => void;
  onProceedWithExisting?: () => void;
  onClearUpload?: () => void;
  isLoading?: boolean;
  uploadedFileName?: string;
  uploadedFileSize?: number;
  /**
   * When this value changes, the component will reset its internal state.
   * Useful for external "Recomeçar" actions.
   */
  resetSignal?: number;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onUploadSuccess,
  onError,
  onProceedWithExisting,
  onClearUpload,
  isLoading = false,
  uploadedFileName,
  uploadedFileSize,
  resetSignal,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "inspecting" | "success" | "error"
  >("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Validate type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];

    // Also check extension as fallback
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some((ext) =>
      fileName.endsWith(ext)
    );

    if (!validTypes.includes(file.type) && !hasValidExtension) {
      return "Ficheiro inválido: apenas .xlsx, .xls e .csv são aceites";
    }

    // Validate size (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20 MB in bytes
    if (file.size > maxSize) {
      return "Ficheiro demasiado grande (máx 20 MB)";
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleFileSelect = async (file: File) => {
    // Prevent multiple uploads
    if (uploadStatus === "uploading" || uploadStatus === "inspecting") {
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      setUploadStatus("error");
      return;
    }

    setSelectedFile(file);
    setUploadProgress(0);
    setUploadStatus("uploading");

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 30;
        });
      }, 200);

      // Upload file
      const uploadResponse = await reconciliationService.uploadFile(file);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Transition to inspecting
      setUploadStatus("inspecting");

      // Inspect file
      const inspection = await reconciliationService.inspectFile(
        uploadResponse.upload_id
      );

      setUploadStatus("success");

      // Notify parent
      onUploadSuccess(inspection, uploadResponse.upload_id);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Falha ao carregar ficheiro";
      onError(errorMessage);
      setUploadStatus("error");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset internal state when parent triggers a restart
  React.useEffect(() => {
    if (resetSignal !== undefined) {
      resetUpload();
    }
  }, [resetSignal]);

  const isDisabled =
    isLoading ||
    uploadStatus === "uploading" ||
    uploadStatus === "inspecting" ||
    uploadStatus === "success";

  return (
    <div
      className={`w-full space-y-6 p-6 ${
        uploadedFileName && uploadedFileSize !== undefined
          ? "bg-green-50 border border-green-200 rounded-md"
          : ""
      }`}
    >
      {uploadedFileName && uploadedFileSize !== undefined ? (
        <div className="flex items-start space-x-3 justify-between">
          <div className="flex items-start space-x-3 flex-1 justify-center">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {/* <h2 className="text-sm font-medium text-green-900"> */}
              <h2 className="text-lg font-semibold text-green-900 mb-6">
                Ficheiro carregado com sucesso
              </h2>
              <p className="text-sm text-gray-700 mt-1">{uploadedFileName}</p>
              <p className="text-xs text-gray-600 mt-1">
                {formatFileSize(uploadedFileSize)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant={"outline"}
              onClick={() => {
                onClearUpload?.();
                resetUpload();
              }}
              aria-label="Carregar outro ficheiro"
            >
              Outro ficheiro
            </Button>
            {onProceedWithExisting && (
              <Button
                variant={"yellow"}
                onClick={onProceedWithExisting}
                aria-label="Continuar com este ficheiro"
              >
                <ArrowBigRight className="h-4 w-4" />
                Continuar
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Instructions */}
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex justify-center items-center">
              <FileIcon className="inline-block h-6 w-6 mr-2 text-yellow-500" />
              Carregar Ficheiro e-Fatura
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Carregue um ficheiro .xlsx, .xls ou .csv para iniciar a
              reconciliação
            </p>
          </div>

          {/* Drag-drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-lg p-8 transition-colors",
              isDragging
                ? "border-yellow-500 bg-yellow-50"
                : "border-gray-300 bg-gray-50 hover:bg-gray-100"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              disabled={isDisabled}
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-3">
              {uploadStatus === "idle" || uploadStatus === "error" ? (
                <>
                  <Upload className="h-12 w-12 text-gray-400" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      Arraste o ficheiro aqui ou
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isDisabled}
                      className={cn(
                        "mt-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                        isDisabled
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-yellow-500 text-white hover:bg-yellow-600"
                      )}
                      aria-label="Selecionar ficheiro e-fatura"
                    >
                      Selecione um ficheiro
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    .xlsx, .xls ou .csv, máximo 20 MB
                  </p>
                </>
              ) : (
                <>
                  <Loader className="h-12 w-12 text-yellow-500 animate-spin" />
                  <p className="text-sm font-medium text-gray-900">
                    {uploadStatus === "uploading"
                      ? "A carregar ficheiro..."
                      : "A verificar ficheiro..."}
                  </p>
                </>
              )}
            </div>

            {/* Progress bar */}
            {(uploadStatus === "uploading" ||
              uploadStatus === "inspecting") && (
              <div className="mt-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 text-center">
                  {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>

          {/* File info and error messages */}
          {selectedFile && uploadStatus !== "uploading" && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start space-x-3">
                {uploadStatus === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success state - show file details */}
          {uploadStatus === "success" && selectedFile && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">
                    Ficheiro carregado com sucesso
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  onClick={resetUpload}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                  aria-label="Remover ficheiro"
                >
                  Remover
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
