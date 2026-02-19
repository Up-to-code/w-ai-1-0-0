import { ConvexReactClient } from "convex/react";

const RAW_CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

type ConvexUrlValidation = {
  valid: boolean;
  normalized: string;
  error: string | null;
};

export function validateConvexUrl(raw: string | null | undefined): ConvexUrlValidation {
  const value = (raw ?? "").trim();
  if (!value) {
    return {
      valid: false,
      normalized: "",
      error: "EXPO_PUBLIC_CONVEX_URL is missing.",
    };
  }
  if (value.startsWith("secret:")) {
    return {
      valid: false,
      normalized: value,
      error: "EXPO_PUBLIC_CONVEX_URL is still set to a placeholder (secret:...).",
    };
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        valid: false,
        normalized: value,
        error: "EXPO_PUBLIC_CONVEX_URL must start with http:// or https://.",
      };
    }
    return {
      valid: true,
      normalized: parsed.toString().replace(/\/$/, ""),
      error: null,
    };
  } catch {
    return {
      valid: false,
      normalized: value,
      error: "EXPO_PUBLIC_CONVEX_URL is not a valid absolute URL.",
    };
  }
}

const validation = validateConvexUrl(RAW_CONVEX_URL);

let bootError: string | null = validation.error;
let bootClient: ConvexReactClient | null = null;
if (validation.valid) {
  try {
    bootClient = new ConvexReactClient(validation.normalized);
    bootError = null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    bootError = `Failed to initialize Convex client: ${message}`;
  }
}

export const convexClient = bootClient;
export const convexInitError = bootError;
export const hasConvexUrl = bootClient !== null;
export const convexUrl = validation.normalized;

if (bootError) {
  const sourceState =
    validation.normalized.length === 0
      ? "empty"
      : validation.normalized.startsWith("secret:")
        ? "placeholder"
        : "invalid";
  console.warn(`[Convex Init] ${bootError} (urlState=${sourceState})`);
}
