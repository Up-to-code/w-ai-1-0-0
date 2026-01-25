import { ConvexReactClient } from "convex/react";

// Get Convex URL from environment variable
// In production, set EXPO_PUBLIC_CONVEX_URL in your environment
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || "";

if (!CONVEX_URL) {
  console.warn(
    "EXPO_PUBLIC_CONVEX_URL is not set. Please set it in your .env file or environment variables."
  );
}

export const convexClient = new ConvexReactClient(CONVEX_URL);
