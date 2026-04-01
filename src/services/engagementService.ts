import type {
  Engagement,
  EngagementCreate,
  EngagementStatus,
  EngagementSummary,
} from "../types";

// ─── Mock Data ───────────────────────────────────────────
// Engagement codes and colors match the Excel allocation matrix

let mockEngagements: Engagement[] = [
  {
    id: "e1",
    name: "BancAlpha - Core Banking",
    code: "BA",
    client: "BancAlpha",
    color: "#3B82F6", // blue
    capacityFte: 4,
    status: "active",
    startDate: "2025-10-01",
    endDate: "2026-06-30",
  },
  {
    id: "e2",
    name: "BancAlpha - Trading",
    code: "Bt",
    client: "BancAlpha",
    color: "#F97316", // orange
    capacityFte: 2,
    status: "active",
    startDate: "2025-11-15",
    endDate: "2026-04-30",
  },
  {
    id: "e3",
    name: "CargoLog - ERP",
    code: "C",
    client: "CargoLog",
    color: "#EAB308", // yellow
    capacityFte: 3,
    status: "active",
    startDate: "2025-09-01",
    endDate: "2026-05-31",
  },
  {
    id: "e4",
    name: "EnergiaVerde - Smart Grid",
    code: "E",
    client: "EnergiaVerde",
    color: "#22C55E", // green
    capacityFte: 2,
    status: "active",
    startDate: "2026-01-06",
    endDate: "2026-07-31",
  },
  {
    id: "e5",
    name: "NovaSaúde - Compliance",
    code: "N",
    client: "NovaSaúde",
    color: "#1E3A5F", // dark navy
    capacityFte: 2,
    status: "active",
    startDate: "2025-12-01",
    endDate: "2026-03-31",
  },
  {
    id: "e6",
    name: "DataSphere - Analytics",
    code: "DA",
    client: "DataSphere",
    color: "#8B5CF6", // purple
    capacityFte: 2.5,
    status: "active",
    startDate: "2026-01-13",
    endDate: "2026-09-30",
  },
  {
    id: "e7",
    name: "RetailMax - Omnichannel",
    code: "R",
    client: "RetailMax",
    color: "#EC4899", // pink
    capacityFte: 1.5,
    status: "planning",
    startDate: "2026-03-01",
    endDate: "2026-08-31",
  },
  {
    id: "e8",
    name: "Seguros+ - Claims Platform",
    code: "S",
    client: "Seguros+",
    color: "#14B8A6", // teal
    capacityFte: 2,
    status: "planning",
    startDate: "2026-03-15",
    endDate: "2026-10-31",
  },
];

let nextId = 9;

// ─── Helpers ─────────────────────────────────────────────

const delay = <T>(data: T, ms = 150): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

// ─── Service ─────────────────────────────────────────────

export const engagementService = {
  async getEngagements(filters?: {
    status?: EngagementStatus;
    client?: string;
  }): Promise<Engagement[]> {
    let result = [...mockEngagements];
    if (filters?.status) {
      result = result.filter((e) => e.status === filters.status);
    }
    if (filters?.client) {
      result = result.filter((e) =>
        e.client.toLowerCase().includes(filters.client!.toLowerCase())
      );
    }
    return delay(result);
  },

  async getEngagement(id: string): Promise<Engagement | null> {
    const found = mockEngagements.find((e) => e.id === id) ?? null;
    return delay(found);
  },

  async createEngagement(data: EngagementCreate): Promise<Engagement> {
    const engagement: Engagement = {
      id: `e${nextId++}`,
      ...data,
    };
    mockEngagements.push(engagement);
    return delay(engagement);
  },

  async updateEngagement(
    id: string,
    data: Partial<EngagementCreate>
  ): Promise<Engagement> {
    const idx = mockEngagements.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error("Engagement não encontrado");
    mockEngagements[idx] = { ...mockEngagements[idx], ...data };
    return delay(mockEngagements[idx]);
  },

  async deleteEngagement(id: string): Promise<void> {
    mockEngagements = mockEngagements.filter((e) => e.id !== id);
    return delay(undefined);
  },

  // Build engagement summary with allocated FTE from an allocations array
  buildSummaries(
    engagements: Engagement[],
    allocations: { engagementId?: string; percent: number; workerId: string; status: string }[]
  ): EngagementSummary[] {
    return engagements.map((engagement) => {
      const engAllocations = allocations.filter(
        (a) => a.engagementId === engagement.id && a.status !== "completed"
      );
      const allocatedFte = engAllocations.reduce((sum, a) => sum + a.percent, 0);
      const uniqueWorkers = new Set(engAllocations.map((a) => a.workerId));
      return {
        engagement,
        allocatedFte,
        allocations: engAllocations as any,
        workerCount: uniqueWorkers.size,
      };
    });
  },
};
