import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FlashList } from "@shopify/flash-list";
import { ChatItem } from "../../components/chat/ChatItem";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { ScreenErrorBoundary } from "../../components/ScreenErrorBoundary";
import { Header } from "../../components/Header";
import { WorkspaceSwitcher } from "../../components/WorkspaceSwitcher";
import { useLocale } from "../../contexts/LocaleContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";

export default function ChatListScreen() {
  const { t, isRTL } = useLocale();
  const { activePhoneNumberId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const chats = useQuery(api.chat.listChats, {
    phoneNumberId: activePhoneNumberId ?? undefined,
  });

  const filteredChats = useMemo(() => {
    if (!chats) return [];
    if (!searchQuery.trim()) return chats;

    const query = searchQuery.toLowerCase();
    return chats.filter(
      (chat) =>
        chat.contactName.toLowerCase().includes(query) ||
        chat.contactPhone.includes(query)
    );
  }, [chats, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => <ChatItem chat={item} />,
    []
  );

  const rtlRow = isRTL ? styles.rowReverse : styles.row;
  const rtlText = isRTL ? styles.textRight : styles.textLeft;

  return (
    <ScreenErrorBoundary screenName="chats">
      {!chats ? (
        <ScreenWrapper edges={["top"]}>
          <Header title={t("chats")} />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={[styles.loadingText, styles.cairoFont]}>{t("loading")}</Text>
          </View>
        </ScreenWrapper>
      ) : (
    <ScreenWrapper edges={["top"]}>
      <Header title={t("chats")} />
      <WorkspaceSwitcher />
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, rtlRow]}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={isRTL ? styles.searchIconRTL : styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, rtlText, styles.cairoFont]}
          placeholder={t("search_chats")}
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={isRTL ? styles.clearButtonRTL : styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={[styles.emptyText, styles.cairoFont]}>
            {searchQuery ? t("no_chats_found") : t("no_chats")}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredChats}
          renderItem={renderItem}
          estimatedItemSize={74}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenWrapper>
      )}
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  row: {
    flexDirection: "row",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchIconRTL: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  clearButton: {
    marginLeft: 8,
  },
  clearButtonRTL: {
    marginRight: 8,
  },
  listContent: {
    paddingBottom: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
  textLeft: {
    textAlign: "left",
  },
  textRight: {
    textAlign: "right",
  },
  cairoFont: {
    fontFamily: "Cairo_400Regular",
  },
});
