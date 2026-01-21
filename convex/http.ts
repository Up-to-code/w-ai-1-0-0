import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// GET /whatsapp/webhook: Verification Challenge
http.route({
  path: "/whatsapp/webhook",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode && token && challenge) {
      const result = await ctx.runAction(internal.whatsapp.verifyWebhook, {
        mode,
        verify_token: token,
        challenge
      });

      if (result.success) {
        return new Response(result.challenge, { status: 200 });
      } else {
        return new Response("Forbidden", { status: 403 });
      }
    }
    return new Response("BadRequest", { status: 400 });
  }),
});

// POST /whatsapp/webhook: Incoming Events
http.route({
  path: "/whatsapp/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log(`[HTTP] Webhook received: ${request.method} ${request.url}`);

    let body;
    try {
      body = await request.json();
      console.log("[HTTP] Webhook Body:", JSON.stringify(body, null, 2));
    } catch (e) {
      console.error("[HTTP] Failed to parse JSON:", e);
      return new Response("Bad Request: Invalid JSON", { status: 400 });
    }

    await ctx.runMutation(internal.webhookEvents.logWhatsappWebhook, { body });

    // Dispatch to internal mutation to handle async scheduling
    try {
      await ctx.runMutation(internal.whatsapp.dispatchWebhook, { body });
      console.log("[HTTP] Webhook Dispatched Successfully");
    } catch (e) {
      console.error("[HTTP] Dispatch Error:", e);
      // We still return 200 OK to Meta to prevent retries of bad payloads, or 500?
      // Meta retries on 5xx. If it's a code bug, 500 is appropriate to see it in dashboard.
      return new Response("Internal Server Error", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  }),
});

// GET /salla/callback: OAuth Callback from Salla
http.route({
  path: "/salla/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    console.log(`[Salla Callback] Received request: ${request.url}`);

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state");

    console.log(`[Salla Callback] Params - Code: ${code ? "Present" : "Missing"}, Error: ${error}, State: ${state}`);

    // Handle errors from Salla
    if (error) {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/integrations?error=${error}`;
      return Response.redirect(redirectUrl, 302);
    }

    // No code provided
    if (!code) {
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/integrations?error=no_code`;
      return Response.redirect(redirectUrl, 302);
    }

    try {
      // Exchange code for tokens
      await ctx.runAction(internal.salla.exchangeCode, { code });

      // Redirect to integrations page with success
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/integrations?success=true`;
      return Response.redirect(redirectUrl, 302);
    } catch (err) {
      console.error("Salla OAuth error:", err);
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/integrations?error=token_exchange_failed`;
      return Response.redirect(redirectUrl, 302);
    }
  }),
});

export default http;
