import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator, SafeAreaView, Pressable } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';

interface FilePickerProps {
    onSelect: (file: any) => void;
    trigger?: React.ReactNode;
}

export function FilePicker({ onSelect, trigger }: FilePickerProps) {
    const files = useQuery(api.files.list, { category: 'chat' });
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredFiles = files?.filter(f =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    const getIconForMime = (mime: string) => {
        if (mime.startsWith('image/')) return 'image';
        if (mime.startsWith('video/')) return 'videocam';
        if (mime.startsWith('audio/')) return 'musical-notes';
        return 'document';
    };

    const renderFile = ({ item }: { item: any }) => (
        <Pressable
            style={({ pressed }) => [
                styles.fileCard,
                pressed && styles.fileCardPressed
            ]}
            onPress={() => {
                onSelect(item);
                setIsOpen(false);
            }}
        >
            <View style={styles.fileIconContainer}>
                <Ionicons name={getIconForMime(item.mimeType)} size={24} color={Theme.colors.primary} />
            </View>
            <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.fileMeta}>
                    {(item.size / 1024).toFixed(1)} KB · {new Date(item._creationTime).toLocaleDateString()}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.textSecondary} />
        </Pressable>
    );

    return (
        <>
            <TouchableOpacity onPress={() => setIsOpen(true)}>
                {trigger || <Ionicons name="cloud-download" size={24} color={Theme.colors.textSecondary} />}
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={26} color={Theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Cloud Storage</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search your files..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {files === undefined ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={Theme.colors.primary} />
                        </View>
                    ) : filteredFiles.length > 0 ? (
                        <FlatList
                            data={filteredFiles}
                            renderItem={renderFile}
                            keyExtractor={item => item._id}
                            contentContainerStyle={styles.listContent}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    ) : (
                        <View style={styles.centerContainer}>
                            <Ionicons name="cloud-offline-outline" size={64} color="#eee" />
                            <Text style={styles.emptyText}>No files found in cloud</Text>
                        </View>
                    )}
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.surfaceSecondary,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: Theme.colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.divider,
    },
    closeButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...Theme.typography.h3,
        color: Theme.colors.textPrimary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: Theme.borderRadius.md,
        height: 48,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        ...Theme.typography.body,
        color: Theme.colors.textPrimary,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: Theme.colors.surface,
    },
    fileCardPressed: {
        opacity: 0.7,
    },
    fileIconContainer: {
        width: 44,
        height: 44,
        borderRadius: Theme.borderRadius.sm,
        backgroundColor: Theme.colors.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    fileDetails: {
        flex: 1,
    },
    fileName: {
        ...Theme.typography.body,
        fontWeight: '600',
        color: Theme.colors.textPrimary,
    },
    fileMeta: {
        ...Theme.typography.caption,
        color: Theme.colors.textSecondary,
        marginTop: 2,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyText: {
        ...Theme.typography.body,
        color: Theme.colors.textSecondary,
        marginTop: 12,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: Theme.colors.divider,
    },
});
