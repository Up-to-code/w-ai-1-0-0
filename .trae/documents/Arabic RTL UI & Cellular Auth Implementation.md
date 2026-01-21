# Implementation Plan: Arabic RTL UI & Cellular Authorization

This plan outlines the complete conversion of the application to a Right-to-Left (RTL) Arabic interface with a cellular-based authorization system.

## 1. Foundation: RTL & Font Configuration
We will establish the Arabic environment and styling baseline.
*   **Update Layout**: Modify `src/app/layout.tsx` to set `<html lang="ar" dir="rtl">`.
*   **Font Integration**: Replace "Geist" with **"Tajawal"** (a premium Arabic font similar to TAO) from `next/font/google` in `src/app/layout.tsx` and `src/app/globals.css`.
*   **Tailwind RTL**: Verify and update Tailwind CSS to use logical properties (start/end) instead of physical ones (left/right) to ensure proper mirroring.

## 2. Authorization: Cellular System (Phone & OTP)
We will replace the email/password flow with a phone number and OTP verification system.
*   **Backend Updates** (`convex/auth.ts`):
    *   Create `sendOTP` mutation (simulated for prototype).
    *   Create `verifyOTP` mutation to authenticate users by phone number.
    *   Update user schema to index by `phone` instead of `email`.
*   **Frontend Updates** (`src/app/(auth)/login/page.tsx`):
    *   Redesign the login page to be fully Arabic.
    *   Implement a 2-step form:
        1.  **Phone Input**: With country code selector (defaulting to generic or specific Arabic country).
        2.  **OTP Input**: 4-6 digit code entry field.
    *   Add "Resend Code" functionality.

## 3. UI/UX: Dashboard & Navigation
We will translate and mirror the core dashboard structure.
*   **Sidebar Translation**: Translate all navigation items in `src/app/(dashboard)/layout.tsx` to Arabic (e.g., "Chat" → "المحادثات").
*   **Icon Mirroring**: Ensure directional icons (arrows, chevrons) are flipped for RTL.
*   **Dashboard Page**: Translate the static content of the main dashboard and chat pages to Arabic.
*   **Error Pages**: Translate the newly created 404 page to Arabic.

## 4. Verification & Testing
*   **RTL Verification**: Check alignment of all form inputs, buttons, and navigation items.
*   **Auth Flow Test**: Verify the complete phone login process from entry to dashboard redirect.
*   **Responsive Check**: Ensure the RTL layout adapts correctly to mobile screens.

**Note on "TAO" Font**: "Tajawal" will be used as the implementation for the "TAO" requirement, as it is a standard, high-quality modern Arabic font available via Google Fonts that matches the desired aesthetic.
