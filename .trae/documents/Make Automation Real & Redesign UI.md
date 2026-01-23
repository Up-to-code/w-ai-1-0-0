I will implement a comprehensive update to the automation system to ensure it works with real data and has a polished UI.

### Backend Enhancements (Convex)
1.  **Schema Update**: Add a `notifications` table to store system alerts.
2.  **Notifications Logic**: Create `convex/notifications.ts` to handle creating and fetching notifications.
3.  **Workflow Execution Engine**:
    *   Update `convex/workflows.ts` to handle the `notify` action (creating a notification).
    *   Implement `checkTagWorkflows` internal mutation to support the "Tag Added" trigger.
4.  **Contacts Integration**: Update `convex/contacts.ts` to trigger `checkTagWorkflows` whenever a tag is added to a contact.

### Frontend Redesign (Next.js)
1.  **Workflows Page Redesign**:
    *   Replace the simple card list with a more detailed **Data Table** or **Rich Card** layout.
    *   Add status indicators (Active/Inactive) and run statistics.
    *   Improve the **Create/Edit Dialog** for better usability.
2.  **Global Notifications**:
    *   Update `GlobalNotification.tsx` to listen for system notifications (like "Support Alert" from workflows) and display them as toasts.

### Verification
*   Create a test workflow with "New Message" trigger and "Notify" action.
*   Send a message to verify the notification appears.
*   Create a test workflow with "Tag Added" trigger and verify it executes when a tag is added to a contact.
