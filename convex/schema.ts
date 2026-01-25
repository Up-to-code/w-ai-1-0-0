import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("agent"), v.literal("user")),
    // Auth fields (if using custom auth or linking to provider)
    tokenIdentifier: v.optional(v.string()),
    password: v.optional(v.string()),
  }).index("by_email", ["email"])
    .index("by_token", ["tokenIdentifier"])
    .index("by_phone", ["phone"]),

  otps: defineTable({
    phone: v.string(),
    code: v.string(),
    expiresAt: v.number(),
    attempts: v.number(),
  }).index("by_phone", ["phone"]),

  chats: defineTable({
    contactId: v.string(), // WhatsApp Phone Number ID
    contactName: v.string(),
    contactPhone: v.string(),
    lastMessageTime: v.number(),
    unreadCount: v.number(),
    status: v.union(v.literal("active"), v.literal("expired")), // 24h window
    tags: v.optional(v.array(v.string())),
    assignedTo: v.optional(v.id("users")), // Assigned agent
    aiMode: v.optional(v.boolean()), // AI Agent Mode
    aiSummary: v.optional(v.string()), // Compressed conversation history
  }).index("by_last_message", ["lastMessageTime"])
    .index("by_assigned_to", ["assignedTo"]),

  ai_configs: defineTable({
    systemPrompt: v.string(),
    model: v.string(),
    temperature: v.optional(v.number()),
    isActive: v.boolean(),
    updatedAt: v.number(),
  }),

  messages: defineTable({
    chatId: v.id("chats"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    type: v.union(v.literal("text"), v.literal("image"), v.literal("video"), v.literal("audio"), v.literal("document"), v.literal("template"), v.literal("interactive")),
    content: v.optional(v.string()), // Text body or Caption
    mediaId: v.optional(v.string()), // Meta Media ID
    storageId: v.optional(v.string()), // Convex Storage ID
    status: v.union(v.literal("sent"), v.literal("delivered"), v.literal("read"), v.literal("failed")),
    timestamp: v.number(),
    metaMessageId: v.optional(v.string()),
    replyTo: v.optional(v.id("messages")), // Reference to message being replied to
  }).index("by_chat", ["chatId"])
    .index("by_meta_message_id", ["metaMessageId"]),

  files: defineTable({
    storageId: v.string(),
    url: v.string(),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    uploadedBy: v.id("users"),
    category: v.optional(v.string()), // e.g., "campaign", "chat"
    whatsappMediaId: v.optional(v.string()), // Added for mapped media
    createdAt: v.number(),
  }).index("by_category", ["category"])
    .index("by_whatsapp_media_id", ["whatsappMediaId"]),

  templates: defineTable({
    name: v.string(),
    language: v.string(),
    category: v.string(),
    content: v.optional(v.string()), // <--- Added content field
    components: v.any(), // JSON structure of components
    status: v.union(v.literal("APPROVED"), v.literal("REJECTED"), v.literal("PENDING")),
    metaTemplateId: v.optional(v.string()),
    lastSyncedAt: v.number(),
  }),

  products: defineTable({
    externalId: v.string(), // SOLO ID
    name: v.string(),
    price: v.number(),
    currency: v.string(),
    imageUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    inStock: v.boolean(),
  }).index("by_external_id", ["externalId"])
    .searchIndex("search_products", {
      searchField: "name",
      filterFields: ["inStock"]
    }),

  knowledge_base: defineTable({
    title: v.string(),
    content: v.string(),
    embedding: v.array(v.float64()), // Vector for RAG
    sourceType: v.union(v.literal("text"), v.literal("pdf")),
    createdAt: v.number(),
  }),

  // Salla OAuth Integration - stores tokens, fetches products on demand
  sallaIntegrations: defineTable({
    merchantId: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    storeName: v.optional(v.string()),
    storeUrl: v.optional(v.string()),
    connectedAt: v.number(),
  }).index("by_merchant", ["merchantId"]),

  // --- Scalable Campaigns Schema ---

  contacts: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    customFields: v.optional(v.any()), // JSON
    isSubscribed: v.boolean(),
    createdAt: v.number(),
    // Anti-spam tracking fields
    lastMessagedAt: v.optional(v.number()),        // Timestamp of last message sent
    lastMessagedTemplate: v.optional(v.string()),  // Last template name sent
  }).index("by_phone", ["phone"])
    .index("by_tag", ["tags"]), // Note: Convex doesn't support array indexing directly like this, but we'll filter

  segments: defineTable({
    name: v.string(),
    criteria: v.any(), // JSON criteria
    count: v.number(),
    lastCalculatedAt: v.number(),
  }),

  campaigns: defineTable({
    name: v.string(),
    templateId: v.id("templates"),
    templateName: v.string(),
    segmentId: v.optional(v.id("segments")), // Optional if sending to specific tags/list
    targetTags: v.optional(v.array(v.string())), // Alternative to segment
    targetContactIds: v.optional(v.array(v.id("contacts"))), // Specific list of contacts
    status: v.union(
      v.literal("DRAFT"),
      v.literal("SCHEDULED"),
      v.literal("PROCESSING"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
      v.literal("PAUSED")
    ),
    scheduledAt: v.number(),
    recurrenceCronSpec: v.optional(v.string()),
    stats: v.object({
      total: v.number(),
      sent: v.number(),
      delivered: v.number(),
      read: v.number(),
      failed: v.number(),
      skipped: v.optional(v.number()),  // Contacts skipped due to rate limiting
    }),
    // Anti-spam sending configuration
    sendingConfig: v.optional(v.object({
      messagesPerSecond: v.number(),      // Target rate (default: 10)
      delayBetweenMessages: v.number(),   // ms delay between each message
      maxRetries: v.number(),             // Max retries per contact
      skipRecentlyContacted: v.boolean(), // Skip if contacted in last N hours
      recentContactHours: v.number(),     // Hours to consider "recent"
    })),
    createdAt: v.number(),
  }),

  // Workflows (Automation)
  workflows: defineTable({
    name: v.string(),
    trigger: v.string(), // new_message, keyword, etc.
    triggerConfig: v.any(), // { keyword: "hello" }
    action: v.string(), // send_message, add_tag
    actionConfig: v.any(), // { templateId: "..." }
    enabled: v.boolean(),
    stats: v.object({
      runs: v.number(),
      lastRun: v.optional(v.number())
    }),
    createdAt: v.number(),
  }),

  campaign_logs: defineTable({
    campaignId: v.id("campaigns"),
    contactId: v.id("contacts"),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
      v.literal("skipped")  // Skipped due to rate limiting or recently contacted
    ),
    metaMessageId: v.optional(v.string()),
    error: v.optional(v.string()),
    skipReason: v.optional(v.string()),  // "recently_contacted", "rate_limited", etc.
  }).index("by_campaign", ["campaignId"])
    .index("by_message_id", ["metaMessageId"]),

  notifications: defineTable({
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("error"), v.literal("success")),
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
    link: v.optional(v.string()),
  }).index("by_read", ["read"])
    .index("by_created_at", ["createdAt"]),

  webhook_events: defineTable({
    source: v.union(v.literal("whatsapp"), v.literal("salla")),
    body: v.any(),
    createdAt: v.number(),
  }).index("by_source_createdAt", ["source", "createdAt"]),

  orders: defineTable({
    orderNumber: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("cancelled"), v.literal("refunded")),
    currency: v.string(),
    items: v.any(), // JSON array of items
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  userActiveChats: defineTable({
    userId: v.id("users"),
    chatId: v.id("chats"),
    lastActiveAt: v.number(), // Timestamp when user last viewed this chat
  }).index("by_user", ["userId"])
    .index("by_user_chat", ["userId", "chatId"]),
});
