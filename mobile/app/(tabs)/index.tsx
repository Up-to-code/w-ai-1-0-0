import { StyleSheet, FlatList, TouchableOpacity, RefreshControl, View, Text, SafeAreaView, ActivityIndicator, TextInput } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { router } from 'expo-router';
import { useEffect, useState, useCallback, useMemo } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Theme } from '@/constants/Theme';
import { Avatar } from '@/components/Avatar';
import { Ionicons } from '@expo/vector-icons';

import { FlashList } from '@shopify/flash-list';

export default function TabOneScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Queries
  const allChats = useQuery(api.chat.listChats);

  const filteredChats = useMemo(() => {
    if (!allChats) return [];
    const sorted = [...allChats].sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    if (!searchQuery) return sorted;
    return sorted.filter(chat =>
      chat.contactName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allChats, searchQuery]);

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'أمس';
    } else if (diffDays < 7) {
      const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return days[date.getDay()];
    } else {
      return date.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
    }
  };

  const [userId, setUserId] = useState<string | null>(null);
  const user = useQuery(api.users.getProfile, userId ? { userId: userId as any } : "skip" as any);

  useEffect(() => {
    SecureStore.getItemAsync("userId").then(id => {
      if (!id) {
        router.replace("/login");
      } else {
        setUserId(id);
      }
    });
  }, []);

  useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'agent') {
      router.replace("/login");
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => router.push(`/chat/${item._id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        <Avatar name={item.contactName} id={item._id} size={56} />
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.contactName} numberOfLines={1}>{item.contactName}</Text>
          <Text style={styles.time}>{formatRelativeTime(item.lastMessageTime)}</Text>
        </View>

        <View style={styles.lastMessageContainer}>
          <View style={styles.messagePreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.aiSummary ? item.aiSummary : (item.status === 'expired' ? 'انتهت الجلسة' : 'اضغط للعرض')}
            </Text>
          </View>

          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {!isSearchVisible ? (
            <>
              <Text style={styles.headerTitle}>الدردشات</Text>
              <TouchableOpacity style={styles.searchButton} onPress={() => setIsSearchVisible(true)}>
                <Ionicons name="search" size={24} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.searchContainer}>
              <TouchableOpacity onPress={() => { setIsSearchVisible(false); setSearchQuery(''); }}>
                <Ionicons name="arrow-forward" size={24} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
              <TextInput
                style={styles.headerSearchInput}
                placeholder="بحث في الدردشات..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                textAlign="right"
              />
            </View>
          )}
        </View>

        {allChats ? (
          filteredChats.length > 0 ? (
            <FlashList
              data={filteredChats}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              estimatedItemSize={92}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.primary} />
              }
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={80} color={Theme.colors.divider} />
              <Text style={styles.emptyText}>لا توجد دردشات حالياً</Text>
            </View>
          )
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </View>
        )}
      </SafeAreaView>
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
  searchButton: {
    padding: 6,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerSearchInput: {
    flex: 1,
    ...Theme.typography.body,
    paddingVertical: 8,
    color: Theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  chatCard: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  avatarContainer: {
    marginRight: 16,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  contactName: {
    ...Theme.typography.h3,
    color: Theme.colors.textPrimary,
  },
  time: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  lastMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  messagePreview: {
    flex: 1,
  },
  lastMessage: {
    ...Theme.typography.body,
    width: '100%',
    color: Theme.colors.textSecondary,
    fontSize: 14,
  },
  badge: {
    backgroundColor: Theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: Theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  badgeText: {
    color: 'white',
    ...Theme.typography.small,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    marginTop: 18,
    color: Theme.colors.textSecondary,
    ...Theme.typography.h3,
  },
});
