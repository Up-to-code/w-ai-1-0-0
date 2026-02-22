This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Production / WhatsApp Webhook

- **Convex deployment:** The app uses the Convex deployment whose URL is set in `NEXT_PUBLIC_CONVEX_URL` (e.g. in Vercel). **You must deploy Convex to that deployment** after any Convex code or function changes: run `npx convex deploy` (for production) or use the same deployment as your dev URL. `npx convex dev` only pushes to the dev deployment; production must be updated with `npx convex deploy` or the app may see "Could not find public function" or outdated validators.
- **Convex (Dashboard → Settings → Environment Variables):** Set `WHATSAPP_VERIFY_TOKEN` (if not set in Integrations webhook form), and `WHATSAPP_APP_SECRET` (recommended) to verify POST webhook signature. Optionally `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_WABA_ID` when not using per-number tokens.
- **Vercel:** Set `NEXT_PUBLIC_CONVEX_URL` to your Convex deployment URL.
- **Meta Developer Console:** Webhook URL = `https://<deployment>.convex.site/whatsapp/webhook` (use your Convex deployment host; replace `.convex.cloud` with `.convex.site` from `NEXT_PUBLIC_CONVEX_URL`). Verify token must match the value in Integrations or `WHATSAPP_VERIFY_TOKEN`.
