import { query, mutation, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";

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
            stats: { total: 0, sent: 0, delivered: 0, read: 0, failed: 0 },
            createdAt: Date.now(),
        });

        // Schedule the starting job
        const delay = Math.max(0, args.scheduledAt - Date.now());
        if (delay > 0) {
            await ctx.scheduler.runAfter(delay, (internal.campaigns as any).startProcessing, { campaignId: id });
        } else {
            await ctx.scheduler.runAfter(0, (internal.campaigns as any).startProcessing, { campaignId: id });
        }

        return id;
    },
});

// 2. Start Processing (Internal) - Initial Setup
export const startProcessing = internalAction({
    args: { campaignId: v.id("campaigns") },
    handler: async (ctx, args) => {
        // 1. Count target audience
        const contacts = await ctx.runQuery((internal.campaigns as any).getCampaignContacts, {
            campaignId: args.campaignId,
            limit: 10000
        });

        // 2. Update status to PROCESSING and Total Count
        await ctx.runMutation((internal.campaigns as any).updateStatus, {
            campaignId: args.campaignId,
            status: "PROCESSING",
            total: contacts.length
        });

        // 3. Kick off the first batch
        await ctx.runAction((internal.campaigns as any).processBatch, {
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
        const { contacts, nextCursor, templateName } = await ctx.runQuery((internal.campaigns as any).getBatchForProcessing, {
            campaignId: args.campaignId,
            cursor: args.cursor,
            limit: BATCH_SIZE
        });

        if (contacts.length === 0) {
            // Done!
            await ctx.runMutation((internal.campaigns as any).updateStatus, {
                campaignId: args.campaignId,
                status: "COMPLETED"
            });
            return;
        }

        // 2. Send Messages (Parallel)
        const results = await Promise.allSettled(
            contacts.map(async (contact: any) => {
                try {
                    const res = await ctx.runAction(api.whatsapp.sendMessage, {
                        to: contact.phone,
                        type: "template",
                        content: {
                            name: templateName,
                            language: { code: "ar" },
                            components: []
                        }
                    });
                    return { contactId: contact._id, status: "sent", metaId: res.messages?.[0]?.id };
                } catch (e) {
                    return { contactId: contact._id, status: "failed", error: String(e) };
                }
            })
        );

        // 3. Log Results & Update Stats
        const logs = results.map((r: any) => {
            if (r.status === "fulfilled") return r.value;
            return { status: "failed", error: "Batch Promise Failed" };
        });

        await ctx.runMutation((internal.campaigns as any).logBatchResults, {
            campaignId: args.campaignId,
            logs
        });

        // 4. Recurse if there's more
        if (nextCursor) {
            await ctx.scheduler.runAfter(1000, (internal.campaigns as any).processBatch, {
                campaignId: args.campaignId,
                cursor: nextCursor
            });
        } else {
            // Double check completion
            await ctx.runMutation((internal.campaigns as any).updateStatus, {
                campaignId: args.campaignId,
                status: "COMPLETED"
            });
        }
    },
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
        let q = ctx.db.query("contacts");
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

        let q = ctx.db.query("contacts").order("desc"); // Deterministic order

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
        const updates: any = { status: args.status };
        if (args.total !== undefined) updates.stats = { ...updates.stats, total: args.total }; // Shallow merge issue fix needed below

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
                status: log.status as any,
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

// Front-end queries
export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("campaigns").order("desc").take(20);
    }
});
