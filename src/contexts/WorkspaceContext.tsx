"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const STORAGE_KEY = "w-ai-active-phone-number-id";
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
  activeWorkspace: Workspace | null;
  isLoading: boolean;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const numbersQuery = useQuery(api.whatsappNumbers.list);
  const numbers = numbersQuery ?? [];
  const [activePhoneNumberId, setActiveState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === ALL_NUMBERS_SENTINEL ? null : stored;
  });

  const setActivePhoneNumberId = useCallback((id: string | null) => {
    setActiveState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(STORAGE_KEY, id);
      else window.localStorage.setItem(STORAGE_KEY, ALL_NUMBERS_SENTINEL);
    }
  }, []);

  // When numbers load, restore from storage or default to first number
  useEffect(() => {
    if (numbers.length === 0) {
      setActiveState(null);
      return;
    }
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored === ALL_NUMBERS_SENTINEL) {
      setActiveState(null);
      return;
    }
    const exists = stored && numbers.some((n) => n.businessNumberId === stored);
    if (exists) {
      setActiveState(stored);
    } else if (numbers.length === 1) {
      setActivePhoneNumberId(numbers[0].businessNumberId);
    } else {
      setActiveState(numbers[0]?.businessNumberId ?? null);
      if (numbers[0]) setActivePhoneNumberId(numbers[0].businessNumberId);
    }
  }, [numbers, setActivePhoneNumberId]);

  const activeWorkspace =
    numbers.find((n) => n.businessNumberId === activePhoneNumberId) ?? null;

  const value: WorkspaceContextValue = {
    numbers,
    activePhoneNumberId,
    setActivePhoneNumberId,
    activeWorkspace,
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
