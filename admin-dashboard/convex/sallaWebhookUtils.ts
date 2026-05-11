export function extractBearerToken(authorizationHeader: string | null): string | null {
  const raw = authorizationHeader?.trim();
  if (!raw) return null;
  const match = raw.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1]?.trim();
  return token && token.length > 0 ? token : null;
}

export function resolveSallaWebhookToken(args: {
  authorizationHeader: string | null;
  xSallaTokenHeader: string | null;
  queryToken: string | null;
}): string | null {
  const bearer = extractBearerToken(args.authorizationHeader);
  if (bearer) return bearer;

  const headerToken = args.xSallaTokenHeader?.trim();
  if (headerToken) return headerToken;

  const queryToken = args.queryToken?.trim();
  if (queryToken) return queryToken;

  return null;
}

export function extractSallaEventType(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const rec = body as Record<string, unknown>;
  if (typeof rec.event === "string" && rec.event.trim()) return rec.event.trim();
  if (typeof rec.type === "string" && rec.type.trim()) return rec.type.trim();
  if (typeof rec.name === "string" && rec.name.trim()) return rec.name.trim();
  return undefined;
}

export function extractSallaMerchantId(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const rec = body as Record<string, unknown>;
  const merchant = rec.merchant;
  if (typeof merchant === "string" && merchant.trim()) return merchant.trim();
  if (typeof merchant === "number" && Number.isFinite(merchant)) return String(merchant);
  return undefined;
}

export function extractSallaAuthorizePayload(body: unknown):
  | {
      merchantId: string;
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    }
  | null {
  if (extractSallaEventType(body) !== "app.store.authorize") return null;
  if (!body || typeof body !== "object") return null;

  const rec = body as Record<string, unknown>;
  const merchantId = extractSallaMerchantId(body);
  const data = rec.data && typeof rec.data === "object" ? (rec.data as Record<string, unknown>) : null;
  const accessToken = typeof data?.access_token === "string" ? data.access_token.trim() : "";
  const refreshToken = typeof data?.refresh_token === "string" ? data.refresh_token.trim() : "";
  const expiresRaw = data?.expires;
  const expiresSeconds =
    typeof expiresRaw === "number"
      ? expiresRaw
      : typeof expiresRaw === "string" && expiresRaw.trim()
        ? Number(expiresRaw)
        : NaN;

  if (!merchantId || !accessToken || !refreshToken || !Number.isFinite(expiresSeconds)) {
    return null;
  }

  return {
    merchantId,
    accessToken,
    refreshToken,
    expiresAt: expiresSeconds * 1000,
  };
}
