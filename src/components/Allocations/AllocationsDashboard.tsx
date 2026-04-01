import React from "react";
import {
  Users,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  LayoutGrid,
  List,
  Briefcase,
  User,
  AlertCircle,
  CalendarDays,
  X,
  Edit3,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  GanttChart,
} from "lucide-react";
import { useModuleVisibility } from "@/hooks/useModuleVisibility";
import { AccessDenied } from "../shared";
import { allocationService } from "@/services/allocationService";
import { engagementService } from "@/services/engagementService";
import type {
  Worker,
  Engagement,
  Allocation,
  AllocationCreate,
  AllocationStatus,
  AllocationType,
  AllocationStats,
  WorkerTimeline,
  EngagementSummary,
  CalendarDay,
  ResourceGroup,
} from "@/types";
import { RESOURCE_GROUP_CONFIG, getResourceGroup } from "@/types";

interface AllocationsDashboardProps {
  currentUser: any;
}

export const AllocationsDashboard: React.FC<AllocationsDashboardProps> = ({
  currentUser,
}) => {
  const { isModuleVisible } = useModuleVisibility(currentUser);

  // ─── State ───────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<
    "timeline" | "allocations" | "engagements" | "calendar"
  >("timeline");
  const [viewMode, setViewMode] = React.useState<"list" | "grid">("list");
  const [selectedWorkerId, setSelectedWorkerId] = React.useState("all");
  const [selectedEngagementId, setSelectedEngagementId] = React.useState("all");
  const [showConflicts, setShowConflicts] = React.useState(false);
  const [selectedConflict, setSelectedConflict] = React.useState<{
    allocation: Allocation;
    conflictingWith: Allocation[];
  } | null>(null);
  const [toast, setToast] = React.useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Data state
  const [workers, setWorkers] = React.useState<Worker[]>([]);
  const [engagements, setEngagements] = React.useState<Engagement[]>([]);
  const [allocations, setAllocations] = React.useState<Allocation[]>([]);
  // stats is now derived via useMemo (see below), not fetched

  // Timeline navigation
  const [timelineStart, setTimelineStart] = React.useState(() => {
    // Start at first Monday of the year
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const day = jan1.getDay();
    const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
    jan1.setDate(jan1.getDate() + diff);
    return jan1;
  });
  const [timelineWeeks, setTimelineWeeks] = React.useState(13); // ~1 quarter
  const [timelineGroupFilter, setTimelineGroupFilter] = React.useState<ResourceGroup | "all">("all");

  // Calendar navigation
  const [calendarDate, setCalendarDate] = React.useState(() => new Date());

  // Create form state
  const [newAllocation, setNewAllocation] = React.useState<Partial<AllocationCreate>>({
    type: "projeto",
    status: "planned",
    percent: 1.0,
  });

  // ─── Data Loading ────────────────────────────────────
  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [w, e, a] = await Promise.all([
        allocationService.getWorkers(),
        engagementService.getEngagements(),
        allocationService.getAllocations(),
      ]);
      setWorkers(w);
      setEngagements(e);
      setAllocations(a);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Derived Data ────────────────────────────────────
  const workerMap = React.useMemo(
    () => new Map(workers.map((w) => [w.id, w])),
    [workers]
  );

  const engagementMap = React.useMemo(
    () => new Map(engagements.map((e) => [e.id, e])),
    [engagements]
  );

  const conflictMap = React.useMemo(() => {
    const map = new Map<string, boolean>();
    const activeLike = new Set<AllocationStatus>(["active", "planned"]);

    allocations.forEach((allocation) => {
      if (!activeLike.has(allocation.status)) {
        map.set(allocation.id, false);
        return;
      }

      const hasConflict = allocations.some((other) => {
        if (other.id === allocation.id) return false;
        if (other.workerId !== allocation.workerId) return false;
        if (!activeLike.has(other.status)) return false;
        return (
          allocation.startDate <= other.endDate &&
          other.startDate <= allocation.endDate
        );
      });

      map.set(allocation.id, hasConflict);
    });

    return map;
  }, [allocations]);

  const filteredAllocations = React.useMemo(() => {
    return allocations.filter((allocation) => {
      if (selectedWorkerId !== "all" && allocation.workerId !== selectedWorkerId) return false;
      if (selectedEngagementId !== "all" && allocation.engagementId !== selectedEngagementId) return false;
      return true;
    });
  }, [allocations, selectedWorkerId, selectedEngagementId]);

  const conflictsList = React.useMemo(() => {
    const activeLike = new Set<AllocationStatus>(["active", "planned"]);
    const conflicts: Array<{ allocation: Allocation; conflictingWith: Allocation[] }> = [];
    const seen = new Set<string>();

    allocations.forEach((allocation) => {
      if (!activeLike.has(allocation.status)) return;
      if (seen.has(allocation.id)) return;

      const conflicting = allocations.filter((other) => {
        if (other.id === allocation.id) return false;
        if (other.workerId !== allocation.workerId) return false;
        if (!activeLike.has(other.status)) return false;
        return (
          allocation.startDate <= other.endDate &&
          other.startDate <= allocation.endDate
        );
      });

      if (conflicting.length > 0) {
        conflicts.push({ allocation, conflictingWith: conflicting });
        conflicting.forEach((c) => seen.add(c.id));
      }
    });

    return conflicts;
  }, [allocations]);

  // Timeline data
  const timelineDataAll = React.useMemo((): WorkerTimeline[] => {
    return allocationService.buildTimeline(
      workers,
      allocations,
      engagements,
      timelineStart,
      timelineWeeks
    );
  }, [workers, allocations, engagements, timelineStart, timelineWeeks]);

  // Filter timeline by resource group
  const timelineData = React.useMemo((): WorkerTimeline[] => {
    if (timelineGroupFilter === "all") return timelineDataAll;
    const allowedCategories = RESOURCE_GROUP_CONFIG[timelineGroupFilter].categories;
    return timelineDataAll.filter((wt) =>
      allowedCategories.includes(wt.worker.category)
    );
  }, [timelineDataAll, timelineGroupFilter]);

  // Group counts for filter badges
  const groupCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: timelineDataAll.length };
    for (const [group, config] of Object.entries(RESOURCE_GROUP_CONFIG)) {
      counts[group] = timelineDataAll.filter((wt) =>
        config.categories.includes(wt.worker.category)
      ).length;
    }
    return counts;
  }, [timelineDataAll]);

  // Stats — derived from filtered workers/allocations so they react to the group filter
  const stats = React.useMemo((): AllocationStats => {
    // Determine which worker IDs are in scope
    const filteredWorkerIds = new Set(
      timelineGroupFilter === "all"
        ? workers.map((w) => w.id)
        : workers
            .filter((w) => RESOURCE_GROUP_CONFIG[timelineGroupFilter].categories.includes(w.category))
            .map((w) => w.id)
    );

    const scopedAllocations = allocations.filter((a) => filteredWorkerIds.has(a.workerId));
    const activeLike = scopedAllocations.filter((a) => a.status !== "completed");
    const active = scopedAllocations.filter((a) => a.status === "active");

    // Conflicts: count allocations that overlap with another for the same worker
    let conflictCount = 0;
    const seen = new Set<string>();
    activeLike.forEach((a) => {
      if (seen.has(a.id)) return;
      const hasConflict = activeLike.some(
        (b) =>
          b.id !== a.id &&
          b.workerId === a.workerId &&
          a.startDate <= b.endDate &&
          b.startDate <= a.endDate
      );
      if (hasConflict) {
        conflictCount++;
        seen.add(a.id);
      }
    });

    // Upcoming ends in 14 days
    const now = new Date();
    const nowIso = now.toISOString().slice(0, 10);
    const in14 = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const upcomingEnd = activeLike.filter(
      (a) => a.endDate >= nowIso && a.endDate <= in14
    ).length;

    // Average chargeability of filtered workers
    const scopedWorkers = workers.filter((w) => filteredWorkerIds.has(w.id));
    const chargeabilities = scopedWorkers.map((w) => {
      const billable = scopedAllocations.filter(
        (a) => a.workerId === w.id && a.type === "projeto" && a.status !== "completed"
      );
      const total = billable.reduce((s, a) => s + a.percent, 0);
      return Math.min(total / w.capacityFte, 1);
    });
    const avgChargeability =
      chargeabilities.length > 0
        ? chargeabilities.reduce((s, c) => s + c, 0) / chargeabilities.length
        : 0;

    return {
      totalAllocations: scopedAllocations.length,
      activeAllocations: active.length,
      conflicts: Math.floor(conflictCount / 2),
      upcomingEnd,
      avgChargeability,
    };
  }, [workers, allocations, timelineGroupFilter]);

  // Engagement summaries
  const engagementSummaries = React.useMemo((): EngagementSummary[] => {
    return engagementService.buildSummaries(engagements, allocations);
  }, [engagements, allocations]);

  // Calendar data
  const calendarData = React.useMemo((): CalendarDay[] => {
    const workerId = selectedWorkerId === "all" ? workers[0]?.id : selectedWorkerId;
    if (!workerId) return [];
    return allocationService.buildCalendar(
      workerId,
      calendarDate.getFullYear(),
      calendarDate.getMonth(),
      allocations,
      engagements
    );
  }, [selectedWorkerId, workers, calendarDate, allocations, engagements]);

  // ─── Actions ─────────────────────────────────────────
  const showToast = React.useCallback(
    (message: string, type: "success" | "error" | "info") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 5000);
    },
    []
  );

  const handleCreateAllocation = React.useCallback(async () => {
    if (
      !newAllocation.workerId ||
      !newAllocation.startDate ||
      !newAllocation.endDate ||
      !newAllocation.percent ||
      !newAllocation.type ||
      !newAllocation.status
    ) {
      showToast("Preencha todos os campos obrigatórios", "error");
      return;
    }

    if (newAllocation.type === "projeto" && !newAllocation.engagementId) {
      showToast("Selecione um engagement para alocações de projeto", "error");
      return;
    }

    try {
      // Check conflicts first
      const conflicts = await allocationService.checkConflicts(
        newAllocation.workerId,
        newAllocation.startDate,
        newAllocation.endDate,
        newAllocation.percent
      );

      if (conflicts.hasConflicts) {
        const worker = workerMap.get(newAllocation.workerId);
        showToast(
          `Conflito: ${worker?.name} fica a ${Math.round(conflicts.maxTotalPercent * 100)}% FTE nesse período`,
          "error"
        );
        return;
      }

      await allocationService.createAllocation(newAllocation as AllocationCreate);
      showToast("Alocação criada com sucesso", "success");
      setShowCreateForm(false);
      setNewAllocation({ type: "projeto", status: "planned", percent: 1.0 });
      await loadData();
    } catch {
      showToast("Erro ao criar alocação", "error");
    }
  }, [newAllocation, workerMap, showToast, loadData]);

  const handleDeleteAllocation = React.useCallback(
    async (id: string) => {
      try {
        await allocationService.deleteAllocation(id);
        showToast("Alocação removida com sucesso", "success");
        await loadData();
      } catch {
        showToast("Erro ao remover alocação", "error");
      }
    },
    [showToast, loadData]
  );

  const handleResolveConflict = React.useCallback(
    async (action: "adjust" | "cancel" | "override") => {
      if (!selectedConflict) return;
      const labels = {
        adjust: "Ajustar datas",
        cancel: "Cancelar alocação",
        override: "Forçar sobreposição",
      };

      if (action === "cancel") {
        await allocationService.deleteAllocation(selectedConflict.allocation.id);
        await loadData();
        showToast(`Alocação cancelada com sucesso`, "success");
      } else {
        showToast(`Ação "${labels[action]}" executada com sucesso`, "success");
      }
      setSelectedConflict(null);
    },
    [selectedConflict, showToast, loadData]
  );

  // ─── Helpers ─────────────────────────────────────────
  const formatDate = (date: string) => new Date(date).toLocaleDateString("pt-PT");

  const getAllocationLabel = (allocation: Allocation) => {
    if (allocation.type === "ferias") return "Férias";
    if (allocation.type === "formacao") return "Formação";
    if (allocation.type === "interno") return "Interno";
    return engagementMap.get(allocation.engagementId ?? "")?.name ?? "Projeto";
  };

  const getAllocationTone = (type: AllocationType) => {
    switch (type) {
      case "ferias":
        return "bg-purple-100 text-purple-800";
      case "formacao":
        return "bg-sky-100 text-sky-800";
      case "interno":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "planned":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <TrendingUp className="h-4 w-4" />;
      case "planned":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "planned":
        return "Planeamento";
      case "completed":
        return "Concluído";
      default:
        return status;
    }
  };

  // ─── Calendar grid (must be before guards to satisfy Rules of Hooks) ───
  const calendarGrid = React.useMemo(() => {
    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();

    const cells: Array<number | null> = [];
    const adjustedStart = startWeekday === 0 ? 6 : startWeekday - 1;
    for (let i = 0; i < adjustedStart; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calendarDate]);

  const calendarWorkerId = selectedWorkerId === "all" ? workers[0]?.id : selectedWorkerId;

  // ─── Guard ───────────────────────────────────────────
  if (!isModuleVisible("allocations")) {
    return <AccessDenied />;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-500">A carregar alocações...</span>
        </div>
      </div>
    );
  }

  // ─── Timeline Month Headers ──────────────────────────
  const getTimelineMonthHeaders = () => {
    if (timelineDataAll.length === 0 || timelineDataAll[0].cells.length === 0) return [];
    const months: { label: string; span: number }[] = [];
    let currentMonth = "";
    let count = 0;

    timelineDataAll[0].cells.forEach((cell) => {
      const m = cell.week.month;
      if (m === currentMonth) {
        count++;
      } else {
        if (currentMonth) months.push({ label: currentMonth, span: count });
        currentMonth = m;
        count = 1;
      }
    });
    if (currentMonth) months.push({ label: currentMonth, span: count });
    return months;
  };

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xl font-bold text-gray-900">
            Bem-vindo, {currentUser?.name?.split(" ")[0]}
          </p>
          <p className="text-gray-600 mt-1">
            Gira a alocação de recursos e projectos da equipa
          </p>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Alocação
        </button>
      </div>

      {/* Stats Grid — reactive to resource group filter */}
      {timelineGroupFilter !== "all" && (
        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: RESOURCE_GROUP_CONFIG[timelineGroupFilter].color }}
          />
          A mostrar métricas para: <span className="font-semibold text-gray-700">{RESOURCE_GROUP_CONFIG[timelineGroupFilter].label}</span>
          <button
            onClick={() => setTimelineGroupFilter("all")}
            className="ml-1 text-blue-600 hover:text-blue-800 font-medium"
          >
            Limpar filtro
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Alocações
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalAllocations}
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
                  Ativas
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.activeAllocations}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conflitos
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.conflicts}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Finais em 14d
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.upcomingEnd}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <Clock className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chargeability
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {Math.round(stats.avgChargeability * 100)}%
                </p>
              </div>
              <div className="p-3 rounded-full bg-indigo-500">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            { key: "timeline", label: "Timeline", icon: GanttChart },
            { key: "allocations", label: "Alocações", icon: List },
            { key: "engagements", label: "Por Engagement", icon: Briefcase },
            { key: "calendar", label: "Calendário", icon: CalendarDays },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ TIMELINE TAB ═══════════ */}
      {activeTab === "timeline" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Timeline Controls */}
          <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const d = new Date(timelineStart);
                  d.setDate(d.getDate() - 7 * timelineWeeks);
                  setTimelineStart(d);
                }}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-gray-700 min-w-[200px] text-center">
                {timelineDataAll[0]?.cells[0]?.week.startDate
                  ? new Date(timelineDataAll[0].cells[0].week.startDate).toLocaleDateString("pt-PT", { month: "short", year: "numeric" })
                  : ""}{" "}
                —{" "}
                {timelineDataAll[0]?.cells[timelineDataAll[0].cells.length - 1]?.week.endDate
                  ? new Date(timelineDataAll[0].cells[timelineDataAll[0].cells.length - 1].week.endDate).toLocaleDateString("pt-PT", { month: "short", year: "numeric" })
                  : ""}
              </span>
              <button
                onClick={() => {
                  const d = new Date(timelineStart);
                  d.setDate(d.getDate() + 7 * timelineWeeks);
                  setTimelineStart(d);
                }}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Resource Group Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setTimelineGroupFilter("all")}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                  timelineGroupFilter === "all"
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Todos
                <span className="ml-1 opacity-60">{groupCounts.all}</span>
              </button>
              {(Object.entries(RESOURCE_GROUP_CONFIG) as [ResourceGroup, typeof RESOURCE_GROUP_CONFIG[ResourceGroup]][]).map(
                ([key, config]) =>
                  groupCounts[key] > 0 && (
                    <button
                      key={key}
                      onClick={() => setTimelineGroupFilter(key)}
                      className={`px-2.5 py-1 rounded-full font-medium transition-colors flex items-center gap-1.5 ${
                        timelineGroupFilter === key
                          ? "text-white"
                          : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                      }`}
                      style={
                        timelineGroupFilter === key
                          ? { backgroundColor: config.color }
                          : undefined
                      }
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={
                          timelineGroupFilter !== key
                            ? { backgroundColor: config.color }
                            : { backgroundColor: "rgba(255,255,255,0.6)" }
                        }
                      />
                      {config.label}
                      <span className="opacity-60">{groupCounts[key]}</span>
                    </button>
                  )
              )}
            </div>

            {/* Weeks Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Semanas:</span>
              {[8, 13, 17, 26].map((n) => (
                <button
                  key={n}
                  onClick={() => setTimelineWeeks(n)}
                  className={`px-2 py-1 rounded ${
                    timelineWeeks === n
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="px-4 py-2 border-b border-gray-100 flex flex-wrap items-center gap-3 text-xs">
            {engagements.filter((e) => e.status === "active").map((e) => (
              <div key={e.id} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: e.color }}
                />
                <span className="text-gray-600">
                  {e.code} - {e.name}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-gray-600">Fe - Férias</span>
            </div>
          </div>

          {/* Timeline Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Month headers */}
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 bg-gray-50 min-w-[200px] px-3 py-1 text-left border-b border-r border-gray-200" rowSpan={2}>
                    <span className="text-xs font-semibold text-gray-700">Colaborador</span>
                  </th>
                  <th className="sticky left-[200px] z-20 bg-gray-50 min-w-[50px] px-2 py-1 text-center border-b border-r border-gray-200" rowSpan={2}>
                    <span className="text-xs font-semibold text-gray-700">Cat.</span>
                  </th>
                  <th className="sticky left-[250px] z-20 bg-gray-50 min-w-[55px] px-2 py-1 text-center border-b border-r border-gray-200" rowSpan={2}>
                    <span className="text-xs font-semibold text-gray-700">Charg.</span>
                  </th>
                  {getTimelineMonthHeaders().map((mh, i) => (
                    <th
                      key={i}
                      colSpan={mh.span}
                      className="px-2 py-1.5 text-center border-b border-r border-gray-200 font-semibold text-gray-800 bg-blue-50"
                    >
                      {mh.label}
                    </th>
                  ))}
                </tr>
                {/* Week headers */}
                <tr className="bg-gray-50">
                  {timelineDataAll[0]?.cells.map((cell, i) => (
                    <th
                      key={i}
                      className="px-1 py-1 text-center border-b border-r border-gray-200 font-medium text-gray-600 min-w-[52px]"
                      title={`${cell.week.startDate} — ${cell.week.endDate}`}
                    >
                      {cell.week.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timelineData.map((wt, idx) => {
                  const currentGroup = getResourceGroup(wt.worker.category);
                  const prevGroup = idx > 0 ? getResourceGroup(timelineData[idx - 1].worker.category) : null;
                  const showGroupHeader = timelineGroupFilter === "all" && currentGroup !== prevGroup;
                  const groupConfig = RESOURCE_GROUP_CONFIG[currentGroup];
                  const totalCols = 3 + (timelineDataAll[0]?.cells.length ?? 0);

                  return (
                    <React.Fragment key={wt.worker.id}>
                      {showGroupHeader && (
                        <tr>
                          <td
                            colSpan={totalCols}
                            className="sticky left-0 z-10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b border-gray-200"
                            style={{ backgroundColor: `${groupConfig.color}10`, color: groupConfig.color }}
                          >
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: groupConfig.color }}
                              />
                              {groupConfig.label}
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-gray-50/50 group">
                    {/* Worker name */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 px-3 py-1.5 border-b border-r border-gray-200 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium text-gray-600">
                          {wt.worker.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </div>
                        <span className="text-xs font-medium text-gray-900 truncate max-w-[140px]">
                          {wt.worker.name}
                        </span>
                      </div>
                    </td>
                    {/* Category */}
                    <td className="sticky left-[200px] z-10 bg-white group-hover:bg-gray-50 px-2 py-1.5 border-b border-r border-gray-200 text-center">
                      <span className="text-[10px] font-mono font-medium text-gray-500">
                        {wt.worker.category}
                      </span>
                    </td>
                    {/* Chargeability */}
                    <td className="sticky left-[250px] z-10 bg-white group-hover:bg-gray-50 px-2 py-1.5 border-b border-r border-gray-200 text-center">
                      <span
                        className={`text-xs font-semibold ${
                          wt.chargeability >= 0.75
                            ? "text-green-700"
                            : wt.chargeability >= 0.4
                            ? "text-yellow-700"
                            : wt.chargeability > 0
                            ? "text-orange-600"
                            : "text-gray-400"
                        }`}
                      >
                        {Math.round(wt.chargeability * 100)}%
                      </span>
                    </td>
                    {/* Week cells */}
                    {wt.cells.map((cell, ci) => {
                      const isEmpty = cell.allocations.length === 0;
                      const isSingle = cell.allocations.length === 1;

                      return (
                        <td
                          key={ci}
                          className={`px-0.5 py-0.5 border-b border-r border-gray-200 text-center ${
                            cell.isOverallocated ? "ring-1 ring-inset ring-red-400" : ""
                          }`}
                          title={
                            isEmpty
                              ? "Sem alocação"
                              : cell.allocations
                                  .map(
                                    (a) =>
                                      `${a.engagementCode} (${Math.round(a.percent * 100)}%)`
                                  )
                                  .join(", ") +
                                ` — Total: ${Math.round(cell.totalPercent * 100)}%`
                          }
                        >
                          {isEmpty ? (
                            <div className="h-6" />
                          ) : isSingle ? (
                            <div
                              className="h-6 rounded-sm flex items-center justify-center text-[10px] font-bold text-white"
                              style={{ backgroundColor: cell.allocations[0].engagementColor }}
                            >
                              {cell.allocations[0].engagementCode}
                            </div>
                          ) : (
                            <div className="h-6 flex gap-px">
                              {cell.allocations.map((a, ai) => (
                                <div
                                  key={ai}
                                  className="flex-1 rounded-sm flex items-center justify-center text-[9px] font-bold text-white min-w-0"
                                  style={{ backgroundColor: a.engagementColor }}
                                >
                                  {a.engagementCode}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ ALLOCATIONS TAB ═══════════ */}
      {activeTab === "allocations" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <select
                value={selectedWorkerId}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1 text-sm"
              >
                <option value="all">Todos os Workers</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="w-4 h-4" />
              <select
                value={selectedEngagementId}
                onChange={(e) => setSelectedEngagementId(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1 text-sm"
              >
                <option value="all">Todos os Engagements</option>
                {engagements.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <button
                onClick={() => setViewMode("list")}
                className={`px-2 py-1 rounded-md border text-sm ${
                  viewMode === "list"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`px-2 py-1 rounded-md border text-sm ${
                  viewMode === "grid"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {conflictsList.length > 0 && (
              <button
                onClick={() => setShowConflicts(!showConflicts)}
                className="ml-auto px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors flex items-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {showConflicts ? "Ocultar" : "Ver"} Conflitos ({conflictsList.length})
              </button>
            )}
          </div>

          {/* Conflicts Panel */}
          {showConflicts && conflictsList.length > 0 && (
            <div className="bg-white border-2 border-red-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  Conflitos de Alocação ({conflictsList.length})
                </h3>
                <button
                  onClick={() => setShowConflicts(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                {conflictsList.map((conflict, idx) => {
                  const worker = workerMap.get(conflict.allocation.workerId);
                  const engagement = conflict.allocation.engagementId
                    ? engagementMap.get(conflict.allocation.engagementId)
                    : null;

                  return (
                    <div
                      key={`${conflict.allocation.id}-${idx}`}
                      className="border border-red-200 rounded-lg p-3 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedConflict(conflict)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900">
                              {worker?.name ?? "Colaborador"}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${getAllocationTone(
                                conflict.allocation.type
                              )}`}
                            >
                              {getAllocationLabel(conflict.allocation)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {formatDate(conflict.allocation.startDate)} -{" "}
                            {formatDate(conflict.allocation.endDate)}
                            {engagement && ` · ${engagement.name}`}
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Conflita com {conflict.conflictingWith.length} outra(s) alocação(ões)
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConflict(conflict);
                          }}
                          className="px-2 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Resolver
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Allocations List/Grid */}
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            }
          >
            {filteredAllocations.map((allocation) => {
              const worker = workerMap.get(allocation.workerId);
              const engagement = allocation.engagementId
                ? engagementMap.get(allocation.engagementId)
                : null;
              const hasConflict = conflictMap.get(allocation.id);

              return (
                <div
                  key={allocation.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {worker?.name ?? "Colaborador"}
                      </p>
                      <p className="text-xs text-gray-500">{worker?.role ?? ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          allocation.status
                        )}`}
                      >
                        {getStatusIcon(allocation.status)}
                        <span className="ml-1">{getStatusLabel(allocation.status)}</span>
                      </span>
                      <button
                        onClick={() => handleDeleteAllocation(allocation.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Remover alocação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getAllocationTone(
                        allocation.type
                      )}`}
                    >
                      {getAllocationLabel(allocation)}
                    </span>
                    {engagement && (
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: engagement.color }}
                        />
                        {engagement.client}
                      </span>
                    )}
                    {hasConflict && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        Conflito
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>
                      {formatDate(allocation.startDate)} - {formatDate(allocation.endDate)}
                    </span>
                    <span className="font-medium">
                      {Math.round(allocation.percent * 100)}% FTE
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════ ENGAGEMENTS TAB ═══════════ */}
      {activeTab === "engagements" && (
        <div className="space-y-4">
          {engagementSummaries.map(({ engagement, allocatedFte, workerCount }) => {
            const usagePct = Math.min(
              Math.round((allocatedFte / engagement.capacityFte) * 100),
              100
            );
            const isOver = allocatedFte > engagement.capacityFte;

            return (
              <div
                key={engagement.id}
                className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-10 rounded-full"
                      style={{ backgroundColor: engagement.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {engagement.name}
                        </p>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 text-gray-600">
                          {engagement.code}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{engagement.client}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        engagement.status
                      )}`}
                    >
                      {getStatusLabel(engagement.status)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(engagement.startDate)} — {formatDate(engagement.endDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">
                      Utilização: {allocatedFte.toFixed(1)} / {engagement.capacityFte.toFixed(1)} FTE
                    </span>
                    <span
                      className={`font-semibold ${
                        isOver ? "text-red-600" : "text-gray-700"
                      }`}
                    >
                      {usagePct}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isOver ? "bg-red-500" : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.min(usagePct, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {workerCount} recurso(s)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════ CALENDAR TAB ═══════════ */}
      {activeTab === "calendar" && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          {/* Calendar Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarDate(d);
                }}
                className="p-1.5 rounded-md hover:bg-gray-100"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="text-sm font-semibold text-gray-900 min-w-[150px] text-center">
                {calendarDate.toLocaleDateString("pt-PT", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarDate(d);
                }}
                className="p-1.5 rounded-md hover:bg-gray-100"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <CalendarDays className="w-4 h-4 text-gray-500" />
              <select
                value={calendarWorkerId ?? ""}
                onChange={(e) => setSelectedWorkerId(e.target.value)}
                className="border border-gray-200 rounded-md px-2 py-1 text-sm"
              >
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Legend */}
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded" />
              <span className="text-gray-600">{"≤"} 8h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
              <span className="text-gray-600">{">"} 8h (sobrealocado)</span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 text-xs text-gray-500 mb-2">
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label, idx) => (
              <div
                key={label}
                className={`text-center font-medium ${
                  idx >= 5 ? "text-gray-400" : ""
                }`}
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarGrid.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="h-20" />;

              const dayData = calendarData[day - 1];
              if (!dayData) return <div key={`day-${day}`} className="h-20" />;

              let bgColor = "bg-white";
              let borderColor = "border-gray-200";

              if (dayData.isWeekend) {
                bgColor = "bg-gray-50";
                borderColor = "border-gray-300";
              } else if (dayData.allocations.length > 0) {
                if (dayData.isOverallocated) {
                  bgColor = "bg-red-50";
                  borderColor = "border-red-300";
                } else {
                  bgColor = "bg-green-50";
                  borderColor = "border-green-300";
                }
              }

              return (
                <div
                  key={`day-${day}`}
                  className={`h-20 border ${borderColor} ${bgColor} rounded-md p-1 relative`}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className={`text-xs font-medium ${
                        dayData.isWeekend ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {day}
                    </div>
                    {dayData.allocations.length > 0 && !dayData.isWeekend && (
                      <div
                        className={`text-[10px] font-semibold px-1 rounded ${
                          dayData.isOverallocated
                            ? "bg-red-200 text-red-800"
                            : "bg-green-200 text-green-800"
                        }`}
                      >
                        {dayData.totalHours.toFixed(1)}h
                      </div>
                    )}
                  </div>
                  {!dayData.isWeekend && (
                    <div className="mt-1 space-y-0.5">
                      {dayData.allocations.slice(0, 2).map((alloc) => (
                        <div
                          key={alloc.id}
                          className="text-[9px] px-1 py-0.5 rounded text-white font-medium truncate"
                          style={{ backgroundColor: alloc.color }}
                          title={`${alloc.label} - ${(alloc.percent * 8).toFixed(1)}h`}
                        >
                          {alloc.label.length > 12
                            ? alloc.label.substring(0, 12) + "…"
                            : alloc.label}{" "}
                          ({(alloc.percent * 8).toFixed(1)}h)
                        </div>
                      ))}
                      {dayData.allocations.length > 2 && (
                        <div className="text-[9px] text-gray-500">
                          +{dayData.allocations.length - 2} mais
                        </div>
                      )}
                    </div>
                  )}
                  {dayData.isOverallocated && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Calendar Summary */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 mb-2">Resumo do Mês</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-gray-500">Dias úteis</p>
                <p className="font-semibold text-gray-900">
                  {calendarData.filter((d) => !d.isWeekend).length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Dias c/ alocação</p>
                <p className="font-semibold text-gray-900">
                  {calendarData.filter((d) => !d.isWeekend && d.allocations.length > 0).length}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Dias sobrealocados</p>
                <p className="font-semibold text-red-600">
                  {calendarData.filter((d) => !d.isWeekend && d.isOverallocated).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ CREATE FORM MODAL ═══════════ */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Nova Alocação</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Worker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colaborador *
                  </label>
                  <select
                    value={newAllocation.workerId ?? ""}
                    onChange={(e) =>
                      setNewAllocation({ ...newAllocation, workerId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Selecionar...</option>
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo *
                  </label>
                  <select
                    value={newAllocation.type ?? "projeto"}
                    onChange={(e) =>
                      setNewAllocation({
                        ...newAllocation,
                        type: e.target.value as AllocationType,
                        engagementId: e.target.value !== "projeto" ? undefined : newAllocation.engagementId,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="projeto">Projeto</option>
                    <option value="ferias">Férias</option>
                    <option value="formacao">Formação</option>
                    <option value="interno">Interno</option>
                  </select>
                </div>

                {/* Engagement (only for projeto) */}
                {newAllocation.type === "projeto" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engagement *
                    </label>
                    <select
                      value={newAllocation.engagementId ?? ""}
                      onChange={(e) =>
                        setNewAllocation({ ...newAllocation, engagementId: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Selecionar...</option>
                      {engagements
                        .filter((e) => e.status !== "completed")
                        .map((eng) => (
                          <option key={eng.id} value={eng.id}>
                            [{eng.code}] {eng.name} — {eng.client}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Início *
                    </label>
                    <input
                      type="date"
                      value={newAllocation.startDate ?? ""}
                      onChange={(e) =>
                        setNewAllocation({ ...newAllocation, startDate: e.target.value })
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
                      value={newAllocation.endDate ?? ""}
                      onChange={(e) =>
                        setNewAllocation({ ...newAllocation, endDate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {/* Percent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    % FTE *
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={Math.round((newAllocation.percent ?? 1) * 100)}
                      onChange={(e) =>
                        setNewAllocation({
                          ...newAllocation,
                          percent: parseInt(e.target.value) / 100,
                        })
                      }
                      className="flex-1"
                    />
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {Math.round((newAllocation.percent ?? 1) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={newAllocation.status ?? "planned"}
                    onChange={(e) =>
                      setNewAllocation({
                        ...newAllocation,
                        status: e.target.value as AllocationStatus,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="planned">Planeado</option>
                    <option value="active">Ativo</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas
                  </label>
                  <textarea
                    value={newAllocation.notes ?? ""}
                    onChange={(e) =>
                      setNewAllocation({ ...newAllocation, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Notas opcionais..."
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
                  onClick={handleCreateAllocation}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Criar Alocação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ CONFLICT RESOLUTION MODAL ═══════════ */}
      {selectedConflict && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Resolver Conflito de Alocação
                </h2>
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Main Allocation */}
                <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                  <p className="text-xs font-medium text-red-700 mb-2">
                    ALOCAÇÃO PRINCIPAL
                  </p>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {workerMap.get(selectedConflict.allocation.workerId)?.name ??
                          "Colaborador"}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {getAllocationLabel(selectedConflict.allocation)}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {formatDate(selectedConflict.allocation.startDate)} -{" "}
                        {formatDate(selectedConflict.allocation.endDate)}
                      </p>
                      <p className="text-xs text-gray-600">
                        {Math.round(selectedConflict.allocation.percent * 100)}% FTE
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        selectedConflict.allocation.status
                      )}`}
                    >
                      {getStatusLabel(selectedConflict.allocation.status)}
                    </span>
                  </div>
                </div>

                {/* Conflicting Allocations */}
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">
                    CONFLITA COM ({selectedConflict.conflictingWith.length})
                  </p>
                  <div className="space-y-2">
                    {selectedConflict.conflictingWith.map((conflicting) => {
                      const eng = conflicting.engagementId
                        ? engagementMap.get(conflicting.engagementId)
                        : null;
                      return (
                        <div
                          key={conflicting.id}
                          className="border border-gray-200 rounded-lg p-3 bg-gray-50"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {getAllocationLabel(conflicting)}
                              </p>
                              {eng && (
                                <p className="text-xs text-gray-500">{eng.name}</p>
                              )}
                              <p className="text-xs text-gray-600 mt-1">
                                {formatDate(conflicting.startDate)} -{" "}
                                {formatDate(conflicting.endDate)}
                              </p>
                              <p className="text-xs text-gray-600">
                                {Math.round(conflicting.percent * 100)}% FTE
                              </p>
                            </div>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                conflicting.status
                              )}`}
                            >
                              {getStatusLabel(conflicting.status)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Resolution Actions */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-900 mb-3">
                    Ações de Resolução
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleResolveConflict("adjust")}
                      className="w-full flex items-center gap-3 p-3 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-left"
                    >
                      <Edit3 className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Ajustar Datas</p>
                        <p className="text-xs text-gray-600">
                          Modificar o período de uma das alocações para eliminar sobreposição
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleResolveConflict("cancel")}
                      className="w-full flex items-center gap-3 p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-left"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Cancelar Alocação
                        </p>
                        <p className="text-xs text-gray-600">
                          Remover uma das alocações conflitantes
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleResolveConflict("override")}
                      className="w-full flex items-center gap-3 p-3 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors text-left"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Forçar Sobreposição
                        </p>
                        <p className="text-xs text-gray-600">
                          Manter ambas as alocações mesmo com conflito (requer aprovação)
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedConflict(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ TOAST ═══════════ */}
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
          {toast.type === "info" && <AlertCircle className="w-5 h-5" />}
          <p className="text-sm font-medium">{toast.message}</p>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
