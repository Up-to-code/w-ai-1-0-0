import * as SecureStore from "expo-secure-store";

const AUTH_TOKEN_KEY = "auth_token";
const USER_ID_KEY = "user_id";
const USER_ROLE_KEY = "user_role";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const LOCALE_KEY = "locale";
const DIRECTION_KEY = "direction";
const ACTIVE_PHONE_NUMBER_ID_KEY = "w_ai_active_phone_number_id";

export type UserRole = "admin" | "agent" | "user";
export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";

async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    console.warn(`[storage] failed to read key ${key}`, error);
    return null;
  }
}

async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (error) {
    console.warn(`[storage] failed to write key ${key}`, error);
  }
}

async function safeDeleteItem(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn(`[storage] failed to delete key ${key}`, error);
  }
}

export const storage = {
  // Auth token storage
  async setAuthToken(token: string): Promise<void> {
    await safeSetItem(AUTH_TOKEN_KEY, token);
  },

  async getAuthToken(): Promise<string | null> {
    return await safeGetItem(AUTH_TOKEN_KEY);
  },

  async removeAuthToken(): Promise<void> {
    await safeDeleteItem(AUTH_TOKEN_KEY);
  },

  // User ID storage
  async setUserId(userId: string): Promise<void> {
    await safeSetItem(USER_ID_KEY, userId);
  },

  async getUserId(): Promise<string | null> {
    return await safeGetItem(USER_ID_KEY);
  },

  async removeUserId(): Promise<void> {
    await safeDeleteItem(USER_ID_KEY);
  },

  // User role storage
  async setUserRole(role: UserRole): Promise<void> {
    await safeSetItem(USER_ROLE_KEY, role);
  },

  async getUserRole(): Promise<UserRole | null> {
    const value = await safeGetItem(USER_ROLE_KEY);
    return value as UserRole | null;
  },

  async removeUserRole(): Promise<void> {
    await safeDeleteItem(USER_ROLE_KEY);
  },

  // Biometric enabled flag
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await safeSetItem(BIOMETRIC_ENABLED_KEY, enabled.toString());
  },

  async getBiometricEnabled(): Promise<boolean> {
    const value = await safeGetItem(BIOMETRIC_ENABLED_KEY);
    return value === "true";
  },

  // Locale storage
  async setLocale(locale: Locale): Promise<void> {
    await safeSetItem(LOCALE_KEY, locale);
  },

  async getLocale(): Promise<Locale> {
    const value = await safeGetItem(LOCALE_KEY);
    return (value as Locale) || "ar"; // Default to Arabic
  },

  // Direction storage
  async setDirection(direction: Direction): Promise<void> {
    await safeSetItem(DIRECTION_KEY, direction);
  },

  async getDirection(): Promise<Direction> {
    const value = await safeGetItem(DIRECTION_KEY);
    return (value as Direction) || "rtl"; // Default to RTL
  },

  // Active WhatsApp number (for multi-number support)
  async setActivePhoneNumberId(id: string | null): Promise<void> {
    if (id == null) {
      await safeDeleteItem(ACTIVE_PHONE_NUMBER_ID_KEY);
    } else {
      await safeSetItem(ACTIVE_PHONE_NUMBER_ID_KEY, id);
    }
  },

  async getActivePhoneNumberId(): Promise<string | null> {
    return await safeGetItem(ACTIVE_PHONE_NUMBER_ID_KEY);
  },

  // Clear all auth data
  async clearAuth(): Promise<void> {
    await Promise.all([
      this.removeAuthToken(),
      this.removeUserId(),
      this.removeUserRole(),
      safeDeleteItem(ACTIVE_PHONE_NUMBER_ID_KEY),
    ]);
  },
};
