import React, { memo, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator 
} from "react-native";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";

interface MessageBubbleProps {
  message: {
    _id: string;
    direction: "inbound" | "outbound";
    type: "text" | "image" | "video" | "audio" | "document" | "template" | "interactive";
    content?: string;
    mediaUrl?: string;
    timestamp: number;
    status?: "sent" | "delivered" | "read" | "failed";
    template?: {
      name?: string;
      language?: string;
    };
  };
}

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Parse bold text (*text*)
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <Text key={index} style={styles.boldText}>
            {part.slice(1, -1)}
          </Text>
        );
      }
      return part;
    });
  };

  // Make URLs clickable
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <Text
            key={index}
            style={styles.link}
            onPress={() => Linking.openURL(part)}
          >
            {part}
          </Text>
        );
      }
      return <Text key={index}>{renderFormattedText(part)}</Text>;
    });
  };

  const renderContent = () => {
    // Image message
    if (message.type === "image") {
      return (
        <View style={styles.mediaContainer}>
          {message.mediaUrl ? (
            <View>
              {imageLoading && !imageError && (
                <View style={styles.imageLoading}>
                  <ActivityIndicator size="small" color="#007AFF" />
                </View>
              )}
              {imageError ? (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#999" />
                  <Text style={styles.placeholderText}>Image unavailable</Text>
                </View>
              ) : (
                <Image 
                  source={{ uri: message.mediaUrl }} 
                  style={[styles.image, imageLoading && styles.imageHidden]}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  resizeMode="cover"
                />
              )}
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#999" />
              <Text style={styles.placeholderText}>Image</Text>
            </View>
          )}
          {message.content && (
            <Text style={[styles.text, isOutbound && styles.outboundText]}>
              {renderTextWithLinks(message.content)}
            </Text>
          )}
        </View>
      );
    }

    // Video message
    if (message.type === "video") {
      return (
        <TouchableOpacity 
          style={styles.mediaPlaceholder}
          onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
        >
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="#FFF" />
          </View>
          <Text style={styles.mediaLabel}>Video</Text>
          {message.content && (
            <Text style={[styles.text, styles.mediaCaption]}>
              {message.content}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    // Audio message
    if (message.type === "audio") {
      return (
        <TouchableOpacity 
          style={styles.audioContainer}
          onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
        >
          <View style={styles.audioIcon}>
            <Ionicons name="play" size={20} color="#FFF" />
          </View>
          <View style={styles.audioWaveform}>
            {[...Array(20)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.waveformBar,
                  { height: 4 + Math.random() * 16 }
                ]} 
              />
            ))}
          </View>
          <Text style={styles.audioDuration}>0:00</Text>
        </TouchableOpacity>
      );
    }

    // Document message
    if (message.type === "document") {
      return (
        <TouchableOpacity 
          style={styles.documentContainer}
          onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
        >
          <Ionicons name="document-outline" size={32} color="#007AFF" />
          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={1}>
              {message.content || "Document"}
            </Text>
            <Text style={styles.documentHint}>Tap to open</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Template message
    if (message.type === "template") {
      return (
        <View style={styles.templateContainer}>
          <View style={styles.templateHeader}>
            <Ionicons name="document-text-outline" size={16} color="#007AFF" />
            <Text style={styles.templateLabel}>Template Message</Text>
          </View>
          <Text style={[styles.text, isOutbound && styles.outboundText]}>
            {message.content || message.template?.name || "Template"}
          </Text>
        </View>
      );
    }

    // Interactive message (buttons, lists, etc.)
    if (message.type === "interactive") {
      return (
        <View style={styles.interactiveContainer}>
          <View style={styles.interactiveHeader}>
            <Ionicons name="apps-outline" size={16} color="#007AFF" />
            <Text style={styles.templateLabel}>Interactive</Text>
          </View>
          <Text style={[styles.text, isOutbound && styles.outboundText]}>
            {message.content || "Interactive message"}
          </Text>
        </View>
      );
    }

    // Regular text message
    if (message.content) {
      return (
        <Text style={[styles.text, isOutbound && styles.outboundText]}>
          {renderTextWithLinks(message.content)}
        </Text>
      );
    }

    return null;
  };

  const getStatusIcon = () => {
    if (!isOutbound) return null;
    
    switch (message.status) {
      case "read":
        return <Ionicons name="checkmark-done" size={14} color="#53BDEB" />;
      case "delivered":
        return <Ionicons name="checkmark-done" size={14} color="#667781" />;
      case "failed":
        return <Ionicons name="alert-circle" size={14} color="#F44336" />;
      default:
        return <Ionicons name="checkmark" size={14} color="#667781" />;
    }
  };

  return (
    <View
      style={[
        styles.container,
        isOutbound ? styles.outboundContainer : styles.inboundContainer,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOutbound ? styles.outboundBubble : styles.inboundBubble,
          message.type === "image" && styles.mediaBubble,
        ]}
      >
        {renderContent()}
        <View style={styles.footer}>
          <Text style={[styles.time, isOutbound && styles.outboundTime]}>
            {format(new Date(message.timestamp), "HH:mm")}
          </Text>
          {getStatusIcon()}
        </View>
      </View>
    </View>
  );
}

export const MessageBubble = memo(MessageBubbleComponent);

const styles = StyleSheet.create({
  container: {
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  outboundContainer: {
    alignItems: "flex-end",
  },
  inboundContainer: {
    alignItems: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    borderRadius: 8,
    padding: 8,
    paddingBottom: 4,
  },
  mediaBubble: {
    padding: 4,
  },
  outboundBubble: {
    backgroundColor: "#D9FDD3",
    borderTopRightRadius: 0,
  },
  inboundBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 0,
  },
  text: {
    fontSize: 15,
    color: "#111B21",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "700",
  },
  link: {
    color: "#007AFF",
    textDecorationLine: "underline",
  },
  outboundText: {
    color: "#111B21",
  },
  mediaContainer: {
    marginBottom: 4,
  },
  image: {
    width: 250,
    height: 200,
    borderRadius: 6,
    marginBottom: 4,
  },
  imageHidden: {
    opacity: 0,
    position: "absolute",
  },
  imageLoading: {
    width: 250,
    height: 200,
    borderRadius: 6,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholder: {
    width: 250,
    height: 150,
    borderRadius: 6,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
  },
  mediaPlaceholder: {
    width: 250,
    height: 180,
    borderRadius: 6,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  mediaLabel: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 8,
  },
  mediaCaption: {
    color: "#FFF",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  audioContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 8,
    minWidth: 200,
  },
  audioIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  audioWaveform: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 24,
  },
  waveformBar: {
    width: 3,
    backgroundColor: "#667781",
    borderRadius: 2,
  },
  audioDuration: {
    fontSize: 12,
    color: "#667781",
  },
  documentContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    gap: 12,
    minWidth: 200,
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111B21",
  },
  documentHint: {
    fontSize: 12,
    color: "#667781",
    marginTop: 2,
  },
  templateContainer: {
    padding: 4,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  templateLabel: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  interactiveContainer: {
    padding: 4,
  },
  interactiveHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  time: {
    fontSize: 11,
    color: "#667781",
  },
  outboundTime: {
    color: "#667781",
  },
});
