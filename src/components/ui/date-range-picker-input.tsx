import React, { useState, useEffect, useRef } from "react";
import { CalendarIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { Calendar } from "./calendar";

interface DateRangePickerInputProps {
  startDate: Date | null;
  endDate: Date | null;
  onRangeChange: (startDate: Date | null, endDate: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  startPlaceholder?: string;
  endPlaceholder?: string;
  startLabel?: string;
  endLabel?: string;
  startError?: string;
  endError?: string;
  className?: string;
  disabled?: boolean;
}

export const DateRangePickerInput: React.FC<DateRangePickerInputProps> = ({
  startDate,
  endDate,
  onRangeChange,
  minDate,
  maxDate,
  startPlaceholder = "dd/mm/yyyy",
  endPlaceholder = "dd/mm/yyyy",
  startLabel = "Data de Início",
  endLabel = "Data de Fim",
  startError,
  endError,
  className,
  disabled = false,
}) => {
  const [startInputValue, setStartInputValue] = useState("");
  const [endInputValue, setEndInputValue] = useState("");
  const [openCalendar, setOpenCalendar] = useState<"start" | "end" | null>(
    null
  );
  const startCalendarRef = useRef<HTMLDivElement>(null);
  const endCalendarRef = useRef<HTMLDivElement>(null);

  // Format date to dd/MM/yyyy
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Parse dd/MM/yyyy to Date
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;

    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = dateString.match(dateRegex);

    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return isNaN(date.getTime()) ? null : date;
  };

  // Update input values when props change
  useEffect(() => {
    if (startDate) {
      setStartInputValue(formatDate(startDate));
    } else {
      setStartInputValue("");
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      setEndInputValue(formatDate(endDate));
    } else {
      setEndInputValue("");
    }
  }, [endDate]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        startCalendarRef.current &&
        !startCalendarRef.current.contains(event.target as Node) &&
        openCalendar === "start"
      ) {
        setOpenCalendar(null);
      }
      if (
        endCalendarRef.current &&
        !endCalendarRef.current.contains(event.target as Node) &&
        openCalendar === "end"
      ) {
        setOpenCalendar(null);
      }
    };

    if (openCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [openCalendar]);

  const handleStartInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setStartInputValue(newValue);

    const parsed = parseDate(newValue);
    if (parsed) {
      onRangeChange(parsed, endDate);
    }
  };

  const handleEndInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEndInputValue(newValue);

    const parsed = parseDate(newValue);
    if (parsed) {
      onRangeChange(startDate, parsed);
    }
  };

  const handleStartCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onRangeChange(date, endDate);
      setStartInputValue(formatDate(date));
      setOpenCalendar(null);
    }
  };

  const handleEndCalendarSelect = (date: Date | undefined) => {
    if (date) {
      onRangeChange(startDate, date);
      setEndInputValue(formatDate(date));
      setOpenCalendar(null);
    }
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
      {/* Start Date */}
      <div className="relative">
        {startLabel && (
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {startLabel}
          </label>
        )}
        <div className="relative">
          <input
            type="text"
            id="startDate"
            value={startInputValue}
            onChange={handleStartInputChange}
            onFocus={() => {
              if (!disabled) {
                setOpenCalendar("start");
              }
            }}
            placeholder={startPlaceholder}
            disabled={disabled}
            className={cn(
              "block w-full px-3 py-2 pr-10 border rounded-md shadow-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              startError
                ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 text-gray-900 focus:ring-yellow-500 focus:border-yellow-500",
              disabled && "bg-gray-50 text-gray-500 cursor-not-allowed"
            )}
            aria-describedby={startError ? "startDate-error" : undefined}
            aria-invalid={startError ? "true" : "false"}
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

          {openCalendar === "start" && (
            <div
              ref={startCalendarRef}
              className="absolute top-full left-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
            >
              <Calendar
                mode="single"
                selected={startDate || undefined}
                onSelect={handleStartCalendarSelect}
                disabled={(date) => {
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                defaultMonth={startDate || minDate || new Date()}
                className="w-full"
              />
            </div>
          )}
        </div>

        {startError && (
          <p id="startDate-error" className="mt-2 text-sm text-red-600">
            {startError}
          </p>
        )}
      </div>

      {/* End Date */}
      <div className="relative">
        {endLabel && (
          <label
            htmlFor="endDate"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {endLabel}
          </label>
        )}
        <div className="relative">
          <input
            type="text"
            id="endDate"
            value={endInputValue}
            onChange={handleEndInputChange}
            onFocus={() => {
              if (!disabled) {
                setOpenCalendar("end");
              }
            }}
            placeholder={endPlaceholder}
            disabled={disabled}
            className={cn(
              "block w-full px-3 py-2 pr-10 border rounded-md shadow-sm transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-offset-2",
              endError
                ? "border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 text-gray-900 focus:ring-yellow-500 focus:border-yellow-500",
              disabled && "bg-gray-50 text-gray-500 cursor-not-allowed"
            )}
            aria-describedby={endError ? "endDate-error" : undefined}
            aria-invalid={endError ? "true" : "false"}
          />
          <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />

          {openCalendar === "end" && (
            <div
              ref={endCalendarRef}
              className="absolute top-full left-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
            >
              <Calendar
                mode="single"
                selected={endDate || undefined}
                onSelect={handleEndCalendarSelect}
                disabled={(date) => {
                  if (minDate && date < minDate) return true;
                  if (maxDate && date > maxDate) return true;
                  return false;
                }}
                defaultMonth={endDate || maxDate || new Date()}
                className="w-full"
              />
            </div>
          )}
        </div>

        {endError && (
          <p id="endDate-error" className="mt-2 text-sm text-red-600">
            {endError}
          </p>
        )}
      </div>
    </div>
  );
};
