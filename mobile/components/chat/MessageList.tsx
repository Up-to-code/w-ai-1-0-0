import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  chatId: string;
}

interface Message {
  _id: string;
  direction: "inbound" | "outbound";
  type: string;
  content?: string;
  mediaUrl?: string;
  timestamp: number;
  status?: string;
}

export function MessageList({ chatId }: MessageListProps) {
  const listRef = useRef<FlashList<Message>>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const prevScrollHeightRef = useRef(0);
  
  const { results: messagesDesc, status, loadMore, isLoading } = usePaginatedQuery(
    api.chat.getMessagesPage,
    { chatId: chatId as any },
    { initialNumItems: 20 }
  );

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

  // Memoized render function for better performance
  const renderItem: ListRenderItem<Message> = useCallback(({ item }) => (
    <MessageBubble message={item as any} />
  ), []);

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
    <View style={styles.container}>
      {status === "CanLoadMore" && (
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
        drawDistance={500}
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
