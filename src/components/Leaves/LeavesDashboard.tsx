import React, { useState } from "react";
import { Calendar, Plus, Clock, CheckCircle, XCircle } from "lucide-react";
import { ViewType } from "../../App";
import { User } from "@/types";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { AccessDenied } from "../shared";
import { DatePickerInput } from "../ui/date-picker-input";

interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  type: "vacation" | "sick" | "personal";
  status: "pending" | "approved" | "rejected";
  reason?: string;
  submissionDate: string;
}

interface LeavesDashboardProps {
  currentUser: User | null;
  currentView: string;
  onViewChange: (view: ViewType) => void;
}

export const LeavesDashboard: React.FC<LeavesDashboardProps> = ({
  currentUser,
  currentView,
  onViewChange,
}) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [leaveRequests] = useState<LeaveRequest[]>([
    {
      id: "1",
      startDate: "2024-03-15",
      endDate: "2024-03-20",
      days: 4,
      type: "vacation",
      status: "approved",
      reason: "Férias de Páscoa",
      submissionDate: "2024-02-28",
    },
    {
      id: "2",
      startDate: "2024-04-10",
      endDate: "2024-04-12",
      days: 3,
      type: "personal",
      status: "pending",
      reason: "Assuntos pessoais",
      submissionDate: "2024-04-01",
    },
  ]);

  const { isModuleVisible } = useModuleVisibility(currentUser);

  const leaveBalance = {
    totalDays: 22,
    usedDays: 4,
    remainingDays: 18,
    pendingDays: 3,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "vacation":
        return "Férias";
      case "sick":
        return "Doença";
      case "personal":
        return "Pessoal";
      case "maternity":
        return "Maternidade/Paternidade";
      case "training":
        return "Formação";
      case "compensatory":
        return "Compensatórias";
      default:
        return type;
    }
  };

  if (!isModuleVisible("leaves")) {
    return <AccessDenied />;
  }

  if (currentView === "submit") {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => onViewChange("dashboard")}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Voltar ao Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Novo Pedido de Ausência
          </h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <DatePickerInput
                  value={startDate}
                  onChange={setStartDate}
                  label="Data de Início"
                  placeholder="dd/mm/yyyy"
                  id="leave-start-date"
                />
              </div>
              <div>
                <DatePickerInput
                  value={endDate}
                  onChange={setEndDate}
                  label="Data de Fim"
                  placeholder="dd/mm/yyyy"
                  id="leave-end-date"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ausência
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500">
                <option value="vacation">Férias</option>
                <option value="sick">Doença</option>
                <option value="personal">Pessoal</option>
                <option value="maternity">Maternidade/Paternidade</option>
                <option value="training">Formação</option>
                <option value="compensatory">Compensatórias</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo (opcional)
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="Descreva o motivo do pedido..."
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => onViewChange("dashboard")}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
              >
                Submeter Pedido
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-gray-900">
            Bem-vindo, {currentUser?.name?.split(" ")[0]}
          </p>
          <p className="text-gray-600 mt-1">
            Gira os seus pedidos de férias, ausências e consulte os saldos
            disponíveis
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onViewChange("submit")}
          className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Pedido
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-md">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total de Dias</p>
              <p className="text-2xl font-bold text-gray-900">
                {leaveBalance.totalDays}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-md">
              <Calendar className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Dias Usados</p>
              <p className="text-2xl font-bold text-gray-900">
                {leaveBalance.usedDays}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-md">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Dias Disponíveis
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {leaveBalance.remainingDays}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-md">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">
                Dias Pendentes
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {leaveBalance.pendingDays}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leave Requests */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Pedidos Recentes
          </h3>
        </div>
        <div className="p-6">
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Ainda não tem pedidos de férias</p>
              <button
                onClick={() => onViewChange("submit")}
                className="mt-4 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar Primeiro Pedido
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        <span className="ml-1">
                          {request.status === "pending"
                            ? "Pendente"
                            : request.status === "approved"
                            ? "Aprovado"
                            : "Rejeitado"}
                        </span>
                      </span>
                      <span className="text-sm text-gray-500">
                        {getTypeLabel(request.type)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {request.days} dias
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>
                      {new Date(request.startDate).toLocaleDateString("pt-PT")}{" "}
                      - {new Date(request.endDate).toLocaleDateString("pt-PT")}
                    </span>
                    <span>
                      Submetido:{" "}
                      {new Date(request.submissionDate).toLocaleDateString(
                        "pt-PT"
                      )}
                    </span>
                  </div>
                  {request.reason && (
                    <p className="mt-2 text-sm text-gray-600">
                      {request.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
