import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

interface Template {
  _id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  components?: any[];
}

interface TemplatePickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
}

export function TemplatePicker({ visible, onClose, onSelect }: TemplatePickerProps) {
  const templates = useQuery(api.templates.list);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"approved" | "all">("approved");

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    
    let filtered = templates;
    
    // Filter by tab
    if (activeTab === "approved") {
      filtered = filtered.filter((t: any) => t.status === "APPROVED");
    }
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t: any) => 
        t.name.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [templates, searchQuery, activeTab]);

  const approvedCount = useMemo(() => 
    (templates || []).filter((t: any) => t.status === "APPROVED").length,
    [templates]
  );

  const handleSelect = useCallback((template: Template) => {
    if (template.status !== "APPROVED") return;
    onSelect(template);
    onClose();
  }, [onSelect, onClose]);

  const renderTemplate = useCallback(({ item }: { item: Template }) => {
    const isApproved = item.status === "APPROVED";
    
    return (
      <Pressable
        style={[
          styles.templateCard,
          !isApproved && styles.templateCardDisabled
        ]}
        onPress={() => handleSelect(item)}
        disabled={!isApproved}
      >
        <View style={styles.templateHeader}>
          <Text style={styles.templateName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[
            styles.statusBadge,
            isApproved ? styles.statusApproved : styles.statusPending
          ]}>
            <Text style={[
              styles.statusText,
              isApproved ? styles.statusTextApproved : styles.statusTextPending
            ]}>
              {item.status}
            </Text>
          </View>
        </View>
        
        <View style={styles.templateMeta}>
          <Text style={styles.templateCategory}>{item.category}</Text>
          <Text style={styles.templateDot}>•</Text>
          <Text style={styles.templateLanguage}>{item.language}</Text>
        </View>
      </Pressable>
    );
  }, [handleSelect]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Message Templates</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search templates..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "approved" && styles.tabActive]}
            onPress={() => setActiveTab("approved")}
          >
            <Text style={[styles.tabText, activeTab === "approved" && styles.tabTextActive]}>
              Approved ({approvedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "all" && styles.tabActive]}
            onPress={() => setActiveTab("all")}
          >
            <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
              All ({templates?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Template List */}
        {!templates ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading templates...</Text>
          </View>
        ) : filteredTemplates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No templates found" : "No templates available"}
            </Text>
          </View>
        ) : (
          <FlashList
            data={filteredTemplates as Template[]}
            renderItem={renderTemplate}
            estimatedItemSize={80}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.listContent}
          />
        )}
      </SafeAreaView>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
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
  tabs: {
    flexDirection: "row",
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  templateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  templateCardDisabled: {
    opacity: 0.6,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  templateName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusApproved: {
    backgroundColor: "#DCFCE7",
  },
  statusPending: {
    backgroundColor: "#FEF9C3",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusTextApproved: {
    color: "#166534",
  },
  statusTextPending: {
    color: "#854D0E",
  },
  templateMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  templateCategory: {
    fontSize: 13,
    color: "#666",
  },
  templateDot: {
    fontSize: 13,
    color: "#999",
    marginHorizontal: 6,
  },
  templateLanguage: {
    fontSize: 13,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
});
