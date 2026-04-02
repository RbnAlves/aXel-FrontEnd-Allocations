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
  ChevronDown,
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
  type TimelinePeriod = "week" | "month" | "trimester";
  const { isModuleVisible } = useModuleVisibility(currentUser);

  // ─── State ───────────────────────────────────────────
  const [activeTab, setActiveTab] = React.useState<
    "timeline" | "allocations" | "engagements" | "calendar" | "conflicts"
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
    // Start exactly at January 1st of the current year
    const now = new Date();
    return new Date(now.getFullYear(), 0, 1);
  });
  const [timelinePeriod, setTimelinePeriod] = React.useState<TimelinePeriod>("month");
  const [timelineWeeks, setTimelineWeeks] = React.useState(4); // 1 month
  const [quickAddWorkerId, setQuickAddWorkerId] = React.useState<string | null>(null);
  const [selectedTimelineWeeks, setSelectedTimelineWeeks] = React.useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = React.useState<Set<ResourceGroup>>(new Set());
  const [selectedWorkerIds, setSelectedWorkerIds] = React.useState<Set<string>>(new Set());
  const [selectedEngagementIds, setSelectedEngagementIds] = React.useState<Set<string>>(new Set());
  const [filterDropdownOpen, setFilterDropdownOpen] = React.useState<"group" | "worker" | "engagement" | null>(null);
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<ResourceGroup, boolean>>({
    leadership: false,
    management: false,
    senior: false,
    consultant: false,
    external: false,
  });

  // Calendar navigation
  const [calendarDate, setCalendarDate] = React.useState(() => new Date());

  // Create/Edit form state
  const [editingAllocationId, setEditingAllocationId] = React.useState<string | null>(null);
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

  const hasAnyFilter = selectedGroups.size > 0 || selectedWorkerIds.size > 0 || selectedEngagementIds.size > 0;

  const timelineFilteredWorkerIds = React.useMemo(() => {
    // No filters active → show all
    if (!hasAnyFilter) {
      return new Set(workers.map((w) => w.id));
    }

    const result = new Set<string>();

    // Group filter: add all workers in selected groups
    if (selectedGroups.size > 0) {
      workers.forEach((w) => {
        for (const group of selectedGroups) {
          if (RESOURCE_GROUP_CONFIG[group].categories.includes(w.category)) {
            result.add(w.id);
            break;
          }
        }
      });
    }

    // Worker filter: add explicitly selected workers
    selectedWorkerIds.forEach((id) => result.add(id));

    // Engagement filter: add workers with allocations on selected engagements
    if (selectedEngagementIds.size > 0) {
      allocations.forEach((a) => {
        if (
          a.engagementId &&
          selectedEngagementIds.has(a.engagementId) &&
          a.status !== "completed"
        ) {
          result.add(a.workerId);
        }
      });
    }

    return result;
  }, [hasAnyFilter, selectedGroups, selectedWorkerIds, selectedEngagementIds, workers, allocations]);

  // Filter timeline by aggregated filter selection
  const timelineData = React.useMemo((): WorkerTimeline[] => {
    return timelineDataAll.filter((wt) => timelineFilteredWorkerIds.has(wt.worker.id));
  }, [timelineDataAll, timelineFilteredWorkerIds]);

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

  const toggleGroupCollapse = React.useCallback((group: ResourceGroup) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  }, []);

  // Stats — derived from filtered workers/allocations so they react to the selected filter
  const stats = React.useMemo((): AllocationStats => {
    const scopedAllocations = allocations.filter((a) =>
      timelineFilteredWorkerIds.has(a.workerId)
    );
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
    const scopedWorkers = workers.filter((w) => timelineFilteredWorkerIds.has(w.id));
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
  }, [allocations, workers, timelineFilteredWorkerIds]);

  const activeFilterTags = React.useMemo(() => {
    const tags: string[] = [];
    selectedGroups.forEach((g) => tags.push(RESOURCE_GROUP_CONFIG[g].label));
    selectedWorkerIds.forEach((id) => {
      const w = workers.find((w) => w.id === id);
      if (w) tags.push(w.name);
    });
    selectedEngagementIds.forEach((id) => {
      const e = engagements.find((e) => e.id === id);
      if (e) tags.push(e.name);
    });
    return tags;
  }, [selectedGroups, selectedWorkerIds, selectedEngagementIds, workers, engagements]);

  const clearAllFilters = React.useCallback(() => {
    setSelectedGroups(new Set());
    setSelectedWorkerIds(new Set());
    setSelectedEngagementIds(new Set());
    setFilterDropdownOpen(null);
  }, []);

  const handleTimelinePeriodChange = React.useCallback(
    (period: TimelinePeriod) => {
      const d = new Date(timelineStart);
      setTimelinePeriod(period);

      if (period === "week") {
        setTimelineWeeks(1);
        return;
      }

      if (period === "month") {
        d.setDate(1);
        setTimelineStart(d);
        setTimelineWeeks(4);
        return;
      }

      d.setDate(1);
      d.setMonth(Math.floor(d.getMonth() / 3) * 3);
      setTimelineStart(d);
      setTimelineWeeks(13);
    },
    [timelineStart]
  );

  const shiftTimeline = React.useCallback(
    (direction: -1 | 1) => {
      const d = new Date(timelineStart);

      if (timelinePeriod === "week") {
        d.setDate(d.getDate() + direction * 7);
        setTimelineStart(d);
        return;
      }

      if (timelinePeriod === "month") {
        d.setDate(1);
        d.setMonth(d.getMonth() + direction);
        setTimelineStart(d);
        return;
      }

      d.setDate(1);
      d.setMonth(Math.floor(d.getMonth() / 3) * 3 + direction * 3);
      setTimelineStart(d);
    },
    [timelineStart, timelinePeriod]
  );

  const toggleTimelineWeekSelection = React.useCallback(
    (workerId: string, weekStart: string, weekEnd: string) => {
      const key = `${weekStart}|${weekEnd}`;
      setSelectedTimelineWeeks((prev) => {
        // Selecting a different worker resets the current selection set.
        if (quickAddWorkerId && quickAddWorkerId !== workerId) {
          setQuickAddWorkerId(workerId);
          return new Set([key]);
        }

        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
          if (next.size === 0) {
            setQuickAddWorkerId(null);
          }
        } else {
          next.add(key);
          setQuickAddWorkerId(workerId);
        }
        return next;
      });
    },
    [quickAddWorkerId]
  );

  const selectedTimelineInterval = React.useMemo(() => {
    if (!quickAddWorkerId || selectedTimelineWeeks.size === 0) {
      return null;
    }

    const parsed = [...selectedTimelineWeeks]
      .map((value) => {
        const [startDate, endDate] = value.split("|");
        return { startDate, endDate };
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate));

    return {
      workerId: quickAddWorkerId,
      startDate: parsed[0].startDate,
      endDate: parsed[parsed.length - 1].endDate,
      weeksCount: parsed.length,
    };
  }, [quickAddWorkerId, selectedTimelineWeeks]);

  const clearTimelineSelection = React.useCallback(() => {
    setQuickAddWorkerId(null);
    setSelectedTimelineWeeks(new Set());
  }, []);

  const handleQuickAddFromSelection = React.useCallback(() => {
    if (!selectedTimelineInterval) return;

    setNewAllocation((prev) => ({
      ...prev,
      workerId: selectedTimelineInterval.workerId,
      startDate: selectedTimelineInterval.startDate,
      endDate: selectedTimelineInterval.endDate,
    }));

    setShowCreateForm(true);
  }, [selectedTimelineInterval]);

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
      clearTimelineSelection();
      await loadData();
    } catch {
      showToast("Erro ao criar alocação", "error");
    }
  }, [newAllocation, workerMap, showToast, loadData, clearTimelineSelection]);

  const handleEditAllocation = React.useCallback(async () => {
    if (!editingAllocationId) return;

    if (
      !newAllocation.startDate ||
      !newAllocation.endDate ||
      !newAllocation.percent ||
      !newAllocation.status
    ) {
      showToast("Preencha todos os campos obrigatórios", "error");
      return;
    }

    try {
      // Check conflicts excluding the allocation being edited
      const conflicts = await allocationService.checkConflicts(
        newAllocation.workerId!,
        newAllocation.startDate,
        newAllocation.endDate,
        newAllocation.percent,
        editingAllocationId
      );

      if (conflicts.hasConflicts) {
        const worker = workerMap.get(newAllocation.workerId!);
        showToast(
          `Conflito: ${worker?.name} fica a ${Math.round(conflicts.maxTotalPercent * 100)}% FTE nesse período`,
          "error"
        );
        return;
      }

      await allocationService.updateAllocation(editingAllocationId, {
        startDate: newAllocation.startDate,
        endDate: newAllocation.endDate,
        percent: newAllocation.percent,
        status: newAllocation.status,
        notes: newAllocation.notes,
      });
      showToast("Alocação atualizada com sucesso", "success");
      setShowCreateForm(false);
      setEditingAllocationId(null);
      setNewAllocation({ type: "projeto", status: "planned", percent: 1.0 });
      await loadData();
    } catch {
      showToast("Erro ao atualizar alocação", "error");
    }
  }, [editingAllocationId, newAllocation, workerMap, showToast, loadData]);

  const openEditModal = React.useCallback(
    (allocation: Allocation) => {
      setEditingAllocationId(allocation.id);
      setNewAllocation({
        workerId: allocation.workerId,
        type: allocation.type,
        engagementId: allocation.engagementId,
        startDate: allocation.startDate,
        endDate: allocation.endDate,
        percent: allocation.percent,
        status: allocation.status,
        notes: allocation.notes,
      });
      setShowCreateForm(true);
    },
    []
  );

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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500"></div>
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
          className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova Alocação
        </button>
      </div>

      {/* Stats Grid — reactive to selected timeline filter */}
      {hasAnyFilter && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="text-gray-600 font-medium">Filtros ativos:</span>
          {activeFilterTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="ml-1 text-yellow-600 hover:text-yellow-800 font-medium"
          >
            Limpar filtros
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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

          <div
            onClick={() => setActiveTab("conflicts")}
            className="p-5 rounded-lg border border-red-300 bg-red-50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">
                  Alerta de Conflitos
                </p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  {stats.conflicts}
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Existem alocações com sobreposição acima da capacidade.
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <AlertTriangle className="w-5 h-5 text-white" />
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
            { key: "conflicts", label: "Gestão de Conflitos", icon: AlertTriangle },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? "bg-yellow-500 text-white border-yellow-500"
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
        <div className="flex gap-4">
          {/* Legend - Left sidebar */}
          <div className="flex-shrink-0 w-[160px] bg-white rounded-lg shadow-sm border border-gray-200 p-3 self-start">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Engagements</p>
            <div className="space-y-1.5">
              {engagements.filter((e) => e.status === "active").map((e) => (
                <div key={e.id} className="flex items-center gap-1.5">
                  <div
                    className="w-3 h-3 rounded-sm flex-shrink-0"
                    style={{ backgroundColor: e.color }}
                  />
                  <span className="text-[11px] text-gray-600 leading-tight">
                    {e.code} - {e.name}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-100 pt-1.5 mt-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-red-500 flex-shrink-0" />
                  <span className="text-[11px] text-gray-600">Fe - Férias</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-3 h-3 rounded-sm bg-cyan-500 flex-shrink-0" />
                  <span className="text-[11px] text-gray-600">Fo - Formação</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-3 h-3 rounded-sm bg-gray-400 flex-shrink-0" />
                  <span className="text-[11px] text-gray-600">Int - Interno</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline content */}
          <div className="flex-1 min-w-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Timeline Controls */}
          <div className="px-4 py-3 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 bg-gray-50">
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => shiftTimeline(-1)}
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
                onClick={() => shiftTimeline(1)}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Multi-select Filters */}
            <div className="flex items-center gap-2 text-xs relative">
              <span className="text-gray-500">Filtros:</span>

              {/* Groups dropdown */}
              <div className="relative">
                <button
                  onClick={() => setFilterDropdownOpen(filterDropdownOpen === "group" ? null : "group")}
                  className={`px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 ${
                    selectedGroups.size > 0
                      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Grupos
                  {selectedGroups.size > 0 && (
                    <span className="ml-0.5 bg-yellow-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {selectedGroups.size}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {filterDropdownOpen === "group" && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-30 min-w-[180px] py-1">
                    {(Object.entries(RESOURCE_GROUP_CONFIG) as [ResourceGroup, typeof RESOURCE_GROUP_CONFIG[ResourceGroup]][]).map(
                      ([key, config]) => (
                        <label
                          key={key}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroups.has(key)}
                            onChange={() => {
                              setSelectedGroups((prev) => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key);
                                else next.add(key);
                                return next;
                              });
                            }}
                            className="rounded border-gray-300 text-yellow-500"
                          />
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: config.color }}
                          />
                          <span className="text-xs text-gray-700">{config.label}</span>
                          <span className="text-xs text-gray-400 ml-auto">{groupCounts[key] ?? 0}</span>
                        </label>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Workers dropdown */}
              <div className="relative">
                <button
                  onClick={() => setFilterDropdownOpen(filterDropdownOpen === "worker" ? null : "worker")}
                  className={`px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 ${
                    selectedWorkerIds.size > 0
                      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Colaborador
                  {selectedWorkerIds.size > 0 && (
                    <span className="ml-0.5 bg-yellow-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {selectedWorkerIds.size}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {filterDropdownOpen === "worker" && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-30 min-w-[220px] py-1 max-h-[300px] overflow-y-auto">
                    {workers.map((w) => (
                      <label
                        key={w.id}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkerIds.has(w.id)}
                          onChange={() => {
                            setSelectedWorkerIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(w.id)) next.delete(w.id);
                              else next.add(w.id);
                              return next;
                            });
                          }}
                          className="rounded border-gray-300 text-yellow-500"
                        />
                        <span className="text-xs text-gray-700">{w.name}</span>
                        <span className="text-[10px] text-gray-400 ml-auto font-mono">{w.category}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Engagements dropdown */}
              <div className="relative">
                <button
                  onClick={() => setFilterDropdownOpen(filterDropdownOpen === "engagement" ? null : "engagement")}
                  className={`px-2.5 py-1 rounded-md border transition-colors flex items-center gap-1 ${
                    selectedEngagementIds.size > 0
                      ? "bg-yellow-50 border-yellow-300 text-yellow-700"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Engagement
                  {selectedEngagementIds.size > 0 && (
                    <span className="ml-0.5 bg-yellow-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                      {selectedEngagementIds.size}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {filterDropdownOpen === "engagement" && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-30 min-w-[250px] py-1 max-h-[300px] overflow-y-auto">
                    {engagements.map((eng) => (
                      <label
                        key={eng.id}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEngagementIds.has(eng.id)}
                          onChange={() => {
                            setSelectedEngagementIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(eng.id)) next.delete(eng.id);
                              else next.add(eng.id);
                              return next;
                            });
                          }}
                          className="rounded border-gray-300 text-yellow-500"
                        />
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: eng.color }}
                        />
                        <span className="text-xs text-gray-700 truncate">{eng.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {hasAnyFilter && (
                <button
                  onClick={clearAllFilters}
                  className="px-2 py-1 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                  title="Limpar todos os filtros"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">Período:</span>
              {([
                { label: "Semana", period: "week", weeks: 1 },
                { label: "Mês", period: "month", weeks: 4 },
                { label: "Trimestre", period: "trimester", weeks: 13 },
              ] as const).map(({ label, period }) => (
                <button
                  key={period}
                  onClick={() => handleTimelinePeriodChange(period)}
                  className={`px-2 py-1 rounded ${
                    timelinePeriod === period
                      ? "bg-yellow-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {selectedTimelineInterval && (
            <div className="px-4 py-2 border-b border-yellow-100 bg-yellow-50 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-yellow-800 font-medium">
                {selectedTimelineInterval.weeksCount} semana(s) selecionada(s)
              </span>
              <span className="text-yellow-700">
                {workerMap.get(selectedTimelineInterval.workerId)?.name ?? "Colaborador"}
              </span>
              <span className="text-yellow-700">
                {formatDate(selectedTimelineInterval.startDate)} - {formatDate(selectedTimelineInterval.endDate)}
              </span>
              <button
                onClick={handleQuickAddFromSelection}
                className="ml-auto px-2.5 py-1 rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
              >
                Nova alocação nas semanas selecionadas
              </button>
              <button
                onClick={clearTimelineSelection}
                className="px-2 py-1 rounded-md text-yellow-700 hover:bg-yellow-100 transition-colors"
              >
                Limpar seleção
              </button>
            </div>
          )}

          {/* Timeline Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Month headers */}
                <tr className="bg-gray-50">
                  <th className="sticky left-0 z-20 bg-gray-50 w-[200px] min-w-[200px] max-w-[200px] px-3 py-1 text-left border-b border-r border-gray-200" rowSpan={2}>
                    <span className="text-xs font-semibold text-gray-700">Colaborador</span>
                  </th>
                  <th className="sticky left-[200px] z-20 bg-gray-50 w-[50px] min-w-[50px] max-w-[50px] px-2 py-1 text-center border-b border-r border-gray-200" rowSpan={2}>
                    <span className="text-xs font-semibold text-gray-700">Cat.</span>
                  </th>
                  <th className="sticky left-[250px] z-20 bg-gray-50 w-[55px] min-w-[55px] max-w-[55px] px-2 py-1 text-center border-b border-r border-gray-200" rowSpan={2}>
                    <span className="text-xs font-semibold text-gray-700">Charg.</span>
                  </th>
                  {getTimelineMonthHeaders().map((mh, i) => (
                    <th
                      key={i}
                      colSpan={mh.span}
                      className="px-2 py-1.5 text-center border-b border-r border-gray-200 font-semibold text-gray-800 bg-yellow-50"
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
                  const shouldShowGroupSections =
                    !hasAnyFilter || selectedGroups.size > 0;
                  const showGroupHeader = shouldShowGroupSections && currentGroup !== prevGroup;
                  const isGroupCollapsed = shouldShowGroupSections && collapsedGroups[currentGroup];
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
                            <button
                              type="button"
                              onClick={() => toggleGroupCollapse(currentGroup)}
                              className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                              title={isGroupCollapsed ? "Expandir secção" : "Colapsar secção"}
                            >
                              {isGroupCollapsed ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: groupConfig.color }}
                              />
                              {groupConfig.label}
                            </button>
                          </td>
                        </tr>
                      )}
                      {!isGroupCollapsed && (
                      <tr className="hover:bg-gray-50/50 group">
                    {/* Worker name */}
                    <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50 w-[200px] min-w-[200px] max-w-[200px] px-3 py-1.5 border-b border-r border-gray-200 whitespace-nowrap">
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
                    <td className="sticky left-[200px] z-10 bg-white group-hover:bg-gray-50 w-[50px] min-w-[50px] max-w-[50px] px-2 py-1.5 border-b border-r border-gray-200 text-center">
                      <span className="text-[10px] font-mono font-medium text-gray-500">
                        {wt.worker.category}
                      </span>
                    </td>
                    {/* Chargeability */}
                    <td className="sticky left-[250px] z-10 bg-white group-hover:bg-gray-50 w-[55px] min-w-[55px] max-w-[55px] px-2 py-1.5 border-b border-r border-gray-200 text-center">
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
                      const weekKey = `${cell.week.startDate}|${cell.week.endDate}`;
                      const isSelected =
                        quickAddWorkerId === wt.worker.id &&
                        selectedTimelineWeeks.has(weekKey);

                      return (
                        <td
                          key={ci}
                          onClick={() =>
                            toggleTimelineWeekSelection(
                              wt.worker.id,
                              cell.week.startDate,
                              cell.week.endDate
                            )
                          }
                          className={`px-0.5 py-0.5 border-b border-r border-gray-200 text-center cursor-pointer transition-colors ${
                            cell.isOverallocated ? "ring-1 ring-inset ring-red-400" : ""
                          } ${isSelected ? "ring-2 ring-inset ring-yellow-500 bg-yellow-50" : "hover:bg-yellow-50/60"}`}
                          title={
                            (isEmpty
                              ? "Sem alocação"
                              : cell.allocations
                                  .map(
                                    (a) =>
                                      `${a.engagementCode} (${Math.round(a.percent * 100)}%)`
                                  )
                                  .join(", ") +
                                ` — Total: ${Math.round(cell.totalPercent * 100)}%`) +
                            " · Clique para selecionar semana"
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
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                        onClick={() => openEditModal(allocation)}
                        className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
                        title="Editar alocação"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
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
                        isOver ? "bg-red-500" : "bg-yellow-500"
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

      {/* ═══════════ CONFLICTS TAB ═══════════ */}
      {activeTab === "conflicts" && (
        <div className="space-y-6">
          {conflictsList.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-900">Sem conflitos</p>
              <p className="text-sm text-gray-500 mt-1">
                Não existem alocações com sobreposição acima da capacidade.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-red-100">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {conflictsList.length} conflito(s) detetado(s)
                    </p>
                    <p className="text-xs text-gray-500">
                      Reveja e resolva as sobreposições de alocação abaixo.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {conflictsList.map((conflict, idx) => {
                  const worker = workerMap.get(conflict.allocation.workerId);
                  const engagement = conflict.allocation.engagementId
                    ? engagementMap.get(conflict.allocation.engagementId)
                    : null;

                  // Compute total overlap FTE
                  const totalFte =
                    conflict.allocation.percent +
                    conflict.conflictingWith.reduce((s, c) => s + c.percent, 0);

                  return (
                    <div
                      key={`conflict-${conflict.allocation.id}-${idx}`}
                      className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden"
                    >
                      {/* Worker header */}
                      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                            {worker?.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("") ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {worker?.name ?? "Colaborador"}
                            </p>
                            <p className="text-xs text-gray-500">{worker?.category} · {worker?.role}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            {Math.round(totalFte * 100)}% FTE total
                          </span>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            Cap. {Math.round((worker?.capacityFte ?? 1) * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Main allocation */}
                      <div className="px-5 py-3 border-b border-red-100 bg-red-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${getAllocationTone(
                                conflict.allocation.type
                              )}`}
                            >
                              {getAllocationLabel(conflict.allocation)}
                            </span>
                            {engagement && (
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: engagement.color }}
                                />
                                {engagement.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <span>
                              {formatDate(conflict.allocation.startDate)} - {formatDate(conflict.allocation.endDate)}
                            </span>
                            <span className="font-semibold">
                              {Math.round(conflict.allocation.percent * 100)}% FTE
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Conflicting allocations */}
                      <div className="px-5 py-3">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                          Conflita com ({conflict.conflictingWith.length})
                        </p>
                        <div className="space-y-2">
                          {conflict.conflictingWith.map((c) => {
                            const cEng = c.engagementId
                              ? engagementMap.get(c.engagementId)
                              : null;
                            return (
                              <div
                                key={c.id}
                                className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-md"
                              >
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${getAllocationTone(c.type)}`}
                                  >
                                    {getAllocationLabel(c)}
                                  </span>
                                  {cEng && (
                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                      <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: cEng.color }}
                                      />
                                      {cEng.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>
                                    {formatDate(c.startDate)} - {formatDate(c.endDate)}
                                  </span>
                                  <span className="font-semibold">
                                    {Math.round(c.percent * 100)}% FTE
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
                        <button
                          onClick={() => setSelectedConflict(conflict)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => handleDeleteAllocation(conflict.allocation.id)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Remover
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════ CREATE FORM MODAL ═══════════ */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingAllocationId ? "Editar Alocação" : "Nova Alocação"}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAllocationId(null);
                    setNewAllocation({ type: "projeto", status: "planned", percent: 1.0 });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Worker */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colaborador *
                  </label>
                  <select
                    value={newAllocation.workerId ?? ""}
                    onChange={(e) =>
                      setNewAllocation({ ...newAllocation, workerId: e.target.value })
                    }
                    disabled={!!editingAllocationId}
                    className={`w-full border rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${editingAllocationId ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed" : "border-gray-300"}`}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    disabled={!!editingAllocationId}
                    className={`w-full border rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${editingAllocationId ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed" : "border-gray-300"}`}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Engagement *
                    </label>
                    <select
                      value={newAllocation.engagementId ?? ""}
                      onChange={(e) =>
                        setNewAllocation({ ...newAllocation, engagementId: e.target.value })
                      }
                      disabled={!!editingAllocationId}
                      className={`w-full border rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500 ${editingAllocationId ? "border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed" : "border-gray-300"}`}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Início *
                    </label>
                    <input
                      type="date"
                      value={newAllocation.startDate ?? ""}
                      onChange={(e) =>
                        setNewAllocation({ ...newAllocation, startDate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Fim *
                    </label>
                    <input
                      type="date"
                      value={newAllocation.endDate ?? ""}
                      onChange={(e) =>
                        setNewAllocation({ ...newAllocation, endDate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* Percent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                  >
                    <option value="planned">Planeado</option>
                    <option value="active">Ativo</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notas
                  </label>
                  <textarea
                    value={newAllocation.notes ?? ""}
                    onChange={(e) =>
                      setNewAllocation({ ...newAllocation, notes: e.target.value })
                    }
                    rows={2}
                    className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder="Notas opcionais..."
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingAllocationId(null);
                    setNewAllocation({ type: "projeto", status: "planned", percent: 1.0 });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingAllocationId ? handleEditAllocation : handleCreateAllocation}
                  className="px-4 py-2 text-sm font-medium text-white bg-yellow-500 border border-transparent rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                >
                  {editingAllocationId ? "Guardar Alterações" : "Criar Alocação"}
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
                      className="w-full flex items-center gap-3 p-3 border border-yellow-200 rounded-lg hover:bg-yellow-50 transition-colors text-left"
                    >
                      <Edit3 className="w-4 h-4 text-yellow-600" />
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
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
              : "bg-yellow-500 text-white"
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
