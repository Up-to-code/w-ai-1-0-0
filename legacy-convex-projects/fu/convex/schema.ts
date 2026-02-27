import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema(
  {
    // Products table (for e-commerce functionality)
    products: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      price: v.number(),
      imageUrl: v.optional(v.string()),
      categoryId: v.optional(v.string()),
      stock: v.optional(v.number()),
      isActive: v.optional(v.boolean()),
    }),

    // Categories table
    categories: defineTable({
      name: v.string(),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      parentId: v.optional(v.id("categories")),
    }),

    // Orders table
    orders: defineTable({
      userId: v.string(),
      status: v.string(),
      total: v.number(),
      items: v.array(v.object({
        productId: v.string(),
        quantity: v.number(),
        price: v.number(),
      })),
      shippingAddress: v.optional(v.object({
        street: v.string(),
        city: v.string(),
        country: v.string(),
      })),
      createdAt: v.number(),
    })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

    // User addresses
    addresses: defineTable({
      userId: v.string(),
      label: v.string(),
      street: v.string(),
      city: v.string(),
      country: v.string(),
      district: v.optional(v.string()),
      details: v.optional(v.string()),
      isDefault: v.optional(v.boolean()),
    }),

    // Favorites/Wishlist
    favorites: defineTable({
      userId: v.string(),
      productId: v.string(),
    })
    .index("by_user_product", ["userId", "productId"]),

    // User profiles with role information
    userProfiles: defineTable({
      userId: v.string(),
      role: v.string(), // "customer" (default), "freelancer", "vendor", "admin"
      name: v.union(v.string(), v.null()),
      businessName: v.optional(v.string()), // Store/Organization name
      phone: v.union(v.string(), v.null()),
      language: v.optional(v.string()),
      imageStorageId: v.optional(v.id("_storage")),
      organizationId: v.optional(v.id("organizations")), // Link to primary organization
      isDeleted: v.optional(v.boolean()),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_userId", ["userId"]),

    organizationMembers: defineTable({
      organizationId: v.id("organizations"),
      userId: v.optional(v.string()),
      inviteEmail: v.optional(v.string()),
      role: v.string(), // "owner", "admin", "member"
      customPermissions: v.optional(v.array(v.string())),
      isDeleted: v.optional(v.boolean()),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      createdByUserId: v.string(),
      updatedByUserId: v.string(),
    })
    .index("by_organization", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"])
    .index("by_isDeleted", ["isDeleted"]),

    auditLogs: defineTable({
      actorUserId: v.string(),
      action: v.string(),
      entityType: v.string(),
      entityId: v.string(),
      before: v.optional(v.any()),
      after: v.optional(v.any()),
      timestamp: v.optional(v.number()), // Made optional to support legacy data
      createdAt: v.optional(v.number()), // Added for backward compatibility
    })
    .index("by_entity", ["entityType", "entityId"])
    // Removed specific index on timestamp/createdAt to allow flexible migration
    .index("by_actor", ["actorUserId"]),

    // Services table (for service providers)
    services: defineTable({
      providerId: v.string(),              // Links to userProfiles.userId
      name: v.string(),
      nameEn: v.string(),
      description: v.string(),
      categoryId: v.id("serviceCategories"),
      price: v.number(),
      priceType: v.union(v.literal("fixed"), v.literal("hourly"), v.literal("range")),
      priceRange: v.optional(v.object({
        min: v.number(),
        max: v.number(),
      })),
      images: v.array(v.string()),
      location: v.string(),
      locationType: v.union(v.literal("home"), v.literal("provider_location"), v.literal("remote")),
      duration: v.optional(v.number()),   // Duration in minutes
      experienceYears: v.optional(v.number()),
      languages: v.array(v.string()),
      responseTime: v.optional(v.string()),
      isActive: v.boolean(),
      verified: v.boolean(),
      rating: v.optional(v.number()),
      reviewsCount: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_provider", ["providerId"])
    .index("by_category", ["categoryId"])
    .index("by_provider_and_active", ["providerId", "isActive"]),

    // Service Categories table
    serviceCategories: defineTable({
      name: v.string(),
      nameEn: v.string(),
      description: v.optional(v.string()),
      icon: v.optional(v.string()),
      parentId: v.optional(v.id("serviceCategories")),
      order: v.number(),
    })
    .index("by_parent", ["parentId"]),

    // Bookings table
    bookings: defineTable({
      serviceId: v.id("services"),
      providerId: v.string(),             // Service provider
      customerId: v.string(),              // Customer who booked
      status: v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("rejected")
      ),
      selectedServices: v.array(v.string()), // Service IDs selected
      scheduledDate: v.string(),           // ISO date string
      scheduledTime: v.string(),          // Time string (HH:mm)
      location: v.union(
        v.literal("home"),
        v.literal("provider_location"),
        v.literal("remote")
      ),
      address: v.optional(v.string()),
      addressId: v.optional(v.id("addresses")),
      phone: v.string(),
      description: v.optional(v.string()),
      totalPrice: v.number(),
      paymentStatus: v.union(v.literal("unpaid"), v.literal("paid"), v.literal("refunded")),
      paymentMethod: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_provider", ["providerId"])
    .index("by_customer", ["customerId"])
    .index("by_service", ["serviceId"])
    .index("by_provider_and_status", ["providerId", "status"])
    .index("by_date", ["scheduledDate"]),

    // Global Categories (System defaults)
    globalCategories: defineTable({
      name: v.string(),
      nameEn: v.optional(v.string()),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      image: v.optional(v.string()),
      icon: v.optional(v.string()),
      style: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    }),

    // Seller Categories
    sellerCategories: defineTable({
      providerId: v.string(),
      name: v.string(),
      nameEn: v.optional(v.string()),
      description: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      image: v.optional(v.string()),
      icon: v.optional(v.string()),
      style: v.optional(v.string()),
      products: v.optional(v.number()),
      parentId: v.optional(v.id("sellerCategories")),
      globalCategoryId: v.optional(v.id("globalCategories")), // Link to source
      backgroundColor: v.optional(v.string()), // For PRO categories
      isSystem: v.optional(v.boolean()), // To distinguish system defaults
      isDeleted: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_provider", ["providerId"]),

    // Product Media (New table for advanced media management)
    productMedia: defineTable({
      providerId: v.string(),
      productId: v.optional(v.id("sellerProducts")), // Can be unassigned initially
      variantId: v.optional(v.id("sellerProductVariants")),
      optionKey: v.optional(v.string()),
      optionValue: v.optional(v.string()),
      url: v.string(),
      storageId: v.optional(v.string()), // For backend deletion
      type: v.union(v.literal("image"), v.literal("video")),
      name: v.optional(v.string()),
      size: v.optional(v.number()),
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      duration: v.optional(v.number()),
      isMain: v.optional(v.boolean()),
      order: v.optional(v.number()),
      isVerified: v.optional(v.boolean()),
      createdAt: v.number(),
    })
    .index("by_product", ["productId"])
    .index("by_variant", ["variantId"])
    .index("by_provider", ["providerId"]),

    // Seller Products
    sellerProducts: defineTable({
      providerId: v.string(),
      name: v.string(),
      nameEn: v.optional(v.string()),
      description: v.optional(v.string()),
      price: v.number(),
      comparePrice: v.optional(v.number()),
      stock: v.number(),
      status: v.string(),
      categoryId: v.optional(v.id("sellerCategories")),
      style: v.optional(v.string()),
      sku: v.optional(v.string()),
      image: v.string(),
      images: v.array(v.string()),
      video: v.optional(v.string()),
      videos: v.optional(v.array(v.string())),
      sales: v.optional(v.number()),
      views: v.optional(v.number()),
      isDeleted: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_provider", ["providerId"])
    .index("by_provider_and_deleted", ["providerId", "isDeleted"]),

    sellerProductOptionGroups: defineTable({
      productId: v.id("sellerProducts"),
      providerId: v.string(),
      key: v.string(),
      name: v.string(),
      type: v.union(
        v.literal("size"),
        v.literal("color"),
        v.literal("material"),
        v.literal("custom")
      ),
      position: v.number(),
      isRequired: v.boolean(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_product", ["productId"])
    .index("by_provider", ["providerId"])
    .index("by_product_and_key", ["productId", "key"]),

    sellerProductOptionValues: defineTable({
      productId: v.id("sellerProducts"),
      providerId: v.string(),
      groupId: v.id("sellerProductOptionGroups"),
      valueKey: v.string(),
      label: v.string(),
      position: v.number(),
      isActive: v.boolean(),
      hex: v.optional(v.string()),
      rgb: v.optional(v.string()),
      dimensions: v.optional(v.object({
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        depth: v.optional(v.number()),
        unit: v.optional(v.string()),
      })),
      textureName: v.optional(v.string()),
      meta: v.optional(v.any()),
      primaryImageUrl: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_product", ["productId"])
    .index("by_provider", ["providerId"])
    .index("by_group", ["groupId"])
    .index("by_product_group_valueKey", ["productId", "groupId", "valueKey"]),

    sellerProductOptionAttributes: defineTable({
      productId: v.id("sellerProducts"),
      providerId: v.string(),
      groupKey: v.string(),
      valueKey: v.string(),
      attributes: v.any(),
      updatedAt: v.number(),
    })
    .index("by_product", ["productId"])
    .index("by_provider", ["providerId"])
    .index("by_product_group_valueKey", ["productId", "groupKey", "valueKey"]),

    sellerProductPriceRules: defineTable({
      productId: v.id("sellerProducts"),
      providerId: v.string(),
      ruleType: v.union(
        v.literal("valueAdjustment"),
        v.literal("valueMultiplier"),
        v.literal("pairOverride"),
        v.literal("comboOverride")
      ),
      appliesTo: v.any(),
      amount: v.optional(v.number()),
      multiplier: v.optional(v.number()),
      currency: v.optional(v.string()),
      priority: v.number(),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_product", ["productId"])
    .index("by_provider", ["providerId"])
    .index("by_product_and_ruleType", ["productId", "ruleType"]),

    sellerCustomizationTemplates: defineTable({
      providerId: v.string(),
      name: v.string(),
      appliesTo: v.optional(v.any()),
      definition: v.any(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_provider", ["providerId"]),

    sellerCustomizationCache: defineTable({
      productId: v.id("sellerProducts"),
      providerId: v.string(),
      combinationKey: v.string(),
      version: v.string(),
      result: v.any(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_product", ["productId"])
    .index("by_provider", ["providerId"])
    .index("by_product_and_combinationKey", ["productId", "combinationKey"]),

    sellerCustomizationResolveEvents: defineTable({
      providerId: v.string(),
      productId: v.id("sellerProducts"),
      combinationKey: v.string(),
      durationMs: v.number(),
      cacheHit: v.boolean(),
      createdAt: v.number(),
    })
    .index("by_provider", ["providerId"])
    .index("by_product", ["productId"]),

    // Seller Product Variants
    sellerProductVariants: defineTable({
      productId: v.id("sellerProducts"),
      providerId: v.string(),
      combination: v.any(), // Record<string, string>
      combinationKey: v.string(),
      parentVariantId: v.optional(v.id("sellerProductVariants")),
      isDefault: v.optional(v.boolean()),
      price: v.number(),
      stock: v.number(),
      sku: v.optional(v.string()),
      image: v.optional(v.string()),
      images: v.optional(v.array(v.string())),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_product", ["productId"])
    .index("by_provider", ["providerId"])
    .index("by_product_and_combinationKey", ["productId", "combinationKey"]),

    // Seller Orders
    sellerOrders: defineTable({
      providerId: v.string(),
      orderNumber: v.string(),
      customerName: v.string(),
      email: v.string(),
      phone: v.string(),
      items: v.array(v.object({
        productId: v.string(),
        variantId: v.optional(v.string()),
        selectedOptions: v.optional(v.any()),
        customizationSnapshot: v.optional(v.any()),
        productName: v.string(),
        productImage: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
      })),
      total: v.number(),
      subtotal: v.number(),
      shipping: v.number(),
      status: v.string(),
      date: v.string(),
      address: v.object({
        street: v.string(),
        city: v.string(),
        district: v.string(),
        postalCode: v.string(),
      }),
      paymentMethod: v.string(),
      shippingCompany: v.optional(v.string()),
      trackingNumber: v.optional(v.string()),
      shippingNotes: v.optional(v.string()),
      cancellationReason: v.optional(v.string()),
      isDeleted: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })
    .index("by_provider", ["providerId"])
    .index("by_orderNumber", ["orderNumber"]),

    // Service Reviews table
    serviceReviews: defineTable({
      serviceId: v.id("services"),
      bookingId: v.optional(v.id("bookings")),
      customerId: v.string(),
      customerName: v.string(),
      rating: v.number(),                  // 1-5
      comment: v.string(),
      images: v.optional(v.array(v.string())),
      createdAt: v.number(),
    })
    .index("by_service", ["serviceId"])
    .index("by_customer", ["customerId"]),

    // Organizations
    organizations: defineTable({
      name: v.string(),
      nameLower: v.string(),
      slug: v.string(),
      commercialRegistration: v.optional(v.string()),
      description: v.optional(v.string()),
      website: v.optional(v.string()),
      isDeleted: v.boolean(),
      deletedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
      createdByUserId: v.string(),
      updatedByUserId: v.string(),
    })
    .index("by_slug", ["slug"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["isDeleted"] }),
  },
  { schemaValidation: true }
);
