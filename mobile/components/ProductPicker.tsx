import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, FlatList, Image, TextInput, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';

interface Product {
    id: string;
    name: string;
    price: number;
    currency: string;
    image: string;
    sku: string;
    url?: string;
    description?: string;
}

interface ProductPickerProps {
    onSelect: (product: Product) => void;
    trigger?: React.ReactNode;
}

export function ProductPicker({ onSelect, trigger }: ProductPickerProps) {
    const fetchProducts = useAction(api.salla.fetchProducts);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");

    const loadProducts = async (page = 1) => {
        setIsLoading(true);
        try {
            const result = await fetchProducts({ page });
            if (result.connected) {
                if (page === 1) {
                    setProducts(result.products);
                } else {
                    setProducts(prev => [...prev, ...result.products]);
                }
                setCurrentPage(page);
                setTotalItems(result.pagination?.totalItems || 0);
            }
            setHasLoaded(true);
        } catch (error) {
            console.error("Failed to load products", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        if (!hasLoaded) loadProducts(1);
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderProduct = ({ item }: { item: Product }) => (
        <TouchableOpacity
            style={styles.productCard}
            onPress={() => {
                onSelect(item);
                setIsOpen(false);
            }}
        >
            <View style={styles.imageContainer}>
                {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="bag-handle-outline" size={32} color="#ccc" />
                    </View>
                )}
                {item.sku && (
                    <View style={styles.skuBadge}>
                        <Text style={styles.skuText}>{item.sku}</Text>
                    </View>
                )}
            </View>
            <View style={styles.productDetails}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>{item.price} <Text style={styles.currencyText}>{item.currency}</Text></Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <>
            <TouchableOpacity onPress={handleOpen} style={styles.triggerButton}>
                {trigger || <Ionicons name="bag-handle" size={24} color={Theme.colors.textSecondary} />}
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                animationType="slide"
                onRequestClose={() => setIsOpen(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={Theme.colors.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>اختر منتج من سلة</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.searchContainer}>
                        <Ionicons name="search" size={20} color={Theme.colors.textSecondary} style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="بحث عن منتج..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {isLoading && products.length === 0 ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={Theme.colors.primary} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredProducts}
                            renderItem={renderProduct}
                            keyExtractor={item => item.id}
                            numColumns={2}
                            contentContainerStyle={styles.listContent}
                            onEndReached={() => {
                                if (!isLoading && products.length < totalItems) {
                                    loadProducts(currentPage + 1);
                                }
                            }}
                            onEndReachedThreshold={0.5}
                            ListFooterComponent={isLoading ? <ActivityIndicator style={{ margin: 20 }} /> : null}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="bag-handle-outline" size={64} color="#eee" />
                                    <Text style={styles.emptyText}>لا توجد منتجات</Text>
                                </View>
                            }
                        />
                    )}
                </SafeAreaView>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    triggerButton: {
        padding: 5,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#eee',
    },
    closeButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Theme.colors.textPrimary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        height: 44,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#ddd',
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Theme.colors.textPrimary,
        textAlign: 'right',
    },
    listContent: {
        padding: 8,
    },
    productCard: {
        flex: 1,
        margin: 6,
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#eee',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    imageContainer: {
        aspectRatio: 1,
        backgroundColor: '#f0f0f0',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skuBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    skuText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    productDetails: {
        padding: 10,
        flex: 1,
    },
    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: Theme.colors.textPrimary,
        lineHeight: 18,
        textAlign: 'right',
        height: 36,
    },
    productFooter: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    productPrice: {
        fontSize: 15,
        fontWeight: 'bold',
        color: Theme.colors.primary,
    },
    currencyText: {
        fontSize: 10,
        fontWeight: 'normal',
        color: Theme.colors.textSecondary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 10,
        color: Theme.colors.textSecondary,
        fontSize: 16,
    },
});
