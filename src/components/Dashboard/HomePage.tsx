import React, { useEffect, useState } from "react";
import {
  FileText,
  Calendar,
  Users,
  Plus,
  ShieldCheck,
  UserSearch,
  Handshake,
} from "lucide-react";
import { Button } from "../ui/button";
import { ModuleType, ViewType } from "@/App";
import { SidebarTrigger } from "../ui/sidebar";
import { isProduction } from "@/utils/featureFlags";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { User } from "@/types";
import { DoorUnlockButton } from "../DoorControl/DoorUnlockButton";
import { doorAccessService } from "@/services/doorAccessService";

interface HomePageProps {
  currentUser: User;
  onModuleChange: (module: ModuleType) => void;
  isApprovalMode?: boolean;
  onApprovalModeChange?: (enabled: boolean) => void;
  onViewChange: (view: ViewType) => void;
}

interface ModuleCard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  hoverColor: string;
  available: boolean;
  features: string[];
  onClick?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  currentUser,
  onModuleChange,
  isApprovalMode = false,
  onApprovalModeChange,
  onViewChange,
}) => {
  const { hasViewPermission, isViewVisible, isModuleVisible } =
    useModuleVisibility(currentUser);
  const [showDoorAccess, setShowDoorAccess] = useState(false);

  // Check if door access should be shown (user is on office network)
  useEffect(() => {
    const checkDoorAccess = async () => {
      try {
        const status = await doorAccessService.getDoorStatus();
        setShowDoorAccess(status.enabled && status.on_office_network);
      } catch (error) {
        // If error, don't show door access
        console.error("Failed to fetch door access status:", error);
        setShowDoorAccess(false);
      }
    };

    checkDoorAccess();
  }, []);

  const hasQuickActions =
    (!isApprovalMode && currentUser.role !== "ADMIN") ||
    (!isApprovalMode && currentUser.role === "APPROVER") ||
    (isViewVisible("expenses", "reconciliation") &&
      hasViewPermission("expenses", "reconciliation")) ||
    showDoorAccess;

  const modules: ModuleCard[] = [
    {
      id: "expenses",
      title: "eXpenses",
      description: "Gestão de Despesas",
      icon: FileText,
      color: "bg-blue-500",
      hoverColor: "hover:bg-blue-600",
      available: true,
      features: [
        "Submissão de despesas",
        "Aprovação de despesas",
        "Relatórios financeiros",
        "Gestão de limites",
      ],
    },
    ...(currentUser.role === "ADMIN"
      ? [
          {
            id: "door-control",
            title: "Controlo de Acessos",
            description: "Monitorização de acessos ao escritório",
            icon: ShieldCheck,
            color: "bg-slate-700",
            hoverColor: "hover:bg-slate-800",
            available: true,
            features: [
              "Registos de abertura da porta",
              "Filtros por ação e período",
              "Ordenação e paginação no servidor",
              "Exportação para Excel",
            ],
            onClick: () => {
              onModuleChange("doorlogs");
            },
          },
        ]
      : []),
    // {
    //   id: "leaves",
    //   title: "Leaves",
    //   description: "Gestão de Ausências",
    //   icon: Calendar,
    //   color: "bg-green-500",
    //   hoverColor: "hover:bg-green-600",
    //   available: false,
    //   features: [
    //     "Pedidos de férias e ausências",
    //     "Aprovação de férias",
    //     "Calendário de equipa",
    //     "Gestão de diferentes tipos de ausências",
    //   ],
    // },
    ...(isModuleVisible("allocations")
      ? [
          {
            id: "allocations",
            title: "Allocations",
            description: "Gestão de Alocação de Recursos",
            icon: UserSearch,
            color: "bg-violet-600",
            hoverColor: "hover:bg-violet-700",
            available: true,
            features: [
              "Timeline semanal de recursos",
              "Detecção de conflitos de alocação",
              "Gestão de engagements",
              "Chargeability por worker",
            ],
          },
        ]
      : []),
    ...(isModuleVisible("engagements")
      ? [
          {
            id: "engagements",
            title: "Engagements",
            description: "Gestão de Projetos e Contratos",
            icon: Handshake,
            color: "bg-teal-600",
            hoverColor: "hover:bg-teal-700",
            available: true,
            features: [
              "Gestão de contratos",
              "Acompanhamento de projetos",
              "CRM de clientes",
              "Integração com faturação",
            ],
          },
        ]
      : []),
  ];

  const upcomingModules = [
    ...(!isModuleVisible("allocations")
      ? [
          {
            title: "Allocation",
            description: "Gestão de Alocação de Recursos",
            icon: Users,
            comingSoon: true,
          },
        ]
      : []),
    {
      title: "Leaves",
      description: "Gestão de Ausências",
      icon: Calendar,
      comingSoon: true,
    },
    ...(!isModuleVisible("engagements")
      ? [
          {
            title: "Engagements",
            description: "Gestão de Projetos e Contratos",
            icon: Users,
            comingSoon: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Sidebar Trigger */}
      <div className="px-4 sm:px-6 pt-2">
        <SidebarTrigger />
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 pb-8 w-full">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo ao AXEL, {currentUser?.name?.split(" ")[0]}!
          </h1>
          <p className="text-lg text-gray-600">
            Selecione um módulo para começar a trabalhar
          </p>
        </div>

        {/* Quick Actions */}
        {hasQuickActions && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Ações Rápidas
            </h2>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
              {/* Botão de acesso ao escritório (apenas quando no IP do escritório) */}
              {showDoorAccess && (
                <div className="w-full sm:w-auto">
                  <DoorUnlockButton
                    buttonText="Aceder ao Escritório"
                    compact={true}
                  />
                </div>
              )}
              {/* Botão só para não-admins e fora do modo aprovação */}
              {!isApprovalMode && currentUser.role !== "ADMIN" && (
                <Button
                  onClick={() => {
                    onModuleChange("expenses");
                    onViewChange("submit");
                  }}
                  variant="yellow"
                  className="w-full sm:w-auto justify-center"
                >
                  <span className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Submeter Despesa
                  </span>
                </Button>
              )}
              {/* Botão só para approvers */}
              {!isApprovalMode && currentUser.role === "APPROVER" && (
                <Button
                  onClick={() => {
                    onApprovalModeChange?.(true);
                    onModuleChange("expenses");
                    onViewChange("invoices");
                  }}
                  variant="yellow"
                  className="w-full sm:w-auto justify-center"
                >
                  <span className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />
                    Aprovar Despesas
                  </span>
                </Button>
              )}
              {/* Botão só para admins */}
              {isViewVisible("expenses", "reconciliation") &&
                hasViewPermission("expenses", "reconciliation") && (
                  <Button
                    onClick={() => {
                      onModuleChange("expenses");
                      onViewChange("reconciliation");
                    }}
                    variant="yellow"
                    className="w-full sm:w-auto justify-center"
                  >
                    <span className="flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Reconciliação de Faturas
                    </span>
                  </Button>
                )}
            </div>
          </div>
        )}

        {/* Available Modules */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            Módulos Disponíveis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.id}
                  onClick={() => {
                    if (module.onClick) {
                      module.onClick();
                      return;
                    }
                    onModuleChange(module.id as any);
                  }}
                  className={`${module.color} ${module.hoverColor} p-6 rounded-xl text-white cursor-pointer transform transition-all duration-200 hover:scale-105 shadow-lg`}
                >
                  <div className="flex items-center mb-4">
                    <Icon className="h-8 w-8 mr-3" />
                    <div>
                      <h3 className="text-xl font-bold">{module.title}</h3>
                      <p className="text-white/80">{module.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {module.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-white/90"
                      >
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-2"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coming Soon */}
        {!isProduction() && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Em Breve
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upcomingModules.map((module, index) => {
                const Icon = module.icon;
                return (
                  <div
                    key={index}
                    className="bg-gray-100 p-6 rounded-xl border-2 border-dashed border-gray-300"
                  >
                    <div className="flex items-center mb-4">
                      <Icon className="h-8 w-8 mr-3 text-gray-400" />
                      <div>
                        <h3 className="text-xl font-bold text-gray-500">
                          {module.title}
                        </h3>
                        <p className="text-gray-400">{module.description}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Em Desenvolvimento
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
