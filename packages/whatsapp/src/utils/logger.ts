import type { JsonValue, WhatsAppLogger } from "../types.js";

/** Logger that intentionally does nothing. */
export const silentLogger: WhatsAppLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

/** Emits a debug log when the configured logger supports debug output. */
export function debug(logger: WhatsAppLogger, message: string, context?: JsonValue): void {
  logger.debug?.(message, context);
}
