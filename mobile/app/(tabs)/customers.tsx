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
import { CustomerItem } from "../../components/customers/CustomerItem";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Header } from "../../components/Header";
import { useWorkspace } from "../../contexts/WorkspaceContext";

export default function CustomersScreen() {
  const router = useRouter();
  const { activePhoneNumberId } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const contacts = useQuery(api.contacts.list, { limit: 1000 });
  const chats = useQuery(api.chat.listChats, {
    phoneNumberId: activePhoneNumberId ?? undefined,
  });

  // Create map of phone to chat ID
  const chatByPhone = useMemo(() => {
    const map = new Map<string, string>();
    (chats || []).forEach((chat) => {
      if (chat.contactPhone) {
        map.set(chat.contactPhone, chat._id);
      }
    });
    return map;
  }, [chats]);

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    const query = searchQuery.toLowerCase();
    const filtered = contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query) ||
        contact.email?.toLowerCase().includes(query)
    );

    return filtered;
  }, [contacts, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    // Convex will automatically refetch
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <CustomerItem contact={item} chatId={chatByPhone.get(item.phone)} />
    ),
    [chatByPhone]
  );

  const addButton = (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() => router.push("/customers/add")}
    >
      <Ionicons name="add" size={24} color="#007AFF" />
    </TouchableOpacity>
  );

  if (!contacts) {
    return (
      <ScreenWrapper edges={["top"]}>
        <Header title="Customers" rightAction={addButton} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper edges={["top"]}>
      <Header title="Customers" rightAction={addButton} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color="#999"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Customer List */}
      {filteredContacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? "No customers found" : "No customers yet"}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredContacts}
          renderItem={renderItem}
          estimatedItemSize={70}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </ScreenWrapper>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  addButton: {
    padding: 4,
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000",
  },
  clearButton: {
    marginLeft: 8,
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
});
