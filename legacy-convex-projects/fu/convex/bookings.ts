/**
 * Bookings Convex Functions
 * Queries and mutations for booking management
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get bookings for a provider
 */
export const getBookings = query({
  args: {
    providerId: v.string(),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("rejected")
    )),
    date: v.optional(v.string()), // ISO date string
  },
  handler: async (ctx, args) => {
    let bookingsQuery = ctx.db
      .query("bookings")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId));

    const bookings = await bookingsQuery.collect();

    // Apply filters
    let filtered = bookings;

    if (args.status !== undefined) {
      filtered = filtered.filter((b) => b.status === args.status);
    }

    if (args.date !== undefined) {
      filtered = filtered.filter((b) => b.scheduledDate === args.date);
    }

    // Sort by scheduled date (upcoming first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.scheduledDate).getTime();
      const dateB = new Date(b.scheduledDate).getTime();
      return dateA - dateB;
    });
  },
});

/**
 * Get single booking by ID
 */
export const getBooking = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    
    if (!booking) {
      throw new Error("Booking not found");
    }

    return booking;
  },
});

/**
 * Get bookings for a customer
 */
export const getCustomerBookings = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    const bookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
    
    // Sort by creation date (newest first)
    return bookings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Create a new booking
 */
export const createBooking = mutation({
  args: {
    serviceId: v.id("services"),
    providerId: v.string(),
    customerId: v.string(),
    selectedServices: v.array(v.string()),
    scheduledDate: v.string(),
    scheduledTime: v.string(),
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
  },
  handler: async (ctx, args) => {
    // Validate service exists
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    // Validate provider matches service
    if (service.providerId !== args.providerId) {
      throw new Error("Service provider mismatch");
    }

    // Validate address if provided
    if (args.addressId) {
      const address = await ctx.db.get(args.addressId);
      if (!address) {
        throw new Error("Address not found");
      }
    }

    // Validate date is in the future
    const scheduledDateTime = new Date(`${args.scheduledDate}T${args.scheduledTime}`);
    if (scheduledDateTime < new Date()) {
      throw new Error("Scheduled date must be in the future");
    }

    const now = Date.now();

    const bookingId = await ctx.db.insert("bookings", {
      serviceId: args.serviceId,
      providerId: args.providerId,
      customerId: args.customerId,
      status: "pending",
      selectedServices: args.selectedServices,
      scheduledDate: args.scheduledDate,
      scheduledTime: args.scheduledTime,
      location: args.location,
      address: args.address,
      addressId: args.addressId,
      phone: args.phone,
      description: args.description,
      totalPrice: args.totalPrice,
      paymentStatus: args.paymentStatus,
      paymentMethod: args.paymentMethod,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, bookingId };
  },
});

/**
 * Update booking status
 */
export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    providerId: v.string(), // For authorization check
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("rejected")
    ),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check authorization
    if (booking.providerId !== args.providerId) {
      throw new Error("Unauthorized: You can only update bookings for your services");
    }

    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "rejected", "cancelled"],
      confirmed: ["in_progress", "cancelled"],
      in_progress: ["completed", "cancelled"],
      completed: [], // Terminal state
      cancelled: [], // Terminal state
      rejected: [], // Terminal state
    };

    const allowedStatuses = validTransitions[booking.status] || [];
    if (!allowedStatuses.includes(args.status)) {
      throw new Error(`Invalid status transition from ${booking.status} to ${args.status}`);
    }

    await ctx.db.patch(args.bookingId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Cancel a booking
 */
export const cancelBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    providerId: v.string(), // For authorization check
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check authorization
    if (booking.providerId !== args.providerId) {
      throw new Error("Unauthorized: You can only cancel bookings for your services");
    }

    // Can only cancel pending or confirmed bookings
    if (booking.status !== "pending" && booking.status !== "confirmed") {
      throw new Error(`Cannot cancel booking with status ${booking.status}`);
    }

    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Complete a booking
 */
export const completeBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    providerId: v.string(), // For authorization check
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Check authorization
    if (booking.providerId !== args.providerId) {
      throw new Error("Unauthorized: You can only complete bookings for your services");
    }

    // Can only complete in_progress bookings
    if (booking.status !== "in_progress") {
      throw new Error(`Cannot complete booking with status ${booking.status}`);
    }

    await ctx.db.patch(args.bookingId, {
      status: "completed",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
