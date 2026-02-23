import { useState, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface MediaLibraryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (file: any) => void;
  allowedTypes?: string[]; // "image", "video", "audio", "document"
}

export function MediaLibraryModal({
  visible,
  onClose,
  onSelect,
  allowedTypes,
}: MediaLibraryModalProps) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const [uploading, setUploading] = useState(false);

  const files = useQuery(api.files.list, {});
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);

  const filteredFiles = useMemo(() => {
    if (!files) return [];
    
    let filtered = files;
    
    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter((f) =>
        f.name.toLowerCase().includes(query)
      );
    }
    
    // Filter by allowed types
    if (allowedTypes && allowedTypes.length > 0) {
      filtered = filtered.filter((f) => {
        const type = f.mimeType.split("/")[0];
        return allowedTypes.some((t) => f.mimeType.includes(t));
      });
    }
    
    return filtered;
  }, [files, search, allowedTypes]);

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please grant photo library access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const postUrl = await generateUploadUrl();
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const uploadResponse = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType || "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload");
      }

      const { storageId } = await uploadResponse.json();

      await saveFile({
        storageId,
        name: asset.fileName || `file_${Date.now()}`,
        mimeType: asset.mimeType || "image/jpeg",
        size: asset.fileSize || blob.size,
        category: "chat",
      });

      // Switch to library tab to show the new file
      setActiveTab("library");
    } catch (error) {
      console.error("Upload failed", error);
      Alert.alert("Error", "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const renderFileItem = ({ item }: { item: any }) => {
    const isImage = item.mimeType.startsWith("image");
    const isVideo = item.mimeType.startsWith("video");
    const isAudio = item.mimeType.startsWith("audio");

    return (
      <TouchableOpacity
        style={styles.fileItem}
        onPress={() => {
          onSelect(item);
          onClose();
        }}
        accessibilityLabel={`Select ${item.name}`}
        accessibilityRole="button"
      >
        <View style={styles.fileThumbnail}>
          {isImage && item.url ? (
            <Image source={{ uri: item.url }} style={styles.thumbnailImage} />
          ) : isVideo ? (
            <Ionicons name="videocam" size={32} color="#007AFF" />
          ) : isAudio ? (
            <Ionicons name="musical-notes" size={32} color="#007AFF" />
          ) : (
            <Ionicons name="document" size={32} color="#007AFF" />
          )}
        </View>
        <Text style={styles.fileName} numberOfLines={2}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Media Library</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "library" && styles.tabActive]}
            onPress={() => setActiveTab("library")}
            accessibilityLabel="Library tab"
            accessibilityRole="tab"
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "library" && styles.tabTextActive,
              ]}
            >
              Library
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "upload" && styles.tabActive]}
            onPress={() => setActiveTab("upload")}
            accessibilityLabel="Upload tab"
            accessibilityRole="tab"
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "upload" && styles.tabTextActive,
              ]}
            >
              Upload
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        {activeTab === "library" && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search files..."
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
              accessibilityLabel="Search files"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearch("")}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {activeTab === "library" ? (
            !files ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : filteredFiles.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>
                  {search ? "No files found" : "No files. Upload new files."}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredFiles}
                renderItem={renderFileItem}
                keyExtractor={(item) => item._id}
                numColumns={2}
                {...({
                  contentContainerStyle: styles.listContent,
                  showsVerticalScrollIndicator: false,
                } as object)}
              />
            )
          ) : (
            <View style={styles.uploadContainer}>
              <TouchableOpacity
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
                onPress={handleUpload}
                disabled={uploading}
                accessibilityLabel="Upload file"
                accessibilityRole="button"
              >
                {uploading ? (
                  <ActivityIndicator size="large" color="#007AFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={48} color="#007AFF" />
                    <Text style={styles.uploadText}>Tap to upload</Text>
                    <Text style={styles.uploadHint}>
                      Images, videos, audio, or documents
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  tabTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F5F5F5",
    margin: 12,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  content: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  listContent: {
    padding: 12,
  },
  fileItem: {
    flex: 1,
    margin: 6,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    overflow: "hidden",
  },
  fileThumbnail: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  fileName: {
    padding: 8,
    fontSize: 12,
    color: "#000",
  },
  uploadContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  uploadButton: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 300,
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  uploadHint: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
