import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "auth_token";
const USER_ID_KEY = "user_id";
const USER_ROLE_KEY = "user_role";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const LOCALE_KEY = "locale";
const DIRECTION_KEY = "direction";

export type UserRole = "admin" | "agent" | "user";
export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";

export const storage = {
  // Auth token storage
  async setAuthToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  },

  async getAuthToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  },

  async removeAuthToken(): Promise<void> {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  },

  // User ID storage
  async setUserId(userId: string): Promise<void> {
    await SecureStore.setItemAsync(USER_ID_KEY, userId);
  },

  async getUserId(): Promise<string | null> {
    return await SecureStore.getItemAsync(USER_ID_KEY);
  },

  async removeUserId(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_ID_KEY);
  },

  // User role storage
  async setUserRole(role: UserRole): Promise<void> {
    await SecureStore.setItemAsync(USER_ROLE_KEY, role);
  },

  async getUserRole(): Promise<UserRole | null> {
    const value = await SecureStore.getItemAsync(USER_ROLE_KEY);
    return value as UserRole | null;
  },

  async removeUserRole(): Promise<void> {
    await SecureStore.deleteItemAsync(USER_ROLE_KEY);
  },

  // Biometric enabled flag
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, enabled.toString());
  },

  async getBiometricEnabled(): Promise<boolean> {
    const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return value === "true";
  },

  // Locale storage
  async setLocale(locale: Locale): Promise<void> {
    await SecureStore.setItemAsync(LOCALE_KEY, locale);
  },

  async getLocale(): Promise<Locale> {
    const value = await SecureStore.getItemAsync(LOCALE_KEY);
    return (value as Locale) || "ar"; // Default to Arabic
  },

  // Direction storage
  async setDirection(direction: Direction): Promise<void> {
    await SecureStore.setItemAsync(DIRECTION_KEY, direction);
  },

  async getDirection(): Promise<Direction> {
    const value = await SecureStore.getItemAsync(DIRECTION_KEY);
    return (value as Direction) || "rtl"; // Default to RTL
  },

  // Clear all auth data
  async clearAuth(): Promise<void> {
    await Promise.all([
      this.removeAuthToken(),
      this.removeUserId(),
      this.removeUserRole(),
    ]);
  },
};
