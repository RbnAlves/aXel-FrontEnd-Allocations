import React from "react";
import {
  CheckCircle,
  Clock,
  Euro,
  FileText,
  PieChart,
  Plus,
} from "lucide-react";
import { DashboardStats, ExpenseTypeStats, Invoice, User } from "../../types";
import { TooltipWrapper } from "../ui/tooltip";
import { ViewType } from "../../App";
import { Button } from "../ui/button";

interface DashboardProps {
  currentUser: User;
  stats: DashboardStats;
  recentInvoices: Invoice[];
  isApprovalMode?: boolean;
  onViewChange: (view: ViewType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  stats,
  isApprovalMode = false,
  onViewChange,
}) => {
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
      </div>
    </div>
  );

  const LimitCard: React.FC<{
    title: string;
    annual_limit: number;
    accrued_limit: number;
    used: number;
    pending: number;
    type: "company" | "benefits";
  }> = ({ title, annual_limit, accrued_limit, used, pending }) => {
    const totalPercentage =
      annual_limit > 0 ? ((used + pending) / annual_limit) * 100 : 0;

    const accruedBudget = accrued_limit;
    const accruedPercentage =
      accruedBudget > 0 ? ((used + pending) / accruedBudget) * 100 : 0;

    // accrued_limit represents the available accrual (carry-over included)
    const accruedRemaining = Math.max(0, accrued_limit - (used + pending));

    const annualRemaining = Math.max(0, annual_limit - (used + pending));

    const getAccruedTooltipColor = () => {
      if (accruedPercentage > 80) return "red";
      if (accruedPercentage > 60) return "yellow";
      return "green";
    };

    const getAccruedTooltipContent = () => {
      if (accruedPercentage > 80) {
        return "Atenção, já ultrapassaste 80% de utilização do limite acumulado de despesas";
      }
      if (accruedPercentage > 60) {
        return "Já ultrapassaste 60% do limite acumulado de despesas";
      }
      return "Percentagem de utilização do limite acumulado de despesas";
    };

    const getAnnualTooltipColor = () => {
      if (totalPercentage > 80) return "red";
      if (totalPercentage > 60) return "yellow";
      return "green";
    };

    const getAnnualTooltipContent = () => {
      if (totalPercentage > 80) {
        return "Atenção, já ultrapassaste 80% de utilização do limite anual de despesas";
      }
      if (totalPercentage > 60) {
        return "Já ultrapassaste 60% do limite anual de despesas";
      }
      return "Percentagem de utilização do limite anual de despesas";
    };

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Accrued Usage Card */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">
                Limite Acumulado
              </h4>
              <TooltipWrapper
                tooltipTrigger={`${accruedPercentage.toFixed(1)}%`}
                tooltipContent={getAccruedTooltipContent()}
                color={getAccruedTooltipColor()}
              />
            </div>
            <div className="flex justify-between items-center mb-2">
              <TooltipWrapper
                tooltipTrigger="Utilizado"
                tooltipContent="Valor total utilizado no ano atual"
                color="ghost"
              />
              <span className="text-sm font-medium">
                {used.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <TooltipWrapper
                tooltipTrigger="Em aprovação"
                tooltipContent="Valor total pendente de aprovação no ano atual"
                color="ghost"
              />
              <span className="text-sm font-medium text-yellow-600">
                {pending.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <TooltipWrapper
                tooltipTrigger="Disponível"
                tooltipContent="Valor restante disponível no limite acumulado"
                color="ghost"
              />
              <span className="text-sm font-medium text-green-600">
                {accruedRemaining.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  accruedPercentage > 80
                    ? "bg-red-500"
                    : accruedPercentage > 60
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
                style={{ width: `${Math.min(accruedPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs">
              <span>0.00€</span>
              <span className="font-medium">
                {accrued_limit.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
          </div>

          {/* Annual Usage Card */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">
                Limite Anual
              </h4>
              <TooltipWrapper
                tooltipTrigger={`${totalPercentage.toFixed(1)}%`}
                tooltipContent={getAnnualTooltipContent()}
                color={getAnnualTooltipColor()}
              />
            </div>
            <div className="flex justify-between items-center mb-2">
              <TooltipWrapper
                tooltipTrigger="Utilizado"
                tooltipContent="Valor total utilizado no ano atual"
                color="ghost"
              />
              <span className="text-sm font-medium">
                {used.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <TooltipWrapper
                tooltipTrigger="Em aprovação"
                tooltipContent="Valor total pendente de aprovação no ano atual"
                color="ghost"
              />
              <span className="text-sm font-medium text-yellow-600">
                {pending.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <TooltipWrapper
                tooltipTrigger="Disponível"
                tooltipContent="Valor restante disponível no limite anual"
                color="ghost"
              />
              <span className="text-sm font-medium text-green-600">
                {annualRemaining.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${
                  totalPercentage > 80
                    ? "bg-red-500"
                    : totalPercentage > 60
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                }`}
                style={{ width: `${Math.min(totalPercentage, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs">
              <span>0.00€</span>
              <span className="font-medium">
                {annual_limit.toLocaleString("pt-PT", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
                €
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Custom SVG Pie Chart Component
  const ExpenseTypePieChart: React.FC<{ data: ExpenseTypeStats[] }> = ({
    data,
  }) => {
    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + item.amount, 0);

    // Generate pie chart segments
    let startAngle = 0;
    const segments = data.map((item, index) => {
      const percentage = (item.amount / total) * 100;
      const angle = (percentage / 100) * 360;
      const endAngle = startAngle + angle;

      // Calculate SVG arc path
      const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
      const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
      const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
      const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);

      // Determine if the arc should be drawn as a large arc (> 180 degrees)
      const largeArcFlag = angle > 180 ? 1 : 0;

      // Create the SVG path
      const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      // Generate a color based on index (you can customize this)
      const colors = [
        "#FBBF24", // yellow-400
        "#F59E0B", // amber-500
        "#D97706", // amber-600
        "#B45309", // amber-700
        "#92400E", // amber-800
        "#78350F", // amber-900
        "#F97316", // orange-500
        "#EA580C", // orange-600
        "#C2410C", // orange-700
        "#9A3412", // orange-800
      ];
      const color = colors[index % colors.length];

      // Store the current end angle as the start angle for the next segment
      startAngle = endAngle;

      return { path, color, item, percentage };
    });

    return (
      <div className="flex flex-col items-center">
        <div className="relative w-[200px] h-[200px]">
          <svg width="200" height="200" viewBox="0 0 200 200">
            {segments.map((segment, index) => (
              <path
                key={index}
                d={segment.path}
                fill={segment.color}
                stroke="#fff"
                strokeWidth="1"
              />
            ))}
          </svg>
        </div>

        <div className="mt-6 w-full">
          <div className="grid grid-cols-2 gap-2">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center">
                <span
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: segment.color }}
                ></span>
                <span className="text-xs text-gray-700 truncate">
                  {segment.item.name}
                </span>
                <span className="text-xs font-medium ml-1 text-gray-900">
                  ({segment.percentage.toFixed(1)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xl font-bold text-gray-900">
            {isApprovalMode
              ? "Gerir aprovações de despesas e monitorizar gastos da equipa"
              : currentUser.role === "ADMIN"
                ? "Visão agregada de todas as despesas e limites dos utilizadores"
                : `Bem-vindo, ${currentUser?.name.split(" ")[0]}`}
          </p>
          <p className="text-gray-600 mt-1">
            Gira as suas despesas e consulte os saldos disponíveis
          </p>
        </div>

        {/* Botão só para não-admins e fora do modo aprovação */}
        {!isApprovalMode && currentUser.role !== "ADMIN" && (
          <Button
            onClick={() => {
              onViewChange("submit");
            }}
            variant="yellow"
          >
            <span className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Submeter Despesa
            </span>
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Pagamentos Pendentes"
          value={stats.pendingApprovals}
          icon={<Clock className="w-6 h-6 text-white" />}
          color="bg-orange-500"
        />
        <StatCard
          title="Pagas Este Mês"
          value={stats.payedThisMonth}
          icon={<CheckCircle className="w-6 h-6 text-white" />}
          color="bg-green-500"
        />
        <StatCard
          title="Total de Submetidas"
          value={stats.submittedThisMonth}
          icon={<Euro className="w-6 h-6 text-white" />}
          color="bg-gray-600"
        />
        <StatCard
          title="Total de Rejeitadas"
          value={stats.rejectedThisMonth}
          icon={<FileText className="w-6 h-6 text-white" />}
          color="bg-red-500"
        />
      </div>

      {/* Spending Limits Section */}
      <div className="mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          {currentUser.role === "ADMIN"
            ? "Limites de Despesa Agregados"
            : "Os Seus Limites de Despesa"}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LimitCard
            title={
              currentUser.role === "ADMIN"
                ? "Contas da Empresa (Todos)"
                : "Conta da Empresa"
            }
            annual_limit={currentUser.limits.companyAccount.annual_limit}
            accrued_limit={currentUser.limits.companyAccount.accrued_limit}
            used={currentUser.limits.companyAccount.used}
            pending={currentUser.limits.companyAccount.pending}
            type="company"
          />
          <LimitCard
            title={
              currentUser.role === "ADMIN"
                ? "Benefícios de Colaborador (Todos)"
                : "Benefícios de Colaborador"
            }
            annual_limit={currentUser.limits.employeeBenefits.annual_limit}
            accrued_limit={currentUser.limits.employeeBenefits.accrued_limit}
            used={currentUser.limits.employeeBenefits.used}
            pending={currentUser.limits.employeeBenefits.pending}
            type="benefits"
          />
        </div>
      </div>

      {/* Expense Type Section */}
      <div className="mt-10">
        <h2 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <PieChart className="w-5 h-5 mr-2 text-yellow-500" />
          Despesas por Tipo
        </h2>

        {stats.expenseTypeStats && stats.expenseTypeStats.length > 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <div className="flex justify-center items-center">
                <ExpenseTypePieChart data={stats.expenseTypeStats} />
              </div>

              {/* Detailed List */}
              <div className="space-y-4">
                {stats.expenseTypeStats.map((expenseType, index) => {
                  // Mapear cores com base no índice, correspondendo ao array colors do PieChart
                  const colorClasses = [
                    "bg-yellow-400",
                    "bg-amber-500",
                    "bg-amber-600",
                    "bg-amber-700",
                    "bg-amber-800",
                    "bg-amber-900",
                    "bg-orange-500",
                    "bg-orange-600",
                    "bg-orange-700",
                    "bg-orange-800",
                  ];
                  const colorClass = colorClasses[index % colorClasses.length];

                  return (
                    <div
                      key={expenseType.id}
                      className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center">
                          <span
                            className={`w-3 h-3 rounded-full mr-2 ${colorClass}`}
                          ></span>
                          <span className="font-medium text-gray-900">
                            {expenseType.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {expenseType.amount.toLocaleString("pt-PT", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                            €
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({expenseType.count} despesas)
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colorClass}`}
                          style={{
                            width: `${Math.min(
                              (expenseType.amount /
                                stats.expenseTypeStats.reduce(
                                  (sum, type) => sum + type.amount,
                                  0,
                                )) *
                                100,
                              100,
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center py-8 text-gray-500">
            <p>Não existem despesas por tipo para mostrar.</p>
          </div>
        )}
      </div>
    </div>
  );
};
