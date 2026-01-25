import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and get Expo push token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  try {
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permissions not granted");
      return null;
    }

    // Get the Expo push token
    // Note: projectId is optional if using EAS Build
    const tokenData = await Notifications.getExpoPushTokenAsync();

    token = tokenData.data;
    console.log("Expo push token:", token);

    // Configure Android channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  } catch (error) {
    console.error("Error registering for push notifications:", error);
  }

  return token;
}

/**
 * Setup notification handlers for received and tapped notifications
 */
export function setupNotificationHandlers() {
  // Handle notification received while app is in foreground
  Notifications.addNotificationReceivedListener((notification) => {
    console.log("Notification received:", notification);
    // You can show a custom in-app notification here if needed
  });

  // Handle notification tapped
  Notifications.addNotificationResponseReceivedListener((response) => {
    console.log("Notification tapped:", response);
    
    const data = response.notification.request.content.data;
    
    // Navigate to chat if chatId is present
    // Import router dynamically to avoid issues
    if (data?.chatId) {
      // Use dynamic import to avoid circular dependencies
      import("expo-router").then(({ router }) => {
        router.push(`/chat/${data.chatId}`);
      });
    }
  });
}

/**
 * Get the current notification permissions status
 */
export async function getNotificationPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
  return await Notifications.getPermissionsAsync();
}
