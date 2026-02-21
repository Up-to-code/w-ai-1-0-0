import AsyncStorage from "@react-native-async-storage/async-storage";
import { reportRuntimeEvent } from "./runtimeTelemetry";

const DIAGNOSTIC_STATE_KEY = "w_ai_startup_diagnostics_v1";

export type StartupPhase =
  | "app_boot_start"
  | "fonts_init"
  | "convex_bootstrap_ok"
  | "convex_bootstrap_failed"
  | "auth_provider_mount"
  | "workspace_provider_mount"
  | "tabs_render_start"
  | "app_ready";

type StartupFatal = {
  message: string;
  source: string;
  isFatal: boolean;
  timestamp: number;
  phase: string;
};

type StartupState = {
  lastPhase: string;
  phaseUpdatedAt: number;
  lastReadyAt?: number;
  lastFatal?: StartupFatal;
};

export type StartupCrashInfo = {
  message: string;
  source: string;
  isFatal: boolean;
  phase: string;
  timestamp: number;
};

const EMPTY_STATE: StartupState = {
  lastPhase: "unknown",
  phaseUpdatedAt: 0,
};

let inMemoryPhase: string = "unknown";
let errorHandlersInstalled = false;

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || "Unknown error";
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function readState(): Promise<StartupState> {
  try {
    const raw = await AsyncStorage.getItem(DIAGNOSTIC_STATE_KEY);
    if (!raw) return { ...EMPTY_STATE };
    const parsed = JSON.parse(raw) as Partial<StartupState>;
    return {
      ...EMPTY_STATE,
      ...parsed,
      lastPhase: typeof parsed.lastPhase === "string" ? parsed.lastPhase : "unknown",
      phaseUpdatedAt:
        typeof parsed.phaseUpdatedAt === "number" ? parsed.phaseUpdatedAt : 0,
    };
  } catch (error) {
    console.warn("[startup-diagnostics] failed to read state", error);
    return { ...EMPTY_STATE };
  }
}

async function writeState(next: StartupState): Promise<void> {
  try {
    await AsyncStorage.setItem(DIAGNOSTIC_STATE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("[startup-diagnostics] failed to write state", error);
  }
}

export async function markStartupPhase(phase: StartupPhase | string): Promise<void> {
  inMemoryPhase = phase;
  const state = await readState();
  state.lastPhase = phase;
  state.phaseUpdatedAt = Date.now();
  await writeState(state);
}

export function getCurrentStartupPhase(): string {
  return inMemoryPhase;
}

export async function recordStartupFatal(
  error: unknown,
  source: string,
  isFatal: boolean
): Promise<void> {
  const message = toMessage(error);
  const state = await readState();
  state.lastFatal = {
    message,
    source,
    isFatal,
    timestamp: Date.now(),
    phase: inMemoryPhase || state.lastPhase || "unknown",
  };
  await writeState(state);
  void reportRuntimeEvent({
    eventName: "startup_fatal",
    severity: isFatal ? "fatal" : "error",
    message,
    phase: inMemoryPhase || state.lastPhase || "unknown",
    metadata: { source },
  });
}

export async function markStartupReady(): Promise<void> {
  const state = await readState();
  state.lastPhase = "app_ready";
  state.phaseUpdatedAt = Date.now();
  state.lastReadyAt = Date.now();
  await writeState(state);
}

export async function getUnrecoveredStartupCrash(): Promise<StartupCrashInfo | null> {
  const state = await readState();
  const fatal = state.lastFatal;
  if (!fatal) return null;
  if (state.lastReadyAt && state.lastReadyAt >= fatal.timestamp) return null;
  return {
    message: fatal.message,
    source: fatal.source,
    isFatal: fatal.isFatal,
    phase: fatal.phase,
    timestamp: fatal.timestamp,
  };
}

export async function clearStartupCrash(): Promise<void> {
  const state = await readState();
  delete state.lastFatal;
  await writeState(state);
}

function attachUnhandledRejectionHandler() {
  const globalWithHandler = globalThis as typeof globalThis & {
    onunhandledrejection?: ((event: unknown) => void) | null;
  };

  globalWithHandler.onunhandledrejection = (event: unknown) => {
    let reason: unknown = event;
    try {
      const maybeEvent = event as { reason?: unknown };
      if (maybeEvent && "reason" in maybeEvent) {
        reason = maybeEvent.reason;
      }
    } catch {
      // best-effort reason extraction only
    }

    void recordStartupFatal(reason, "onunhandledrejection", true);
  };
}

function attachGlobalErrorHandler() {
  const globalWithErrorUtils = globalThis as typeof globalThis & {
    ErrorUtils?: {
      getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
      setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
    };
  };

  const maybeErrorUtils = globalWithErrorUtils.ErrorUtils;
  if (!maybeErrorUtils?.setGlobalHandler) return;

  const originalHandler = maybeErrorUtils.getGlobalHandler?.();

  maybeErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    void recordStartupFatal(error, "ErrorUtils", !!isFatal);
    try {
      originalHandler?.(error, isFatal);
    } catch (handlerError) {
      console.warn("[startup-diagnostics] original error handler failed", handlerError);
    }
  });
}

export function installGlobalStartupErrorHandlers(): void {
  if (errorHandlersInstalled) return;
  errorHandlersInstalled = true;

  try {
    attachGlobalErrorHandler();
  } catch (error) {
    console.warn("[startup-diagnostics] failed to attach ErrorUtils handler", error);
  }

  try {
    attachUnhandledRejectionHandler();
  } catch (error) {
    console.warn("[startup-diagnostics] failed to attach rejection handler", error);
  }
}
