import type { JsonObject, JsonValue } from "../types.js";

/** Returns true when a value is a non-null object and not an array. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads a string property from an unknown object. */
export function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

/** Reads a nested record property from an unknown object. */
export function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  return isRecord(value) ? value : undefined;
}

/** Reads an array property from an unknown object. */
export function readArray(record: Record<string, unknown>, key: string): readonly unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

/** Converts unknown JSON-ish data into a safe JSON value for logs and callbacks. */
export function toJsonValue(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }
  if (isRecord(value)) {
    const out: Record<string, JsonValue> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = toJsonValue(entry);
    }
    return out as JsonObject;
  }
  return String(value);
}

/** Removes non-digit characters except a leading plus, then trims the result. */
export function normalizePhoneNumber(input: string): string {
  return input.trim().replace(/[^\d+]/g, "");
}

/** Normalizes template language codes for lookup keys. */
export function normalizeLanguageCode(input: string | undefined): string {
  return (input ?? "").trim().toLowerCase().replace("-", "_");
}
