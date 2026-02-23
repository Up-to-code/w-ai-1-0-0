"use client";

import { useConvex } from "convex/react";
import { useEffect, useMemo, useState } from "react";

type OptionalQueryState<T> = {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  unavailable: boolean;
};

function isMissingFunctionError(message: string): boolean {
  return message.includes("Could not find public function");
}

export function useOptionalConvexQuery<T = any>(
  queryRef: any,
  args: Record<string, any> | "skip" | undefined,
  enabled: boolean = true
): OptionalQueryState<T> {
  const convex = useConvex();
  const argsKey = useMemo(() => {
    if (args === "skip" || !args) return "skip";
    try {
      return JSON.stringify(args);
    } catch {
      return "args";
    }
  }, [args]);

  const [state, setState] = useState<OptionalQueryState<T>>({
    data: undefined,
    error: null,
    loading: false,
    unavailable: false,
  });

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !queryRef || args === "skip" || !args) {
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      unavailable: false,
    }));

    void convex
      .query(queryRef, args)
      .then((result) => {
        if (cancelled) return;
        setState({
          data: result as T,
          error: null,
          loading: false,
          unavailable: false,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setState({
          data: undefined,
          error: message,
          loading: false,
          unavailable: isMissingFunctionError(message),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [argsKey, convex, enabled, queryRef]);

  return state;
}
