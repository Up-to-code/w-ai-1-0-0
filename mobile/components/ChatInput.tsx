import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { useMutation, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { ProductPicker } from './ProductPicker';
import { TemplatePicker } from './TemplatePicker';
import { FilePicker } from './FilePicker';

interface ChatInputProps {
    chatId: string;
    isWindowOpen: boolean;
}

export function ChatInput({ chatId, isWindowOpen }: ChatInputProps) {
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    // Convex Hooks
    const sendMessage = useMutation(api.chat.sendMessage);
    const generateUploadUrl = useMutation(api.files.generateUploadUrl);
    const saveFile = useMutation(api.files.saveFile);
    const uploadMediaToMeta = useAction(api.whatsapp.uploadMedia);
    const saveExternalImage = useAction(api.files.saveExternalImage);

    const handleSendText = async () => {
        if (!text.trim() || loading || !isWindowOpen) return;

        setLoading(true);
        try {
            await sendMessage({
                chatId: chatId as any,
                content: text.trim(),
                type: 'text'
            });
            setText('');
        } catch (e) {
            console.error(e);
            Alert.alert("خطأ", "فشل في إرسال الرسالة");
        } finally {
            setLoading(false);
        }
    };

    const handleSendCloudFile = async (file: any) => {
        if (!isWindowOpen) {
            Alert.alert("تنبيه", "انتهت مهلة الـ 24 ساعة. يمكنك إرسال قوالب فقط.");
            return;
        }
        setLoading(true);
        try {
            const mediaId = await uploadMediaToMeta({
                storageId: file.storageId,
                type: file.mimeType,
            });

            const type = file.mimeType.startsWith('image/') ? 'image' :
                file.mimeType.startsWith('video/') ? 'video' : 'document';

            await sendMessage({
                chatId: chatId as any,
                type: type as any,
                content: "",
                mediaId,
                storageId: file.storageId,
            });
        } catch (e) {
            console.error(e);
            Alert.alert("خطأ", "فشل في إرسال الملف");
        } finally {
            setLoading(false);
        }
    };

    const handlePickImage = async () => {
        if (!isWindowOpen) {
            Alert.alert("تنبيه", "انتهت مهلة الـ 24 ساعة. يمكنك إرسال قوالب فقط.");
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            await uploadAndSendMedia(asset.uri, asset.mimeType || 'image/jpeg', 'image', asset.fileName || 'image.jpg', asset.fileSize);
        }
    };

    const handlePickDocument = async () => {
        if (!isWindowOpen) {
            Alert.alert("تنبيه", "انتهت مهلة الـ 24 ساعة. يمكنك إرسال قوالب فقط.");
            return;
        }
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
        });

        if (!result.canceled) {
            const asset = result.assets[0];
            await uploadAndSendMedia(asset.uri, asset.mimeType || 'application/octet-stream', 'document', asset.name, asset.size);
        }
    };

    const uploadAndSendMedia = async (uri: string, mimeType: string, type: string, name: string, size?: number) => {
        setLoading(true);
        try {
            const postUrl = await generateUploadUrl();
            const response = await fetch(uri);
            const blob = await response.blob();

            const result = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": mimeType },
                body: blob,
            });
            const { storageId } = await result.json();

            await saveFile({
                storageId,
                name,
                mimeType,
                size: size || 0,
                category: "chat" as any,
            });

            const mediaId = await uploadMediaToMeta({
                storageId,
                type: mimeType,
            });

            await sendMessage({
                chatId: chatId as any,
                type: type as any,
                content: "",
                mediaId,
                storageId,
            });

        } catch (e) {
            console.error("Upload failed", e);
            Alert.alert("خطأ في الرفع", "فشل إرسال الملف، يرجى المحاولة لاحقاً");
        } finally {
            setLoading(false);
        }
    };

    const handleSendProduct = async (product: any) => {
        if (!isWindowOpen) {
            Alert.alert("تنبيه", "انتهت مهلة الـ 24 ساعة. يمكنك إرسال قوالب فقط.");
            return;
        }
        setLoading(true);
        try {
            if (!product.image) {
                await sendMessage({
                    chatId: chatId as any,
                    content: `*${product.name}*\n${product.price} ${product.currency}\n\n${product.url || ""}`,
                    type: "text"
                });
                return;
            }

            const { storageId, mimeType } = await saveExternalImage({
                url: product.image,
                name: `${product.name}.jpg`,
            });

            const mediaId = await uploadMediaToMeta({
                storageId,
                type: mimeType,
            });

            await sendMessage({
                chatId: chatId as any,
                type: "image",
                content: `*${product.name}*\n\n${product.url || ""}`,
                mediaId,
                storageId,
            });
        } catch (e) {
            console.error(e);
            Alert.alert("خطأ", "فشل في إرسال المنتج");
        } finally {
            setLoading(false);
        }
    };

    const handleSendTemplate = async (template: any) => {
        setLoading(true);
        try {
            await sendMessage({
                chatId: chatId as any,
                type: "template",
                content: template.name,
                template: {
                    name: template.name,
                    language: template.language,
                    components: []
                },
            });
        } catch (e) {
            console.error(e);
            Alert.alert("خطأ", "فشل في إرسال القالب");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.actionToolbar}>
                <View style={styles.quickActions}>
                    <TemplatePicker onSelect={handleSendTemplate} />
                    <ProductPicker onSelect={handleSendProduct} />
                    <FilePicker onSelect={handleSendCloudFile} />

                    <TouchableOpacity style={[styles.actionButton, !isWindowOpen && styles.actionDisabled]} onPress={handlePickImage} disabled={loading || !isWindowOpen}>
                        <Ionicons name="camera" size={22} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, !isWindowOpen && styles.actionDisabled]} onPress={handlePickDocument} disabled={loading || !isWindowOpen}>
                        <Ionicons name="attach" size={24} color={Theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.inputSection}>
                <View style={[styles.inputWrapper, !isWindowOpen && styles.inputWrapperDisabled]}>
                    <TextInput
                        style={styles.input}
                        placeholder={isWindowOpen ? "اكتب رسالة..." : "انتهت الـ 24 ساعة. أرسل قالباً."}
                        placeholderTextColor={Theme.colors.textSecondary}
                        value={text}
                        onChangeText={setText}
                        multiline
                        maxLength={4000}
                        editable={!loading && isWindowOpen}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.sendCircle, (!text.trim() || loading || !isWindowOpen) && styles.sendDisabled]}
                    onPress={handleSendText}
                    disabled={!text.trim() || loading || !isWindowOpen}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="white" />
                    ) : (
                        <Ionicons name="send" size={20} color="white" />
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        paddingBottom: Platform.OS === 'ios' ? 34 : 12,
        paddingTop: 8,
    },
    actionToolbar: {
        marginBottom: 8,
    },
    quickActions: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        gap: 16,
    },
    actionButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: Theme.colors.surfaceSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Theme.colors.border,
    },
    inputSection: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 8,
        gap: 6,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: 'white',
        borderRadius: 25,
        paddingHorizontal: 12,
        paddingVertical: 2,
        minHeight: 48,
        justifyContent: 'center',
    },
    inputWrapperDisabled: {
        backgroundColor: '#f0f2f5',
        opacity: 0.8,
    },
    input: {
        ...Theme.typography.body,
        minHeight: 44,
        maxHeight: 120,
        color: Theme.colors.textPrimary,
        paddingTop: 10,
        textAlign: 'right',
    },
    sendCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#00a884', // WhatsApp Action Green
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendDisabled: {
        backgroundColor: Theme.colors.statusSent,
        shadowOpacity: 0.1,
    },
    actionDisabled: {
        opacity: 0.5,
    },
});
