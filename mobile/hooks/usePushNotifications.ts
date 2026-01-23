import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true
    }),
});

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
    const [notification, setNotification] = useState<Notifications.Notification | undefined>();
    const notificationListener = useRef<Notifications.Subscription | null>(null);
    const responseListener = useRef<Notifications.Subscription | null>(null);

    // We use existing API structure
    const recordToken = useMutation(api.notifications.recordPushNotificationToken);

    useEffect(() => {
        registerForPushNotificationsAsync().then(async (token) => {
            setExpoPushToken(token);
            if (token) {
                // Retrieve userId from storage
                const userId = await SecureStore.getItemAsync("userId");
                if (userId) {
                    // Register with Convex
                    // @ts-ignore
                    recordToken({ token, userId: userId as any }).catch(e => console.log("Failed to register token:", e));
                } else {
                    console.log("No userId found, skipping push token registration");
                }
            }
        });

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
            // Handle navigation if needed
            // const chatId = response.notification.request.content.data.chatId;
        });

        return () => {
            notificationListener.current &&
                notificationListener.current.remove();
            responseListener.current &&
                responseListener.current.remove();
        };
    }, []);

    return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            // alert('Failed to get push token for push notification!');
            console.log('Failed to get push token for push notification!');
            return;
        }

        try {
            const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log("Expo Push Token:", token);
        } catch (e) {
            console.error("Error getting token:", e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
