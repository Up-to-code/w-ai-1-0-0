import { ConvexError } from "convex/values";

export type AppErrorCode = "AUTH_REQUIRED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_FAILED" | "CONFLICT";

/**
 * Throw an application-level ConvexError with the specified code and message.
 *
 * @param code - One of the application error codes (`"AUTH_REQUIRED"`, `"FORBIDDEN"`, `"NOT_FOUND"`, `"VALIDATION_FAILED"`, `"CONFLICT"`)
 * @param message - Human-readable error message
 * @returns Does not return; this function always throws.
 * @throws {ConvexError} Always throws a `ConvexError` constructed with the given `code` and `message`.
 */
export function throwAppError(code: AppErrorCode, message: string): never {
  throw new ConvexError({ code, message });
}