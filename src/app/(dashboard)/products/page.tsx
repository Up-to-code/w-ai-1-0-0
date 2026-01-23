"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useQuery, useAction } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import {
    Search,
    Package,
    RefreshCw,
    Link2,
    ShoppingBag,
    Info,
    } from "lucide-react"

export default function ProductsPage() {
    const connection = useQuery(api.salla.getConnection)
    const fetchProducts = useAction(api.salla.fetchProducts)

    type Product = {
        id: string | number
        name: string
        sku: string
        price: number
        originalPrice: number
        currency: string
        stock: number
        image?: string | null
        inStock: boolean
        description?: string
        url?: string
        status?: string
        options?: unknown[]
        images?: unknown[]
    }

    const [products, setProducts] = useState<Product[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [hasFetched, setHasFetched] = useState(false)
    const [search, setSearch] = useState("")
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const sentinelRef = useRef<HTMLDivElement | null>(null)

    const handleFetchProducts = useCallback(async (initial?: boolean) => {
        if (initial) {
            setIsLoading(true)
            try {
                const result = await fetchProducts({ page: 1, perPage: 50 })
                if (result.connected) {
                    setProducts(result.products)
                    setPage(result.pagination?.currentPage || 1)
                    setTotalPages(result.pagination?.totalPages || 1)
                }
                setHasFetched(true)
            } finally {
                setIsLoading(false)
            }
            return
        }
        if (isLoadingMore || page >= totalPages) return
        setIsLoadingMore(true)
        try {
            const nextPage = page + 1
            const result = await fetchProducts({ page: nextPage, perPage: 50 })
            if (result.connected) {
                setProducts(prev => [...prev, ...result.products])
                setPage(result.pagination?.currentPage || nextPage)
                setTotalPages(result.pagination?.totalPages || totalPages)
            }
        } finally {
            setIsLoadingMore(false)
        }
    }, [fetchProducts, isLoadingMore, page, totalPages])

    useEffect(() => {
        if (connection && !hasFetched && !isLoading) {
            handleFetchProducts(true)
        }
    }, [connection, hasFetched, isLoading, handleFetchProducts])

    useEffect(() => {
        const el = sentinelRef.current
        if (!el || !hasFetched) return
        const observer = new IntersectionObserver((entries) => {
            const [entry] = entries
            if (entry.isIntersecting && !isLoading && !isLoadingMore && search.trim() === "") {
                handleFetchProducts(false)
            }
        }, { rootMargin: "200px" })
        observer.observe(el)
        return () => observer.disconnect()
    }, [hasFetched, isLoading, isLoadingMore, search, page, totalPages, handleFetchProducts])

    const filteredProducts = products.filter(p =>
        p.name?.includes(search) || p.sku?.includes(search)
    )

    // Not connected state
    if (!connection) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 rounded-full bg-[#004D3D]/10 flex items-center justify-center mb-6">
                    <ShoppingBag className="h-10 w-10 text-[#004D3D]" />
                </div>
                <h2 className="text-xl font-bold mb-2">لم يتم ربط متجر سلة</h2>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    قم بربط متجرك على سلة لعرض المنتجات واستخدامها في قوالب واتساب
                </p>
                <Link href="/integrations">
                    <Button className="gap-2 bg-[#004D3D] hover:bg-[#003D2D]">
                        <Link2 className="h-4 w-4" />
                        ربط متجر سلة
                    </Button>
                </Link>
            </div>
        )
    }

    // Connected but no products fetched yet
    if (!hasFetched && products.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#004D3D] flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">منتجات سلة</h1>
                        <p className="text-muted-foreground text-sm">
                            متصل بـ {connection.storeName || "متجر سلة"}
                        </p>
                    </div>
                </div>

                <Card className="max-w-lg mx-auto">
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="rounded-xl border bg-muted/30 animate-pulse h-28" />
                            ))}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            جاري التحميل...
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6 m-16">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#004D3D] flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">منتجات سلة</h1>
                        <p className="text-muted-foreground text-sm">
                            {connection.storeName || "متجر سلة"} • {products.length} منتج
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => handleFetchProducts(true)}
                    disabled={isLoading}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    {isLoading ? 'جاري التحديث...' : 'تحديث'}
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث بالاسم أو SKU..."
                        className="pr-10 h-11"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Products Grid */}
            {isLoading && products.length === 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="rounded-xl border bg-muted/30 animate-pulse h-64" />
                    ))}
                </div>
            ) : filteredProducts.length === 0 ? (
                <Card className="border-dashed shadow-none">
                    <CardContent className="py-12 text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">لا توجد منتجات</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            className="group cursor-pointer rounded-xl border bg-card text-card-foreground transition-all hover:border-[#004D3D]/50"
                            onClick={() => setSelectedProduct(product)}
                        >
                            <div className="aspect-square bg-muted rounded-t-xl overflow-hidden relative">
                                {product.image ? (
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-12 w-12 text-muted-foreground/50" />
                                    </div>
                                )}
                                {!product.inStock && (
                                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                        <Badge variant="destructive">نفد من المخزون</Badge>
                                    </div>
                                )}
                            </div>
                            <div className="p-3">
                                <h3 className="font-medium text-sm line-clamp-1 mb-1">{product.name}</h3>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-[#004D3D]">{product.price}</span>
                                        <span className="text-xs text-muted-foreground">{product.currency}</span>
                                    </div>
                                    {product.originalPrice > product.price && (
                                        <span className="text-xs text-muted-foreground line-through">
                                            {product.originalPrice}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={sentinelRef} />
                </div>
            )}

            {/* Quick Look Modal */}
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>نظرة سريعة</DialogTitle>
                        <DialogDescription>
                            تفاصيل المنتج الأساسية
                        </DialogDescription>
                    </DialogHeader>

                    {selectedProduct && (
                        <div className="space-y-6">
                            {/* Header Image */}
                            <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                                {selectedProduct.image ? (
                                    <img
                                        src={selectedProduct.image}
                                        alt={selectedProduct.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="h-16 w-16 text-muted-foreground/50" />
                                    </div>
                                )}
                            </div>

                            {/* Title & Price */}
                            <div>
                                <h2 className="text-lg font-bold line-clamp-2">{selectedProduct.name}</h2>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xl font-bold text-[#004D3D]">
                                        {selectedProduct.price} <span className="text-sm font-normal text-muted-foreground">{selectedProduct.currency}</span>
                                    </span>
                                    {selectedProduct.originalPrice > selectedProduct.price && (
                                        <span className="text-sm text-muted-foreground line-through">
                                            {selectedProduct.originalPrice} {selectedProduct.currency}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span className={`w-2 h-2 rounded-full ${selectedProduct.inStock ? 'bg-success' : 'bg-destructive'}`} />
                                {selectedProduct.inStock ? `متوفر (${selectedProduct.stock} قطعة)` : 'غير متوفر'}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                <Link href={`/products/${selectedProduct.id}`} className="w-full">
                                    <Button className="w-full gap-2 bg-[#004D3D] hover:bg-[#003D2D]">
                                        <Info className="h-4 w-4" />
                                        عرض التفاصيل الكاملة
                                    </Button>
                                </Link>
                                <Button className="w-full gap-2 bg-[#004D3D] hover:bg-[#003D2D]" asChild>
                                    <Link href={`/templates/new?salla_product_id=${selectedProduct.id}`}>
                                        <ShoppingBag className="h-4 w-4" />
                                        استخدام في قالب
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
