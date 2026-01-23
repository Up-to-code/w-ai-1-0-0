import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, SafeAreaView } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';

interface Template {
    _id: string;
    name: string;
    language: string;
    category: string;
    status: string;
    content?: string;
}

interface TemplatePickerProps {
    onSelect: (template: Template) => void;
    trigger?: React.ReactNode;
}

export function TemplatePicker({ onSelect, trigger }: TemplatePickerProps) {
    const templates = useQuery(api.templates.list);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<'approved' | 'all'>('approved');

    const handleOpen = () => {
        setIsOpen(true);
    };

    const filterTemplates = (list: Template[]) => {
        let filtered = list;
        if (activeTab === 'approved') {
            filtered = list.filter(t => t.status === "APPROVED");
        }
        if (searchQuery) {
            filtered = filtered.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return filtered;
    };

    const displayTemplates = templates ? filterTemplates(templates) : [];

    const renderTemplate = ({ item }: { item: Template }) => (
        <TouchableOpacity
            style={styles.templateCard}
            onPress={() => {
                if (item.status === 'APPROVED') {
                    onSelect(item);
                    setIsOpen(false);
                }
            }}
            disabled={item.status !== 'APPROVED' && activeTab === 'all'}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.templateName}>{item.name}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'APPROVED' ? '#e6fcf5' : '#fff9db' }
                ]}>
                    <Text style={[
                        styles.statusText,
                        { color: item.status === 'APPROVED' ? '#087f5b' : '#f08c00' }
                    ]}>{item.status}</Text>
                </View>
            </View>
            <Text style={styles.templateInfo}>{item.category} · {item.language}</Text>
            {item.content && (
                <Text style={styles.templateContent} numberOfLines={2}>{item.content}</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity onPress={handleOpen} style={styles.triggerButton}>
                {trigger || <Ionicons name="document-text" size={24} color={Theme.colors.textSecondary} />}
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>قوالب الرسائل</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="بحث في القوالب..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
                            onPress={() => setActiveTab('approved')}
                        >
                            <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
                                معتمدة ({(templates || []).filter(t => t.status === "APPROVED").length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
                            onPress={() => setActiveTab('all')}
                        >
                            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                                الكل ({templates?.length || 0})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        data={displayTemplates}
                        renderItem={renderTemplate}
                        keyExtractor={item => item._id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="document-text-outline" size={64} color="#eee" />
                                <Text style={styles.emptyText}>لا توجد قوالب</Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    triggerButton: {
        padding: 5,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 44,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ddd',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Theme.colors.textPrimary,
        textAlign: 'right',
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        marginBottom: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: Theme.colors.primary,
    },
    tabText: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: Theme.colors.primary,
    },
    listContent: {
        padding: 12,
    },
    templateCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#eee',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    templateName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
        flex: 1,
        textAlign: 'right',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    templateInfo: {
        fontSize: 12,
        color: Theme.colors.textSecondary,
        marginTop: 4,
        textAlign: 'right',
    },
    templateContent: {
        fontSize: 14,
        color: Theme.colors.textSecondary,
        marginTop: 10,
        fontStyle: 'italic',
        textAlign: 'right',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 10,
        color: Theme.colors.textSecondary,
        fontSize: 16,
    },
});
