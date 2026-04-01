import React, { useState, useEffect } from "react";
import { CalendarIcon, AlertCircle, CheckIcon } from "lucide-react";
import { DatePickerInput } from "../ui/date-picker-input";
import { Button } from "../ui/button";

interface DateRangePickerProps {
  minDate: Date; // Data mínima do ficheiro
  maxDate: Date; // Data máxima do ficheiro
  onDateRangeSelect: (startDate: Date, endDate: Date) => void;
  onError: (message: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  minDate,
  maxDate,
  onDateRangeSelect,
  onError,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  // Format date to dd/MM/yyyy for display
  const formatDateForDisplay = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Initialize with min and max dates
  useEffect(() => {
    setStartDate(minDate);
    setEndDate(maxDate);
  }, [minDate, maxDate]);

  // Validate dates
  const validateDates = (): boolean => {
    const newErrors: { startDate?: string; endDate?: string } = {};

    if (!startDate) {
      newErrors.startDate = "Data inválida";
    }

    if (!endDate) {
      newErrors.endDate = "Data inválida";
    }

    if (startDate && endDate) {
      // Check if start date is before min date
      if (startDate < minDate) {
        newErrors.startDate = `Data deve ser maior ou igual a ${formatDateForDisplay(
          minDate
        )}`;
      }

      // Check if end date is after max date
      if (endDate > maxDate) {
        newErrors.endDate = `Data deve ser menor ou igual a ${formatDateForDisplay(
          maxDate
        )}`;
      }

      // Check if start date is after end date
      if (startDate > endDate) {
        newErrors.startDate = "Data início deve ser anterior a data fim";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    setErrors({});
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    setErrors({});
  };

  const handleConfirm = () => {
    if (!validateDates()) {
      onError("Por favor, corrija os erros antes de continuar");
      return;
    }

    if (startDate && endDate) {
      // Convert to UTC for storage
      const startUTC = new Date(
        Date.UTC(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate()
        )
      );
      const endUTC = new Date(
        Date.UTC(
          endDate.getFullYear(),
          endDate.getMonth(),
          endDate.getDate(),
          23,
          59,
          59
        )
      );

      onDateRangeSelect(startUTC, endUTC);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="w-full space-y-6">
      <div className="bg-white rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex justify-center items-center">
            <CalendarIcon className="inline-block h-6 w-6 mr-2 text-yellow-500" />
            Selecionar Intervalo de Datas
          </h2>
          <Button
            onClick={handleConfirm}
            disabled={hasErrors || !startDate || !endDate}
            variant={"yellow"}
            aria-label="Confirmar intervalo de datas"
          >
            <CheckIcon className="h-4 w-4" />
            Confirmar Intervalo
          </Button>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Escolha o período temporal para a reconciliação. As datas devem estar
          dentro do intervalo do ficheiro carregado.
        </p>

        {/* Date range display */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
          <p className="text-xs font-medium text-blue-900 mb-2">
            Intervalo permitido pelo ficheiro:
          </p>
          <p className="text-sm text-blue-700">
            <span className="font-semibold">
              {formatDateForDisplay(minDate)}
            </span>
            {" até "}
            <span className="font-semibold">
              {formatDateForDisplay(maxDate)}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DatePickerInput
            value={startDate}
            onChange={handleStartDateChange}
            minDate={minDate}
            maxDate={maxDate}
            label="Data de Início"
            placeholder="dd/mm/yyyy"
            error={errors.startDate}
            id="startDate"
          />

          <DatePickerInput
            value={endDate}
            onChange={handleEndDateChange}
            minDate={minDate}
            maxDate={maxDate}
            label="Data de Fim"
            placeholder="dd/mm/yyyy"
            error={errors.endDate}
            id="endDate"
          />
        </div>

        {/* Validation summary */}
        {hasErrors && (
          <div className="mt-4 p-3 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Erros de Validação
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Por favor, corrija os erros acima antes de confirmar.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
