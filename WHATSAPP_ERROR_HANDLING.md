# WhatsApp Integration - Error Handling Fixes

## Overview

This document outlines the comprehensive fixes applied to the WhatsApp integration and campaign management system to properly handle errors and improve reliability.

## Issues Fixed

### 1. **WhatsApp Error Handling (Error #131030 & #132012)**

#### Problems:
- **Error #131030**: "Recipient phone number not in allowed list" - Not handled gracefully in campaigns
- **Error #132012**: "Parameter format does not match format in the created template" - Header components missing parameters
- Generic error handling that didn't distinguish between retryable and non-retryable errors

#### Solutions:

**A. Centralized Error Categorization** (`error-utils.ts`):
```typescript
- Error code classification system with metadata
- Retry behavior per error type
- Detailed error descriptions and suggested actions
- Support for 20+ known WhatsApp error codes
```

**B. Enhanced sendMessage Action** (whatsapp.ts):
```typescript
- Validates phone numbers before sending
- Categorizes errors with retry metadata
- Logs detailed error information for debugging
- Returns structured error objects with code, category, and retryable flag
```

**C. Improved Campaign Error Handling** (campaigns.ts):
```typescript
- Catches specific error codes (131030, 132012)
- Handles template format errors gracefully
- Distinguishes between retryable and non-retryable errors
- Logs errors with context (contact ID, campaign ID)
```

### 2. **Template Header Parameter Issues**

#### Problem:
- TEXT format headers with empty parameters causing #132012 errors
- No validation of header component parameters

#### Solution:
```typescript
// In campaigns.ts sendToContact():
if (comp.format === "TEXT") {
  // Ensure we have at least one parameter
  if (!comp.example?.header_text || comp.example.header_text.length === 0) {
    console.warn("[Campaign] TEXT header has no parameters, skipping header component");
    // Don't add an empty header component
  } else {
    components.push({
      type: "header",
      parameters: comp.example.header_text.map((text: string) => 
        ({ type: "text", text })
      )
    });
  }
}
```

### 3. **Phone Number Validation**

#### Problem:
- No validation of phone number format before sending
- Could waste API calls on invalid numbers

#### Solution:
```typescript
// New utility function: validateAndCleanPhoneNumber()
- Removes non-digits
- Validates minimum length (7 digits)
- Validates maximum length (15 digits)
- Throws descriptive errors
```

### 4. **Campaign Deletion Error**

#### Problem:
```
Error: Delete on nonexistent document ID kn71pd93f4yrb5vs27ta7ntj7n7zt0wz
```

#### Solution:
```typescript
// In campaigns.ts remove():
export const remove = mutation({
  args: { id: v.id("campaigns") },
  handler: async (ctx, args) => {
    // Check if campaign exists first
    const campaign = await ctx.db.get(args.id);
    if (!campaign) {
      console.warn(`[Campaign] Attempt to delete non-existent campaign: ${args.id}`);
      return false;
    }
    // ... rest of deletion logic
  }
});
```

## Error Categories

The system now categorizes WhatsApp errors into these types:

| Category | Retryable | Examples | Action |
|----------|-----------|----------|--------|
| PHONE_NOT_ALLOWED | No | #131030 | Add to allowed list, skip contact |
| TEMPLATE_FORMAT | No | #132012 | Fix template parameters |
| INVALID_TEMPLATE | No | #132001 | Verify/recreate template |
| RATE_LIMIT | Yes | #80005, #200, #368 | Retry with backoff |
| AUTH_ERROR | No | #401, #403 | Verify credentials |
| NETWORK_ERROR | Yes | #500, #502, #503 | Retry with backoff |
| INVALID_PHONE | No | Invalid format | Fix phone number |
| OTHER | Yes | Unknown | Retry with caution |

## Key Error Codes Reference

### Phone Number Errors
- **131000**: Invalid recipient type
- **131001**: Invalid phone format
- **131030**: Recipient not in allowed list (test mode)

### Template Errors
- **132001**: Template not found
- **132012**: Parameter format mismatch (header empty)
- **132014**: Template suspended
- **132015**: Template rejected

### Rate Limiting
- **80005**: Message rate limit exceeded
- **200**: Unsupported/throttled request
- **368**: Temporarily throttled

## Error Logging

All errors now include structured logging:

```typescript
{
  timestamp: number,
  category: ErrorCategory,
  code: number,
  message: string,
  retryable: boolean,
  contact: string,
  campaignId: string,
  suggestedAction: string,
  details: object
}
```

## Usage Examples

### Sending a Message with Error Handling

```typescript
try {
  const res = await ctx.runAction(api.whatsapp.sendMessage, {
    to: "+966500000000",
    type: "template",
    content: { ... }
  });
} catch (e) {
  const err = e as Error & { code?: number; category?: string; retryable?: boolean };
  
  if (err.code === 131030) {
    // Phone not in allowed list - skip permanently
    logFailure(contactId, "Phone not in allowed list");
  } else if (err.retryable) {
    // Retryable error - will be retried by retrier
    throw error; // Re-throw to trigger retry mechanism
  } else {
    // Non-retryable, non-whitelisted error
    logFailure(contactId, err.message);
  }
}
```

### Campaign Processing

The campaign system now:
1. Catches errors per contact
2. Categorizes them appropriately
3. Retries only retryable errors
4. Logs detailed failure information
5. Continues processing remaining contacts
6. Completes gracefully when done

## Testing Recommendations

1. **Test Phone Not Allowed Error**:
   - Try sending to: 966500000000 (if not in allowed list)
   - Expected: Error #131030, marked as failed in campaign logs

2. **Test Template Format Error**:
   - Create template with TEXT header but no parameters
   - Try to send campaign using that template
   - Expected: Error #132012, marked as failed, error logged

3. **Test Valid Send**:
   - Use contacts in WhatsApp allowed list
   - Use approved template with valid parameters
   - Expected: Success, message delivered

4. **Test Retry Behavior**:
   - Simulate rate limit error (#80005)
   - Expected: Automatic retry with exponential backoff

5. **Test Campaign Deletion**:
   - Delete campaign that exists
   - Expected: Success, logs deleted
   - Delete non-existent campaign
   - Expected: Returns false, no error thrown

## Files Modified

1. **convex/whatsapp.ts**:
   - Enhanced sendMessage action with validation and error categorization
   - Better logging and error structure
   - Phone number validation

2. **convex/campaigns.ts**:
   - Improved sendToContact error handling
   - Template header parameter validation
   - Safe campaign deletion
   - Better error logging with context

3. **convex/error-utils.ts** (NEW):
   - Comprehensive error code reference
   - Error categorization utilities
   - Phone number validation functions
   - Error report generation

## Future Improvements

1. **Exponential Backoff**: Implement exponential backoff for rate limit errors
2. **Error Analytics**: Track error patterns to identify systemic issues
3. **User Notifications**: Notify users of non-retryable errors
4. **Template Validation**: Validate templates before campaign creation
5. **Phone List Management**: Auto-sync allowed phone numbers from Meta
6. **Circuit Breaker**: Implement circuit breaker for repeated failures

## Support

For WhatsApp API errors, refer to:
- [Meta WhatsApp Cloud API Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)
- [WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)

