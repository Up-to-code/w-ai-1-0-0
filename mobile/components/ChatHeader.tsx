import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Theme } from '../constants/Theme';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface ChatHeaderProps {
    chatId: string;
    contactName: string;
    contactPhone?: string;
    aiMode?: boolean;
}

export function ChatHeader({ chatId, contactName, contactPhone, aiMode }: ChatHeaderProps) {
    const router = useRouter();
    const toggleAi = useMutation(api.chat.toggleAiMode);

    const handleToggleAi = () => {
        toggleAi({ chatId: chatId as any, enabled: !aiMode });
    };

    return (
        <View style={styles.container}>
            <View style={styles.leftContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>

                <View style={styles.profileContainer}>
                    <Avatar name={contactName} id={chatId} size={42} />
                    <View style={styles.infoContainer}>
                        <Text style={styles.name} numberOfLines={1}>{contactName}</Text>
                        <View style={styles.statusRow}>
                            <View style={styles.onlineDot} />
                            <Text style={styles.statusText}>نشط الآن</Text>
                        </View>
                    </View>
                </View>
            </View>

            <TouchableOpacity onPress={handleToggleAi} style={styles.aiButton} activeOpacity={0.8}>
                <View style={[styles.aiBadge, aiMode && styles.aiBadgeActive]}>
                    <Ionicons name="flash" size={14} color={aiMode ? 'white' : Theme.colors.textSecondary} />
                    <Text style={[styles.aiText, aiMode && styles.aiTextActive]}>AI</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Theme.colors.primary,
        paddingTop: Platform.OS === 'ios' ? 64 : 44,
        paddingBottom: 12,
        paddingHorizontal: 16,
        zIndex: 10,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: 8,
        marginLeft: -4,
        padding: 4,
    },
    profileContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    infoContainer: {
        marginLeft: 12,
        flex: 1,
    },
    name: {
        color: 'white',
        ...Theme.typography.h3,
        fontWeight: 'bold',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#25D366',
        marginRight: 6,
    },
    statusText: {
        color: 'rgba(255,255,255,0.85)',
        ...Theme.typography.small,
        fontSize: 11,
    },
    aiButton: {
        marginLeft: 12,
    },
    aiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surfaceSecondary,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    aiBadgeActive: {
        backgroundColor: Theme.colors.primary,
        borderColor: Theme.colors.primary,
    },
    aiText: {
        color: Theme.colors.textSecondary,
        ...Theme.typography.small,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    aiTextActive: {
        color: 'white',
    },
});
