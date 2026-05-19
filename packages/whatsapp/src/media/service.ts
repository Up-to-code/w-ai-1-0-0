import type { GraphClient } from "../client/graph-client.js";
import { isRecord, readString } from "../utils/guards.js";

/** Metadata returned by the Cloud API media object endpoint. */
export interface MediaInfo {
  readonly messaging_product?: string;
  readonly url: string;
  readonly mime_type?: string;
  readonly sha256?: string;
  readonly file_size?: number;
  readonly id?: string;
}

/** Result returned by the media upload endpoint. */
export interface MediaUploadResult {
  readonly id: string;
}

/** Result returned by the resumable template media upload flow. */
export interface TemplateMediaUploadResult {
  readonly handle: string;
  readonly uploadId: string;
}

/** Media APIs for uploading, locating, and downloading WhatsApp media. */
export class MediaService {
  constructor(private readonly graph: GraphClient) {}

  /** Uploads a Blob/File to WhatsApp and returns a reusable media ID. */
  async uploadMedia(file: Blob, mimeType: string, filename = "media"): Promise<MediaUploadResult> {
    const form = new FormData();
    form.append("file", file, filename);
    form.append("type", mimeType);
    form.append("messaging_product", "whatsapp");
    return this.graph.request<MediaUploadResult>(`/${this.graph.config.phoneNumberId}/media`, {
      method: "POST",
      body: form,
    });
  }

  /** Fetches media from a public URL, uploads it to WhatsApp, and returns its media ID. */
  async uploadMediaFromUrl(url: string, mimeType: string, filename = "media"): Promise<MediaUploadResult> {
    const response = await this.graph.config.fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch media URL: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return this.uploadMedia(blob, mimeType || response.headers.get("content-type") || "application/octet-stream", filename);
  }

  /** Starts a resumable upload session and uploads template header media, returning Meta's handle. */
  async uploadTemplateMedia(file: Blob, mimeType: string): Promise<TemplateMediaUploadResult> {
    const appId = this.graph.config.appId;
    if (!appId) {
      throw new Error("appId is required for template media uploads.");
    }
    const sessionUrl = await this.graph.url(`/${appId}/uploads`, { file_length: file.size, file_type: mimeType });
    const sessionResponse = await this.graph.config.fetch(sessionUrl, {
      method: "POST",
      headers: { Authorization: `OAuth ${this.graph.config.accessToken}` },
    });
    const sessionBody = await sessionResponse.json() as unknown;
    if (!sessionResponse.ok) {
      throw new Error(readMetaMessage(sessionBody) ?? "Failed to create template media upload session.");
    }
    if (!isRecord(sessionBody)) {
      throw new Error("Meta did not return a valid upload session response.");
    }
    const uploadId = readString(sessionBody, "id");
    if (!uploadId) {
      throw new Error("Meta did not return an upload session id.");
    }
    const uploadUrl = await this.graph.url(`/${uploadId}`);
    const response = await this.graph.config.fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${this.graph.config.accessToken}`,
        file_offset: "0",
      },
      body: file,
    });
    const body = await response.json() as unknown;
    if (!response.ok) {
      throw new Error(readMetaMessage(body) ?? "Template media upload failed.");
    }
    if (!isRecord(body) || typeof body.h !== "string") {
      throw new Error("Meta did not return a template media handle.");
    }
    return { handle: body.h, uploadId };
  }

  /** Fetches the temporary download URL and metadata for a WhatsApp media object. */
  async getMediaInfo(mediaId: string): Promise<MediaInfo> {
    return this.graph.request<MediaInfo>(`/${mediaId}`, { method: "GET" });
  }

  /** Downloads a WhatsApp media object as a Blob. */
  async downloadMedia(mediaId: string): Promise<Blob> {
    const info = await this.getMediaInfo(mediaId);
    const response = await this.graph.config.fetch(info.url, {
      headers: { Authorization: `Bearer ${this.graph.config.accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Failed to download WhatsApp media: ${response.status} ${response.statusText}`);
    }
    return response.blob();
  }
}

function readMetaMessage(body: unknown): string | undefined {
  if (!isRecord(body)) return undefined;
  const error = body.error;
  if (!isRecord(error)) return undefined;
  return readString(error, "message");
}
