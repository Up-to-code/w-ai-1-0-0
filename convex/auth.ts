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
    console.log("[Auth] sendOTP called", { phone: args.phone });
    // International numbers (E.164) typically range from 7 to 15 digits.
    if (args.phone.length < 7) {
      console.log("[Auth] sendOTP: phone too short");
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

    console.log("[Auth] sendOTP success");
    return { success: true, message: "تم إرسال رمز التحقق عبر واتساب" };
  },
});

// Cellular Auth: Verify OTP
export const verifyOTP = mutation({
  args: { phone: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    console.log("[Auth] verifyOTP called", { phone: args.phone, codeLength: args.code?.length });
    const otpRecord = await ctx.db
      .query("otps")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!otpRecord) {
      console.log("[Auth] verifyOTP: no OTP request found for phone");
      throw new Error("لم يتم العثور على طلب تحقق"); // No OTP request found
    }
    if (otpRecord.code !== args.code) {
      console.log("[Auth] verifyOTP: invalid code");
      throw new Error("رمز التحقق غير صحيح"); // Invalid code
    }
    if (Date.now() > otpRecord.expiresAt) {
      console.log("[Auth] verifyOTP: code expired");
      throw new Error("انتهت صلاحية الرمز"); // Code expired
    }

    // Clear OTP
    await ctx.db.delete(otpRecord._id);
    console.log("[Auth] verifyOTP: OTP cleared");

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", args.phone))
      .first();

    if (!user) {
      console.log("[Auth] verifyOTP: creating new user for phone");
      const userId = await ctx.db.insert("users", {
        phone: args.phone,
        role: "user",
        name: "مستخدم " + args.phone.slice(-4), // User + last 4 digits
      });
      user = await ctx.db.get(userId);
      console.log("[Auth] verifyOTP: user created", { userId });
    } else {
      console.log("[Auth] verifyOTP: existing user found", { userId: user._id });
    }

    console.log("[Auth] verifyOTP success, returning userId:", user?._id);
    return user?._id;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const login = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    console.log("[Auth] login called", { email, passwordLength: args.password?.length });
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      console.log("[Auth] login: no user found for email");
      throw new Error("المستخدم غير موجود");
    }
    console.log("[Auth] login: user found", { userId: user._id, hasPassword: user.password != null });
    if (user.password === undefined || user.password === null) {
      console.log("[Auth] login: user has no password (phone-only account)");
      throw new Error("هذا الحساب مسجّل برقم الهاتف. يرجى استخدام تسجيل الدخول بالهاتف.");
    }
    if (user.password !== args.password) {
      console.log("[Auth] login: password mismatch");
      throw new Error("كلمة المرور غير صحيحة");
    }

    console.log("[Auth] login success", { userId: user._id });
    return user._id;
  },
});

export const register = mutation({
  args: { email: v.string(), password: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    console.log("[Auth] register called", { email, name: args.name ?? "(none)", passwordLength: args.password?.length });
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      console.log("[Auth] register: email already exists");
      throw new Error("البريد الإلكتروني مسجل مسبقاً");
    }

    const userId = await ctx.db.insert("users", {
      email,
      password: args.password,
      name: args.name?.trim() || "مستخدم جديد",
      role: "user",
    });
    console.log("[Auth] register success", { userId });
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
    console.log("[Auth] updateUser called", { userId: args.userId, name: args.name ?? "(none)", email: args.email ?? "(none)" });
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.log("[Auth] updateUser: user not found");
      throw new Error("المستخدم غير موجود");
    }

    const updates: { name?: string; email?: string } = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.email !== undefined) updates.email = normalizeEmail(args.email);

    await ctx.db.patch(args.userId, updates);
    console.log("[Auth] updateUser success", { updates });
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
    console.log("[Auth] changePassword called", { userId: args.userId, newPasswordLength: args.newPassword?.length });
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.log("[Auth] changePassword: user not found");
      throw new Error("المستخدم غير موجود");
    }

    if (user.password !== args.currentPassword) {
      console.log("[Auth] changePassword: current password mismatch");
      throw new Error("كلمة المرور الحالية غير صحيحة");
    }

    if (args.newPassword.length < 6) {
      console.log("[Auth] changePassword: new password too short");
      throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }

    await ctx.db.patch(args.userId, { password: args.newPassword });
    console.log("[Auth] changePassword success");
    return true;
  },
});

export const recordPushNotificationToken = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("[Auth] recordPushNotificationToken called", { userId: args.userId, tokenPrefix: args.token?.slice(0, 20) + "..." });
    const user = await ctx.db.get(args.userId);
    if (!user) {
      console.log("[Auth] recordPushNotificationToken: user not found");
      throw new Error("المستخدم غير موجود");
    }

    await pushNotifications.recordToken(ctx, {
      userId: args.userId,
      pushToken: args.token,
    });
    console.log("[Auth] recordPushNotificationToken success");
    return true;
  },
});
