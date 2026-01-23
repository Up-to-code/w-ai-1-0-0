import { View, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, StatusBar, ImageBackground } from 'react-native';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import * as SecureStore from 'expo-secure-store';
import { useState, useEffect, useMemo } from 'react';
import { MessageBubble } from '@/components/MessageBubble';
import { ChatHeader } from '@/components/ChatHeader';
import { ChatInput } from '@/components/ChatInput';
import { Theme } from '@/constants/Theme';
import { FlashList } from '@shopify/flash-list';

export default function ChatScreen() {
    const { id } = useLocalSearchParams();
    const chatId = id as any;

    const [userId, setUserId] = useState<string | null>(null);
    useEffect(() => {
        SecureStore.getItemAsync("userId").then(setUserId);
    }, []);

    const user = useQuery(api.users.getProfile, userId ? { userId: userId as any } : "skip" as any);

    useEffect(() => {
        if (user && user.role !== 'admin' && user.role !== 'agent') {
            router.replace("/");
        }
    }, [user]);

    // Queries
    const messages = useQuery(api.chat.getMessages, { chatId });
    const chat = useQuery(api.chat.getChat, { chatId });

    // Mutations
    const markAsRead = useMutation(api.chat.markAsRead);

    useEffect(() => {
        if (chatId && messages?.length) {
            markAsRead({ chatId }).catch(console.error);
        }
    }, [chatId, messages?.length]);

    // Prepare messages (Newest -> Oldest for inverted list)
    const sortedMessages = useMemo(() => {
        if (!messages) return [];
        return [...messages].reverse();
    }, [messages]);

    // Check 24 hour window
    const isWindowOpen = useMemo(() => {
        if (!messages || messages.length === 0) return true; // New chat, allow template or initial message depends on provider

        const lastInbound = [...messages]
            .reverse()
            .find(m => m.direction === 'inbound');

        if (!lastInbound) return false; // Never received message? WhatsApp usually requires template first

        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        return lastInbound.timestamp > twentyFourHoursAgo;
    }, [messages]);

    if (messages === undefined || chat === undefined || !user || (user.role !== 'admin' && user.role !== 'agent')) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <Stack.Screen options={{ headerShown: false }} />

            <ChatHeader
                chatId={chatId}
                contactName={chat?.contactName || "Unknown"}
                contactPhone={chat?.contactPhone}
                aiMode={chat?.aiMode}
            />

            <ImageBackground
                source={require('../../assets/chat_bg.jpg')}
                style={styles.backgroundImage}
                imageStyle={styles.backgroundImageStyle}
            >
                <KeyboardAvoidingView
                    style={styles.keyboardContainer}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                >
                    <View style={{ flex: 1 }}>
                        <FlashList
                            data={sortedMessages}
                            renderItem={({ item }) => <MessageBubble message={item} />}
                            keyExtractor={item => item._id}
                            inverted
                            estimatedItemSize={80}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    </View>

                    <ChatInput chatId={chatId} isWindowOpen={isWindowOpen} />
                </KeyboardAvoidingView>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.chatBackground,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
    },
    backgroundImageStyle: {
        opacity: 0.85,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Theme.colors.chatBackground,
    },
    keyboardContainer: {
        flex: 1,
    },
    listContent: {
        paddingVertical: 16,
    },
});
