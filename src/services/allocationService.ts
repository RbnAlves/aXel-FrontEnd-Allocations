import type {
  Worker,
  Allocation,
  AllocationCreate,
  AllocationUpdate,
  AllocationStats,
  AllocationType,
  ConflictCheckResponse,
  ConflictDetail,
  CalendarDay,
  CalendarDayAllocation,
  TimelineWeek,
  TimelineCell,
  TimelineCellAllocation,
  WorkerTimeline,
  Engagement,
} from "../types";

// ─── Mock Workers (matching mote.consulting Excel) ───────

// Sorted by Resource Group: Leadership → Management → Senior → Consultant → External
const mockWorkers: Worker[] = [
  // Leadership (P, AP)
  { id: "w1",  name: "Cristina Rajão",   role: "Partner",             category: "P",   capacityFte: 1 },
  { id: "w6",  name: "André Guerreiro",  role: "Partner",             category: "P",   capacityFte: 1 },
  { id: "w2",  name: "Eloi Machado",     role: "Associate Partner",   category: "AP",  capacityFte: 1 },
  { id: "w7",  name: "Teresa Valente",   role: "Associate Partner",   category: "AP",  capacityFte: 1 },
  { id: "w10", name: "Rui Rodrigues",    role: "Associate Partner",   category: "AP",  capacityFte: 1 },
  { id: "w11", name: "Pedro Nunes",      role: "Associate Partner",   category: "AP",  capacityFte: 1 },
  // Management (SM1, M1, M2, AM)
  { id: "w14", name: "Tiago Soares",     role: "Senior Manager",      category: "SM1", capacityFte: 1 },
  { id: "w9",  name: "Ricardo Amaro",    role: "Manager",             category: "M1",  capacityFte: 1 },
  { id: "w16", name: "Mafalda Prazeres", role: "Manager",             category: "M1",  capacityFte: 1 },
  { id: "w15", name: "José Morais",      role: "Manager",             category: "M2",  capacityFte: 1 },
  { id: "w8",  name: "Inês Pina Ramos",  role: "Associate Manager",   category: "AM",  capacityFte: 1 },
  { id: "w12", name: "Gonçalo Barrias",  role: "Associate Manager",   category: "AM",  capacityFte: 1 },
  { id: "w13", name: "Ruben Alves",      role: "Associate Manager",   category: "AM",  capacityFte: 1 },
  { id: "w26", name: "Miguel Casaca",    role: "Associate Manager",   category: "AM",  capacityFte: 1 },
  // Senior (SC1, SC2)
  { id: "w17", name: "Nuno Almeida",     role: "Senior Consultant",   category: "SC1", capacityFte: 1 },
  { id: "w25", name: "João Coimbra",     role: "Senior Consultant",   category: "SC1", capacityFte: 1 },
  { id: "w3",  name: "Lurdes Cruz",      role: "Senior Consultant",   category: "SC2", capacityFte: 1 },
  // Consultant (C1, C2, A1)
  { id: "w5",  name: "Tomás Malaca",     role: "Consultant",          category: "C2",  capacityFte: 1 },
  { id: "w18", name: "João Franco",      role: "Consultant",          category: "C2",  capacityFte: 1 },
  { id: "w27", name: "José Correia",     role: "Consultant",          category: "C2",  capacityFte: 2 },
  // External
  { id: "w20", name: "Paulo Falcão",     role: "External Consultant", category: "Ext", capacityFte: 1 },
];

// ─── Mock Allocations ────────────────────────────────────
// Based on the Excel: workers allocated to engagements across Jan-Mar 2026

let mockAllocations: Allocation[] = [
  // Cristina Rajão (w1) - 33% chargeability
  { id: "a1",  workerId: "w1",  engagementId: "e3", startDate: "2026-01-19", endDate: "2026-02-13", percent: 0.4, type: "projeto", status: "active" },
  { id: "a2",  workerId: "w1",  engagementId: "e1", startDate: "2026-02-09", endDate: "2026-02-20", percent: 0.3, type: "projeto", status: "active" },
  { id: "a3",  workerId: "w1",  startDate: "2026-03-02", endDate: "2026-03-06", percent: 1.0, type: "ferias", status: "planned" },

  // Eloi Machado (w2) - 93% chargeability
  { id: "a4",  workerId: "w2",  engagementId: "e1", startDate: "2026-01-05", endDate: "2026-03-27", percent: 0.5, type: "projeto", status: "active" },
  { id: "a5",  workerId: "w2",  engagementId: "e2", startDate: "2026-01-05", endDate: "2026-02-06", percent: 0.4, type: "projeto", status: "active" },
  { id: "a6",  workerId: "w2",  engagementId: "e1", startDate: "2026-02-09", endDate: "2026-03-27", percent: 0.4, type: "projeto", status: "active" },

  // Lurdes Cruz (w3) - 0% chargeability
  { id: "a7",  workerId: "w3",  startDate: "2026-01-05", endDate: "2026-03-27", percent: 0.0, type: "interno", status: "active" },

  // Tomás Malaca (w5) - 0% chargeability
  { id: "a8",  workerId: "w5",  startDate: "2026-01-05", endDate: "2026-03-27", percent: 0.0, type: "interno", status: "active" },

  // André Guerreiro (w6) - 20% chargeability
  { id: "a9",  workerId: "w6",  engagementId: "e3", startDate: "2026-01-05", endDate: "2026-03-27", percent: 0.2, type: "projeto", status: "active" },
  { id: "a10", workerId: "w6",  engagementId: "e2", startDate: "2026-01-19", endDate: "2026-02-06", percent: 0.3, type: "projeto", status: "active" },
  { id: "a11", workerId: "w6",  engagementId: "e3", startDate: "2026-02-16", endDate: "2026-02-27", percent: 0.3, type: "projeto", status: "active" },
  { id: "a12", workerId: "w6",  startDate: "2026-03-09", endDate: "2026-03-20", percent: 1.0, type: "ferias", status: "planned" },

  // Teresa Valente (w7) - 4%
  { id: "a13", workerId: "w7",  engagementId: "e5", startDate: "2026-02-09", endDate: "2026-03-06", percent: 0.05, type: "projeto", status: "active" },
  { id: "a14", workerId: "w7",  startDate: "2026-03-09", endDate: "2026-03-20", percent: 1.0, type: "ferias", status: "planned" },

  // Inês Pina Ramos (w8) - 38%
  { id: "a15", workerId: "w8",  engagementId: "e4", startDate: "2026-01-06", endDate: "2026-03-27", percent: 0.4, type: "projeto", status: "active" },

  // Ricardo Amaro (w9) - 41%
  { id: "a16", workerId: "w9",  engagementId: "e4", startDate: "2026-01-06", endDate: "2026-03-27", percent: 0.4, type: "projeto", status: "active" },
  { id: "a17", workerId: "w9",  engagementId: "e4", startDate: "2026-01-06", endDate: "2026-01-16", percent: 0.6, type: "projeto", status: "completed" },

  // Rui Rodrigues (w10) - 47%
  { id: "a18", workerId: "w10", engagementId: "e5", startDate: "2026-01-05", endDate: "2026-02-27", percent: 0.5, type: "projeto", status: "active" },
  { id: "a19", workerId: "w10", engagementId: "e5", startDate: "2026-03-02", endDate: "2026-03-27", percent: 0.5, type: "projeto", status: "planned" },

  // Pedro Nunes (w11) - 7%
  { id: "a20", workerId: "w11", engagementId: "e5", startDate: "2026-01-19", endDate: "2026-02-13", percent: 0.1, type: "projeto", status: "active" },
  { id: "a21", workerId: "w11", startDate: "2026-03-02", endDate: "2026-03-27", percent: 1.0, type: "ferias", status: "planned" },

  // Gonçalo Barrias (w12) - 33%
  { id: "a22", workerId: "w12", engagementId: "e3", startDate: "2026-01-05", endDate: "2026-03-27", percent: 0.35, type: "projeto", status: "active" },

  // Ruben Alves (w13) - 24%
  { id: "a23", workerId: "w13", engagementId: "e3", startDate: "2026-01-05", endDate: "2026-02-27", percent: 0.25, type: "projeto", status: "active" },

  // Tiago Soares (w14) - 33%
  { id: "a24", workerId: "w14", engagementId: "e3", startDate: "2026-01-05", endDate: "2026-01-30", percent: 0.3, type: "projeto", status: "completed" },
  { id: "a25", workerId: "w14", engagementId: "e3", startDate: "2026-02-02", endDate: "2026-03-27", percent: 0.35, type: "projeto", status: "active" },

  // José Morais (w15) - 41%
  { id: "a26", workerId: "w15", engagementId: "e6", startDate: "2026-01-13", endDate: "2026-03-27", percent: 0.45, type: "projeto", status: "active" },

  // Mafalda Prazeres (w16) - 94%
  { id: "a27", workerId: "w16", engagementId: "e4", startDate: "2026-01-06", endDate: "2026-03-27", percent: 1.0, type: "projeto", status: "active" },

  // Nuno Almeida (w17) - 49%
  { id: "a28", workerId: "w17", engagementId: "e3", startDate: "2026-01-05", endDate: "2026-02-06", percent: 0.5, type: "projeto", status: "active" },
  { id: "a29", workerId: "w17", engagementId: "e3", startDate: "2026-02-09", endDate: "2026-03-27", percent: 0.5, type: "projeto", status: "active" },

  // João Franco (w18) - 41%
  { id: "a30", workerId: "w18", engagementId: "e1", startDate: "2026-01-05", endDate: "2026-03-27", percent: 0.4, type: "projeto", status: "active" },

  // João Coimbra (w25) - 16%
  { id: "a31", workerId: "w25", engagementId: "e1", startDate: "2026-01-05", endDate: "2026-01-30", percent: 0.2, type: "projeto", status: "completed" },
  { id: "a32", workerId: "w25", engagementId: "e5", startDate: "2026-02-02", endDate: "2026-02-27", percent: 0.2, type: "projeto", status: "active" },

  // Miguel Casaca (w26) - 49%
  { id: "a33", workerId: "w26", engagementId: "e1", startDate: "2026-01-05", endDate: "2026-02-27", percent: 0.5, type: "projeto", status: "active" },
  { id: "a34", workerId: "w26", engagementId: "e1", startDate: "2026-03-02", endDate: "2026-03-27", percent: 0.5, type: "projeto", status: "planned" },

  // José Correia (w27) - 25%
  { id: "a35", workerId: "w27", engagementId: "e6", startDate: "2026-01-13", endDate: "2026-03-27", percent: 0.25, type: "projeto", status: "active" },
];

let nextAllocId = 36;

// ─── Helpers ─────────────────────────────────────────────

const delay = <T>(data: T, ms = 150): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

const overlaps = (
  startA: string, endA: string,
  startB: string, endB: string
): boolean => {
  return startA <= endB && startB <= endA;
};

const getMonday = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
};

const formatIso = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getISOWeekNumber = (d: Date): number => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

// ─── Service ─────────────────────────────────────────────

export const allocationService = {
  // === Workers ===
  async getWorkers(): Promise<Worker[]> {
    return delay([...mockWorkers]);
  },

  getWorkerSync(id: string): Worker | undefined {
    return mockWorkers.find((w) => w.id === id);
  },

  // === Allocations CRUD ===
  async getAllocations(filters?: {
    workerId?: string;
    engagementId?: string;
    status?: string;
    type?: string;
  }): Promise<Allocation[]> {
    let result = [...mockAllocations];
    if (filters?.workerId) result = result.filter((a) => a.workerId === filters.workerId);
    if (filters?.engagementId) result = result.filter((a) => a.engagementId === filters.engagementId);
    if (filters?.status) result = result.filter((a) => a.status === filters.status);
    if (filters?.type) result = result.filter((a) => a.type === filters.type);
    return delay(result);
  },

  async getAllocation(id: string): Promise<Allocation | null> {
    return delay(mockAllocations.find((a) => a.id === id) ?? null);
  },

  async createAllocation(data: AllocationCreate): Promise<Allocation> {
    const allocation: Allocation = {
      id: `a${nextAllocId++}`,
      ...data,
    };
    mockAllocations.push(allocation);
    return delay(allocation);
  },

  async updateAllocation(id: string, data: AllocationUpdate): Promise<Allocation> {
    const idx = mockAllocations.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error("Alocação não encontrada");
    mockAllocations[idx] = { ...mockAllocations[idx], ...data };
    return delay(mockAllocations[idx]);
  },

  async deleteAllocation(id: string): Promise<void> {
    mockAllocations = mockAllocations.filter((a) => a.id !== id);
    return delay(undefined);
  },

  // === Conflict Detection ===
  async checkConflicts(
    workerId: string,
    startDate: string,
    endDate: string,
    percent: number,
    excludeAllocationId?: string
  ): Promise<ConflictCheckResponse> {
    const worker = mockWorkers.find((w) => w.id === workerId);
    if (!worker) return delay({ hasConflicts: false, conflicts: [], maxTotalPercent: percent });

    const activeAllocations = mockAllocations.filter(
      (a) =>
        a.workerId === workerId &&
        a.id !== excludeAllocationId &&
        a.status !== "completed" &&
        overlaps(a.startDate, a.endDate, startDate, endDate)
    );

    if (activeAllocations.length === 0) {
      return delay({ hasConflicts: false, conflicts: [], maxTotalPercent: percent });
    }

    // Interval sweep: collect all date boundaries
    const boundaries = new Set<string>();
    boundaries.add(startDate);
    boundaries.add(endDate);
    activeAllocations.forEach((a) => {
      boundaries.add(a.startDate);
      boundaries.add(a.endDate);
    });

    const sorted = [...boundaries].sort();
    let maxTotal = 0;
    const conflictDetails: ConflictDetail[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const intervalStart = sorted[i];
      const intervalEnd = sorted[i + 1];

      let total = percent; // proposed allocation
      const overlapping: Allocation[] = [];

      activeAllocations.forEach((a) => {
        if (overlaps(a.startDate, a.endDate, intervalStart, intervalEnd)) {
          total += a.percent;
          overlapping.push(a);
        }
      });

      maxTotal = Math.max(maxTotal, total);

      if (total > worker.capacityFte) {
        overlapping.forEach((a) => {
          if (!conflictDetails.find((c) => c.allocationId === a.id)) {
            const aWorker = mockWorkers.find((w) => w.id === a.workerId);
            conflictDetails.push({
              allocationId: a.id,
              workerName: aWorker?.name ?? "Desconhecido",
              engagementName: a.engagementId ?? "N/A",
              startDate: a.startDate,
              endDate: a.endDate,
              percent: a.percent,
              overlapStart: intervalStart,
              overlapEnd: intervalEnd,
            });
          }
        });
      }
    }

    return delay({
      hasConflicts: conflictDetails.length > 0,
      conflicts: conflictDetails,
      maxTotalPercent: maxTotal,
    });
  },

  // === Stats ===
  async getStats(): Promise<AllocationStats> {
    const active = mockAllocations.filter((a) => a.status === "active");
    const now = new Date();
    const in14Days = new Date(now.getTime() + 14 * 86400000);
    const nowIso = formatIso(now);
    const in14Iso = formatIso(in14Days);

    // Count conflicts
    let conflictCount = 0;
    const activePlanned = mockAllocations.filter((a) => a.status !== "completed");
    activePlanned.forEach((a) => {
      const hasConflict = activePlanned.some(
        (b) =>
          b.id !== a.id &&
          b.workerId === a.workerId &&
          overlaps(a.startDate, a.endDate, b.startDate, b.endDate)
      );
      if (hasConflict) conflictCount++;
    });

    const upcomingEnd = mockAllocations.filter((a) => {
      return a.status !== "completed" && a.endDate >= nowIso && a.endDate <= in14Iso;
    }).length;

    // Calculate average chargeability
    const workerCharges = mockWorkers.map((w) => {
      const workerAllocs = mockAllocations.filter(
        (a) => a.workerId === w.id && a.type === "projeto" && a.status !== "completed"
      );
      const totalPercent = workerAllocs.reduce((s, a) => s + a.percent, 0);
      return Math.min(totalPercent / w.capacityFte, 1);
    });
    const avgChargeability =
      workerCharges.length > 0
        ? workerCharges.reduce((s, c) => s + c, 0) / workerCharges.length
        : 0;

    return delay({
      totalAllocations: mockAllocations.length,
      activeAllocations: active.length,
      conflicts: Math.floor(conflictCount / 2), // each conflict counted twice
      upcomingEnd,
      avgChargeability,
    });
  },

  // === Timeline (the Excel-replacement view) ===
  buildTimeline(
    workers: Worker[],
    allocations: Allocation[],
    engagements: Engagement[],
    startDate: Date,
    numWeeks: number
  ): WorkerTimeline[] {
    const engMap = new Map(engagements.map((e) => [e.id, e]));

    // Build weeks array
    const weeks: TimelineWeek[] = [];
    const monday = getMonday(startDate);
    for (let i = 0; i < numWeeks; i++) {
      const weekStart = new Date(monday);
      weekStart.setDate(monday.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 4); // Friday

      const weekNum = getISOWeekNumber(weekStart);
      const monthName = weekStart.toLocaleDateString("pt-PT", { month: "short" });

      weeks.push({
        weekNumber: weekNum,
        label: `S${weekNum}`,
        startDate: formatIso(weekStart),
        endDate: formatIso(weekEnd),
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      });
    }

    // Build per-worker timelines
    return workers.map((worker) => {
      const workerAllocations = allocations.filter((a) => a.workerId === worker.id);

      let totalWeeksAllocated = 0;

      const cells: TimelineCell[] = weeks.map((week) => {
        const cellAllocations: TimelineCellAllocation[] = [];

        workerAllocations.forEach((a) => {
          if (
            a.status !== "completed" &&
            overlaps(a.startDate, a.endDate, week.startDate, week.endDate)
          ) {
            const eng = a.engagementId ? engMap.get(a.engagementId) : null;

            let code = "Fe";
            let color = "#EF4444"; // red for férias
            if (a.type === "formacao") {
              code = "Fo";
              color = "#06B6D4"; // cyan
            } else if (a.type === "interno") {
              code = "Int";
              color = "#9CA3AF"; // gray
            } else if (eng) {
              code = eng.code;
              color = eng.color;
            }

            cellAllocations.push({
              engagementCode: code,
              engagementColor: color,
              percent: a.percent,
              type: a.type,
              engagementId: a.engagementId,
              allocationId: a.id,
            });
          }
        });

        const totalPercent = cellAllocations.reduce((s, ca) => s + ca.percent, 0);
        if (totalPercent > 0) totalWeeksAllocated++;

        return {
          workerId: worker.id,
          week,
          allocations: cellAllocations,
          totalPercent,
          isOverallocated: totalPercent > worker.capacityFte,
        };
      });

      // Chargeability = billable weeks / total weeks (only count projeto type)
      const billableWeeks = cells.filter((c) =>
        c.allocations.some((a) => a.type === "projeto")
      ).length;
      const chargeability = numWeeks > 0 ? billableWeeks / numWeeks : 0;

      return { worker, chargeability, cells };
    });
  },

  // === Calendar ===
  buildCalendar(
    workerId: string,
    year: number,
    month: number,
    allocations: Allocation[],
    engagements: Engagement[]
  ): CalendarDay[] {
    const engMap = new Map(engagements.map((e) => [e.id, e]));
    const workerAllocs = allocations.filter((a) => a.workerId === workerId);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: CalendarDay[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const iso = formatIso(date);
      const dow = date.getDay();
      const isWeekend = dow === 0 || dow === 6;

      const dayAllocations: CalendarDayAllocation[] = [];
      workerAllocs.forEach((a) => {
        if (a.status !== "completed" && overlaps(a.startDate, a.endDate, iso, iso)) {
          const eng = a.engagementId ? engMap.get(a.engagementId) : null;
          let label = "Férias";
          let color = "#EF4444";
          if (a.type === "formacao") {
            label = "Formação";
            color = "#06B6D4";
          } else if (a.type === "interno") {
            label = "Interno";
            color = "#9CA3AF";
          } else if (eng) {
            label = eng.name;
            color = eng.color;
          }
          dayAllocations.push({ id: a.id, type: a.type, label, percent: a.percent, color });
        }
      });

      const totalHours = dayAllocations.reduce((s, da) => s + da.percent * 8, 0);

      days.push({
        date: iso,
        allocations: dayAllocations,
        totalHours,
        isOverallocated: totalHours > 8,
        isWeekend,
      });
    }

    return days;
  },
};
