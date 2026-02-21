import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const QUEUE_KEY = "w_ai_runtime_event_queue_v1";
const MAX_QUEUE_ITEMS = 50;

type RuntimeSeverity = "info" | "warning" | "error" | "fatal";

export type RuntimeTelemetryEvent = {
  eventName: string;
  severity: RuntimeSeverity;
  message?: string;
  stack?: string;
  phase?: string;
  metadata?: unknown;
  platform?: string;
  appVersion?: string;
  buildId?: string;
  jsEngine?: string;
};

function getConvexSiteUrl(): string | null {
  const cloud = (process.env.EXPO_PUBLIC_CONVEX_URL ?? "").trim();
  if (!cloud) return null;
  if (!cloud.startsWith("http://") && !cloud.startsWith("https://")) return null;
  return cloud.replace(".convex.cloud", ".convex.site").replace(/\/$/, "");
}

function baseEvent(event: RuntimeTelemetryEvent): RuntimeTelemetryEvent {
  return {
    ...event,
    platform: event.platform ?? Platform.OS,
    appVersion: event.appVersion ?? Constants.expoConfig?.version,
  };
}

async function readQueue(): Promise<RuntimeTelemetryEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue: RuntimeTelemetryEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-MAX_QUEUE_ITEMS)));
  } catch {
    // Best-effort queue persistence only.
  }
}

async function sendToServer(event: RuntimeTelemetryEvent): Promise<boolean> {
  const siteBase = getConvexSiteUrl();
  if (!siteBase) return false;
  const endpoint = `${siteBase}/mobile/runtime-event`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(baseEvent(event)),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

export async function flushQueuedRuntimeEvents(): Promise<void> {
  const queue = await readQueue();
  if (queue.length === 0) return;

  const remaining: RuntimeTelemetryEvent[] = [];
  for (const event of queue) {
    const ok = await sendToServer(event);
    if (!ok) {
      remaining.push(event);
    }
  }

  await writeQueue(remaining);
}

export async function reportRuntimeEvent(event: RuntimeTelemetryEvent): Promise<void> {
  const queued = await readQueue();
  const nextQueue = [...queued, baseEvent(event)].slice(-MAX_QUEUE_ITEMS);
  await writeQueue(nextQueue);
  await flushQueuedRuntimeEvents();
}
