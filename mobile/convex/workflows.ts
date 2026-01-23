import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("workflows").order("desc").collect();
    }
});

export const create = mutation({
    args: {
        name: v.string(),
        trigger: v.string(),
        triggerConfig: v.any(),
        action: v.string(),
        actionConfig: v.any(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("workflows", {
            name: args.name,
            trigger: args.trigger,
            triggerConfig: args.triggerConfig,
            action: args.action,
            actionConfig: args.actionConfig,
            enabled: true,
            stats: { runs: 0 },
            createdAt: Date.now(),
        });
    }
});

export const toggle = mutation({
    args: { id: v.id("workflows") },
    handler: async (ctx, args) => {
        const workflow = await ctx.db.get(args.id);
        if (workflow) {
            await ctx.db.patch(args.id, { enabled: !workflow.enabled });
        }
    }
});

export const update = mutation({
    args: {
        id: v.id("workflows"),
        name: v.string(),
        trigger: v.string(),
        triggerConfig: v.any(),
        action: v.string(),
        actionConfig: v.any(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, {
            name: args.name,
            trigger: args.trigger,
            triggerConfig: args.triggerConfig,
            action: args.action,
            actionConfig: args.actionConfig,
        });
    }
});

export const remove = mutation({
    args: { id: v.id("workflows") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    }
});

// --- Execution Engine ---

async function executeWorkflowAction(ctx: any, workflow: any, contactPhone: string, contactId?: string) {
    console.log(`[Workflows] Executing rule "${workflow.name}"`);

    // Increment stats
    await ctx.db.patch(workflow._id, {
        stats: {
            runs: (workflow.stats?.runs || 0) + 1,
            lastRun: Date.now()
        }
    });

    // Execute Action
    if (workflow.action === "send_template") {
        const templateName = workflow.actionConfig?.template;
        if (templateName) {
            await ctx.scheduler.runAfter(0, api.whatsapp.sendMessage, {
                to: contactPhone,
                type: "template",
                content: {
                    name: templateName,
                    language: { code: "ar" },
                    components: []
                }
            });
            console.log(`[Workflows] Scheduled Template: ${templateName}`);
        }
    } else if (workflow.action === "add_tag") {
        const tag = workflow.actionConfig?.tag;
        if (tag) {
            // If we have contactId, use it directly, otherwise search
            let contact = null;
            if (contactId) {
                contact = await ctx.db.get(contactId);
            } else {
                contact = await ctx.db
                    .query("contacts")
                    .withIndex("by_phone", (q: any) => q.eq("phone", contactPhone))
                    .first();
            }

            if (contact) {
                const tags = contact.tags || [];
                if (!tags.includes(tag)) {
                    await ctx.db.patch(contact._id, { tags: [...tags, tag] });
                    console.log(`[Workflows] Action: Added Tag "${tag}" to ${contactPhone}`);
                }
            }
        }
    } else if (workflow.action === "notify") {
        const message = workflow.actionConfig?.message || `Automation Rule "${workflow.name}" triggered.`;
        await ctx.scheduler.runAfter(0, internal.notifications.create, {
            type: "info",
            title: "Automation Alert",
            message: message,
            link: "/workflows"
        });
    } else if (workflow.action === "remove_tag") {
        const tag = workflow.actionConfig?.tag;
        if (tag) {
            let contact = null;
            if (contactId) {
                contact = await ctx.db.get(contactId);
            } else {
                contact = await ctx.db
                    .query("contacts")
                    .withIndex("by_phone", (q: any) => q.eq("phone", contactPhone))
                    .first();
            }

            if (contact && contact.tags && contact.tags.includes(tag)) {
                const newTags = contact.tags.filter((t: string) => t !== tag);
                await ctx.db.patch(contact._id, { tags: newTags });
                console.log(`[Workflows] Action: Removed Tag "${tag}" from ${contactPhone}`);
            }
        }
    } else if (workflow.action === "assign_user") {
        const userId = workflow.actionConfig?.userId;
        if (userId) {
            // Find chat associated with this contact
            // Note: Schema stores contactPhone in chats
            const chat = await ctx.db
                .query("chats")
                .filter((q: any) => q.eq(q.field("contactPhone"), contactPhone))
                .first();

            if (chat) {
                await ctx.db.patch(chat._id, { assignedTo: userId });
                console.log(`[Workflows] Action: Assigned chat ${chat._id} to user ${userId}`);
            }
        }
    }
}

export const checkAndExecuteWorkflows = internalMutation({
    args: {
        messageId: v.id("messages"),
        content: v.string(),
        contactPhone: v.string(),
    },
    handler: async (ctx, args) => {
        // 1. Fetch Active Workflows
        const workflows = await ctx.db
            .query("workflows")
            .filter((q: any) => q.eq(q.field("enabled"), true))
            .collect();

        if (workflows.length === 0) return;

        console.log(`[Workflows] Checking ${workflows.length} rules for message: ${args.messageId}`);

        for (const workflow of workflows) {
            let matched = false;

            // 2. Check Triggers
            if (workflow.trigger === "new_message") {
                matched = true;
            } else if (workflow.trigger === "keyword") {
                const keyword = workflow.triggerConfig?.keyword?.toLowerCase();
                if (keyword && args.content.toLowerCase().includes(keyword)) {
                    matched = true;
                }
            }

            // 3. Execute Action if Matched
            if (matched) {
                await executeWorkflowAction(ctx, workflow, args.contactPhone);
            }
        }
    }
});

export const checkContactWorkflows = internalMutation({
    args: {
        contactId: v.id("contacts"),
        contactPhone: v.string(),
        isNew: v.boolean(),
    },
    handler: async (ctx, args) => {
        const workflows = await ctx.db
            .query("workflows")
            .filter((q: any) => q.eq(q.field("enabled"), true))
            .collect();

        for (const workflow of workflows) {
            if (workflow.trigger === "contact_created" && args.isNew) {
                await executeWorkflowAction(ctx, workflow, args.contactPhone, args.contactId);
            }
        }
    }
});
export const checkTagWorkflows = internalMutation({
    args: {
        contactId: v.id("contacts"),
        contactPhone: v.string(),
        addedTag: v.string(),
    },
    handler: async (ctx, args) => {
        const workflows = await ctx.db
            .query("workflows")
            .filter((q: any) => q.eq(q.field("enabled"), true))
            .collect();

        for (const workflow of workflows) {
            if (workflow.trigger === "tag_added") {
                // Check if this is the specific tag we are looking for (optional, if UI supports specific tag trigger)
                // Assuming triggerConfig.tag might exist, or it triggers on ANY tag if empty
                const targetTag = workflow.triggerConfig?.tag;

                if (!targetTag || targetTag === args.addedTag) {
                    await executeWorkflowAction(ctx, workflow, args.contactPhone, args.contactId);
                }
            }
        }
    }
});
