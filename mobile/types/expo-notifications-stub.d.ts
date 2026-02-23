declare module "expo-notifications" {
  export type NotificationPermissionsStatus = "undetermined" | "granted" | "denied";

  export interface NotificationContent {
    data?: Record<string, unknown>;
  }
  export interface NotificationRequest {
    content: NotificationContent;
  }
  export interface Notification {
    request: NotificationRequest;
  }
  export interface NotificationResponse {
    notification: Notification;
  }

  export const requestPermissionsAsync: () => Promise<{ status: NotificationPermissionsStatus }>;
  export const getPermissionsAsync: () => Promise<{ status: NotificationPermissionsStatus }>;
  export const setNotificationHandler: (handler: {
    handleNotification?: (notification: Notification) => Promise<unknown> | unknown;
  }) => void;
  export const addNotificationReceivedListener: (
    listener: (notification: Notification) => void
  ) => { remove: () => void };
  export const addNotificationResponseReceivedListener: (
    listener: (response: NotificationResponse) => void
  ) => { remove: () => void };
  export const getExpoPushTokenAsync: (options?: { projectId?: string }) => Promise<{ data: string }>;
  export const setNotificationChannelAsync: (id: string, channel: unknown) => Promise<void>;
  export const AndroidImportance: { MAX: number; HIGH: number; DEFAULT: number; LOW: number; MIN: number; NONE: number };
}
