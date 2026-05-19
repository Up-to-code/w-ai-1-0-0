# @qentrah/whatsapp

Framework-agnostic TypeScript utilities for the official Meta WhatsApp Cloud API. The package covers message sending, media, templates, webhook verification/parsing, high-level reply actions, and campaign planning with bring-your-own persistence.

Open source under the MIT License. Source code and issues live on GitHub: [Up-to-code/qentrah-whatsapp](https://github.com/Up-to-code/qentrah-whatsapp).

The default Graph API version is `v25.0`, based on the latest public Graph API version signal available during implementation. You can override it with `apiVersion`.

## Install

```bash
npm install @qentrah/whatsapp
```

## Quickstart

```ts
import { WhatsAppClient } from "@qentrah/whatsapp";

const whatsapp = new WhatsAppClient({
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!,
  wabaId: process.env.WHATSAPP_WABA_ID,
  appId: process.env.META_APP_ID,
  appSecret: process.env.META_APP_SECRET,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
});

await whatsapp.messages.sendText("201234567890", "Hello from WhatsApp Cloud API");
```

## Webhooks

Use the native `Request -> Response` handler in Next.js route handlers, workers, Bun, Deno, or any server that supports Web Fetch APIs.

```ts
import { createWebhookHandler } from "@qentrah/whatsapp";

export const GET = createWebhookHandler(config, {
  async onMessage({ message, contact, actions }) {
    await actions.reply(`Hi ${contact?.name ?? "there"}, we received: ${message.text ?? message.type}`);
  },
});

export const POST = GET;
```

The handler:

- verifies `hub.challenge` setup requests using `verifyToken`
- verifies `X-Hub-Signature-256` when `appSecret` and a signature header are present
- extracts every `entry[].changes[]`
- parses inbound messages, status-only payloads, and template status updates
- exposes `actions.reply`, `replyWithImage`, `replyWithFile`, `sendTemplate`, `markRead`, and `react`

Enable read receipts after successful `onMessage` handling:

```ts
const handler = whatsapp.webhooks.createHandler(
  {
    async onMessage({ actions }) {
      await actions.reply("Thanks, we are on it.");
    },
  },
  { autoMarkRead: true },
);
```

## Messages

```ts
await whatsapp.messages.sendText("201234567890", "Text body");

await whatsapp.messages.sendImage("201234567890", {
  link: "https://example.com/image.jpg",
  caption: "Image caption",
});

await whatsapp.messages.sendDocument("201234567890", {
  id: "MEDIA_ID",
  filename: "invoice.pdf",
});

await whatsapp.messages.react("201234567890", "wamid.message-id", "👍");

await whatsapp.messages.markRead("wamid.inbound-message-id");
```

## Templates

```ts
await whatsapp.templates.createTemplate({
  name: "order_update",
  language: "en_US",
  category: "UTILITY",
  components: [
    { type: "BODY", text: "Your order {{1}} is ready.", example: { body_text: [["A100"]] } },
  ],
});

const templates = await whatsapp.templates.listTemplates();
const template = await whatsapp.templates.getTemplateByName("order_update");

if (template?.id) {
  await whatsapp.templates.updateTemplate(template.id, {
    components: [{ type: "BODY", text: "Your order {{1}} has shipped." }],
  });
}

await whatsapp.templates.deleteTemplate("order_update");
```

Send an approved template:

```ts
await whatsapp.messages.sendTemplate("201234567890", {
  name: "order_update",
  language: { code: "en_US" },
  components: [
    {
      type: "body",
      parameters: [{ type: "text", text: "A100" }],
    },
  ],
});
```

## Media

```ts
const upload = await whatsapp.media.uploadMedia(fileBlob, "image/jpeg", "photo.jpg");

await whatsapp.messages.sendImage("201234567890", {
  id: upload.id,
  caption: "Uploaded image",
});

const info = await whatsapp.media.getMediaInfo(upload.id);
const downloaded = await whatsapp.media.downloadMedia(upload.id);
```

Template header media uses Meta's resumable upload flow:

```ts
const result = await whatsapp.media.uploadTemplateMedia(fileBlob, "image/jpeg");
console.log(result.handle);
```

## Campaigns

Campaigns are side-effect-free until you call `run`. You bring the database, queue, and logging.

```ts
const plan = whatsapp.campaigns.createPlan({
  template: {
    name: "order_update",
    language: { code: "en_US" },
  },
  recipients: [
    { id: "1", phone: "201234567890", lastContactedAt: Date.now() - 48 * 60 * 60 * 1000 },
    { id: "2", phone: "201111111111", lastContactedAt: Date.now() },
  ],
  rules: {
    messagesPerSecond: 10,
    skipRecentlyContacted: true,
    recentContactWindowMs: 24 * 60 * 60 * 1000,
    maxRetries: 3,
  },
});

const summary = await whatsapp.campaigns.run(plan, {
  async logResult(result) {
    await db.campaignLogs.insert(result);
  },
  async markContacted(recipient, timestamp) {
    await db.contacts.update(recipient.id, { lastContactedAt: timestamp });
  },
});
```

## Bring Your Own Database

This package intentionally does not ship database tables or storage assumptions. Use adapters and callbacks to connect your own stack:

```ts
await whatsapp.campaigns.run(plan, {
  sendTemplate: (recipient, template) => whatsapp.messages.sendTemplate(recipient.phone, template),
  logResult: (result) => myDatabase.writeCampaignResult(result),
  markContacted: (recipient, timestamp) => myDatabase.updateContact(recipient.id, { timestamp }),
  wait: (ms) => queue.sleep(ms),
});
```

Webhook handlers follow the same model: save inbound messages, statuses, media IDs, and template updates wherever your application stores them.

## Security

- Store access tokens outside source control.
- Configure `appSecret` so outgoing Graph requests include `appsecret_proof`.
- Keep `verifyToken` private; Meta uses it only during webhook setup.
- Keep the raw webhook request body intact before signature verification.
- Do not log access tokens, app secrets, or full customer payloads in production.

## Official References

- [Meta WhatsApp Business Platform Postman workspace](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Cloud API messages collection](https://www.postman.com/meta/whatsapp-business-platform/folder/8uw665u/messages)
- [Cloud API webhook payload reference](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference)
- [Meta-hosted WhatsApp Node.js SDK API reference](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/messages/template/)
