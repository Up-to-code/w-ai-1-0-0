import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator, Alert, Share } from "react-native";
import { usePaginatedQuery, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { MessageBubble } from "./MessageBubble";
import { MessageActionsModal } from "./MessageActionsModal";
import { MediaViewerModal } from "./MediaViewerModal";
import { ForwardMessageModal } from "./ForwardMessageModal";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

interface MessageListProps {
  chatId: string;
  onReply?: (message: Message) => void;
}

interface Message {
  _id: string;
  direction: "inbound" | "outbound";
  type: string;
  content?: string;
  mediaUrl?: string;
  timestamp: number;
  status?: string;
  mediaId?: string;
  storageId?: string;
}

export function MessageList({ chatId, onReply }: MessageListProps) {
  const listRef = useRef<FlashList<Message>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevScrollHeightRef = useRef(0);
  const viewedMessageIds = useRef<Set<string>>(new Set());
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Modal states
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [actionsModalPosition, setActionsModalPosition] = useState<{ x: number; y: number } | undefined>();
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerUrl, setMediaViewerUrl] = useState("");
  const [mediaViewerType, setMediaViewerType] = useState<"image" | "video">("image");
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  
  const { results: messagesDesc, status, loadMore, isLoading } = usePaginatedQuery(
    api.chat.getMessagesPage,
    { chatId: chatId as any },
    { initialNumItems: 20 }
  );

  const chat = useQuery(api.chat.getChat, { chatId: chatId as any });
  const contactName = chat?.contactName || "Message";
  const markAsRead = useMutation(api.chat.markAsRead);

  // Reverse messages for display (newest at bottom)
  const messages = useMemo(() => {
    return [...messagesDesc].reverse() as Message[];
  }, [messagesDesc]);

  // Initial scroll to bottom when chat changes
  useEffect(() => {
    if (messages.length > 0 && status === "Exhausted") {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: false });
        setIsAtBottom(true);
      }, 100);
    }
  }, [chatId]);

  // Auto-scroll to bottom on new messages if we were at bottom
  useEffect(() => {
    if (isAtBottom && messages.length > 0 && status !== "LoadingFirstPage") {
      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, isAtBottom, status]);

  // Preserve scroll position when loading more (scrolling up for history)
  useEffect(() => {
    if (status === "LoadingMore" && listRef.current) {
      // @ts-ignore - FlashList methods
      listRef.current.getScrollMetrics?.().then((metrics: any) => {
        prevScrollHeightRef.current = metrics?.contentLength || 0;
      });
    } else if (status === "Exhausted" && prevScrollHeightRef.current > 0 && listRef.current) {
      // @ts-ignore - FlashList methods
      listRef.current.getScrollMetrics?.().then((metrics: any) => {
        const newHeight = metrics?.contentLength || 0;
        const diff = newHeight - prevScrollHeightRef.current;
        if (diff > 0) {
          listRef.current?.scrollToOffset({ offset: diff + 50, animated: false });
        }
        prevScrollHeightRef.current = 0;
      });
    }
  }, [status, messages.length]);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    const isBottom = distanceFromBottom < 100;
    setIsAtBottom(isBottom);

    // Load more when scrolling to top (for history)
    if (contentOffset.y < 100 && status === "CanLoadMore" && !isLoading) {
      loadMore(20);
    }
  }, [status, isLoading, loadMore]);

  // Viewability config for read receipts
  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50, // Mark as read when 50% visible
    minimumViewTime: 500, // Must be visible for 500ms
  }), []);

  // Track viewed messages and mark as read
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    // Filter for inbound messages that haven't been marked as read
    const unreadInboundMessages = viewableItems
      .filter((item: any) => {
        const message = item.item as Message;
        return (
          message.direction === "inbound" &&
          message.status !== "read" &&
          !viewedMessageIds.current.has(message._id)
        );
      })
      .map((item: any) => item.item._id);

    if (unreadInboundMessages.length > 0) {
      // Mark messages as viewed locally to avoid duplicate calls
      unreadInboundMessages.forEach((id: string) => {
        viewedMessageIds.current.add(id);
      });

      // Debounce markAsRead call - clear existing timeout and set new one
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }

      markAsReadTimeoutRef.current = setTimeout(() => {
        markAsRead({ chatId: chatId as any }).catch((error) => {
          console.error("Failed to mark messages as read:", error);
          // Remove from viewed set on error so we can retry
          unreadInboundMessages.forEach((id: string) => {
            viewedMessageIds.current.delete(id);
          });
        });
        markAsReadTimeoutRef.current = null;
      }, 500);
    }
  }, [chatId, markAsRead]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, []);

  // Download handler
  const handleDownload = useCallback(async (message: Message) => {
    if (!message.mediaUrl) {
      Alert.alert("Error", "No media URL available");
      return;
    }

    try {
      const hasMedia = ["image", "video", "audio", "document"].includes(message.type);
      if (!hasMedia) {
        Alert.alert("Info", "This message type cannot be downloaded");
        return;
      }

      // Request permissions for images/videos
      if (message.type === "image" || message.type === "video") {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Please grant media library access to save files");
          return;
        }
      }

      // Download file
      const fileExtension = message.type === "image" ? "jpg" 
        : message.type === "video" ? "mp4"
        : message.type === "audio" ? "mp4"
        : "pdf";
      const fileName = `${message.type}_${Date.now()}.${fileExtension}`;
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + fileName;

      if (!fileUri) {
        throw new Error("File system directory not available");
      }

      const downloadResult = await FileSystem.downloadAsync(message.mediaUrl, fileUri);

      if (message.type === "image" || message.type === "video") {
        // Save to gallery
        await MediaLibrary.createAssetAsync(downloadResult.uri);
        Alert.alert("Success", `${message.type === "image" ? "Image" : "Video"} saved to gallery`);
      } else {
        // Share file for documents/audio
        await Share.share({
          url: downloadResult.uri,
          message: `Downloaded ${message.type}`,
        });
        Alert.alert("Success", "File downloaded");
      }
    } catch (error) {
      console.error("Download failed:", error);
      Alert.alert("Error", "Failed to download file");
    }
  }, []);

  // Forward handler
  const handleForward = useCallback((message: Message) => {
    setSelectedMessage(message);
    setForwardModalVisible(true);
  }, []);

  // Reply handler
  const handleReply = useCallback((message: Message) => {
    if (onReply) {
      onReply(message);
    }
  }, [onReply]);

  // Media press handler
  const handleMediaPress = useCallback((mediaUrl: string, mediaType: "image" | "video") => {
    setMediaViewerUrl(mediaUrl);
    setMediaViewerType(mediaType);
    setMediaViewerVisible(true);
  }, []);

  // Long press handler
  const handleLongPress = useCallback((message: Message, position: { x: number; y: number }) => {
    setSelectedMessage(message);
    setActionsModalPosition(position);
    setActionsModalVisible(true);
  }, []);

  // Memoized render function for better performance
  const renderItem: ListRenderItem<Message> = useCallback(({ item }) => (
    <MessageBubble 
      message={item as any} 
      contactName={contactName}
      onLongPress={handleLongPress}
      onMediaPress={handleMediaPress}
      onReply={handleReply}
      onForward={handleForward}
      onDownload={handleDownload}
    />
  ), [contactName, handleLongPress, handleMediaPress, handleReply, handleForward, handleDownload]);

  // Memoized key extractor
  const keyExtractor = useCallback((item: Message) => item._id, []);

  // Loading footer component
  const ListFooterComponent = useMemo(() => (
    <View style={styles.footer} />
  ), []);

  if (status === "LoadingFirstPage") {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <>
      <View style={styles.container}>
        {isLoading && status === "LoadingMore" && (
          <View style={styles.loadMoreHeader}>
            <ActivityIndicator size="small" color="#007AFF" />
          </View>
        )}
        
        <FlashList
          ref={listRef}
          data={messages}
          renderItem={renderItem}
          estimatedItemSize={70}
          keyExtractor={keyExtractor}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={styles.listContent}
          ListFooterComponent={ListFooterComponent}
          // Performance optimizations
          drawDistance={350}
          removeClippedSubviews={true}
          accessibilityLabel="Message list"
          accessibilityRole="list"
          // Read receipt tracking
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          overrideItemLayout={(layout, item) => {
            // Estimate different sizes for different message types
            const type = (item as Message).type;
            if (type === "image") {
              layout.size = 250;
            } else if (type === "audio") {
              layout.size = 80;
            } else if (type === "document") {
              layout.size = 100;
            } else {
              layout.size = 70;
            }
          }}
        />
      </View>

      {/* Message Actions Modal */}
      <MessageActionsModal
        visible={actionsModalVisible}
        message={selectedMessage}
        onClose={() => {
          setActionsModalVisible(false);
          setSelectedMessage(null);
        }}
        onDownload={() => selectedMessage && handleDownload(selectedMessage)}
        onForward={() => selectedMessage && handleForward(selectedMessage)}
        onReply={() => selectedMessage && handleReply(selectedMessage)}
        position={actionsModalPosition}
      />

      {/* Media Viewer Modal */}
      <MediaViewerModal
        visible={mediaViewerVisible}
        mediaUrl={mediaViewerUrl}
        mediaType={mediaViewerType}
        onClose={() => {
          setMediaViewerVisible(false);
          setMediaViewerUrl("");
        }}
        onDownload={async () => {
          if (selectedMessage) {
            await handleDownload(selectedMessage);
          }
        }}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        visible={forwardModalVisible}
        message={selectedMessage}
        currentChatId={chatId}
        onClose={() => {
          setForwardModalVisible(false);
          setSelectedMessage(null);
        }}
        onForwardComplete={() => {
          Alert.alert("Success", "Message forwarded");
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EFEAE2",
  },
  listContent: {
    padding: 12,
    paddingBottom: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadMoreHeader: {
    padding: 8,
    alignItems: "center",
    backgroundColor: "#EFEAE2",
  },
  loadMoreButton: {
    padding: 4,
  },
  footer: {
    height: 12,
  },
});
