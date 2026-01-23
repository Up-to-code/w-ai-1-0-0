import { StyleSheet, TouchableOpacity, View, Text, TextInput, Modal, SafeAreaView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, useMemo } from 'react';
import { Theme } from '@/constants/Theme';
import { Avatar } from '@/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

export default function ContactsScreen() {
    const [userId, setUserId] = useState<string | null>(null);
    useEffect(() => {
        SecureStore.getItemAsync("userId").then(setUserId);
    }, []);

    const user = useQuery(api.users.getProfile, userId ? { userId: userId as any } : "skip" as any);
    const contacts = useQuery(api.contacts.list);
    const createContact = useMutation(api.contacts.create);
    const getOrCreateChat = useMutation(api.chat.getOrCreateChat);

    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newTags, setNewTags] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user && user.role !== 'admin') {
            Alert.alert("تنبيه", "عذراً، لا تملك صلاحية الوصول لهذه الصفحة");
            router.replace("/");
        }
    }, [user]);

    const filteredContacts = useMemo(() => {
        if (!contacts) return [];
        return contacts.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone.includes(searchQuery)
        );
    }, [contacts, searchQuery]);

    if (!user || user.role !== 'admin') {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
            </View>
        );
    }

    const handleAddContact = async () => {
        if (!newName || !newPhone) {
            Alert.alert("خطأ", "يرجى ملء الاسم ورقم الهاتف");
            return;
        }

        setIsSubmitting(true);
        try {
            await createContact({
                name: newName,
                phone: newPhone.replace(/\D/g, ''),
                email: newEmail || undefined,
                tags: newTags ? newTags.split(',').map(tag => tag.trim()) : undefined,
            });
            setIsAddModalOpen(false);
            setNewName('');
            setNewPhone('');
            setNewEmail('');
            setNewTags('');
            Alert.alert("نجاح", "تمت إضافة العميل بنجاح");
        } catch (e) {
            console.error(e);
            Alert.alert("خطأ", "فشل في إضافة العميل");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoToChat = async (contact: any) => {
        setIsSubmitting(true);
        try {
            const chat = await getOrCreateChat({
                contactPhone: contact.phone,
                contactName: contact.name,
            });
            if (chat) {
                router.push(`/chat/${chat._id}`);
            } else {
                Alert.alert("خطأ", "فشل في إنشاء المحادثة");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("خطأ", "فشل في فتح المحادثة");
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <Pressable
            style={({ pressed }) => [
                styles.contactCard,
                pressed && styles.contactCardPressed
            ]}
            onPress={() => handleGoToChat(item)}
        >
            <Avatar name={item.name} id={item._id} size={54} />
            <View style={styles.contactContent}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactPhone}>{item.phone}</Text>
            </View>
            <View style={styles.actionRow}>
                <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => handleGoToChat(item)}
                >
                    <Ionicons name="chatbubble-ellipses" size={20} color={Theme.colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionIcon, { marginLeft: 10 }]}
                    onPress={() => Alert.alert("اتصال", `جاري الاتصال بـ ${item.phone}...`)}
                >
                    <Ionicons name="call" size={20} color={Theme.colors.accent} />
                </TouchableOpacity>
            </View>
        </Pressable>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>العملاء</Text>
                    <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalOpen(true)}>
                        <Ionicons name="add" size={28} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchSection}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="بحث بالاسم أو الهاتف..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholderTextColor={Theme.colors.textSecondary}
                            textAlign="right"
                        />
                    </View>
                </View>

                {contacts === undefined ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={Theme.colors.primary} />
                    </View>
                ) : filteredContacts.length > 0 ? (
                    <FlashList
                        data={filteredContacts}
                        keyExtractor={item => item._id}
                        renderItem={renderItem}
                        estimatedItemSize={88}
                        contentContainerStyle={styles.listContent}
                    />
                ) : (
                    <View style={styles.centerContainer}>
                        <Ionicons name="people-outline" size={64} color={Theme.colors.divider} />
                        <Text style={styles.emptyText}>لا يوجد عملاء مطايقين</Text>
                    </View>
                )}
            </SafeAreaView>

            <Modal
                visible={isAddModalOpen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsAddModalOpen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalIndicator} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>عميل جديد</Text>
                            <TouchableOpacity onPress={() => setIsAddModalOpen(false)} style={styles.closeIcon}>
                                <Ionicons name="close" size={24} color={Theme.colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>الاسم بالكامل</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="مثال: أحمد منصور"
                                value={newName}
                                onChangeText={setNewName}
                                placeholderTextColor={Theme.colors.textSecondary}
                                textAlign="right"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>رقم الواتساب</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="مثال: 201015638178"
                                value={newPhone}
                                onChangeText={setNewPhone}
                                keyboardType="phone-pad"
                                placeholderTextColor={Theme.colors.textSecondary}
                                textAlign="right"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>البريد الإلكتروني (اختياري)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="example@mail.com"
                                value={newEmail}
                                onChangeText={setNewEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor={Theme.colors.textSecondary}
                                textAlign="right"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>الوسوم (اختياري، للفصل بينها استخدم فاصلة)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="عميل_مهم, مهتم, شراء_جديد"
                                value={newTags}
                                onChangeText={setNewTags}
                                placeholderTextColor={Theme.colors.textSecondary}
                                textAlign="right"
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleAddContact}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitButtonText}>إضافة العميل</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.surfaceSecondary,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 18,
        backgroundColor: Theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    headerTitle: {
        ...Theme.typography.h1,
        color: Theme.colors.textPrimary,
    },
    addButton: {
        backgroundColor: Theme.colors.primary,
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchSection: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.md,
        paddingHorizontal: 16,
        height: 56,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        ...Theme.typography.body,
        color: Theme.colors.textPrimary,
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Theme.colors.surface,
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
    },
    contactCardPressed: {
        transform: [{ scale: 0.98 }],
        opacity: 0.95,
    },
    contactContent: {
        flex: 1,
        marginHorizontal: 16,
    },
    contactName: {
        ...Theme.typography.h3,
        color: Theme.colors.textPrimary,
    },
    contactPhone: {
        ...Theme.typography.caption,
        color: Theme.colors.textSecondary,
        marginTop: 4,
        fontWeight: '600',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Theme.colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 100,
    },
    emptyText: {
        ...Theme.typography.h3,
        color: Theme.colors.textSecondary,
        marginTop: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.surface,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: 28,
        paddingBottom: 48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
    },
    modalIndicator: {
        width: 44,
        height: 6,
        backgroundColor: Theme.colors.divider,
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 36,
    },
    modalTitle: {
        ...Theme.typography.h2,
        color: Theme.colors.textPrimary,
    },
    closeIcon: {
        padding: 6,
    },
    inputGroup: {
        marginBottom: 24,
    },
    inputLabel: {
        ...Theme.typography.small,
        color: Theme.colors.textSecondary,
        marginBottom: 10,
        fontWeight: 'bold',
    },
    input: {
        backgroundColor: Theme.colors.surfaceSecondary,
        borderRadius: Theme.borderRadius.md,
        padding: 18,
        ...Theme.typography.body,
        color: Theme.colors.textPrimary,
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    submitButton: {
        backgroundColor: Theme.colors.primary,
        borderRadius: Theme.borderRadius.md,
        padding: 20,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: Theme.colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: 'white',
        ...Theme.typography.h3,
        fontWeight: 'bold',
    },
});
