import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { TemplatePicker } from "../TemplatePicker";
import { ProductPicker } from "../ProductPicker";
import { AudioRecorder } from "../AudioRecorder";
import { MediaLibraryModal } from "../MediaLibraryModal";
import { CameraScreen } from "../CameraScreen";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Message {
  _id: string;
  direction: "inbound" | "outbound";
  type: string;
  content?: string;
  mediaUrl?: string;
  timestamp: number;
  status?: string;
}

interface ChatInputProps {
  chatId: string;
  replyTo?: Message | null;
  onReplyCancel?: () => void;
}

export function ChatInput({ chatId, replyTo, onReplyCancel }: ChatInputProps) {
  const insets = useSafeAreaInsets();
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showCameraScreen, setShowCameraScreen] = useState(false);
  
  const sendMessage = useMutation(api.chat.sendMessage);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const uploadMediaToMeta = useAction(api.whatsapp.uploadMedia);
  const saveExternalImage = useAction(api.files.saveExternalImage);

  const handleSendText = async () => {
    if (!inputValue.trim() || isSending) return;

    const content = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      await sendMessage({
        chatId: chatId as any,
        content,
        type: "text",
        replyTo: replyTo?._id,
      });
      if (onReplyCancel) {
        onReplyCancel();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setInputValue(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendTemplate = useCallback(async (template: any) => {
    setIsSending(true);
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
    } catch (error) {
      console.error("Failed to send template:", error);
      Alert.alert("Error", "Failed to send template");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage]);

  const handleSendProduct = useCallback(async (product: any) => {
    setIsSending(true);
    try {
      const textCaption = `*${product.name}*\n${product.price} ${product.currency}\n\n${product.description ? product.description.substring(0, 100) + (product.description.length > 100 ? "..." : "") : ""}`;

      if (!product.image) {
        await sendMessage({ 
          chatId: chatId as any, 
          content: textCaption + `\n${product.url || ""}`, 
          type: "text" 
        });
        return;
      }

      const fileName = `${product.name.replace(/\s+/g, '_')}.jpg`;
      const { storageId, mimeType } = await saveExternalImage({
        url: product.image,
        name: fileName,
      });

      const mediaId = await uploadMediaToMeta({
        storageId: storageId,
        type: mimeType,
      });

      const formattedCaption = `*${product.name}*\n\n${product.description ? product.description.substring(0, 150) + (product.description.length > 150 ? "..." : "") : ""}\n\n${product.url || ""}`;

      await sendMessage({
        chatId: chatId as any,
        type: "image",
        content: formattedCaption,
        mediaId: mediaId,
        storageId: storageId,
      });
    } catch (error) {
      console.error("Failed to send product:", error);
      Alert.alert("Error", "Failed to send product");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage, saveExternalImage, uploadMediaToMeta]);

  const handlePickImage = useCallback(async () => {
    setShowAttachMenu(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant photo library access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setIsSending(true);

    try {
      // 1. Get upload URL
      const postUrl = await generateUploadUrl();
      
      // 2. Fetch image from local URI
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      // 3. Upload to Convex storage
      const uploadResponse = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType || "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      const { storageId } = await uploadResponse.json();
      
      if (!storageId) {
        throw new Error("No storageId returned");
      }

      // 4. Save file metadata
      await saveFile({
        storageId,
        name: asset.fileName || `image_${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize || blob.size,
        category: "chat",
      });

      // 5. Upload to Meta WhatsApp API
      const mediaId = await uploadMediaToMeta({
        storageId: storageId,
        type: asset.mimeType || "image/jpeg",
      });

      // 6. Send as image message
      await sendMessage({
        chatId: chatId as any,
        type: "image",
        content: "",
        mediaId: mediaId,
        storageId: storageId,
      });
    } catch (error) {
      console.error("Failed to send image:", error);
      Alert.alert("Error", "Failed to send image");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage, generateUploadUrl, saveFile, uploadMediaToMeta]);

  const handlePickVideo = useCallback(async () => {
    setShowAttachMenu(false);
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant photo library access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setIsSending(true);

    try {
      // 1. Get upload URL
      const postUrl = await generateUploadUrl();
      
      // 2. Fetch video from local URI
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      // 3. Upload to Convex storage
      const uploadResponse = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType || "video/mp4" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      const { storageId } = await uploadResponse.json();
      
      if (!storageId) {
        throw new Error("No storageId returned");
      }

      // 4. Save file metadata
      await saveFile({
        storageId,
        name: asset.fileName || `video_${Date.now()}.mp4`,
        mimeType: asset.mimeType || "video/mp4",
        size: asset.fileSize || blob.size,
        category: "chat",
      });

      // 5. Upload to Meta WhatsApp API
      const mediaId = await uploadMediaToMeta({
        storageId: storageId,
        type: asset.mimeType || "video/mp4",
      });

      // 6. Send as video message
      await sendMessage({
        chatId: chatId as any,
        type: "video",
        content: asset.duration ? `Duration: ${Math.round(asset.duration)}s` : "",
        mediaId: mediaId,
        storageId: storageId,
      });
    } catch (error) {
      console.error("Failed to send video:", error);
      Alert.alert("Error", "Failed to send video");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage, generateUploadUrl, saveFile, uploadMediaToMeta]);

  const handleTakePhoto = useCallback(() => {
    setShowAttachMenu(false);
    setShowCameraScreen(true);
  }, []);

  const handleCameraCapture = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    setShowCameraScreen(false);
    setIsSending(true);

    try {
      // 1. Get upload URL
      const postUrl = await generateUploadUrl();
      
      // 2. Fetch image from local URI
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      // 3. Upload to Convex storage
      const uploadResponse = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType || "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      const { storageId } = await uploadResponse.json();
      
      if (!storageId) {
        throw new Error("No storageId returned");
      }

      // 4. Save file metadata
      await saveFile({
        storageId,
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize || blob.size,
        category: "chat",
      });

      // 5. Upload to Meta WhatsApp API
      const mediaId = await uploadMediaToMeta({
        storageId: storageId,
        type: asset.mimeType || "image/jpeg",
      });

      // 6. Send as image message
      await sendMessage({
        chatId: chatId as any,
        type: "image",
        content: "",
        mediaId: mediaId,
        storageId: storageId,
      });
    } catch (error) {
      console.error("Failed to send photo:", error);
      Alert.alert("Error", "Failed to send photo");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage, generateUploadUrl, saveFile, uploadMediaToMeta]);

  const handleVoiceNote = useCallback(async (uri: string) => {
    setIsRecording(false);
    setIsSending(true);

    try {
      // 1. Get upload URL
      const postUrl = await generateUploadUrl();

      // 2. Fetch audio file from local URI
      const response = await fetch(uri);
      const blob = await response.blob();

      // 3. Upload to Convex storage
      const uploadResponse = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": "audio/mp4" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload to storage");
      }

      const { storageId } = await uploadResponse.json();

      if (!storageId) {
        throw new Error("No storageId returned");
      }

      // 4. Save file metadata
      await saveFile({
        storageId,
        name: `voice_note_${Date.now()}.aac`,
        mimeType: "audio/mp4",
        size: blob.size,
        category: "chat",
      });

      // 5. Upload to Meta WhatsApp API
      const mediaId = await uploadMediaToMeta({
        storageId: storageId,
        type: "audio/mp4",
      });

      // 6. Send as audio message
      await sendMessage({
        chatId: chatId as any,
        type: "audio",
        content: "",
        mediaId: mediaId,
        storageId: storageId,
      });
    } catch (error) {
      console.error("Failed to send voice note:", error);
      Alert.alert("Error", "Failed to send voice note");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage, generateUploadUrl, saveFile, uploadMediaToMeta]);

  const handleSelectFromLibrary = useCallback(async (file: any) => {
    setIsSending(true);
    try {
      // Upload to Meta WhatsApp API
      const mediaId = await uploadMediaToMeta({
        storageId: file.storageId,
        type: file.mimeType,
      });

      // Determine message type
      let type = "document";
      if (file.mimeType.startsWith("image")) type = "image";
      else if (file.mimeType.startsWith("video")) type = "video";
      else if (file.mimeType.startsWith("audio")) type = "audio";

      // Send message
      await sendMessage({
        chatId: chatId as any,
        type: type as any,
        content: "",
        mediaId: mediaId,
        storageId: file.storageId,
      });
    } catch (error) {
      console.error("Failed to send file from library:", error);
      Alert.alert("Error", "Failed to send file");
    } finally {
      setIsSending(false);
    }
  }, [chatId, sendMessage, uploadMediaToMeta]);

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Audio Recorder */}
      {isRecording && (
        <AudioRecorder
          onRecordingComplete={handleVoiceNote}
          onCancel={() => setIsRecording(false)}
        />
      )}

      {/* Attachment Menu */}
      {!isRecording && showAttachMenu && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.attachMenu}
        >
          <TouchableOpacity 
            style={styles.attachOption}
            onPress={() => {
              setShowAttachMenu(false);
              setShowTemplatePicker(true);
            }}
            accessibilityLabel="Template"
            accessibilityRole="button"
          >
            <View style={[styles.attachIcon, { backgroundColor: "#007AFF" }]}>
              <Ionicons name="document-text" size={22} color="#FFF" />
            </View>
            <Text style={styles.attachLabel}>Template</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.attachOption}
            onPress={() => {
              setShowAttachMenu(false);
              setShowProductPicker(true);
            }}
            accessibilityLabel="Product"
            accessibilityRole="button"
          >
            <View style={[styles.attachIcon, { backgroundColor: "#FF9500" }]}>
              <Ionicons name="cube" size={22} color="#FFF" />
            </View>
            <Text style={styles.attachLabel}>Product</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.attachOption}
            onPress={() => {
              setShowAttachMenu(false);
              setShowMediaLibrary(true);
            }}
            accessibilityLabel="Library"
            accessibilityRole="button"
          >
            <View style={[styles.attachIcon, { backgroundColor: "#34C759" }]}>
              <Ionicons name="folder" size={22} color="#FFF" />
            </View>
            <Text style={styles.attachLabel}>Library</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.attachOption}
            onPress={handlePickImage}
            accessibilityLabel="Photo"
            accessibilityRole="button"
          >
            <View style={[styles.attachIcon, { backgroundColor: "#34C759" }]}>
              <Ionicons name="image" size={22} color="#FFF" />
            </View>
            <Text style={styles.attachLabel}>Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.attachOption}
            onPress={handleTakePhoto}
            accessibilityLabel="Camera"
            accessibilityRole="button"
          >
            <View style={[styles.attachIcon, { backgroundColor: "#AF52DE" }]}>
              <Ionicons name="camera" size={22} color="#FFF" />
            </View>
            <Text style={styles.attachLabel}>Camera</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.attachOption}
            onPress={handlePickVideo}
            accessibilityLabel="Video"
            accessibilityRole="button"
          >
            <View style={[styles.attachIcon, { backgroundColor: "#5856D6" }]}>
              <Ionicons name="videocam" size={22} color="#FFF" />
            </View>
            <Text style={styles.attachLabel}>Video</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.attachOption}
            onPress={() => {
              setShowAttachMenu(false);
              setIsRecording(true);
            }}
            accessibilityLabel="Voice"
            accessibilityRole="button"
          >
            <View style={[styles.attachIcon, { backgroundColor: "#FF3B30" }]}>
              <Ionicons name="mic" size={22} color="#FFF" />
            </View>
            <Text style={styles.attachLabel}>Voice</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Reply Preview */}
      {replyTo && !isRecording && (
        <View style={styles.replyPreview}>
          <View style={styles.replyPreviewContent}>
            <View style={styles.replyPreviewLine} />
            <View style={styles.replyPreviewInfo}>
              <Text style={styles.replyPreviewLabel} numberOfLines={1}>
                Replying to {replyTo.type === "text" 
                  ? replyTo.content?.substring(0, 30) || "message"
                  : `${replyTo.type} message`}
              </Text>
              {replyTo.content && replyTo.type === "text" && (
                <Text style={styles.replyPreviewText} numberOfLines={1}>
                  {replyTo.content}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.replyCancelButton}
            onPress={onReplyCancel}
            accessibilityLabel="Cancel reply"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={20} color="#667781" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Row */}
      {!isRecording && (
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={() => setShowAttachMenu(!showAttachMenu)}
          disabled={isSending}
          accessibilityLabel="Open attachment menu"
          accessibilityRole="button"
        >
          <Ionicons 
            name={showAttachMenu ? "close" : "add"} 
            size={24} 
            color={showAttachMenu ? "#007AFF" : "#666"} 
          />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            value={inputValue}
            onChangeText={setInputValue}
            multiline
            maxLength={4096}
            editable={!isSending}
            onFocus={() => setShowAttachMenu(false)}
            accessibilityLabel="Message input"
            accessibilityRole="textbox"
            accessibilityHint="Type your message here"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputValue.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSendText}
          disabled={!inputValue.trim() || isSending}
          accessibilityLabel={inputValue.trim() ? "Send message" : "Send button disabled"}
          accessibilityRole="button"
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
      )}

      {/* Template Picker Modal */}
      <TemplatePicker
        visible={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={handleSendTemplate}
      />

      {/* Product Picker Modal */}
      <ProductPicker
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelect={handleSendProduct}
      />

      {/* Media Library Modal */}
      <MediaLibraryModal
        visible={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onSelect={handleSelectFromLibrary}
      />

      {/* Camera Screen Modal */}
      <CameraScreen
        visible={showCameraScreen}
        onClose={() => setShowCameraScreen(false)}
        onCapture={handleCameraCapture}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  attachMenu: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    gap: 16,
  },
  attachOption: {
    alignItems: "center",
  },
  attachIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  attachLabel: {
    fontSize: 12,
    color: "#666",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    gap: 8,
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  inputContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    minHeight: 36,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    color: "#000",
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F5F5F5",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 8,
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  replyPreviewLine: {
    width: 3,
    height: 40,
    backgroundColor: "#007AFF",
    borderRadius: 2,
  },
  replyPreviewInfo: {
    flex: 1,
  },
  replyPreviewLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 2,
  },
  replyPreviewText: {
    fontSize: 12,
    color: "#667781",
  },
  replyCancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
