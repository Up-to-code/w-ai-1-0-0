import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  Pressable,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  image?: string;
  description?: string;
  url?: string;
  sku?: string;
}

interface ProductPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}

export function ProductPicker({ visible, onClose, onSelect }: ProductPickerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const fetchProducts = useAction(api.salla.fetchProducts);

  const loadProducts = useCallback(async (pageNum: number = 1) => {
    if (loading) return;
    setLoading(true);
    
    try {
      const result = await fetchProducts({ page: pageNum, perPage: 20 });
      if (result && result.products) {
        if (pageNum === 1) {
          setProducts(result.products);
        } else {
          setProducts(prev => [...prev, ...result.products]);
        }
        setHasMore(result.products.length >= 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
      setInitialLoadDone(true);
    }
  }, [fetchProducts, loading]);

  // Load products when modal opens
  React.useEffect(() => {
    if (visible && !initialLoadDone) {
      loadProducts(1);
    }
  }, [visible, initialLoadDone, loadProducts]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const handleSelect = useCallback((product: Product) => {
    onSelect(product);
    onClose();
  }, [onSelect, onClose]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      loadProducts(page + 1);
    }
  }, [loading, hasMore, page, loadProducts]);

  const renderProduct = useCallback(({ item }: { item: Product }) => (
    <Pressable
      style={styles.productCard}
      onPress={() => handleSelect(item)}
    >
      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.productImage} />
      ) : (
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="cube-outline" size={24} color="#999" />
        </View>
      )}
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.sku && (
          <Text style={styles.productSku}>SKU: {item.sku}</Text>
        )}
        <Text style={styles.productPrice}>
          {item.price} {item.currency}
        </Text>
      </View>
    </Pressable>
  ), [handleSelect]);

  const renderFooter = useCallback(() => {
    if (!loading || !hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
      </View>
    );
  }, [loading, hasMore]);

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
          <Text style={styles.title}>Products</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
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

        {/* Product List */}
        {!initialLoadDone ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading products...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "No products found" : "No products available"}
            </Text>
          </View>
        ) : (
          <FlashList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
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
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 24,
  },
  productCard: {
    flex: 1,
    margin: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#F5F5F5",
  },
  productImagePlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  productSku: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#007AFF",
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
  footerLoader: {
    paddingVertical: 16,
    alignItems: "center",
  },
});
