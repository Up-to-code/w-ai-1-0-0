import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

let activeChatIdForForegroundSuppression: string | null = null;
let notificationHandlerConfigured = false;

export function setActiveChatForNotificationSuppression(chatId: string | null) {
  activeChatIdForForegroundSuppression = chatId;
}

export function configureNotificationHandler() {
  if (notificationHandlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const data = notification.request.content.data as { chatId?: string } | undefined;
        const isActiveChatNotification =
          !!data?.chatId &&
          !!activeChatIdForForegroundSuppression &&
          data.chatId === activeChatIdForForegroundSuppression;

        // Best practice: suppress noisy foreground alerts for the chat currently open on screen.
        return {
          shouldShowAlert: !isActiveChatNotification,
          shouldPlaySound: !isActiveChatNotification,
          shouldSetBadge: !isActiveChatNotification,
          shouldShowBanner: !isActiveChatNotification,
          shouldShowList: !isActiveChatNotification,
        };
      },
    });
    notificationHandlerConfigured = true;
  } catch (error) {
    console.warn("Failed to configure notification handler", error);
  }
}

/**
 * Request notification permissions and get Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    configureNotificationHandler();

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      if (__DEV__) console.log("[notifications] Permission not granted");
      return null;
    }

    // Get projectId from Constants
    const projectId = 
      Constants.expoConfig?.extra?.eas?.projectId || 
      Constants.expoConfig?.extra?.projectId ||
      Constants.easConfig?.projectId;

    // Get the Expo push token with projectId
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    token = tokenData.data;
    if (__DEV__) console.log("[notifications] Push token registered");

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    // Handle specific projectId error gracefully
    if (message.includes("projectId") || message.includes("No \"projectId\"")) {
      console.warn("Push notifications require a projectId. This is expected in Expo Go. For full push notification support, use a development build with EAS.");
      return null;
    }
    console.error("Error registering for push notifications:", error);
  }

  return token;
}

/**
 * Setup notification handlers for received and tapped notifications.
 * When onSetActivePhoneNumberId is provided (e.g. from WorkspaceContext), we call it with
 * data.phoneNumberId before navigating so the correct number's inbox is shown.
 */
export function setupNotificationHandlers(
  onSetActivePhoneNumberId?: (id: string) => void
) {
  let receivedSubscription:
    | { remove: () => void }
    | undefined;
  let responseSubscription:
    | { remove: () => void }
    | undefined;

  try {
  // Handle notification received while app is in foreground
    receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      if (__DEV__) console.log("[notifications] Received:", notification.request.content?.title);
    });

    // Handle notification tapped
    responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (__DEV__) console.log("[notifications] Tapped:", response.notification.request.content?.data);

      const data = response.notification.request.content.data as {
        chatId?: string;
        phoneNumberId?: string;
      };

      // Navigate to chat if chatId is present
      if (data?.chatId) {
        // Switch to the chat's number first so sidebar shows correct inbox (multi-number)
        if (data.phoneNumberId && onSetActivePhoneNumberId) {
          onSetActivePhoneNumberId(data.phoneNumberId);
        }
        import("expo-router").then((moduleNamespace) => {
          const ns = moduleNamespace as unknown as {
            router?: { push: (href: string) => void };
            default?: { router?: { push: (href: string) => void } };
          };
          const imperativeRouter = ns.router ?? ns.default?.router;
          imperativeRouter?.push(`/chat/${data.chatId}`);
        });
      }
    });
  } catch (error) {
    console.warn("Failed to setup notification listeners", error);
  }

  return () => {
    receivedSubscription?.remove?.();
    responseSubscription?.remove?.();
  };
}

/**
 * Get the current notification permissions status
 */
export async function getNotificationPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
