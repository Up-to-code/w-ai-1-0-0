"use client";
import { ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

// Use placeholder during build when env is missing (e.g. Vercel without env var set).
// Set NEXT_PUBLIC_CONVEX_URL in Vercel (and run convex deploy) for production.
const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL ?? "https://placeholder.convex.cloud";
const convex = new ConvexReactClient(convexUrl);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
