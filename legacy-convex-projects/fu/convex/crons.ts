// File: convex/crons.ts
// Purpose: Cron jobs for scheduled tasks

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run daily to check for accounts to hard delete
// Runs every 24 hours to check for accounts marked for deletion > 15 days ago
// Note: UTC+3 timezone - adjust timing as needed
crons.interval(
  "hardDeleteAccounts",
  { hours: 24 },
  internal.users.hardDeleteExpiredAccounts,
  {}
);

export default crons;
