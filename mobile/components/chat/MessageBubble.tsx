import React, { memo, useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator,
  I18nManager,
} from "react-native";
import { format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";

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
    replyTo?: {
      _id: string;
      content?: string;
      type: string;
      direction?: "inbound" | "outbound";
    };
  };
  contactName?: string;
  onLongPress?: (message: MessageBubbleProps["message"], position: { x: number; y: number }) => void;
  onMediaPress?: (mediaUrl: string, mediaType: "image" | "video") => void;
  onReply?: (message: MessageBubbleProps["message"]) => void;
  onForward?: (message: MessageBubbleProps["message"]) => void;
  onDownload?: (message: MessageBubbleProps["message"]) => void;
}

// Audio Player Component
function AudioPlayerComponent({ mediaUrl, isOutbound }: { mediaUrl: string; isOutbound: boolean }) {
  // Only create player if mediaUrl is valid
  const player = useAudioPlayer(mediaUrl && mediaUrl.trim() !== "" ? mediaUrl : undefined, {
    updateInterval: 100,
  });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    const configureAudio = async () => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
        });
      } catch (error) {
        console.error("Failed to set audio mode", error);
      }
    };

    configureAudio();
  }, []);

  const togglePlayPause = () => {
    try {
      if (status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      console.error("Failed to toggle playback", error);
    }
  };

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const duration = status.duration || 0;
  const position = status.currentTime || 0;
  const progress = duration > 0 ? (position / duration) * 100 : 0;
  const isPlaying = status.playing || false;

  return (
    <View style={styles.audioContainer}>
      <TouchableOpacity
        style={styles.audioIcon}
        onPress={togglePlayPause}
        accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
        accessibilityRole="button"
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={20}
          color="#FFF"
        />
      </TouchableOpacity>
      <View style={styles.audioWaveform}>
        {[...Array(20)].map((_, i) => {
          const barProgress = (i / 20) * 100;
          const isActive = barProgress < progress;
          return (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: isActive ? 20 + Math.random() * 10 : 4 + Math.random() * 8,
                  backgroundColor: isActive
                    ? isOutbound
                      ? "#005c4b"
                      : "#007AFF"
                    : "#667781",
                },
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.audioDuration}>
        {formatTime(position)} / {formatTime(duration)}
      </Text>
    </View>
  );
}

function MessageBubbleComponent({ 
  message, 
  contactName = "Message",
  onLongPress, 
  onMediaPress, 
  onReply, 
  onForward,
  onDownload 
}: MessageBubbleProps) {
  const isOutbound = message.direction === "outbound";
  const isRTL = I18nManager.isRTL;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const bubbleRef = useRef<View>(null);

  // Sanitize HTML content to remove tags and attributes
  const sanitizeText = (text: string): string => {
    if (!text) return "";
    
    // Step 1: Remove all HTML tags (including malformed ones)
    let cleaned = text.replace(/<[^>]*>/g, "");
    
    // Step 2: Remove all attribute-like patterns (class, id, style, dir, etc.)
    // This catches patterns like "n class-", "class=", "class =", etc.
    cleaned = cleaned.replace(/\s*[a-zA-Z-]+\s*[-=:]\s*["']?[^"'\s]*["']?/gi, "");
    
    // Step 3: Remove specific problematic patterns
    cleaned = cleaned.replace(/n\s*class\s*[-=:]/gi, "");
    cleaned = cleaned.replace(/al-direction[^"]*"/gi, "");
    cleaned = cleaned.replace(/class\s*[-=:]\s*["']?[^"'\s]*["']?/gi, "");
    cleaned = cleaned.replace(/id\s*[-=:]\s*["']?[^"'\s]*["']?/gi, "");
    cleaned = cleaned.replace(/style\s*[-=:]\s*["']?[^"'\s]*["']?/gi, "");
    cleaned = cleaned.replace(/dir\s*[-=:]\s*["']?[^"'\s]*["']?/gi, "");
    cleaned = cleaned.replace(/direction\s*[-=:]\s*["']?[^"'\s]*["']?/gi, "");
    
    // Step 4: Decode HTML entities
    cleaned = cleaned.replace(/&nbsp;/g, " ");
    cleaned = cleaned.replace(/&amp;/g, "&");
    cleaned = cleaned.replace(/&lt;/g, "<");
    cleaned = cleaned.replace(/&gt;/g, ">");
    cleaned = cleaned.replace(/&quot;/g, '"');
    cleaned = cleaned.replace(/&#39;/g, "'");
    cleaned = cleaned.replace(/&#x27;/g, "'");
    cleaned = cleaned.replace(/&#x2F;/g, "/");
    
    // Step 5: Clean up multiple spaces and trim
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned.trim();
  };

  // Parse bold text (*text*)
  const renderFormattedText = (text: string) => {
    const cleanedText = sanitizeText(text);
    const parts = cleanedText.split(/(\*[^*]+\*)/g);
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
    const cleanedText = sanitizeText(text);
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = cleanedText.split(urlRegex);
    
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

  const handleLongPress = (event: any) => {
    if (onLongPress && bubbleRef.current) {
      // Use measure to get accurate position relative to screen
      (bubbleRef.current as unknown as { measure: (cb: (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => void) => void }).measure((x, y, width, height, pageX, pageY) => {
        onLongPress(message, { x: pageX + width / 2, y: pageY });
      });
    } else if (onLongPress) {
      // Fallback to event position if measure fails
      const { pageX, pageY } = event.nativeEvent;
      onLongPress(message, { x: pageX, y: pageY });
    }
  };

  const handleImagePress = () => {
    if (message.mediaUrl && onMediaPress) {
      onMediaPress(message.mediaUrl, "image");
    }
  };

  const handleVideoPress = () => {
    if (message.mediaUrl && onMediaPress) {
      onMediaPress(message.mediaUrl, "video");
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case "image":
        return "image";
      case "video":
        return "videocam";
      case "audio":
        return "musical-notes";
      case "document":
        return "document";
      default:
        return "document-text";
    }
  };

  const renderReplyContext = () => {
    if (!message.replyTo) return null;
    
    const isRepliedOutbound = message.replyTo.direction === "outbound";
    const senderName = isRepliedOutbound ? "You" : contactName;
    const borderColor = isOutbound ? "#005c4b" : "#667781";
    const bgColor = isOutbound 
      ? "rgba(0, 92, 75, 0.08)" 
      : "rgba(102, 119, 129, 0.08)";
    
    return (
      <View style={[
        styles.replyContext,
        { 
          borderLeftColor: borderColor,
          borderRightColor: borderColor,
          borderLeftWidth: isRTL ? 0 : 3,
          borderRightWidth: isRTL ? 3 : 0,
          paddingLeft: isRTL ? 6 : 8,
          paddingRight: isRTL ? 8 : 6,
          backgroundColor: bgColor,
        }
      ]}>
        <View style={styles.replyContextContent}>
          <Text style={[
            styles.replyContextSender,
            { color: borderColor }
          ]} numberOfLines={1}>
            {senderName}
          </Text>
          {message.replyTo.type === "text" ? (
            <Text style={styles.replyContextText} numberOfLines={1}>
              {sanitizeText(message.replyTo.content || "Message")}
            </Text>
          ) : (
            <View style={styles.replyContextMedia}>
              <Ionicons 
                name={getMediaIcon(message.replyTo.type)} 
                size={12} 
                color={borderColor}
              />
              <Text style={[styles.replyContextMediaText, { color: borderColor }]}>
                {message.replyTo.type.charAt(0).toUpperCase() + message.replyTo.type.slice(1)}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    // Image message
    if (message.type === "image") {
      return (
        <TouchableOpacity 
          style={styles.mediaContainer}
          onPress={handleImagePress}
          onLongPress={handleLongPress}
          activeOpacity={0.9}
        >
          {message.mediaUrl && message.mediaUrl.trim() !== "" ? (
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
              ) : message.mediaUrl && message.mediaUrl.trim() !== "" ? (
                <Image 
                  source={{ uri: message.mediaUrl }} 
                  style={[styles.image, imageLoading && styles.imageHidden]}
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  resizeMode="cover"
                  accessibilityLabel={message.content || "Image"}
                  accessibilityRole="image"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#999" />
                  <Text style={styles.placeholderText}>Image unavailable</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color="#999" />
              <Text style={styles.placeholderText}>Image</Text>
            </View>
          )}
          {message.content && (
            <View style={styles.captionContainer}>
              <Text style={[styles.captionText, isOutbound && styles.outboundText]}>
                {renderTextWithLinks(message.content)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Video message
    if (message.type === "video") {
      return (
        <TouchableOpacity 
          style={styles.mediaPlaceholder}
          onPress={handleVideoPress}
          onLongPress={handleLongPress}
          accessibilityLabel={`Video message${message.content ? `: ${message.content}` : ""}`}
          accessibilityRole="button"
        >
          <View style={styles.playButton}>
            <Ionicons name="play" size={24} color="#FFF" />
          </View>
          <Text style={styles.mediaLabel}>Video</Text>
          {message.content && (
            <View style={styles.captionContainer}>
              <Text style={[styles.captionText, styles.mediaCaption]}>
                {renderTextWithLinks(message.content)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // Audio message
    if (message.type === "audio") {
      if (!message.mediaUrl || message.mediaUrl.trim() === "") {
        return (
          <View style={styles.audioContainer}>
            <View style={styles.audioPlaceholder}>
              <Ionicons name="musical-notes-outline" size={24} color="#999" />
              <Text style={styles.placeholderText}>Audio unavailable</Text>
            </View>
          </View>
        );
      }
      return <AudioPlayerComponent mediaUrl={message.mediaUrl} isOutbound={isOutbound} />;
    }

    // Document message
    if (message.type === "document") {
      return (
        <TouchableOpacity 
          style={styles.documentContainer}
          onPress={() => message.mediaUrl && Linking.openURL(message.mediaUrl)}
          accessibilityLabel={`Document: ${message.content || "Document"}`}
          accessibilityRole="button"
          accessibilityHint="Double tap to open document"
        >
          <Ionicons name="document-outline" size={32} color="#007AFF" />
          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={1}>
              {sanitizeText(message.content || "Document")}
            </Text>
            <Text style={styles.documentHint}>Tap to open</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Template message
    if (message.type === "template") {
      let templateData: any = null;
      try {
        // Try to parse template data from content if it's JSON
        if (message.content && message.content.startsWith("{")) {
          templateData = JSON.parse(message.content);
        }
      } catch (e) {
        // Not JSON, use as string
      }

      const templateName = templateData?.name || message.template?.name || sanitizeText(message.content || "Template");
      const hasComponents = templateData?.components && Array.isArray(templateData.components);

      return (
        <View style={styles.templateContainer}>
          <View style={styles.templateHeader}>
            <Ionicons name="document-text-outline" size={16} color="#007AFF" />
            <Text style={styles.templateLabel}>Template: {sanitizeText(templateName)}</Text>
          </View>
          {hasComponents && (
            <View style={styles.templateComponents}>
              {templateData.components.map((comp: any, idx: number) => {
                if (comp.type === "BODY" && comp.text) {
                  return (
                    <Text key={idx} style={[styles.text, styles.templateBody, isOutbound && styles.outboundText]}>
                      {comp.text}
                    </Text>
                  );
                }
                if (comp.type === "FOOTER" && comp.text) {
                  return (
                    <Text key={idx} style={[styles.templateFooter, isOutbound && styles.outboundText]}>
                      {comp.text}
                    </Text>
                  );
                }
                return null;
              })}
            </View>
          )}
          {!hasComponents && (
            <Text style={[styles.text, isOutbound && styles.outboundText]}>
              {sanitizeText(templateName)}
            </Text>
          )}
        </View>
      );
    }

    // Interactive message (buttons, lists, etc.)
    if (message.type === "interactive") {
      let interactiveData: any = null;
      try {
        // Try to parse interactive data from content if it's JSON
        if (message.content && message.content.startsWith("{")) {
          interactiveData = JSON.parse(message.content);
        }
      } catch (e) {
        // Not JSON, use as string
      }

      const hasButtons = interactiveData?.buttons && Array.isArray(interactiveData.buttons);
      const hasList = interactiveData?.list && interactiveData.list.items;

      return (
        <View style={styles.interactiveContainer}>
          <View style={styles.interactiveHeader}>
            <Ionicons name="apps-outline" size={16} color="#007AFF" />
            <Text style={styles.templateLabel}>Interactive Message</Text>
          </View>
          {interactiveData?.body?.text && (
            <Text style={[styles.text, styles.interactiveBody, isOutbound && styles.outboundText]}>
              {interactiveData.body.text}
            </Text>
          )}
          {hasButtons && (
            <View style={styles.interactiveButtons}>
              {interactiveData.buttons.slice(0, 3).map((btn: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.interactiveButton}
                  onPress={() => {
                    // Handle button press - could send reply or open URL
                    if (btn.type === "url" && btn.url) {
                      Linking.openURL(btn.url);
                    }
                  }}
                  accessibilityLabel={btn.text || `Button ${idx + 1}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.interactiveButtonText}>{btn.text || "Button"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {hasList && (
            <View style={styles.interactiveList}>
              {interactiveData.list.items.slice(0, 5).map((item: any, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.interactiveListItem}
                  onPress={() => {
                    // Handle list item selection
                  }}
                  accessibilityLabel={item.title || `Item ${idx + 1}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.interactiveListItemTitle}>{item.title || "Item"}</Text>
                  {item.description && (
                    <Text style={styles.interactiveListItemDesc}>{item.description}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          {!hasButtons && !hasList && (
            <Text style={[styles.text, isOutbound && styles.outboundText]}>
              {sanitizeText(message.content || "Interactive message")}
            </Text>
          )}
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

  const getAccessibilityLabel = () => {
    const typeLabels: Record<string, string> = {
      text: "Text message",
      image: "Image message",
      video: "Video message",
      audio: "Audio message",
      document: "Document message",
      template: "Template message",
      interactive: "Interactive message",
    };
    const typeLabel = typeLabels[message.type] || "Message";
    const directionLabel = isOutbound ? "sent" : "received";
    const statusLabel = isOutbound && message.status ? `, ${message.status}` : "";
    return `${typeLabel}, ${directionLabel}${statusLabel}`;
  };

  const bubbleContent = (
    <TouchableOpacity
      activeOpacity={1}
      onLongPress={handleLongPress}
      delayLongPress={500}
    >
      <View
        style={[
          styles.bubble,
          isOutbound ? styles.outboundBubble : styles.inboundBubble,
          message.type === "image" && styles.mediaBubble,
          isRTL && isOutbound && styles.outboundBubbleRTL,
          isRTL && !isOutbound && styles.inboundBubbleRTL,
        ]}
      >
        {renderReplyContext()}
        {renderContent()}
        <View style={styles.footer}>
          <Text style={[styles.time, isOutbound && styles.outboundTime]}>
            {format(new Date(message.timestamp), "HH:mm")}
          </Text>
          {getStatusIcon()}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      ref={bubbleRef}
      style={[
        styles.container,
        isOutbound ? styles.outboundContainer : styles.inboundContainer,
      ]}
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityRole="text"
    >
      {bubbleContent}
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
    overflow: "hidden",
  },
  mediaBubble: {
    padding: 4,
  },
  outboundBubble: {
    backgroundColor: "#D9FDD3",
    borderTopRightRadius: 0,
  },
  outboundBubbleRTL: {
    borderTopRightRadius: 8,
    borderTopLeftRadius: 0,
  },
  inboundBubble: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 0,
  },
  inboundBubbleRTL: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 0,
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
  audioPlaceholder: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
  },
  captionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  captionText: {
    fontSize: 14,
    color: "#111B21",
    lineHeight: 18,
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
  templateComponents: {
    gap: 4,
  },
  templateBody: {
    fontSize: 14,
    marginBottom: 4,
  },
  templateFooter: {
    fontSize: 11,
    color: "#667781",
    fontStyle: "italic",
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
  interactiveBody: {
    marginBottom: 8,
  },
  interactiveButtons: {
    gap: 6,
    marginTop: 8,
  },
  interactiveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  interactiveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  interactiveList: {
    gap: 4,
    marginTop: 8,
  },
  interactiveListItem: {
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  interactiveListItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  interactiveListItemDesc: {
    fontSize: 12,
    color: "#666",
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
  replyContext: {
    flexDirection: "row",
    marginBottom: 6,
    marginTop: 0,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  replyContextContent: {
    flex: 1,
    gap: 1,
  },
  replyContextSender: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 1,
  },
  replyContextText: {
    fontSize: 12,
    color: "#667781",
    lineHeight: 14,
  },
  replyContextMedia: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  replyContextMediaText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
