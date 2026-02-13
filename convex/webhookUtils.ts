export type WebhookChange = { field?: string; value?: any };

export function extractWebhookChanges(body: any): WebhookChange[] {
  const entries = Array.isArray(body?.entry) ? body.entry : [];
  const changes: WebhookChange[] = [];
  for (const entry of entries) {
    const entryChanges = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of entryChanges) {
      changes.push({ field: change?.field, value: change?.value });
    }
  }
  return changes;
}

export function resolvePhoneNumberCandidate(
  incomingPhoneNumberId?: string | null,
  defaultPhoneNumberId?: string | null,
  firstAvailablePhoneNumberId?: string | null
): { phoneNumberId?: string; usedFallback: boolean } {
  if (incomingPhoneNumberId?.trim()) {
    return { phoneNumberId: incomingPhoneNumberId, usedFallback: false };
  }
  if (defaultPhoneNumberId?.trim()) {
    return { phoneNumberId: defaultPhoneNumberId, usedFallback: true };
  }
  if (firstAvailablePhoneNumberId?.trim()) {
    return { phoneNumberId: firstAvailablePhoneNumberId, usedFallback: true };
  }
  return { phoneNumberId: undefined, usedFallback: true };
}
