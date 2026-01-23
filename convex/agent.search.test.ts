import { describe, it, expect } from 'vitest';

// Test the detectSearchIntent function
function detectSearchIntent(message: string): { shouldSearch: boolean; queryType: string; extractedParams: any } {
  const lowerMessage = message.toLowerCase().trim();
  
  // Comprehensive search intent patterns with confidence scoring
  const intentPatterns = [
    // Product availability queries (high confidence)
    { pattern: /\b(do you have|do u have|have you got|got any)\b.*?(product|item|thing)?\s*(?:number|#)?\s*([a-z0-9\-]+)?/i, type: 'availability', confidence: 0.9 },
    // Price-related queries (high confidence) - Added "for" support and improved spacing
    { pattern: /(?:^|\s|\b)(how much|what.*price|price of|cost of|بكم|بكام|كم سعر|شقد|قيمة)(?:\b|\s|$)\s*(?:is|the|for|of)?\s*(.+?)(?:\?|؟|$)/i, type: 'price_inquiry', confidence: 0.9 },
    // Product search with identifiers (high confidence)
    { pattern: /\b(product|item|thing).*?(?:number|#|code)\s*[:\-]?\s*([a-z0-9\-]+)/i, type: 'product_number', confidence: 0.95 },
    // General search patterns (medium confidence)
    { pattern: /\b(search|find|look for|show me|get me|i want|i need|looking for|want to see)\b\s*(?:a|the|some|for)?\s*(.+?)(?:\?|$)/i, type: 'general_search', confidence: 0.7 },
    // Category searches (medium confidence) - Improved regex
    { pattern: /\b(what.*category|category of|type of|kind of)\b\s*(?:is|are)?\s*(.+?)(?:\?|$)/i, type: 'category_search', confidence: 0.6 },
    // Comparison queries (medium confidence)
    { pattern: /\b(compare|difference|vs|versus|أو|between|among)\b\s*(?:the|between|in)?\s*(.+?)(?:\?|$)/i, type: 'comparison', confidence: 0.65 },
    // Arabic search patterns (high confidence) - Fixed boundaries for Arabic
    { pattern: /(?:^|\s)(ابحث عن|وريني|جيب لي|عرض|عندك|فيها|توجد)(?:\s+|$).*?(?:منتج|سلعة|شيء|ال)?\s*(.+?)(?:\?|$)/i, type: 'general_search', confidence: 0.8 },
    // Reference to previous search (high confidence to override general/availability)
    { pattern: /\b(like that|similar|same as|another one|the other one)\b/i, type: 'reference_search', confidence: 0.95 }
  ];
  
  // Product identifier patterns (SKUs, model numbers, etc.)
  const identifierPatterns = [
    /\b[a-z]{2,}-\d{3,}\b/i,  // ABC-123 format (case insensitive)
    /\b\d{4,}\b/,            // 4+ digit numbers
    /\b(?=[a-z0-9]*\d)[a-z0-9]{6,}\b/i,      // Mixed alphanumeric 6+ chars (must have digit inside)
    /\b(?:model|sku|code|ref)[:\-]?\s*([a-z0-9\-]+)/i
  ];
  
  let bestMatch = null;
  let maxConfidence = 0.5; // Minimum threshold
  let extractedParams: any = {};
  
  // Check each intent pattern
  for (const intent of intentPatterns) {
    const match = lowerMessage.match(intent.pattern);
    if (match && intent.confidence > maxConfidence) {
      bestMatch = intent.type;
      maxConfidence = intent.confidence;
      
      // Extract parameters based on pattern type
      if (intent.type === 'product_number' && match[2]) {
        extractedParams.productNumber = match[2].toUpperCase();
      } else if (intent.type === 'price_inquiry' && match[match.length - 1]) {
        extractedParams.productName = match[match.length - 1].trim();
      } else if (intent.type === 'general_search' && match[match.length - 1]) {
        extractedParams.searchQuery = match[match.length - 1].trim();
      } else if (intent.type === 'category_search' && match[match.length - 1]) {
        extractedParams.category = match[match.length - 1].trim();
        extractedParams.searchQuery = extractedParams.category;
      } else if (intent.type === 'comparison' && match[match.length - 1]) {
        extractedParams.searchQuery = match[match.length - 1].trim();
      }
    }
  }
  
  // Look for product identifiers if not already found
  if (!extractedParams.productNumber) {
    for (const pattern of identifierPatterns) {
        const match = lowerMessage.match(pattern);
        if (match) {
          const id = match[1] || match[0];
          extractedParams.productNumber = id.toUpperCase().replace(/[^A-Z0-9\-]/g, '');
          // Force product_number type if explicit identifier found
          if (!bestMatch || bestMatch === 'general_search' || bestMatch === 'price_inquiry' || bestMatch === 'availability') {
              bestMatch = 'product_number';
              maxConfidence = 0.95;
          }
          break;
        }
      }
  }
  
  return {
    shouldSearch: maxConfidence >= 0.6,
    queryType: bestMatch || 'general_search',
    extractedParams
  };
}

describe('detectSearchIntent', () => {
  describe('Product Availability Queries', () => {
    it('should detect "Do you have" queries', () => {
      const result = detectSearchIntent("Do you have this product?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('availability');
      expect(result.extractedParams).toEqual({});
    });

    it('should detect "Do you have" with product number', () => {
      const result = detectSearchIntent("Do you have product number ABC-123?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('ABC-123');
    });

    it('should detect "Have you got" variations', () => {
      const result = detectSearchIntent("Have you got any laptops?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('availability');
    });

    it('should detect "Got any" informal queries', () => {
      const result = detectSearchIntent("Got any smartphones?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('availability');
    });
  });

  describe('Price Inquiry Queries', () => {
    it('should detect "How much" queries', () => {
      const result = detectSearchIntent("How much is this laptop?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('price_inquiry');
      expect(result.extractedParams.productName).toBe('this laptop');
    });

    it('should detect "What is the price" queries', () => {
      const result = detectSearchIntent("What is the price of iPhone 13?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('price_inquiry');
      expect(result.extractedParams.productName).toBe('iphone 13');
    });

    it('should detect "Price of" queries', () => {
      const result = detectSearchIntent("Price of Samsung Galaxy S21");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('price_inquiry');
      expect(result.extractedParams.productName).toBe('samsung galaxy s21');
    });

    it('should detect Arabic price queries', () => {
      const result = detectSearchIntent("بكم هذا المنتج؟");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('price_inquiry');
    });

    it('should detect "كم سعر" Arabic queries', () => {
      const result = detectSearchIntent("كم سعر الهاتف؟");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('price_inquiry');
      expect(result.extractedParams.productName).toBe('الهاتف');
    });
  });

  describe('Product Number Queries', () => {
    it('should detect product number with "number" keyword', () => {
      const result = detectSearchIntent("Product number ABC-123");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('ABC-123');
    });

    it('should detect product number with "#" symbol', () => {
      const result = detectSearchIntent("Item #XYZ-456");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('XYZ-456');
    });

    it('should detect product code queries', () => {
      const result = detectSearchIntent("Do you have code 789-DEF?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('789-DEF');
    });

    it('should detect SKU patterns automatically', () => {
      const result = detectSearchIntent("I need ABC-1234");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('ABC-1234');
    });

    it('should detect 4+ digit numbers as product identifiers', () => {
      const result = detectSearchIntent("Show me 12345");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('12345');
    });
  });

  describe('General Search Queries', () => {
    it('should detect "search for" queries', () => {
      const result = detectSearchIntent("Search for wireless headphones");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('general_search');
      expect(result.extractedParams.searchQuery).toBe('wireless headphones');
    });

    it('should detect "find" queries', () => {
      const result = detectSearchIntent("Find me a good laptop");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('general_search');
      expect(result.extractedParams.searchQuery).toBe('me a good laptop');
    });

    it('should detect "show me" queries', () => {
      const result = detectSearchIntent("Show me gaming keyboards");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('general_search');
      expect(result.extractedParams.searchQuery).toBe('gaming keyboards');
    });

    it('should detect "looking for" queries', () => {
      const result = detectSearchIntent("I'm looking for office chairs");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('general_search');
      expect(result.extractedParams.searchQuery).toBe('office chairs');
    });
  });

  describe('Arabic Search Queries', () => {
    it('should detect "ابحث عن" queries', () => {
      const result = detectSearchIntent("ابحث عن هاتف محمول");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('general_search');
      expect(result.extractedParams.searchQuery).toBe('هاتف محمول');
    });

    it('should detect "وريني" queries', () => {
      const result = detectSearchIntent("وريني اللابتوبات");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('general_search');
      expect(result.extractedParams.searchQuery).toBe('لابتوبات');
    });

    it('should detect "عندك" queries', () => {
      const result = detectSearchIntent("عندك سماعات؟");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('general_search');
      expect(result.extractedParams.searchQuery).toBe('سماعات؟');
    });
  });

  describe('Comparison Queries', () => {
    it('should detect "compare" queries', () => {
      const result = detectSearchIntent("Compare iPhone and Samsung");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('comparison');
      expect(result.extractedParams.searchQuery).toBe('iphone and samsung');
    });

    it('should detect "vs" queries', () => {
      const result = detectSearchIntent("iPhone vs Samsung Galaxy");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('comparison');
      // Regex captures what's after "vs"
      expect(result.extractedParams.searchQuery).toBe('samsung galaxy');
    });

    it('should detect "difference" queries', () => {
      const result = detectSearchIntent("What's the difference between Mac and PC?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('comparison');
      expect(result.extractedParams.searchQuery).toBe('mac and pc');
    });
  });

  describe('Category Queries', () => {
    it('should detect "what category" queries', () => {
      const result = detectSearchIntent("What category is this product in?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('category_search');
      expect(result.extractedParams.searchQuery).toBe('this product in');
    });

    it('should detect "type of" queries', () => {
      const result = detectSearchIntent("What type of phone is this?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('category_search');
      expect(result.extractedParams.searchQuery).toBe('phone is this');
    });
  });

  describe('Reference Queries', () => {
    it('should detect "like that" references', () => {
      const result = detectSearchIntent("Show me more products like that");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('reference_search');
    });

    it('should detect "similar" queries', () => {
      const result = detectSearchIntent("Do you have anything similar?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('reference_search');
    });

    it('should detect "another one" queries', () => {
      const result = detectSearchIntent("Show me another one");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('reference_search');
    });
  });

  describe('Edge Cases and Non-Search Queries', () => {
    it('should not trigger search for greetings', () => {
      const result = detectSearchIntent("Hello, how are you?");
      expect(result.shouldSearch).toBe(false);
    });

    it('should not trigger search for general questions', () => {
      const result = detectSearchIntent("What time is it?");
      expect(result.shouldSearch).toBe(false);
    });

    it('should not trigger search for feedback', () => {
      const result = detectSearchIntent("Thank you for your help");
      expect(result.shouldSearch).toBe(false);
    });

    it('should handle empty messages', () => {
      const result = detectSearchIntent("");
      expect(result.shouldSearch).toBe(false);
      expect(result.queryType).toBe('general_search');
    });

    it('should handle very short messages', () => {
      const result = detectSearchIntent("Hi");
      expect(result.shouldSearch).toBe(false);
    });
  });

  describe('Complex and Multi-Intent Queries', () => {
    it('should handle "Do you have and how much" combined queries', () => {
      const result = detectSearchIntent("Do you have Product-123 and how much is it?");
      expect(result.shouldSearch).toBe(true);
      // Should prioritize product_number over availability due to explicit ID
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('PRODUCT-123');
    });

    it('should handle product number with price inquiry', () => {
      const result = detectSearchIntent("Product ABC-123, what's the price?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('product_number');
      expect(result.extractedParams.productNumber).toBe('ABC-123');
    });

    it('should handle vague product references', () => {
      const result = detectSearchIntent("How much for that one?");
      expect(result.shouldSearch).toBe(true);
      expect(result.queryType).toBe('price_inquiry');
      // Should extract "that one" as product name for context
      expect(result.extractedParams.productName).toBe('that one');
    });
  });

  describe('Confidence Threshold Testing', () => {
    it('should require minimum confidence of 0.6', () => {
      const result = detectSearchIntent("Maybe you have something?");
      expect(result.shouldSearch).toBe(false); // Confidence too low
    });

    it('should trigger search for high-confidence patterns', () => {
      const result = detectSearchIntent("Do you have product 12345?");
      expect(result.shouldSearch).toBe(true); // High confidence
      expect(result.queryType).toBe('product_number');
    });
  });
});