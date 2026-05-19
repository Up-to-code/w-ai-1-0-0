import { WhatsAppApiError, errorFromMetaResponse } from "../errors.js";
import type { FetchLike, JsonValue, WhatsAppConfig, WhatsAppLogger } from "../types.js";
import { createAppSecretProof } from "../utils/crypto.js";
import { silentLogger } from "../utils/logger.js";
import { toJsonValue } from "../utils/guards.js";

/** Latest Graph API version confirmed during package implementation. */
export const DEFAULT_GRAPH_API_VERSION = "v25.0";

/** Shared normalized configuration used by all services. */
export interface ResolvedWhatsAppConfig extends Required<Pick<WhatsAppConfig, "accessToken" | "phoneNumberId" | "apiVersion">> {
  readonly wabaId?: string;
  readonly appId?: string;
  readonly appSecret?: string;
  readonly verifyToken?: string;
  readonly logger: WhatsAppLogger;
  readonly fetch: FetchLike;
  readonly disableAppSecretProof: boolean;
}

/** Low-level Graph API client with auth, appsecret_proof, and error normalization. */
export class GraphClient {
  /** Normalized client configuration. */
  readonly config: ResolvedWhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    if (!config.accessToken.trim()) {
      throw new Error("WhatsApp accessToken is required.");
    }
    if (!config.phoneNumberId.trim()) {
      throw new Error("WhatsApp phoneNumberId is required.");
    }
    const fetchImpl = config.fetch ?? globalThis.fetch;
    if (!fetchImpl) {
      throw new Error("A fetch implementation is required in this runtime.");
    }
    this.config = {
      accessToken: config.accessToken.trim(),
      phoneNumberId: config.phoneNumberId.trim(),
      wabaId: config.wabaId?.trim() || undefined,
      appId: config.appId?.trim() || undefined,
      appSecret: config.appSecret?.trim() || undefined,
      verifyToken: config.verifyToken?.trim() || undefined,
      apiVersion: normalizeApiVersion(config.apiVersion ?? DEFAULT_GRAPH_API_VERSION),
      logger: config.logger ?? silentLogger,
      fetch: fetchImpl,
      disableAppSecretProof: config.disableAppSecretProof ?? false,
    };
  }

  /** Builds a fully qualified Graph API URL from a path like `/123/messages`. */
  async url(path: string, query?: URLSearchParams | Record<string, string | number | boolean | undefined>): Promise<URL> {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    const url = new URL(`https://graph.facebook.com/${this.config.apiVersion}/${cleanPath}`);
    if (query instanceof URLSearchParams) {
      query.forEach((value, key) => url.searchParams.set(key, value));
    } else if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
      }
    }
    if (this.config.appSecret && !this.config.disableAppSecretProof) {
      url.searchParams.set("appsecret_proof", await createAppSecretProof(this.config.accessToken, this.config.appSecret));
    }
    return url;
  }

  /** Sends a Graph API request and returns a typed JSON response. */
  async request<T>(path: string, init: RequestInit = {}, query?: URLSearchParams | Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = await this.url(path, query);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${this.config.accessToken}`);
    const response = await this.config.fetch(url, {
      ...init,
      headers,
    });
    const body = await parseResponseBody(response);
    if (!response.ok) {
      const error = errorFromMetaResponse(response.status, body);
      this.config.logger.error("WhatsApp Graph API request failed", toJsonValue({
        path,
        status: response.status,
        code: error.code ?? null,
        category: error.category,
      }));
      throw error;
    }
    return body as T;
  }

  /** Sends a JSON Graph API request with the correct content type. */
  async json<T>(path: string, method: "POST" | "PATCH" | "DELETE" | "GET", body?: unknown, query?: URLSearchParams | Record<string, string | number | boolean | undefined>): Promise<T> {
    const headers = new Headers();
    if (body !== undefined) headers.set("Content-Type", "application/json");
    return this.request<T>(
      path,
      {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      query,
    );
  }
}

/** Normalizes version input so callers can pass `25.0` or `v25.0`. */
export function normalizeApiVersion(version: string): string {
  const trimmed = version.trim();
  return trimmed.startsWith("v") ? trimmed : `v${trimmed}`;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (!response.ok) {
      throw new WhatsAppApiError({
        message: text,
        status: response.status,
        category: response.status >= 500 ? "NETWORK_ERROR" : "OTHER",
        retryable: response.status >= 500,
        details: text,
      });
    }
    return text;
  }
}
