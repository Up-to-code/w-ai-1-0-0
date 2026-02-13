import React, { useState } from "react";
import {
  View,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Alert,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface MediaViewerModalProps {
  visible: boolean;
  mediaUrl: string;
  mediaType: "image" | "video";
  onClose: () => void;
  onDownload?: () => void;
}

export function MediaViewerModal({
  visible,
  mediaUrl,
  mediaType,
  onClose,
  onDownload,
}: MediaViewerModalProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const player = useVideoPlayer(mediaType === "video" ? mediaUrl : undefined, (player) => {
    if (player) {
      player.loop = false;
      player.muted = false;
    }
  });

  const handleDownload = async () => {
    if (downloading || !mediaUrl || mediaUrl.trim() === "") {
      Alert.alert("Error", "No media URL available");
      return;
    }

    try {
      setDownloading(true);

      // Request permissions
      if (mediaType === "image" || mediaType === "video") {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Please grant media library access to save files");
          setDownloading(false);
          return;
        }
      }

      // Download file
      const fileExtension = mediaType === "image" ? "jpg" : "mp4";
      const fileName = `download_${Date.now()}.${fileExtension}`;
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      
      if (!baseDir) {
        throw new Error("File system directory not available");
      }

      const fileUri = baseDir + fileName;
      const downloadResult = await FileSystem.downloadAsync(mediaUrl, fileUri);

      if (mediaType === "image" || mediaType === "video") {
        // Save to gallery
        await MediaLibrary.createAssetAsync(downloadResult.uri);
        Alert.alert("Success", `${mediaType === "image" ? "Image" : "Video"} saved to gallery`);
      } else {
        Alert.alert("Success", "File downloaded");
      }

      if (onDownload) {
        onDownload();
      }
    } catch (error) {
      console.error("Download failed:", error);
      Alert.alert("Error", "Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownload}
            disabled={downloading}
            accessibilityLabel="Download"
            accessibilityRole="button"
          >
            {downloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="download" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Media Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          maximumZoomScale={mediaType === "image" ? 5 : 1}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          {mediaType === "image" ? (
            <View style={styles.imageContainer}>
              {!mediaUrl || mediaUrl.trim() === "" ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="image-outline" size={64} color="#FFFFFF" />
                  <Text style={styles.errorText}>No image URL available</Text>
                </View>
              ) : imageLoading && !imageError ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : imageError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="image-outline" size={64} color="#FFFFFF" />
                  <Text style={styles.errorText}>Failed to load image</Text>
                </View>
              ) : (
                <Image
                  source={{ uri: mediaUrl }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                />
              )}
            </View>
          ) : (
            <View style={styles.videoContainer}>
              {player && (
                <VideoView
                  player={player}
                  style={styles.video}
                  nativeControls
                  contentFit="contain"
                />
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  downloadButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  loadingContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
});
