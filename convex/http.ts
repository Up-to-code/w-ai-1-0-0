import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { extractSallaEventType, resolveSallaWebhookToken } from "./sallaWebhookUtils";

const http = httpRouter();

// GET /whatsapp/webhook: Verification Challenge (verify token from DB, fallback to env)
http.route({
  path: "/whatsapp/webhook",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode && token && challenge) {
      const settings = await ctx.runQuery(api.webhookSettings.get, {});
      const expectedToken = settings.verifyToken ?? process.env.WHATSAPP_VERIFY_TOKEN;
      const result = await ctx.runAction(internal.whatsapp.verifyWebhook, {
        mode,
        verify_token: token,
        challenge,
        expected_verify_token: expectedToken ?? undefined,
      } as { mode?: string; verify_token?: string; challenge?: string; expected_verify_token?: string });

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
    console.log(`[HTTP Webhook] Incoming POST request to ${request.url}`);
    console.log(`[HTTP Webhook] Signature Header: ${request.headers.get("X-Hub-Signature-256")}`);

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("X-Hub-Signature-256");

    console.log(`[HTTP Webhook] appSecret present: ${!!appSecret}, signatureHeader present: ${!!signatureHeader}`);

    if (appSecret && signatureHeader) {
      const isValid = await ctx.runAction(internal.nodeUtils.verifySignature, {
        rawBody,
        signatureHeader,
        appSecret,
      });
      if (!isValid) {
        console.error("[HTTP] Webhook signature verification failed", {
          headerPrefix: signatureHeader.slice(0, 20),
          bodyLength: rawBody.length,
        });
        return new Response("Unauthorized", { status: 401 });
      }
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error("[HTTP] Failed to parse JSON:", e);
      return new Response("Bad Request: Invalid JSON", { status: 400 });
    }

    if (process.env.CONVEX_VERBOSE_WEBHOOK === "1") {
      console.log("[HTTP] Webhook Body:", JSON.stringify(body, null, 2));
    } else {
      const summary = body && typeof body === "object" && "object" in body ? (body as { object?: string }).object : "?";
      const entryLen = body && typeof body === "object" && "entry" in body ? (body as { entry?: unknown[] }).entry?.length : 0;
      console.log(`[HTTP] Webhook received: object=${summary} entries=${entryLen}`);
    }

    await ctx.runMutation(internal.webhookEvents.logWhatsappWebhook, { body });

    try {
      await ctx.runMutation(internal.whatsapp.dispatchWebhook, { body });
      console.log("[HTTP] Webhook Dispatched Successfully");
    } catch (e) {
      console.error("[HTTP] Dispatch Error:", e);
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

// POST /salla/nt: Salla notifications webhook endpoint
http.route({
  path: "/salla/nt",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const runSallaWebhookLog = ctx.runMutation as unknown as (
      name: string,
      args: {
        body: unknown;
        processingStatus?: "received" | "failed";
        eventType?: string;
        note?: string;
      }
    ) => Promise<unknown>;

    const expectedToken = process.env.SALLA_WEBHOOK_TOKEN?.trim();
    const url = new URL(request.url);
    const providedToken = resolveSallaWebhookToken({
      authorizationHeader: request.headers.get("authorization"),
      xSallaTokenHeader: request.headers.get("x-salla-token"),
      queryToken: url.searchParams.get("token"),
    });

    if (expectedToken && providedToken !== expectedToken) {
      await runSallaWebhookLog("webhookEvents:logSallaWebhook", {
        body: { reason: "unauthorized", url: request.url },
        processingStatus: "failed",
        note: "Invalid Salla notification token",
      });
      return new Response("Unauthorized", { status: 401 });
    }

    const rawBody = await request.text();
    let body: unknown = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      body = { rawBody };
    }

    const eventType = extractSallaEventType(body);
    await runSallaWebhookLog("webhookEvents:logSallaWebhook", {
      body,
      eventType,
      processingStatus: "received",
      note: "/salla/nt",
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }),
});

export default http;
