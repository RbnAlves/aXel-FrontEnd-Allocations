import React from "react";
import {
  Briefcase,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
} from "lucide-react";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { AccessDenied } from "../shared";
import { engagementService } from "@/services/engagementService";
import { allocationService } from "@/services/allocationService";
import type {
  Engagement,
  EngagementCreate,
  EngagementStatus,
  EngagementSummary,
  Allocation,
  Worker,
} from "@/types";

interface EngagementsDashboardProps {
  currentUser: any;
}

export const EngagementsDashboard: React.FC<EngagementsDashboardProps> = ({
  currentUser,
}) => {
  const { isModuleVisible } = useModuleVisibility(currentUser);

  const [engagements, setEngagements] = React.useState<Engagement[]>([]);
  const [allocations, setAllocations] = React.useState<Allocation[]>([]);
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<EngagementStatus | "all">("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [toast, setToast] = React.useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [newEngagement, setNewEngagement] = React.useState<Partial<EngagementCreate>>({
    status: "planning",
    capacityFte: 1,
    color: "#3B82F6",
  });

  // Predefined engagement colors
  const colorOptions = [
    "#3B82F6", "#22C55E", "#EAB308", "#F97316", "#EC4899",
    "#8B5CF6", "#14B8A6", "#1E3A5F", "#EF4444", "#6366F1",
  ];

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [e, a, w] = await Promise.all([
        engagementService.getEngagements(),
        allocationService.getAllocations(),
        allocationService.getWorkers(),
      ]);
      setEngagements(e);
      setAllocations(a);
      setWorkers(w);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const workerMap = React.useMemo(
    () => new Map(workers.map((w) => [w.id, w])),
    [workers]
  );

  const summaries = React.useMemo((): EngagementSummary[] => {
    return engagementService.buildSummaries(engagements, allocations);
  }, [engagements, allocations]);

  const filteredSummaries = React.useMemo(() => {
    if (filterStatus === "all") return summaries;
    return summaries.filter((s) => s.engagement.status === filterStatus);
  }, [summaries, filterStatus]);

  const engagementStats = React.useMemo(() => {
    const active = engagements.filter((e) => e.status === "active").length;
    const planning = engagements.filter((e) => e.status === "planning").length;
    const totalCapacity = engagements.reduce((s, e) => s + e.capacityFte, 0);
    const totalAllocated = summaries.reduce((s, sm) => s + sm.allocatedFte, 0);
    return { active, planning, totalCapacity, totalAllocated };
  }, [engagements, summaries]);

  const showToast = React.useCallback(
    (message: string, type: "success" | "error" | "info") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 5000);
    },
    []
  );

  const handleCreate = React.useCallback(async () => {
    if (
      !newEngagement.name ||
      !newEngagement.code ||
      !newEngagement.client ||
      !newEngagement.startDate ||
      !newEngagement.endDate
    ) {
      showToast("Preencha todos os campos obrigatórios", "error");
      return;
    }
    try {
      await engagementService.createEngagement(newEngagement as EngagementCreate);
      showToast("Engagement criado com sucesso", "success");
      setShowCreateForm(false);
      setNewEngagement({ status: "planning", capacityFte: 1, color: "#3B82F6" });
      await loadData();
    } catch {
      showToast("Erro ao criar engagement", "error");
    }
  }, [newEngagement, showToast, loadData]);

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        await engagementService.deleteEngagement(id);
        showToast("Engagement removido com sucesso", "success");
        await loadData();
      } catch {
        showToast("Erro ao remover engagement", "error");
      }
    },
    [showToast, loadData]
  );

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("pt-PT");

  const getStatusConfig = (status: EngagementStatus) => {
    switch (status) {
      case "active":
        return { color: "bg-emerald-100 text-emerald-800", icon: TrendingUp, label: "Ativo" };
      case "planning":
        return { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Planeamento" };
      case "completed":
        return { color: "bg-slate-100 text-slate-600", icon: CheckCircle, label: "Concluído" };
    }
  };

  if (!isModuleVisible("engagements")) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">A carregar engagements...</span>
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
            Gerencie engagements e capacidade de equipa
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Engagement
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Engagements Ativos
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {engagementStats.active}
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-500">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Em Planeamento
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {engagementStats.planning}
              </p>
            </div>
            <div className="p-3 rounded-full bg-amber-500">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Capacidade Total
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {engagementStats.totalCapacity.toFixed(1)}
                <span className="text-sm font-normal text-gray-500 ml-1">FTE</span>
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500">
              <Users className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Alocado
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {engagementStats.totalAllocated.toFixed(1)}
                <span className="text-sm font-normal text-gray-500 ml-1">FTE</span>
              </p>
            </div>
            <div className="p-3 rounded-full bg-indigo-500">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(
          [
            { key: "all", label: "Todos" },
            { key: "active", label: "Ativos" },
            { key: "planning", label: "Planeamento" },
            { key: "completed", label: "Concluídos" },
          ] as const
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filterStatus === f.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Engagements List */}
      <div className="space-y-4">
        {filteredSummaries.map(({ engagement, allocatedFte, allocations: engAllocations, workerCount }) => {
          const statusConfig = getStatusConfig(engagement.status);
          const StatusIcon = statusConfig.icon;
          const usagePct = engagement.capacityFte > 0
            ? Math.min(Math.round((allocatedFte / engagement.capacityFte) * 100), 150)
            : 0;
          const isOver = allocatedFte > engagement.capacityFte;
          const isExpanded = expandedId === engagement.id;

          // Get unique workers allocated to this engagement
          const allocatedWorkerIds = [...new Set(engAllocations.map((a) => a.workerId))];

          return (
            <div
              key={engagement.id}
              className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden"
            >
              {/* Engagement Header */}
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className="w-1.5 h-14 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: engagement.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {engagement.name}
                        </h3>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-500 flex-shrink-0">
                          {engagement.code}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.color} flex-shrink-0`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{engagement.client}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(engagement.startDate)} — {formatDate(engagement.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {workerCount} recurso(s)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : engagement.id)}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Capacity Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-600">
                      Utilização: {allocatedFte.toFixed(1)} / {engagement.capacityFte.toFixed(1)} FTE
                    </span>
                    <span
                      className={`font-semibold ${
                        isOver ? "text-red-600" : usagePct >= 80 ? "text-amber-600" : "text-gray-700"
                      }`}
                    >
                      {usagePct}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver
                          ? "bg-red-500"
                          : usagePct >= 80
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(usagePct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Recursos Alocados
                    </p>
                    <button
                      onClick={() => handleDelete(engagement.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      Remover Engagement
                    </button>
                  </div>

                  {allocatedWorkerIds.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">
                      Sem recursos alocados a este engagement
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {allocatedWorkerIds.map((wId) => {
                        const worker = workerMap.get(wId);
                        const workerAllocs = engAllocations.filter(
                          (a) => a.workerId === wId
                        );
                        const totalPercent = workerAllocs.reduce(
                          (s, a) => s + a.percent,
                          0
                        );
                        return (
                          <div
                            key={wId}
                            className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-200"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                                {worker?.name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("") ?? "?"}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {worker?.name ?? "Desconhecido"}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {worker?.category} · {worker?.role}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                              {Math.round(totalPercent * 100)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {engagement.notes && (
                    <div className="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                      {engagement.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSummaries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">Nenhum engagement encontrado</p>
        </div>
      )}

      {/* Create Engagement Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Novo Engagement
                </h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={newEngagement.name ?? ""}
                    onChange={(e) =>
                      setNewEngagement({ ...newEngagement, name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Ex: BancAlpha - Core Banking"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código *
                    </label>
                    <input
                      type="text"
                      value={newEngagement.code ?? ""}
                      onChange={(e) =>
                        setNewEngagement({
                          ...newEngagement,
                          code: e.target.value.toUpperCase().slice(0, 3),
                        })
                      }
                      maxLength={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                      placeholder="BA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cliente *
                    </label>
                    <input
                      type="text"
                      value={newEngagement.client ?? ""}
                      onChange={(e) =>
                        setNewEngagement({ ...newEngagement, client: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Nome do cliente"
                    />
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cor
                  </label>
                  <div className="flex gap-2">
                    {colorOptions.map((c) => (
                      <button
                        key={c}
                        onClick={() =>
                          setNewEngagement({ ...newEngagement, color: c })
                        }
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          newEngagement.color === c
                            ? "border-gray-900 scale-110"
                            : "border-transparent hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Início *
                    </label>
                    <input
                      type="date"
                      value={newEngagement.startDate ?? ""}
                      onChange={(e) =>
                        setNewEngagement({ ...newEngagement, startDate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Fim *
                    </label>
                    <input
                      type="date"
                      value={newEngagement.endDate ?? ""}
                      onChange={(e) =>
                        setNewEngagement({ ...newEngagement, endDate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Capacidade (FTE) *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="20"
                      value={newEngagement.capacityFte ?? 1}
                      onChange={(e) =>
                        setNewEngagement({
                          ...newEngagement,
                          capacityFte: parseFloat(e.target.value) || 1,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={newEngagement.status ?? "planning"}
                      onChange={(e) =>
                        setNewEngagement({
                          ...newEngagement,
                          status: e.target.value as EngagementStatus,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="planning">Planeamento</option>
                      <option value="active">Ativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={newEngagement.notes ?? ""}
                    onChange={(e) =>
                      setNewEngagement({ ...newEngagement, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Observações opcionais..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Criar Engagement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : toast.type === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          {toast.type === "success" && <CheckCircle className="w-5 h-5" />}
          {toast.type === "error" && <AlertTriangle className="w-5 h-5" />}
          <p className="text-sm font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
