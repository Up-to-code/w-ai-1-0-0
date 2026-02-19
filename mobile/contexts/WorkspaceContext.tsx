import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { storage } from "../lib/storage";

const ALL_NUMBERS_SENTINEL = "__all__";

type Workspace = {
  _id: Id<"whatsapp_numbers">;
  businessAccountId: string;
  businessNumberId: string;
  phone: string;
  name: string;
  createdAt: number;
};

type WorkspaceContextValue = {
  numbers: Workspace[];
  activePhoneNumberId: string | null;
  setActivePhoneNumberId: (id: string | null) => void;
  isLoading: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const numbersQuery = useQuery(api.whatsappNumbers.list);
  const numbers = useMemo(() => numbersQuery ?? [], [numbersQuery]);
  const [activePhoneNumberId, setActiveState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const setActivePhoneNumberId = useCallback(async (id: string | null) => {
    setActiveState(id);
    await storage.setActivePhoneNumberId(id ?? ALL_NUMBERS_SENTINEL);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await storage.getActivePhoneNumberId();
      if (!cancelled) {
        setActiveState(stored === ALL_NUMBERS_SENTINEL ? null : stored);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || numbers.length === 0) return;
    const current = activePhoneNumberId;
    if (current == null) return;
    const exists = numbers.some((n) => n.businessNumberId === current);
    if (!exists) {
      void storage.setActivePhoneNumberId(numbers[0].businessNumberId);
    }
  }, [numbers, hydrated, activePhoneNumberId]);

  const resolvedActivePhoneNumberId = useMemo(() => {
    if (activePhoneNumberId == null) return null;
    return numbers.some((n) => n.businessNumberId === activePhoneNumberId)
      ? activePhoneNumberId
      : numbers[0]?.businessNumberId ?? null;
  }, [numbers, activePhoneNumberId]);

  const value: WorkspaceContextValue = {
    numbers,
    activePhoneNumberId: resolvedActivePhoneNumberId,
    setActivePhoneNumberId,
    isLoading: numbersQuery === undefined,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
