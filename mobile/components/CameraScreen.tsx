import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CameraScreenProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (asset: ImagePicker.ImagePickerAsset) => void;
}

export function CameraScreen({ visible, onClose, onCapture }: CameraScreenProps) {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    } else {
      setError(null);
      setIsCapturing(false);
    }
  }, [visible]);

  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
      
      if (status !== "granted") {
        setError("Camera permission is required to take photos");
      }
    } catch (err) {
      setHasPermission(false);
      setError("Failed to request camera permission");
    }
  };

  const handleTakePhoto = async () => {
    if (isCapturing) return;

    setIsCapturing(true);
    setError(null);

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ['images'],
      });

      if (result.canceled) {
        setIsCapturing(false);
        return;
      }

      const asset = result.assets[0];
      if (asset) {
        onCapture(asset);
        onClose();
      }
    } catch (err: any) {
      const isSimulator = err.message?.includes("simulator") || err.message?.includes("Camera not available");
      if (!isSimulator && __DEV__) console.error("Camera error:", err);
      if (isSimulator) {
        setError("Camera not available on simulator. Please use a physical device.");
      } else {
        setError(err.message || "Failed to take photo. Please try again.");
      }
    } finally {
      setIsCapturing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close camera"
            accessibilityRole="button"
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Camera</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="camera-outline" size={64} color="#999" />
              <Text style={styles.errorTitle}>Camera Unavailable</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={requestCameraPermission}
                accessibilityLabel="Retry"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : hasPermission === false ? (
            <View style={styles.errorContainer}>
              <Ionicons name="camera-outline" size={64} color="#999" />
              <Text style={styles.errorTitle}>Permission Required</Text>
              <Text style={styles.errorText}>
                Please grant camera permission in your device settings to take photos.
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={requestCameraPermission}
                accessibilityLabel="Request permission"
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Request Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="camera" size={80} color="#FFFFFF" />
                <Text style={styles.cameraPlaceholderText}>
                  Tap the capture button below to take a photo
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Footer with Capture Button */}
        {hasPermission && !error && (
          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
              onPress={handleTakePhoto}
              disabled={isCapturing}
              accessibilityLabel="Take photo"
              accessibilityRole="button"
            >
              {isCapturing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>
          </View>
        )}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraPlaceholder: {
    alignItems: "center",
    gap: 16,
  },
  cameraPlaceholderText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  errorContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#CCCCCC",
    textAlign: "center",
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#CCCCCC",
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
});
