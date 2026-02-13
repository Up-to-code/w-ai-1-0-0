import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { storage } from "../lib/storage";

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
  const numbers = numbersQuery ?? [];
  const [activePhoneNumberId, setActiveState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const setActivePhoneNumberId = useCallback(async (id: string | null) => {
    setActiveState(id);
    await storage.setActivePhoneNumberId(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await storage.getActivePhoneNumberId();
      if (!cancelled) {
        setActiveState(stored);
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
    const exists = current && numbers.some((n) => n.businessNumberId === current);
    if (!exists) {
      const next = numbers[0].businessNumberId;
      setActiveState(next);
      storage.setActivePhoneNumberId(next);
    }
  }, [numbers, hydrated, activePhoneNumberId]);

  const value: WorkspaceContextValue = {
    numbers,
    activePhoneNumberId,
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
