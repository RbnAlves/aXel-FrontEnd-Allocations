import React, { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, FileText, X } from "lucide-react";
import { ExpenseType, User } from "../../types";
import { expenseTypeService } from "../../services";

interface EmptyInvoiceProps {
  currentUser: User;
  initialData?: Partial<never>;
  onSubmit: (data: never) => void;
  onCancel: () => void;
  onExpenseTypeChange?: (
    expense_type_id: number,
    expense_type_name: string
  ) => void;
  hasUploadedFile?: boolean;
  onRemoveFile?: () => void;
}

// 5 botões para aparecer no submeter despesa
const SELECTED_EXPENSE_TYPE_IDS = [7, 11, 19, 20, 21]; // Change these IDs to your desired values

export const EmptyInvoice: React.FC<EmptyInvoiceProps> = ({
  initialData,
  onCancel,
  onExpenseTypeChange,
  hasUploadedFile,
  onRemoveFile,
}) => {
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loadingExpenseTypes, setLoadingExpenseTypes] =
    useState<boolean>(false);
  const [selectedExpenseTypeId, setSelectedExpenseTypeId] = useState<
    number | undefined
  >(initialData?.expense_type_id);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchExpenseTypes = async () => {
      try {
        setLoadingExpenseTypes(true);
        const types = await expenseTypeService.getExpenseTypes();
        setExpenseTypes(types);
      } catch (error) {
        console.error("Failed to fetch expense types:", error);
        setErrors((prev) => ({
          ...prev,
          expenseType: "Erro ao carregar tipos de despesa.",
        }));
      } finally {
        setLoadingExpenseTypes(false);
      }
    };
    fetchExpenseTypes();
  }, []);

  const handleExpenseTypeChange = (e: {
    target: { value: string | number; name?: string };
  }) => {
    const expenseTypeId = e.target.value
      ? parseInt(e.target.value as string)
      : undefined;
    const expenseTypeName = e.target.name;
    setSelectedExpenseTypeId(expenseTypeId);

    if (expenseTypeId && onExpenseTypeChange) {
      const selectedTypeName =
        expenseTypeName ||
        expenseTypes.find((type) => type.id === expenseTypeId)?.name ||
        "";
      onExpenseTypeChange(expenseTypeId, selectedTypeName);
    }

    if (errors.expenseType) {
      setErrors((prev) => ({ ...prev, expenseType: "" }));
    }
  };

  // Filter expenseTypes to only include the selected IDs
  const filteredExpenseTypes = expenseTypes.filter((type) =>
    SELECTED_EXPENSE_TYPE_IDS.includes(type.id)
  );

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Detalhes da Despesa
            </h2>
            <button
              onClick={onCancel}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
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

          <div>
            <label
              htmlFor="expenseType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Tipo de Despesa
            </label>
            {filteredExpenseTypes.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filteredExpenseTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() =>
                      handleExpenseTypeChange({
                        target: { value: type.id, name: type.name },
                      })
                    }
                    className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                      selectedExpenseTypeId === type.id
                        ? "bg-yellow-500 text-white border-yellow-500"
                        : "text-gray-500 border-gray-300 hover:bg-yellow-100 hover:text-yellow-700 hover:border-yellow-100"
                    }`}
                    aria-label={`Selecionar ${type.name}`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            )}
            <select
              id="expenseType"
              value={selectedExpenseTypeId || ""}
              onChange={handleExpenseTypeChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
              disabled={loadingExpenseTypes}
            >
              <option value="">Selecione o tipo de despesa</option>
              {expenseTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {loadingExpenseTypes && (
              <p className="mt-1 text-sm text-gray-600">
                A carregar tipos de despesa...
              </p>
            )}
            {errors.expenseType && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {errors.expenseType}
              </p>
            )}

            {selectedExpenseTypeId && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  {
                    expenseTypes.find(
                      (type) => type.id === selectedExpenseTypeId
                    )?.name
                  }
                </h4>
                <p className="text-sm text-gray-600">
                  {expenseTypes.find(
                    (type) => type.id === selectedExpenseTypeId
                  )?.description ||
                    "Selecione este tipo de despesa para continuar."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
