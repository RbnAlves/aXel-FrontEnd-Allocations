import { useEffect, useMemo, useState } from "react";
import { userService } from "../services/userService";
import { User } from "../types";

interface UseMultiUserDistributionParams {
  enabled: boolean;
  totalAmount: number;
}

export const useMultiUserDistribution = ({
  enabled,
  totalAmount,
}: UseMultiUserDistributionParams) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) {
      setSelectedUserIds([]);
      setAllocations({});
      setError(null);
      return;
    }

    const loadUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await userService.getUsers();
        setUsers(fetchedUsers);
        setError(null);
      } catch (err) {
        console.error("Failed to load users for distribution:", err);
        setError("Falha ao carregar utilizadores");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [enabled]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const updateAllocation = (userId: string, value: number) => {
    setAllocations((prev) => ({ ...prev, [userId]: value }));
  };

  const distributeEqually = () => {
    if (selectedUserIds.length === 0) return;
    const share = parseFloat((totalAmount / selectedUserIds.length).toFixed(2));
    const nextAllocations: Record<string, number> = {};
    selectedUserIds.forEach((id) => {
      nextAllocations[id] = share;
    });
    setAllocations(nextAllocations);
  };

  const allocatedTotal = useMemo(() => {
    return selectedUserIds.reduce((sum, id) => sum + (allocations[id] || 0), 0);
  }, [selectedUserIds, allocations]);

  const remaining = useMemo(() => {
    return totalAmount - allocatedTotal;
  }, [totalAmount, allocatedTotal]);

  return {
    users,
    loading,
    error,
    selectedUserIds,
    allocations,
    allocatedTotal,
    remaining,
    toggleUser,
    updateAllocation,
    distributeEqually,
  };
};
