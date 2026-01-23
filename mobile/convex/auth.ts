import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Cellular Auth: Send OTP
export const sendOTP = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    // Basic validation: Egyptian numbers are typically 12 digits (with code) or 11 (local)
    if (args.phone.length < 11) {
      throw new Error("رقم الهاتف قصير جداً. يرجى إدخال الرقم كاملاً مع كود الدولة (مثال: 2010...)");
    }

    // 1. Generate 6 digit code
    console.log(`[Auth] Generating OTP for raw input: "${args.phone}"`);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // 2. Store in DB
    const existing = await ctx.db
      .query("otps")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { code, expiresAt, attempts: 0 });
    } else {
      await ctx.db.insert("otps", { phone: args.phone, code, expiresAt, attempts: 0 });
    }

    // 3. Send via WhatsApp
    await ctx.scheduler.runAfter(0, api.whatsapp.sendMessage, {
      to: args.phone,
      type: "text",
      content: { body: `رمز التحقق الخاص بك لـ W-AI هو: ${code}` },
    });

    console.log(`[WhatsApp OTP] Sent to ${args.phone}: ${code}`);

    return { success: true, message: "تم إرسال رمز التحقق عبر واتساب" };
  },
});

// Cellular Auth: Verify OTP
export const verifyOTP = mutation({
  args: { phone: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const otpRecord = await ctx.db
      .query("otps")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!otpRecord) throw new Error("لم يتم العثور على طلب تحقق"); // No OTP request found
    if (otpRecord.code !== args.code) throw new Error("رمز التحقق غير صحيح"); // Invalid code
    if (Date.now() > otpRecord.expiresAt) throw new Error("انتهت صلاحية الرمز"); // Code expired

    // Clear OTP
    await ctx.db.delete(otpRecord._id);

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        phone: args.phone,
        role: "user",
        name: "مستخدم " + args.phone.slice(-4), // User + last 4 digits
      });
      user = await ctx.db.get(userId);
    }

    return user?._id;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
