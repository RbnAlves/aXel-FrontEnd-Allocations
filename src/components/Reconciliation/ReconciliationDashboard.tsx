import React, { useState, useEffect, useRef } from "react";
import {
  FileUploadZone,
  FileInspectionPanel,
  DateRangePicker,
  JobExecutor,
  ReconciliationResults,
  ReconciliationCharts,
} from "./";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import {
  FileInspection,
  ReconciliationResultResponse as ReconciliationResultsType,
  User,
} from "../../types";
import { Button } from "../ui/button";
import {
  reconciliationService,
  reconciliationEnumsService,
} from "../../services";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { AccessDenied } from "../shared";

interface ReconciliationDashboardProps {
  currentUser: User;
}

type Step = "upload" | "inspect" | "dates" | "execute" | "results";

interface DateRange {
  start: Date | null;
  end: Date | null;
}

export const ReconciliationDashboard: React.FC<ReconciliationDashboardProps> = (
  props,
) => {
  const { isViewVisible, hasViewPermission } = useModuleVisibility(
    props.currentUser,
  );
  const [step, setStep] = useState<Step>("upload");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [inspection, setInspection] = useState<FileInspection | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<number | null>(null);
  const [resetSignal, setResetSignal] = useState<number>(0);
  const [dateRange, setDateRange] = useState<DateRange>({
    start: null,
    end: null,
  });
  const [results, setResults] = useState<ReconciliationResultsType | null>(
    null,
  );
  const [error, setError] = useState<string>("");
  const [infoMessage, setInfoMessage] = useState<string>("");
  const [discrepancyTypeLabelMap, setDiscrepancyTypeLabelMap] = useState<
    Record<string, string>
  >({});
  const hasFetchedEnumsRef = useRef(false);

  // Fetch enum maps on component mount
  useEffect(() => {
    if (hasFetchedEnumsRef.current) return;
    hasFetchedEnumsRef.current = true;
    const fetchEnums = async () => {
      try {
        const discrepancies =
          await reconciliationEnumsService.getDiscrepancyTypes("pt-PT");
        setDiscrepancyTypeLabelMap(
          reconciliationEnumsService.createDiscrepancyTypeLabelMap(
            discrepancies,
          ),
        );
      } catch (error) {
        console.error("Error fetching discrepancy type enums:", error);
      }
    };

    fetchEnums();
  }, []);

  const steps = [
    { id: "upload", label: "Upload" },
    { id: "inspect", label: "Verificação" },
    { id: "dates", label: "Datas" },
    { id: "execute", label: "Execução" },
    { id: "results", label: "Resultados" },
  ];

  // Reset helper
  const resetAll = () => {
    setStep("upload");
    setUploadId(null);
    setInspection(null);
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setDateRange({ start: null, end: null });
    setResults(null);
    setError("");
    setInfoMessage("");
    // bump signal so FileUploadZone clears its internal state
    setResetSignal((v) => v + 1);
  };

  const handleUploadSuccess = (insp: FileInspection, id: string) => {
    setUploadId(id);
    setInspection(insp);
    setUploadedFileName("e-fatura.xlsx"); // You can get actual name from props if needed
    setUploadedFileSize(1024 * 500); // Placeholder, get from file info
    setStep("inspect");
    setError("");
  };

  const handleProceedInspect = () => {
    if (!inspection) return;
    setStep("dates");
    setError("");
  };

  const handleDateSelect = (start: Date, end: Date) => {
    setDateRange({ start, end });
    setStep("execute");
    setError("");
  };

  const handleJobComplete = (res: ReconciliationResultsType) => {
    setResults(res);
    setStep("results");
  };

  const handleError = (message: string) => {
    setError(message);
  };

  const handleExportResults = async () => {
    if (!results) return;

    try {
      setInfoMessage("A exportar resultados...");
      const blob = await reconciliationService.exportResults(results.job_id);
      reconciliationService.downloadFile(
        blob,
        `reconciliacao_${results.job_id}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`,
      );
      setInfoMessage("Resultados exportados com sucesso!");
      setTimeout(() => setInfoMessage(""), 3000);
    } catch (error) {
      console.error("Error exporting results:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Falha ao exportar resultados.",
      );
    }
  };

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  if (
    !isViewVisible("expenses", "reconciliation") ||
    !hasViewPermission("expenses", "reconciliation")
  ) {
    return <AccessDenied />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xl font-bold text-gray-900">
            Reconciliação de Faturas
          </p>
          <p className="text-gray-600 mt-1">
            Fluxo de reconciliação de dados do e-fatura com o aXel.
          </p>
        </div>

        <div>
          <Button variant={"outline"} onClick={resetAll}>
            Recomeçar
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
        {steps.map((s, idx) => {
          const isActive = idx === currentStepIndex;
          const isDone = idx < currentStepIndex;
          const canClick = isDone || isActive;

          return (
            <button
              key={s.id}
              onClick={() => {
                if (canClick) {
                  setStep(s.id as Step);
                  setError("");
                  // When going back, clear data from steps after the selected step
                  if (s.id === "inspect") {
                    setDateRange({ start: null, end: null });
                    setResults(null);
                  }
                  if (s.id === "upload") {
                    setDateRange({ start: null, end: null });
                    setResults(null);
                    // Keep uploadId and inspection to preserve uploaded file
                  }
                  if (s.id === "dates") {
                    setResults(null);
                  }
                }
              }}
              disabled={!canClick}
              className={`border rounded-md p-3 flex items-center space-x-3 transition-all ${
                !canClick
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:shadow-md"
              } ${
                isActive
                  ? "border-yellow-500 bg-yellow-50"
                  : isDone
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-white"
              }`}
            >
              <div
                className={`h-8 w-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                  isActive
                    ? "bg-yellow-500 text-white"
                    : isDone
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-700"
                }`}
              >
                {idx + 1}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-gray-900">
                  {s.label}
                </div>
                {isActive && (
                  <div className="text-xs text-gray-600">Passo atual</div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-800 px-3 py-2 mb-6 rounded">
          <AlertTriangle className="h-4 w-4 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {infoMessage && (
        <div className="flex items-start space-x-2 bg-green-50 border border-green-200 text-green-800 px-3 py-2 mb-6 rounded">
          <CheckCircle className="h-4 w-4 mt-0.5" />
          <div className="text-sm">{infoMessage}</div>
        </div>
      )}

      {/* Step content */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        {step === "upload" && (
          <FileUploadZone
            onUploadSuccess={handleUploadSuccess}
            onError={handleError}
            uploadedFileName={uploadedFileName || undefined}
            uploadedFileSize={uploadedFileSize || undefined}
            onProceedWithExisting={
              uploadedFileName ? () => setStep("inspect") : undefined
            }
            onClearUpload={() => {
              setUploadId(null);
              setInspection(null);
              setUploadedFileName(null);
              setUploadedFileSize(null);
              setResetSignal((v) => v + 1);
            }}
            resetSignal={resetSignal}
          />
        )}

        {step === "inspect" && inspection && (
          <FileInspectionPanel
            inspection={inspection}
            onProceed={handleProceedInspect}
          />
        )}

        {step === "dates" && inspection && (
          <DateRangePicker
            minDate={new Date(inspection.earliest_date)}
            maxDate={new Date(inspection.latest_date)}
            onDateRangeSelect={handleDateSelect}
            onError={handleError}
          />
        )}

        {step === "execute" && uploadId && dateRange.start && dateRange.end && (
          <JobExecutor
            uploadId={uploadId}
            dateStart={dateRange.start}
            dateEnd={dateRange.end}
            onJobComplete={handleJobComplete}
            onError={handleError}
            onCancel={resetAll}
          />
        )}

        {step === "results" && results && (
          <div className="space-y-6">
            <ReconciliationResults
              results={results}
              discrepancyTypeLabelMap={discrepancyTypeLabelMap}
              onExport={handleExportResults}
            />
            <ReconciliationCharts
              results={results}
              discrepancyTypeLabelMap={discrepancyTypeLabelMap}
            />
          </div>
        )}

        {/* Loading guard if state inconsistent */}
        {step === "execute" &&
          (!uploadId || !dateRange.start || !dateRange.end) && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Preparar execução...</span>
            </div>
          )}
      </div>
    </div>
  );
};
