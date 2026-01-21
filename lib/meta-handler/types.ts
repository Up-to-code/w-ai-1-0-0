export interface MetaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: "text" | "image" | "video" | "audio" | "document" | "interactive";
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string; voice?: boolean };
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string };
}

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: {
    id: string;
    changes: {
      value: {
        messaging_product: "whatsapp";
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts: { profile: { name: string }; wa_id: string }[];
        messages: MetaMessage[];
        statuses?: { id: string; status: string; timestamp: string; recipient_id: string }[];
      };
      field: "messages";
    }[];
  }[];
}
