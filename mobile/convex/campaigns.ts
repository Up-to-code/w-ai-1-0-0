import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { retrier, crons } from "./index";

// 1. Create a Campaign
export const create = mutation({
    args: {
        name: v.string(),
        templateId: v.id("templates"),
        templateName: v.string(), // Cached for recursion
        segmentId: v.optional(v.id("segments")),
        targetTags: v.optional(v.array(v.string())),
        targetContactIds: v.optional(v.array(v.id("contacts"))),
        scheduledAt: v.number(),
        recurrenceCronSpec: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("campaigns", {
            name: args.name,
            templateId: args.templateId,
            templateName: args.templateName,
            segmentId: args.segmentId,
            targetTags: args.targetTags,
            targetContactIds: args.targetContactIds,
            status: "SCHEDULED",
            scheduledAt: args.scheduledAt,
            recurrenceCronSpec: args.recurrenceCronSpec,
            stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
            createdAt: Date.now(),
        });

        if (args.recurrenceCronSpec) {
            await crons.register(
                ctx,
                { kind: "cron", cronspec: args.recurrenceCronSpec },
                internal.campaigns.startProcessing,
                { campaignId: id },
                `campaign-${id}`
            );
        }

        // Schedule the starting job
        const delay = Math.max(0, args.scheduledAt - Date.now());
        if (delay > 0) {
            await ctx.scheduler.runAfter(delay, internal.campaigns.startProcessing, { campaignId: id });
        } else {
            await ctx.scheduler.runAfter(0, internal.campaigns.startProcessing, { campaignId: id });
        }

        return id;
    },
});

// 2. Start Processing (Internal) - Initial Setup
export const startProcessing = internalAction({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        // 1. Count target audience
        const contacts = await ctx.runQuery(internal.campaigns.getCampaignContacts, {
            campaignId: args.campaignId,
            limit: 10000
        });

        // 2. Update status to PROCESSING and Total Count
        await ctx.runMutation(internal.campaigns.updateStatus, {
            campaignId: args.campaignId,
            status: "PROCESSING",
            total: contacts.length
        });

        // 3. Kick off the first batch
        await ctx.runAction(internal.campaigns.processBatch, {
            campaignId: args.campaignId,
            cursor: null // Start from beginning
        });
    },
});

// 3. Process Batch (Recursive)
export const processBatch = internalAction({
    args: {
        campaignId: v.id("campaigns"),
        cursor: v.union(v.string(), v.null()),
    },
    handler: async (ctx, args) => {
        const BATCH_SIZE = 50;

        // 1. Fetch batch
        const { contacts, nextCursor, templateName } = await ctx.runQuery(internal.campaigns.getBatchForProcessing, {
            campaignId: args.campaignId,
            cursor: args.cursor,
            limit: BATCH_SIZE
        });

        if (contacts.length === 0) {
            // Done!
            await ctx.runMutation(internal.campaigns.updateStatus, {
                campaignId: args.campaignId,
                status: "COMPLETED"
            });
            return;
        }

        // 2. Send Messages via Retrier
        for (const contact of contacts) {
            await retrier.run(
                ctx,
                internal.campaigns.sendToContact,
                { campaignId: args.campaignId, contactId: contact._id },
                { initialBackoffMs: 500, base: 2, maxFailures: 4 }
            );
        }

        // 4. Recurse if there's more
        if (nextCursor) {
            await ctx.scheduler.runAfter(1000, internal.campaigns.processBatch, {
                campaignId: args.campaignId,
                cursor: nextCursor
            });
        } else {
            // Completion handled in sendToContact
        }
    },
});

export const sendToContact = internalAction({
    args: { campaignId: v.id("campaigns"), contactId: v.id("contacts") },
    handler: async (ctx, args) => {
        const campaign = await ctx.runQuery(internal.campaigns.getCampaignById, { id: args.campaignId });
        const contact = await ctx.runQuery(internal.campaigns.getContactById, { id: args.contactId });
        if (!campaign || !contact) throw new Error("Campaign or contact not found");

        try {
            const res = await ctx.runAction(api.whatsapp.sendMessage, {
                to: (contact as { phone?: string }).phone as string,
                type: "template",
                content: {
                    name: campaign.templateName,
                    language: { code: "ar" },
                    components: []
                }
            });
            await ctx.runMutation(internal.campaigns.logBatchResults, {
                campaignId: args.campaignId,
                logs: [{ contactId: args.contactId, status: "sent", metaId: res.messages?.[0]?.id }]
            });
        } catch (e: unknown) {
            await ctx.runMutation(internal.campaigns.logBatchResults, {
                campaignId: args.campaignId,
                logs: [{ contactId: args.contactId, status: "failed", error: String((e as Error)?.message || e) }]
            });
        }

        const updated = await ctx.runQuery(internal.campaigns.getCampaignById, { id: args.campaignId });
        if (updated && (updated.stats.sent + updated.stats.failed) >= updated.stats.total) {
            await ctx.runMutation(internal.campaigns.updateStatus, {
                campaignId: args.campaignId,
                status: "COMPLETED"
            });
        }
    }
});

export const getCampaignById = internalQuery({
    args: { id: v.id("campaigns") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    }
});

export const getContactById = internalQuery({
    args: { id: v.id("contacts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    }
});
export const remove = mutation({
    args: { id: v.id("campaigns") },
    handler: async (ctx, args) => {
        const logs = await ctx.db.query("campaign_logs").withIndex("by_campaign", q => q.eq("campaignId", args.id)).collect();
        for (const log of logs) {
            await ctx.db.delete(log._id);
        }
        await ctx.db.delete(args.id);
        return true;
    }
});

export const recalculateStats = mutation({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        const logs = await ctx.db
            .query("campaign_logs")
            .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
            .collect();

        const stats = {
            total: logs.length, // Or keep original total if it includes pending?
            sent: 0,
            delivered: 0,
            read: 0,
            failed: 0
        };

        for (const log of logs) {
            if (log.status === 'sent') stats.sent++;
            if (log.status === 'delivered') {
                stats.sent++;
                stats.delivered++;
            }
            if (log.status === 'read') {
                stats.sent++;
                stats.delivered++;
                stats.read++;
            }
            if (log.status === 'failed') stats.failed++;
        }

        // Preserve total from existing if it's larger (meaning pending messages)
        const campaign = await ctx.db.get(args.campaignId);
        if (campaign) {
            stats.total = Math.max(stats.total, campaign.stats.total);
            await ctx.db.patch(args.campaignId, { stats });
        }
        return stats;
    }
});

export const getCampaignContacts = internalQuery({
    args: { campaignId: v.id("campaigns"), limit: v.number() },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return [];

        // 1. Direct Selection
        if (campaign.targetContactIds && campaign.targetContactIds.length > 0) {
            // Fetch specific contacts
            const contacts = await Promise.all(
                campaign.targetContactIds.map(id => ctx.db.get(id))
            );
            return contacts.filter(c => c !== null);
        }

        // 2. Tag Filtering (Naive implementation for now)
        // Ideally we use a separate index or search, but for <10k contacts this might be okay-ish for MVP
        const q = ctx.db.query("contacts");
        let contacts = await q.take(args.limit);

        if (campaign.targetTags && campaign.targetTags.length > 0) {
            contacts = contacts.filter(c =>
                c.tags?.some(tag => campaign.targetTags?.includes(tag))
            );
        }

        return contacts;
    }
});

export const getBatchForProcessing = internalQuery({
    args: { campaignId: v.id("campaigns"), cursor: v.union(v.string(), v.null()), limit: v.number() },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        const q = ctx.db.query("contacts").order("desc"); // Deterministic order

        // Use pagination
        const page = await q.paginate({ cursor: args.cursor, numItems: args.limit });

        return {
            contacts: page.page,
            nextCursor: page.continueCursor,
            templateName: campaign.templateName
        };
    }
});

export const updateStatus = internalMutation({
    args: { campaignId: v.id("campaigns"), status: v.string(), total: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const updates: { status: "DRAFT" | "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED" | "PAUSED"; stats?: { total: number; sent: number; delivered: number; read: number; failed: number } } = { status: args.status as "DRAFT" | "SCHEDULED" | "PROCESSING" | "COMPLETED" | "FAILED" | "PAUSED" };
        if (args.total !== undefined) updates.stats = { total: args.total, sent: 0, delivered: 0, read: 0, failed: 0 };

        // Proper merge
        const campaign = await ctx.db.get(args.campaignId);
        if (campaign && args.total !== undefined) {
            updates.stats = { ...campaign.stats, total: args.total };
        }

        await ctx.db.patch(args.campaignId, updates);
    }
});

export const logBatchResults = internalMutation({
    args: {
        campaignId: v.id("campaigns"),
        logs: v.array(v.object({
            contactId: v.id("contacts"),
            status: v.string(),
            metaId: v.optional(v.string()),
            error: v.optional(v.string())
        }))
    },
    handler: async (ctx, args) => {
        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) return;

        let sent = 0, failed = 0;

        for (const log of args.logs) {
            await ctx.db.insert("campaign_logs", {
                campaignId: args.campaignId,
                contactId: log.contactId,
                status: log.status as "sent" | "delivered" | "read" | "failed",
                metaMessageId: log.metaId,
                error: log.error
            });

            if (log.status === 'sent') sent++;
            if (log.status === 'failed') failed++;
        }

        // Increment Stats
        await ctx.db.patch(args.campaignId, {
            stats: {
                ...campaign.stats,
                sent: campaign.stats.sent + sent,
                failed: campaign.stats.failed + failed
            }
        });
    }
});

export const updateMessageStatus = internalMutation({
    args: {
        metaMessageId: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        console.log(`[Campaigns] updateMessageStatus called for ${args.metaMessageId} with status ${args.status}`);
        const log = await ctx.db
            .query("campaign_logs")
            .withIndex("by_message_id", (q) => q.eq("metaMessageId", args.metaMessageId))
            .first();

        if (!log) {
            console.log(`[Campaigns] Log not found for metaMessageId: ${args.metaMessageId}`);
            return false;
        }

        // Ignore if status is same
        if (log.status === args.status) {
             console.log(`[Campaigns] Status already ${args.status}, skipping.`);
             return true;
        }

        const oldStatus = log.status;
        const newStatus = args.status;

        console.log(`[Campaigns] Updating status from ${oldStatus} to ${newStatus}`);

        // Valid statuses from Meta: sent, delivered, read, failed
        // Map to our schema types
        const mappedStatus = newStatus;
        if (!["sent", "delivered", "read", "failed"].includes(newStatus)) {
            // Meta might send 'deleted' or others, ignore or map
            return true;
        }

        await ctx.db.patch(log._id, { status: mappedStatus as "sent" | "delivered" | "read" | "failed" });

        // Update Campaign Stats
        const campaign = await ctx.db.get(log.campaignId);
        if (campaign) {
            const stats = { ...campaign.stats };
            
            if (mappedStatus === 'delivered' && oldStatus !== 'delivered' && oldStatus !== 'read') {
                stats.delivered++;
            } else if (mappedStatus === 'read' && oldStatus !== 'read') {
                stats.read++;
                // If it jumped from sent to read, it implies delivered too
                if (oldStatus === 'sent') {
                    stats.delivered++; // implied
                }
            } else if (mappedStatus === 'failed' && oldStatus !== 'failed') {
                stats.failed++;
            }

            await ctx.db.patch(campaign._id, { stats });
            console.log(`[Campaigns] Stats updated:`, stats);
        } else {
             console.error(`[Campaigns] Campaign not found for log ${log._id}`);
        }
        
        return true;
    }
});

// Front-end queries
export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("campaigns").order("desc").take(20);
    }
});