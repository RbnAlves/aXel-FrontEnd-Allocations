import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  X,
  CheckCircle,
  AlertCircle,
  Loader,
  SettingsIcon,
} from "lucide-react";
import {
  ReconciliationResultResponse as ReconciliationResults,
  JobStatus,
} from "../../types";
import { reconciliationService } from "../../services";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface JobExecutorProps {
  uploadId: string;
  dateStart: Date;
  dateEnd: Date;
  onJobComplete: (results: ReconciliationResults) => void;
  onError: (message: string) => void;
  onCancel?: () => void;
}

export const JobExecutor: React.FC<JobExecutorProps> = ({
  uploadId,
  dateStart,
  dateEnd,
  onJobComplete,
  onError,
  onCancel,
}) => {
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [failureCount, setFailureCount] = useState(0);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const jobIdRef = useRef<string | null>(null);

  // Get status message based on job status
  const getStatusMessage = (status?: string, progress?: number): string => {
    if (!status) return "Aguardando início...";

    switch (status) {
      case "PENDING":
        return "A preparar reconciliação...";
      case "RUNNING":
        if (progress !== undefined) {
          if (progress < 30) return "A processar...";
          if (progress < 70) return "A analisar dados...";
          if (progress < 95) return "Quase pronto...";
        }
        return "A processar...";
      case "COMPLETED":
        return "Concluído!";
      case "FAILED":
        return "Falhou";
      default:
        return "A processar...";
    }
  };

  // Poll for job status
  const pollJobStatus = async (jobId: string) => {
    try {
      const status = await reconciliationService.getJobStatus(jobId);
      setJobStatus(status);
      setFailureCount(0); // Reset failure count on success

      if (status.status === "COMPLETED") {
        stopPolling();
        setIsRunning(false);
        // Fetch actual results from API
        try {
          const results = await reconciliationService.getResults(jobId);
          onJobComplete(results);
        } catch (error) {
          console.error("Error fetching results:", error);
          onError(
            "Reconciliação concluída mas falhou ao obter resultados. Por favor, recarregue."
          );
        }
      } else if (status.status === "FAILED") {
        stopPolling();
        setIsRunning(false);
        onError(
          status.error_message ||
            "Reconciliação falhou. Por favor, tente novamente."
        );
      }
    } catch (error) {
      console.error("Error polling job status:", error);
      setFailureCount((prev) => prev + 1);

      // Stop polling after 3 consecutive failures
      if (failureCount >= 2) {
        stopPolling();
        setIsRunning(false);
        onError(
          "Ligação perdida. Não foi possível obter o estado da reconciliação."
        );
      }
    }
  };

  // Start polling
  const startPolling = (jobId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 2 seconds
    pollingIntervalRef.current = setInterval(() => {
      pollJobStatus(jobId);
    }, 2000);

    // Immediate first poll
    pollJobStatus(jobId);
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  // Start reconciliation
  const handleStartReconciliation = async () => {
    setIsRunning(true);
    setFailureCount(0);
    setJobStatus(null);

    try {
      const jobStatus = await reconciliationService.runReconciliation(
        uploadId,
        dateStart,
        dateEnd
      );

      jobIdRef.current = jobStatus.job_id;
      setJobStatus(jobStatus);

      // Start polling
      startPolling(jobStatus.job_id);
    } catch (error) {
      console.error("Error starting reconciliation:", error);
      setIsRunning(false);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Falha ao iniciar reconciliação";
      onError(errorMessage);
    }
  };

  // Cancel reconciliation
  const handleCancelReconciliation = async () => {
    if (!jobIdRef.current) return;

    try {
      const updatedStatus = await reconciliationService.cancelJob(
        jobIdRef.current
      );
      setJobStatus(updatedStatus);
      stopPolling();
      setIsRunning(false);

      if (onCancel) {
        onCancel();
      }

      onError("Reconciliação cancelada pelo utilizador");
    } catch (error) {
      console.error("Error canceling job:", error);
      onError("Falha ao cancelar reconciliação");
    }
  };

  const progress = jobStatus?.progress || 0;
  const status = jobStatus?.status;
  const canCancel = status === "RUNNING";

  return (
    <div className="w-full bg-white rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 flex justify-center items-center">
          <SettingsIcon className="h-6 w-6 mr-2 text-yellow-500" />
          Executar Reconciliação
        </h2>

        {/* Action buttons */}
        <div className="flex items-center justify-end space-x-3">
          {/* Cancel button (only when running) */}
          {canCancel && (
            <button
              onClick={handleCancelReconciliation}
              className="flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Cancelar reconciliação"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </button>
          )}

          {/* Start button (only when not running) */}
          {!isRunning && (
            <Button
              onClick={handleStartReconciliation}
              disabled={isRunning}
              variant={"yellow"}
              aria-label="Executar reconciliação"
            >
              <Play className="h-4 w-4" />
              Executar Reconciliação
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">
        Clique no botão para iniciar o processo de reconciliação entre o
        ficheiro e-fatura e o aXel.
      </p>

      {/* Status display */}
      {!isRunning && !jobStatus && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-sm text-gray-700">
            Pronto para iniciar a reconciliação do período:
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-2">
            {new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(
              dateStart
            )}{" "}
            até{" "}
            {new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(
              dateEnd
            )}
          </p>
        </div>
      )}

      {/* Progress bar and status */}
      {isRunning && (
        <div className="mb-6">
          {/* Status message */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {status === "COMPLETED" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : status === "FAILED" ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : (
                <Loader className="h-5 w-5 text-yellow-500 animate-spin" />
              )}
              <p className="text-sm font-medium text-gray-900">
                {getStatusMessage(status, progress)}
              </p>
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {progress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                "absolute top-0 left-0 h-full transition-all duration-300 ease-out",
                status === "COMPLETED"
                  ? "bg-green-500"
                  : status === "FAILED"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Job details */}
          {jobStatus && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
              <p className="text-blue-900">
                <span className="font-medium">Job ID:</span>{" "}
                <code className="bg-white px-1.5 py-0.5 rounded">
                  {jobStatus.job_id}
                </code>
              </p>
              {jobStatus.started_at && (
                <p className="text-blue-900 mt-1">
                  <span className="font-medium">Iniciado:</span>{" "}
                  {new Intl.DateTimeFormat("pt-PT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(jobStatus.started_at))}
                </p>
              )}
              {jobStatus.finished_at && (
                <p className="text-blue-900 mt-1">
                  <span className="font-medium">Concluído:</span>{" "}
                  {new Intl.DateTimeFormat("pt-PT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(jobStatus.finished_at))}
                </p>
              )}
            </div>
          )}

          {/* Error message */}
          {status === "FAILED" && jobStatus?.error_message && (
            <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Erro</p>
                  <p className="text-sm text-red-700 mt-1">
                    {jobStatus.error_message}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info message */}
      {isRunning && !canCancel && (
        <p className="mt-4 text-xs text-gray-500 text-center">
          Este processo pode demorar alguns minutos. Por favor, aguarde...
        </p>
      )}
    </div>
  );
};
