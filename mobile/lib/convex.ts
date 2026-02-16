import { ConvexReactClient } from "convex/react";

// Get Convex URL from environment variable
// In EAS builds: set via eas secret (EXPO_PUBLIC_CONVEX_URL) - see eas.json
// In local dev: use .env or EXPO_PUBLIC_CONVEX_URL
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || "";

export const hasConvexUrl = CONVEX_URL.length > 0;

if (!hasConvexUrl) {
  console.warn(
    "EXPO_PUBLIC_CONVEX_URL is not set. Set it in .env (local) or eas secret:create (EAS builds)."
  );
}

export const convexClient = new ConvexReactClient(CONVEX_URL);
