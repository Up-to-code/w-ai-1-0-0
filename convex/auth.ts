import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "./_generated/api";

const pushNotifications = new PushNotifications(components.pushNotifications);

// Cellular Auth: Send OTP
export const sendOTP = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    // International numbers (E.164) typically range from 7 to 15 digits.
    if (args.phone.length < 7) {
      throw new Error("رقم الهاتف قصير جداً. يرجى إدخال الرقم كاملاً مع كود الدولة (مثال: 966...)");
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
    console.log(`[Auth] Attempting to schedule WhatsApp OTP for ${args.phone}...`);
    try {
      await ctx.scheduler.runAfter(0, api.whatsapp.sendMessage, {
        to: args.phone,
        type: "text",
        content: { body: `رمز التحقق الخاص بك لـ W-AI هو: ${code}` },
      });
      console.log(`[Auth] WhatsApp OTP scheduled successfully for ${args.phone}`);
    } catch (err) {
      console.error(`[Auth] FAILED to schedule WhatsApp OTP: ${err}`);
    }

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

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) throw new Error("المستخدم غير موجود");
    if (user.password !== args.password) throw new Error("كلمة المرور غير صحيحة");

    return user._id;
  },
});

export const register = mutation({
  args: { email: v.string(), password: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) throw new Error("البريد الإلكتروني مسجل مسبقاً");

    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: args.password,
      name: args.name || "مستخدم جديد",
      role: "user",
    });

    return userId;
  },
});

export const updateUser = mutation({
  args: { 
    userId: v.id("users"), 
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("المستخدم غير موجود");

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;

    await ctx.db.patch(args.userId, updates);
    return true;
  },
});

export const changePassword = mutation({
  args: { 
    userId: v.id("users"), 
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("المستخدم غير موجود");

    if (user.password !== args.currentPassword) {
      throw new Error("كلمة المرور الحالية غير صحيحة");
    }

    if (args.newPassword.length < 6) {
      throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }

    await ctx.db.patch(args.userId, { password: args.newPassword });
    return true;
  },
});

export const recordPushNotificationToken = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    // Verify user exists
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("المستخدم غير موجود");

    // Record the push token
    await pushNotifications.recordToken(ctx, {
      userId: args.userId,
      pushToken: args.token,
    });

    return true;
  },
});
