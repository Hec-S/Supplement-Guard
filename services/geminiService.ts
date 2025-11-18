import { GoogleGenAI, Type } from "@google/genai";
import { ClaimData } from '../types';

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY environment variable not set. This application requires a valid API key to function.");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const invoiceLineItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "A unique ID for the line item, e.g., 'sli-1'." },
    category: {
      type: Type.STRING,
      description: "The category this item belongs to (e.g., 'REAR BUMPER', 'REAR LAMPS', 'VEHICLE DIAGNOSTICS', etc.)"
    },
    lineNumber: { type: Type.NUMBER, nullable: true, description: "The line number from the invoice" },
    operation: { type: Type.STRING, nullable: true, description: "Operation code (e.g., 'S01', 'R&I', 'Repl')" },
    description: { type: Type.STRING },
    quantity: { type: Type.NUMBER },
    price: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    laborHours: { type: Type.NUMBER, nullable: true, description: "Labor hours if applicable" },
    paintHours: { type: Type.NUMBER, nullable: true, description: "Paint hours if applicable" },
    isNew: { type: Type.BOOLEAN, nullable: true, description: "True if this item only exists in the supplement invoice." },
    isChanged: { type: Type.BOOLEAN, nullable: true, description: "True if quantity or price changed from the original." },
    isRemoved: { type: Type.BOOLEAN, nullable: true, description: "True if this item was in original but not in supplement." },
    // Change tracking fields
    originalQuantity: { type: Type.NUMBER, nullable: true, description: "Original quantity if item changed" },
    originalPrice: { type: Type.NUMBER, nullable: true, description: "Original price if item changed" },
    originalTotal: { type: Type.NUMBER, nullable: true, description: "Original total if item changed" },
    quantityChange: { type: Type.NUMBER, nullable: true, description: "Difference in quantity (supplement - original)" },
    priceChange: { type: Type.NUMBER, nullable: true, description: "Difference in price (supplement - original)" },
    totalChange: { type: Type.NUMBER, nullable: true, description: "Difference in total (supplement - original)" },
    changeType: {
      type: Type.STRING,
      nullable: true,
      description: "Type of change: NEW, REMOVED, QUANTITY_CHANGED, PRICE_CHANGED, BOTH_CHANGED, UNCHANGED"
    },
    // Enhanced automotive fields
    partNumber: { type: Type.STRING, nullable: true, description: "OEM or aftermarket part number if identifiable" },
    vehicleSystem: {
      type: Type.STRING,
      nullable: true,
      description: "Vehicle system category: ENGINE, TRANSMISSION, BRAKES, SUSPENSION, ELECTRICAL, BODY, INTERIOR, EXHAUST, COOLING, FUEL, STEERING, HVAC, SAFETY, WHEELS_TIRES, OTHER"
    },
    partCategory: {
      type: Type.STRING,
      nullable: true,
      description: "Part category: OEM, AFTERMARKET, LABOR, PAINT_MATERIALS, CONSUMABLES, RENTAL, STORAGE, OTHER"
    },
    isOEM: { type: Type.BOOLEAN, nullable: true, description: "True if identified as OEM part, false if aftermarket" }
  },
  required: ['id', 'category', 'description', 'quantity', 'price', 'total']
};

const invoiceSchema = {
  type: Type.OBJECT,
  properties: {
    fileName: { type: Type.STRING, description: "The filename of the invoice document." },
    lineItems: { type: Type.ARRAY, items: invoiceLineItemSchema },
    subtotal: { type: Type.NUMBER },
    tax: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
  },
  required: ['fileName', 'lineItems', 'subtotal', 'tax', 'total']
};

const claimDataSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Generate a unique claim ID, e.g., CLM-2024-XXXXXX" },
    originalInvoice: invoiceSchema,
    supplementInvoice: invoiceSchema,
    // Change tracking summary
    changesSummary: {
      type: Type.OBJECT,
      properties: {
        totalNewItems: { type: Type.INTEGER, description: "Count of new items added in supplement" },
        totalRemovedItems: { type: Type.INTEGER, description: "Count of items removed from original" },
        totalChangedItems: { type: Type.INTEGER, description: "Count of items with changes" },
        totalUnchangedItems: { type: Type.INTEGER, description: "Count of unchanged items" },
        totalAmountChange: { type: Type.NUMBER, description: "Total dollar amount change" },
        percentageChange: { type: Type.NUMBER, description: "Percentage change in total" }
      },
      required: ['totalNewItems', 'totalRemovedItems', 'totalChangedItems', 'totalUnchangedItems', 'totalAmountChange', 'percentageChange']
    },
    // Keep these for backward compatibility but make them minimal
    fraudScore: { type: Type.INTEGER, description: "Set to 0 - not used for fraud detection anymore" },
    fraudReasons: {
        type: Type.ARRAY,
        description: "Empty array - not used for fraud detection anymore",
        items: { type: Type.STRING }
    },
    invoiceSummary: { type: Type.STRING, description: "A detailed summary of what changed between the original and supplement invoices, focusing on line item changes." }
  },
  required: ['id', 'originalInvoice', 'supplementInvoice', 'changesSummary', 'fraudScore', 'fraudReasons', 'invoiceSummary']
};

/**
 * Validates the structure of the claim data object returned by the AI.
 * Throws a detailed error if validation fails.
 * @param data The data object to validate.
 * @returns True if the data is valid.
 */
const validateClaimData = (data: any): data is ClaimData => {
  if (!data) {
    throw new Error("The AI response was empty. Please try again.");
  }

  const checkProperty = (obj: any, prop: string, type: string, isArray = false) => {
    if (obj[prop] === undefined || obj[prop] === null) {
      throw new Error(`The AI response is missing the required '${prop}' field.`);
    }
    if (isArray) {
      if (!Array.isArray(obj[prop])) {
        throw new Error(`The '${prop}' field should be an array, but it's not.`);
      }
    } else if (typeof obj[prop] !== type) {
      throw new Error(`The '${prop}' field should be a ${type}, but received ${typeof obj[prop]}.`);
    }
  };

  const validateInvoice = (invoice: any, name: string) => {
    if (!invoice) {
      throw new Error(`The AI response is missing the '${name}' object.`);
    }
    checkProperty(invoice, 'fileName', 'string');
    checkProperty(invoice, 'lineItems', 'object', true);
    checkProperty(invoice, 'subtotal', 'number');
    checkProperty(invoice, 'tax', 'number');
    checkProperty(invoice, 'total', 'number');

    // Enhanced validation for line items with change tracking and categories
    if (invoice.lineItems.length > 0) {
      invoice.lineItems.forEach((item: any, index: number) => {
        if (!item.id || typeof item.id !== 'string') {
          throw new Error(`Line item ${index} is missing a valid 'id' field.`);
        }
        if (!item.category || typeof item.category !== 'string') {
          throw new Error(`Line item ${index} is missing a valid 'category' field.`);
        }
        if (!item.description || typeof item.description !== 'string') {
          throw new Error(`Line item ${index} is missing a valid 'description' field.`);
        }
        if (typeof item.quantity !== 'number') {
          throw new Error(`Line item ${index} is missing a valid 'quantity' field.`);
        }
        if (typeof item.price !== 'number') {
          throw new Error(`Line item ${index} is missing a valid 'price' field.`);
        }
        if (typeof item.total !== 'number') {
          throw new Error(`Line item ${index} is missing a valid 'total' field.`);
        }
      });
    }
  };

  const validateChangesSummary = (summary: any) => {
    if (!summary) {
      throw new Error("The AI response is missing the 'changesSummary' object.");
    }
    checkProperty(summary, 'totalNewItems', 'number');
    checkProperty(summary, 'totalRemovedItems', 'number');
    checkProperty(summary, 'totalChangedItems', 'number');
    checkProperty(summary, 'totalUnchangedItems', 'number');
    checkProperty(summary, 'totalAmountChange', 'number');
    checkProperty(summary, 'percentageChange', 'number');
  };
  
  checkProperty(data, 'id', 'string');
  checkProperty(data, 'fraudScore', 'number');
  checkProperty(data, 'fraudReasons', 'object', true);
  checkProperty(data, 'invoiceSummary', 'string');
  validateInvoice(data.originalInvoice, 'originalInvoice');
  validateInvoice(data.supplementInvoice, 'supplementInvoice');
  validateChangesSummary(data.changesSummary);

  return true;
};


// Helper function to convert a File to a base64 string and format for the API
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        } else {
            reject(new Error('Failed to read file as string.'));
        }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const analyzeClaimPackage = async (
  originalFiles: File[],
  supplementFiles: File[]
): Promise<ClaimData> => {
  const originalParts = await Promise.all(originalFiles.map(fileToGenerativePart));
  const supplementParts = await Promise.all(supplementFiles.map(fileToGenerativePart));

  const prompt = `You are a meticulous document analyst with exceptional Optical Character Recognition (OCR) capabilities specializing in automotive repair invoices. Your primary goal is to accurately extract and compare LINE ITEMS WITH THEIR CATEGORIES between original and supplement claim packages.

Your task is to:
1. Extract all line items from both documents WITH THEIR CATEGORIES
2. Compare them to identify what changed
3. Track additions, removals, and modifications
4. Extract the COMPLETE workfile total from supplement (estimate + all supplements)
5. Return structured data showing these changes

CRITICAL TOTAL EXTRACTION:
- In the SUPPLEMENT file, the "Workfile Total" or "NET COST OF REPAIRS" shows the COMPLETE total
- This total = Original Estimate + All Supplements combined
- This is the TRUE final amount for the entire claim
- Always prioritize extracting this value for accurate total reporting

Follow these instructions precisely:

1. **CATEGORY AND LINE ITEM OCR and Extraction:**
   
   **CRITICAL: Identify CATEGORIES and assign each line item to its category**
   
   Categories in invoices appear as:
   - **BOLD BLACK TEXT** headers (ALL CAPS)
   - Examples: "REAR BUMPER", "REAR LAMPS", "VEHICLE DIAGNOSTICS", "QUARTER PANEL", "MISCELLANEOUS OPERATIONS", "OTHER CHARGES"
   - Categories group related line items underneath them
   
   For each document (original and supplement):
   - First identify all CATEGORY headers (bold, all caps text)
   - Then extract every line item under each category
   - Each line item MUST include:
     • Category it belongs to (REQUIRED - use "UNCATEGORIZED" if no category found)
     • Line number (if visible in the invoice)
     • Operation code (e.g., "S01", "R&I", "Repl", "O/H")
     • Description (exact text as shown)
     • Quantity
     • Unit price
     • Total amount
     • Labor hours (if shown)
     • Paint hours (if shown separately)
   
   Common category patterns to recognize:
   - Body parts: REAR BUMPER, FRONT BUMPER, QUARTER PANEL, HOOD, DOOR, etc.
   - Lighting: REAR LAMPS, FRONT LAMPS, HEADLAMPS, etc.
   - Systems: VEHICLE DIAGNOSTICS, ELECTRICAL, SUSPENSION, FRAME, etc.
   - Operations: MISCELLANEOUS OPERATIONS, OTHER CHARGES, PAINT OPERATIONS, etc.
   - Materials: PAINT MATERIALS, CONSUMABLES, etc.

2. **Line Item Matching and Comparison:**
   
   **CRITICAL: Compare LINE ITEMS between documents, preserving category structure**
   
   - Match items between original and supplement based on BOTH category AND description
   - Items should be compared within the same category when possible
   - Use fuzzy matching for similar descriptions (e.g., "Front Bumper" vs "Frnt Bumper")
   - Track the following changes:
     
     a) **NEW ITEMS** (isNew: true):
        - Items that appear ONLY in the supplement
        - Not present in the original at all
     
     b) **REMOVED ITEMS** (isRemoved: true):
        - Items that were in the original
        - But are NOT in the supplement
     
     c) **CHANGED ITEMS** (isChanged: true):
        - Items in both documents but with different:
          • Quantity
          • Price
          • Total
        - Store original values for comparison
        - Calculate the differences
     
     d) **UNCHANGED ITEMS**:
        - Items identical in both documents
        - Same quantity, price, and total

3. **Change Tracking Details:**
   
   For CHANGED items, track:
   - originalQuantity, originalPrice, originalTotal
   - quantityChange (supplement - original)
   - priceChange (supplement - original)
   - totalChange (supplement - original)
   - changeType: "QUANTITY_CHANGED", "PRICE_CHANGED", or "BOTH_CHANGED"
   
   For NEW items:
   - changeType: "NEW"
   - All change fields can be null
   
   For REMOVED items:
   - Include in original invoice with isRemoved: true
   - changeType: "REMOVED"
   
   For UNCHANGED items:
   - changeType: "UNCHANGED"
   - All change fields should be 0

4. **Automotive Part Classification (Optional but Helpful):**
   
   For better tracking, classify parts when possible:
   - Part numbers (OEM or aftermarket)
   - Vehicle system (ENGINE, BRAKES, BODY, etc.)
   - Part category (OEM, AFTERMARKET, LABOR, etc.)
   - Labor hours and rates if applicable

5. **Document Totals (After Line Item Analysis):**
   
   After processing line items, extract totals:
   
   **For ORIGINAL:**
   - Look for "Net Cost of Repairs" as authoritative total
   - Or use Subtotal, Tax, Total from document
   
   **For SUPPLEMENT:**
   - **CRITICAL - LOOK FOR THESE TOTALS IN ORDER OF PRIORITY:**
     1. "Workfile Total" - This is the MOST AUTHORITATIVE total (estimate + all supplements)
     2. "NET COST OF REPAIRS" - Alternative name for the complete total
     3. "CUMULATIVE EFFECTS OF SUPPLEMENT(S)" section if above not found
     4. Or use Subtotal, Tax, Total from document as last resort
   
   **IMPORTANT:** The "Workfile Total" or "NET COST OF REPAIRS" in the supplement represents the COMPLETE total including the original estimate PLUS all supplements. This is the TRUE final amount.

6. **Generate Change Summary:**
   
   Create a changesSummary object with:
   - totalNewItems: Count of new items added
   - totalRemovedItems: Count of items removed
   - totalChangedItems: Count of items modified
   - totalUnchangedItems: Count of unchanged items
   - totalAmountChange: Dollar difference in totals
   - percentageChange: Percentage change in total

7. **Invoice Summary:**
   
   Write a clear, detailed summary focusing on:
   - What specific items were added (organized by category)
   - What specific items were removed (organized by category)
   - What items had price or quantity changes (organized by category)
   - The overall impact on the total cost
   - **IMPORTANT:** Mention the Workfile Total or NET COST OF REPAIRS as the complete total
   - Clarify that this total includes the original estimate plus all supplements
   - Organize the summary by categories for clarity
   - Use clear, simple language
   - Focus on facts, not fraud detection

IMPORTANT NOTES:
- This is NOT a fraud detection analysis
- Focus ONLY on documenting what changed between documents
- **CRITICAL:** Every line item MUST have a category assigned (use "UNCATEGORIZED" if no category is visible)
- Preserve the hierarchical structure of categories and their line items
- Be precise in matching line items within their categories
- Track all changes accurately
- Set fraudScore to 0 and fraudReasons to empty array (not used)
- **CRITICAL:** The "Workfile Total" or "NET COST OF REPAIRS" in supplement files represents the COMPLETE claim total (original estimate + all supplements)
- Always extract and report this complete workfile total for accurate financial reporting

Return ONLY a single, valid JSON object that adheres to the provided schema. Do not include any other text or markdown formatting.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { text: prompt },
          { text: "\n--- ORIGINAL PACKAGE FILES ---" },
          ...originalParts,
          { text: "\n--- SUPPLEMENT PACKAGE FILES ---" },
          ...supplementParts,
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: claimDataSchema,
      },
    });
    
    const jsonString = response.text.trim();
    let parsedData;

    try {
      parsedData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse JSON response from AI:", jsonString);
      throw new Error("The AI returned a response that was not valid JSON. Please try your request again.");
    }

    validateClaimData(parsedData);
    
    return parsedData as ClaimData;
  } catch (error) {
    console.error("Error during claim analysis:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unexpected error occurred while analyzing the claim. See console for details.");
  }
};
