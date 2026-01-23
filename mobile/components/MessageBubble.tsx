import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';

interface MessageBubbleProps {
    message: {
        _id: string;
        direction: 'inbound' | 'outbound';
        type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
        content?: string;
        mediaUrl?: string | null;
        timestamp: number;
        status?: 'sent' | 'delivered' | 'read' | 'failed';
    };
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isOutbound = message.direction === 'outbound';

    const renderStatus = () => {
        if (!isOutbound) return null;

        const color = message.status === 'read' ? Theme.colors.statusRead : Theme.colors.statusSent;
        const iconName = message.status === 'read' || message.status === 'delivered'
            ? 'checkmark-done'
            : 'checkmark';

        return <Ionicons name={iconName} size={14} color={color} style={styles.statusIcon} />;
    };

    const renderWaveform = () => (
        <View style={styles.waveformContainer}>
            {[14, 20, 16, 24, 18, 22, 14, 18, 12, 16, 20, 14].map((h, i) => (
                <View key={i} style={[styles.waveformBar, { height: h, backgroundColor: isOutbound ? 'rgba(255,255,255,0.45)' : Theme.colors.divider }]} />
            ))}
        </View>
    );

    const renderContent = () => {
        switch (message.type) {
            case 'image':
                return message.mediaUrl ? (
                    <Image source={{ uri: message.mediaUrl }} style={styles.mediaImage} resizeMode="cover" />
                ) : (
                    <View style={styles.mediaPlaceholder}>
                        <Ionicons name="image" size={32} color={Theme.colors.textSecondary} />
                    </View>
                );

            case 'audio':
                return (
                    <View style={styles.audioContainer}>
                        <TouchableOpacity style={[styles.playButton, { backgroundColor: isOutbound ? 'white' : Theme.colors.primary }]}>
                            <Ionicons name="play" size={20} color={isOutbound ? Theme.colors.primary : 'white'} />
                        </TouchableOpacity>
                        <View style={styles.audioMain}>
                            {renderWaveform()}
                            <View style={styles.audioMeta}>
                                <Text style={[styles.audioDuration, { color: isOutbound ? 'rgba(255,255,255,0.8)' : Theme.colors.textSecondary }]}>0:05</Text>
                            </View>
                        </View>
                    </View>
                );

            case 'document':
                return (
                    <TouchableOpacity
                        style={[styles.documentContainer, { backgroundColor: isOutbound ? 'rgba(255,255,255,0.1)' : Theme.colors.surfaceSecondary }]}
                        onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
                    >
                        <View style={[styles.docIcon, { backgroundColor: isOutbound ? 'white' : Theme.colors.primary }]}>
                            <Ionicons name="document-text" size={20} color={isOutbound ? Theme.colors.primary : 'white'} />
                        </View>
                        <Text style={[styles.documentText, { color: isOutbound ? 'white' : Theme.colors.textPrimary }]}>Document.pdf</Text>
                    </TouchableOpacity>
                );

            default:
                return message.content ? (
                    <Text style={[styles.messageText, isOutbound ? styles.outboundText : styles.inboundText]}>
                        {message.content}
                    </Text>
                ) : null;
        }
    };

    const caption = message.type !== 'text' && message.content && message.content.trim() ? message.content : null;

    return (
        <View style={[styles.container, isOutbound ? styles.outboundContainer : styles.inboundContainer]}>
            <View style={[
                styles.bubble,
                isOutbound ? styles.outboundBubble : styles.inboundBubble,
                message.type === 'image' && styles.mediaBubble,
                message.type === 'audio' && styles.audioBubble
            ]}>
                {/* WhatsApp Bubble Tail */}
                <View style={[
                    styles.tail,
                    isOutbound ? styles.outboundTail : styles.inboundTail,
                ]} />

                {renderContent()}

                {caption && (
                    <View style={styles.captionContainer}>
                        <Text style={[styles.caption, isOutbound ? styles.outboundText : styles.inboundText]}>
                            {caption}
                        </Text>
                    </View>
                )}

                <View style={styles.footer}>
                    {renderStatus()}
                    <Text style={[styles.timestamp, isOutbound && styles.outboundTimestamp]}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 4,
        paddingHorizontal: 12,
        width: '100%',
    },
    outboundContainer: {
        alignItems: 'flex-end', // WhatsApp RTL: Outbound (Sent) on Left
    },
    inboundContainer: {
        alignItems: 'flex-start', // WhatsApp RTL: Inbound (Received) on Right
    },
    bubble: {
        maxWidth: '85%',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        position: 'relative',
        minWidth: 80,
    },
    outboundBubble: {
        backgroundColor: Theme.colors.outboundBubble,
        borderTopRightRadius: 0,
    },
    inboundBubble: {
        backgroundColor: Theme.colors.inboundBubble,
        borderTopLeftRadius: 0,
    },
    tail: {
        position: 'absolute',
        top: 0,
        width: 10,
        height: 10,
    },
    outboundTail: {
        right: -8,
        borderTopWidth: 8,
        borderTopColor: Theme.colors.outboundBubble,
        borderRightWidth: 8,
        borderRightColor: 'transparent',
    },
    inboundTail: {
        left: -8,
        borderTopWidth: 8,
        borderTopColor: Theme.colors.inboundBubble,
        borderLeftWidth: 8,
        borderLeftColor: 'transparent',
    },
    mediaBubble: {
        paddingHorizontal: 4,
        paddingTop: 4,
        paddingBottom: 4,
    },
    audioBubble: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        minWidth: 220,
    },
    messageText: {
        ...Theme.typography.body,
        lineHeight: 20,
        color: '#111b21',
    },
    outboundText: {
        color: '#111b21',
    },
    inboundText: {
        color: '#111b21',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 2,
    },
    timestamp: {
        ...Theme.typography.small,
        fontSize: 10,
        color: '#667781',
    },
    outboundTimestamp: {
        color: '#667781',
    },
    statusIcon: {
        marginLeft: 4,
    },
    mediaImage: {
        width: 260,
        height: 260,
        borderRadius: 14,
    },
    mediaPlaceholder: {
        width: 260,
        height: 150,
        borderRadius: 14,
        backgroundColor: Theme.colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    audioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    audioMain: {
        flex: 1,
        marginLeft: 12,
    },
    waveformContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 24,
        gap: 3,
    },
    waveformBar: {
        width: 3,
        borderRadius: 1.5,
    },
    audioMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    audioDuration: {
        ...Theme.typography.small,
        fontSize: 11,
    },
    documentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        minWidth: 200,
    },
    docIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentText: {
        marginLeft: 12,
        ...Theme.typography.body,
        fontWeight: 'bold',
    },
    captionContainer: {
        marginTop: 8,
        paddingHorizontal: 4,
    },
    caption: {
        ...Theme.typography.body,
    },
});
