import type { JsonValue } from "../types.js";

/** Generic key-value persistence adapter for applications that want package-managed state. */
export interface KeyValueStore {
  /** Reads a JSON-compatible value by key. */
  get(key: string): Promise<JsonValue | undefined>;
  /** Writes a JSON-compatible value by key. */
  set(key: string, value: JsonValue): Promise<void>;
  /** Removes a value by key. */
  delete(key: string): Promise<void>;
}

/** Storage adapter for persisting downloaded media in a host application. */
export interface MediaStorageAdapter {
  /** Stores a media blob and returns an application-defined reference. */
  store(file: Blob, metadata: { readonly mediaId: string; readonly mimeType?: string }): Promise<string>;
}

/** Scheduler adapter for applications that want delayed campaign execution. */
export interface SchedulerAdapter {
  /** Schedules a named task at a future timestamp. */
  schedule(taskName: string, runAt: number, payload: JsonValue): Promise<void>;
}
