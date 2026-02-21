import {
  installGlobalStartupErrorHandlers,
  markStartupPhase,
} from "./lib/startupDiagnostics";

installGlobalStartupErrorHandlers();
void markStartupPhase("app_boot_start");

require("expo-router/entry");
