import React from "react";
import { FileInspection } from "../../types";
import {
  AlertCircle,
  Lock,
  CheckCircle,
  EyeIcon,
  ArrowBigRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";

interface FileInspectionPanelProps {
  inspection: FileInspection;
  onProceed: () => void;
  isLoading?: boolean;
}

export const FileInspectionPanel: React.FC<FileInspectionPanelProps> = ({
  inspection,
  onProceed,
  isLoading = false,
}) => {
  const hasWarnings = inspection.warnings && inspection.warnings.length > 0;
  const isBlocked = hasWarnings && hasWarnings;

  return (
    <div className="w-full space-y-6">
      {/* Header with summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex justify-center items-center">
            <CheckCircle className="inline-block h-6 w-6 mr-2 text-yellow-500" />
            Verificação do Ficheiro
          </h2>

          <Button
            onClick={onProceed}
            disabled={isBlocked || isLoading}
            variant={"yellow"}
            aria-label={
              isBlocked
                ? "Não pode prosseguir com avisos no ficheiro"
                : "Continuar"
            }
          >
            {isBlocked ? (
              <Lock className="h-4 w-4 mr-2" />
            ) : (
              <ArrowBigRight className="h-4 w-4" />
            )}
            {isLoading ? "A processar..." : "Continuar"}
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Row count */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 uppercase">
              Linhas
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {inspection.row_count.toLocaleString("pt-PT")}
            </p>
          </div>

          {/* Column count */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 uppercase">
              Colunas
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {inspection.column_count}
            </p>
          </div>

          {/* Status */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-600 uppercase">
              Estado
            </p>
            <p
              className={cn(
                "text-2xl font-bold mt-2",
                hasWarnings ? "text-yellow-600" : "text-green-600"
              )}
            >
              {hasWarnings ? "⚠️" : "✓"}
            </p>
          </div>
        </div>
      </div>

      {/* Warnings section */}
      {hasWarnings && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900">
                Problemas Detetados
              </h3>
              <p className="text-sm text-red-700 mt-1">
                O ficheiro tem problemas que precisam ser resolvidos antes de
                prosseguir:
              </p>
              <ul className="mt-3 space-y-2">
                {inspection.warnings.map((warning, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-red-700 flex items-start"
                  >
                    <span className="mr-2">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-600 mt-3 italic">
                Por favor, corrija o ficheiro e carregue novamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sample data preview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex justify-start items-center">
          <EyeIcon className="inline-block h-6 w-6 mr-2 text-yellow-500" />
          Pré-visualização dos Dados
        </h2>

        {inspection.sample_rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {inspection.headers.map((header) => (
                    <th
                      key={header.index}
                      className="px-3 py-2 text-left text-xs font-medium text-gray-700"
                    >
                      {header.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspection.sample_rows.slice(0, 5).map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    {inspection.headers.map((header) => (
                      <td
                        key={`${rowIdx}-${header.index}`}
                        className="px-3 py-2 text-gray-700 truncate max-w-xs"
                        title={String(row[header.name])}
                      >
                        {row[header.name] !== undefined &&
                        row[header.name] !== null
                          ? String(row[header.name])
                          : "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {inspection.sample_rows.length > 5 && (
              <p className="mt-2 text-xs text-gray-600 text-center">
                Mostrando 5 de {inspection.sample_rows.length} linhas de amostra
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600 text-center py-4">
            Sem dados para mostrar
          </p>
        )}
      </div>
    </div>
  );
};
