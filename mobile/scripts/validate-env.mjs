#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const KEY = "EXPO_PUBLIC_CONVEX_URL";

function readEnvFileValue(key) {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return null;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const k = trimmed.slice(0, idx).trim();
    if (k !== key) continue;
    return trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return null;
}

function validateConvexUrl(value) {
  const v = (value ?? "").trim();
  if (!v) return "is missing.";
  if (v.startsWith("secret:")) return "contains a placeholder value (secret:...).";
  let parsed;
  try {
    parsed = new URL(v);
  } catch {
    return "is not a valid absolute URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "must start with http:// or https://.";
  }
  return null;
}

const fromProcess = process.env[KEY];
const fromEnvFile = readEnvFileValue(KEY);
const value = fromProcess ?? fromEnvFile ?? "";
const issue = validateConvexUrl(value);

if (issue) {
  console.error(`[env-check] ${KEY} ${issue}`);
  console.error(`[env-check] Current value: ${value || "(not set)"}`);
  console.error(
    `[env-check] Fix: set ${KEY}=https://hardy-gopher-480.convex.cloud in EAS environment and local .env.`
  );
  process.exit(1);
}

console.log(`[env-check] ${KEY} looks valid.`);
