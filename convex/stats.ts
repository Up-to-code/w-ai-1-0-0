import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        // Parallel Fetching for Best Performance
        // Forced Sync Update
        const [
            contactsCount,
            messagesCount,
            campaignsCount,
            recentMessages
        ] = await Promise.all([
            ctx.db.query("contacts").collect().then(res => res.length), // Optimization: use count() if available or index logic
            ctx.db.query("messages").collect().then(res => res.length),
            ctx.db.query("campaigns").collect().then(res => res.length),
            ctx.db.query("messages")
                .order("desc")
                .take(5)
        ]);

        // Format Recent Activity from Messages
        const recentActivity = await Promise.all(recentMessages.map(async (msg) => {
            let name = "مستخدم";
            // Try to resolve contact name ??
            // Ideally messages should have sender info denormalized or we join.
            // For now, simple "New Message" activity
            const chat = await ctx.db.get(msg.chatId);
            return {
                id: msg._id,
                type: "message",
                user: chat?.contactName || "Unknown",
                action: msg.direction === "inbound" ? "أرسل رسالة جديدة" : "تم إرسال رسالة",
                time: msg._creationTime, // Timestamp
                icon: "MessageSquare",
                color: "primary"
            };
        }));

        // Real Chart Data (Last 7 Days)
        const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(today.getDate() - (6 - i));
            return d;
        });

        // Fetch all messages and campaigns for aggregation (Optimizable with index/analytics table later)
        const allMessages = await ctx.db.query("messages").collect();
        const allCampaigns = await ctx.db.query("campaigns").collect();

        const chartData = last7Days.map(date => {
            const dayStart = new Date(date.setHours(0, 0, 0, 0)).getTime();
            const dayEnd = new Date(date.setHours(23, 59, 59, 999)).getTime();

            return {
                day: dayNames[date.getDay()],
                messages: allMessages.filter(m => m.timestamp >= dayStart && m.timestamp <= dayEnd).length,
                campaigns: allCampaigns.filter(c => c.createdAt >= dayStart && c.createdAt <= dayEnd).length
            };
        });

        // Calculate Rates
        const sentMessages = allMessages.filter(m => m.direction === "outbound" && m.status !== "failed").length;
        const totalOutbound = allMessages.filter(m => m.direction === "outbound").length;
        const deliveryRate = totalOutbound > 0 ? (sentMessages / totalOutbound) * 100 : 0;

        const readMessages = allMessages.filter(m => m.status === "read").length;
        const readRate = totalOutbound > 0 ? (readMessages / totalOutbound) * 100 : 0;

        return {
            totalContacts: contactsCount,
            totalMessages: messagesCount,
            totalCampaigns: campaignsCount,
            deliveryRate,
            readRate,
            recentActivity,
            chartData
        };
    },
});
