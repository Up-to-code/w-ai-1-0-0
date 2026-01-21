# Implementation Plan: Fix Build Errors & Enhance Application Features

This plan addresses the build error and implements the requested features for a complete mobile business dashboard.

## 1. Fix Build Error

* **Correct Import Path**: In `src/app/(dashboard)/settings/page.tsx`, change the import path from `../../../../../convex/_generated/api` to `../../../../convex/_generated/api` (remove one level of `../` to correctly resolve the project root).

## 2. Dashboard & Mobile Business Focus

* **Redesign Dashboard**: Update `src/app/(dashboard)/dashboard/page.tsx` to focus exclusively on "Mobile Business".

* **Integration Card**: Add a prominent "Mobile Business Integration" card with an "Authorize" button to simulate connecting the business model.

## 3. Customer Management (New)

* **Create Customers Page**: `src/app/(dashboard)/customers/page.tsx`.

* **Features**:

  * List of customers (mock data initially).

  * **Add Customer**: Modal/Form to add new customers.

  * **Edit Customer**: Ability to edit details.

  * **Customer Details**: View full profile and history.

## 4. Campaigns & Templates

* **Enhance Campaigns Page**: `src/app/(dashboard)/campaigns/page.tsx`.

* **Template Management**:

  * Implement "Create Template" modal/drawer.

  * Implement "Edit Template" functionality.

  * Add mock data for templates.

## 5. Storage & Files

* **Enhance Storage Page**: `src/app/(dashboard)/storage/page.tsx`.

* **File Details**: Add a detailed view (modal) when clicking a file to show metadata, preview, and delete option.

## 6. AI Settings & Test Interface

* **Tabbed Interface**: Refactor `src/app/(dashboard)/ai-settings/page.tsx` to use Tabs:

  * **Tab 1: Configuration**: Existing Prompt Edit and Knowledge Base management.

  * **Tab 2: Test AI**: A chat interface to test the AI bot's responses in real-time.

* **Read Receipts**: Add a "Read Receipts" toggle in the AI/Chat settings (addressing the "mark 3" request).

## 7. Mock Data

* **Populate Data**: Ensure all new pages (Customers, Templates) have realistic Arabic mock data to demonstrate the app's look and feel.

