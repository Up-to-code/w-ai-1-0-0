# Dual Number Rollout Checklist

## Pre-Deployment
- Confirm both numbers exist in `Integrations` and both have valid access tokens.
- Set `defaultPhoneNumberId` in webhook settings to the production fallback number.
- Run schema deployment and execute:
  - `convex run migrations:backfillTemplatePhoneNumberScope '{"defaultPhoneNumberId":"<PHONE_NUMBER_ID>"}'`
  - `convex run migrations:backfillWorkflowPhoneNumberScope '{"defaultPhoneNumberId":"<PHONE_NUMBER_ID>"}'`

## Functional Verification
- Send inbound message to Number A and verify:
  - chat is created/updated under Number A scope,
  - global toast shows sender and recipient context,
  - unread indicators update in sidebar and number switcher.
- Repeat same for Number B with a different contact.
- Trigger webhook payload with multiple `entry[].changes[]` and verify all events are processed.
- Send payload without `phone_number_id` and verify fallback routes to configured default number.

## Automation Verification
- Create number-scoped template for Number A.
- Create workflow `new_message -> send_template` for Number A and verify it does not execute for Number B.
- Create campaign for Number B and verify outbound messages use Number B sender config.
- Verify non-approved templates are blocked in workflow execution with warning notification.

## Observability
- Check webhook logs include `fallback=true/false` and resolved business number ID.
- Review failed sends in notifications and retry manually if required.
- Monitor status updates (sent/delivered/read) for both campaigns and chats.

## Go-Live Criteria
- Zero cross-number leakage in templates/workflows/campaign sends.
- No missed events in multi-entry webhook payload.
- Inbox/global notifications are accurate for sender and recipient contexts.
