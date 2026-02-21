import {
  installGlobalStartupErrorHandlers,
} from "./lib/startupDiagnostics";

installGlobalStartupErrorHandlers();

require("expo-router/entry");
