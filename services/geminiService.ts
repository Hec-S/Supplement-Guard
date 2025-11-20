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

const totalsSummaryCategorySchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, description: "Category name (e.g., 'Parts', 'Body Labor', 'Paint Labor')" },
    basis: { type: Type.STRING, nullable: true, description: "Basis for calculation (e.g., '15.4 hrs')" },
    rate: { type: Type.STRING, nullable: true, description: "Rate (e.g., '$ 120.00 /hr')" },
    cost: { type: Type.NUMBER, description: "Cost amount for this category" }
  },
  required: ['category', 'cost']
};

const totalsSummarySchema = {
  type: Type.OBJECT,
  properties: {
    categories: {
      type: Type.ARRAY,
      items: totalsSummaryCategorySchema,
      description: "Array of category totals (Parts, Body Labor, Paint Labor, etc.)"
    },
    subtotal: { type: Type.NUMBER, description: "Subtotal amount" },
    salesTax: { type: Type.NUMBER, description: "Sales tax amount" },
    salesTaxRate: { type: Type.NUMBER, nullable: true, description: "Tax rate percentage (e.g., 9.0000 for 9%)" },
    salesTaxBasis: { type: Type.NUMBER, nullable: true, description: "Amount tax is calculated on" },
    totalAmount: { type: Type.NUMBER, description: "Total amount" },
    netCostOfSupplement: { type: Type.NUMBER, nullable: true, description: "Net cost of supplement (for supplement invoices)" }
  },
  required: ['categories', 'subtotal', 'salesTax', 'totalAmount']
};

const invoiceSchema = {
  type: Type.OBJECT,
  properties: {
    fileName: { type: Type.STRING, description: "The filename of the invoice document." },
    lineItems: { type: Type.ARRAY, items: invoiceLineItemSchema },
    subtotal: { type: Type.NUMBER },
    tax: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    totalsSummary: {
      ...totalsSummarySchema,
      nullable: true,
      description: "Totals summary table if present in the invoice (look for 'TOTALS SUMMARY' section)"
    }
  },
  required: ['fileName', 'lineItems', 'subtotal', 'tax', 'total']
};

const claimDataSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Generate a unique claim ID, e.g., CLM-2024-XXXXXX" },
    claimNumber: {
      type: Type.STRING,
      nullable: true,
      description: "The actual Claim # from the document, typically found in the top right of the first page"
    },
    vehicleInfo: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        year: { type: Type.STRING, nullable: true, description: "Vehicle year" },
        make: { type: Type.STRING, nullable: true, description: "Vehicle make (e.g., Toyota, Ford)" },
        model: { type: Type.STRING, nullable: true, description: "Vehicle model (e.g., Camry, F-150)" },
        vin: { type: Type.STRING, nullable: true, description: "Vehicle Identification Number" },
        description: { type: Type.STRING, nullable: true, description: "Full vehicle description if available" }
      }
    },
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
1. Extract CLAIM NUMBER and VEHICLE INFORMATION from the documents
2. Extract all line items from both documents WITH THEIR CATEGORIES
3. **EXTRACT THE "TOTALS SUMMARY" TABLE** (CRITICAL - see section 7 below)
4. Compare line items to identify what changed
5. Track additions, removals, and modifications
6. Extract the COMPLETE workfile total from supplement (estimate + all supplements)
7. Return structured data showing these changes

═══════════════════════════════════════════════════════════════════════════════
🔧 AUTO-DAMAGE ESTIMATE TERMINOLOGY REFERENCE 🔧
═══════════════════════════════════════════════════════════════════════════════

**SUPPLEMENT CODES:**
When you see codes like S01, S02, S03, S04, S05 in the operation column:
- S01 = Supplement 1 (first supplement to original estimate)
- S02 = Supplement 2 (second supplement)
- S03 = Supplement 3 (third supplement)
- S04 = Supplement 4 (fourth supplement)
- S05 = Supplement 5 (fifth supplement)
- If NO supplement code appears, the operation is part of the ORIGINAL estimate

**LABOR OPERATION ABBREVIATIONS:**
- Rpr = Repair (fix existing part)
- Repl = Replace (remove old part, install new part)
- R&I = Remove and Install (remove part, then reinstall SAME part)
- R&R = Remove and Replace (remove old part, replace with new part)
- Refn = Refinish (paint-related work)
- Blnd = Blend (blend paint into adjacent panels for color match)

**LABOR CATEGORIES (letter next to labor time):**
- M = Mechanical labor (engine, transmission, drivetrain work)
- S = Structural labor (frame, unibody, structural repairs)
- F = Frame labor (frame straightening, alignment)
- E = Electrical labor (wiring, sensors, electronics)
- G = Glass labor (windshield, windows)
- D = Diagnostic labor (computer diagnostics, troubleshooting)
- Incl = Included (operation included in another operation, no added charge)

**PAINT & MATERIALS / SPECIAL WORK:**
- Three Stage = Extra paint procedure (tri-coat paint system)
- Add for Clear Coat = Extra refinish step for clear coat application
- BCR = Blend, Clear, Refinish (complete paint process)
- O/H = Overhaul (complete disassembly and rebuild)

**SUBLET CHARGES:**
- Subl = Sublet work (work performed by third-party vendor)
- Common sublet operations:
  • Wheel alignment (performed at alignment shop)
  • Glass replacement (performed at glass shop)
  • ADAS calibration (camera/sensor calibration)
  • Paintless dent repair (PDR specialist)
  • Upholstery repair (interior specialist)

**PRICING INDICATORS:**
- X = Tax-exempt item (not subject to sales tax)
- T = Taxable miscellaneous charge (subject to sales tax)

**PART INFORMATION:**
- Part numbers identify specific vehicle parts (e.g., 3CN807421BGRU = Bumper cover)
- Part numbers typically indicate OEM (Original Equipment Manufacturer) parts
- Generic descriptions without part numbers may indicate aftermarket parts
- Look for "OEM", "OE", "Genuine", "Original" to identify OEM parts
- Look for "Aftermarket", "AM", "Alternative" to identify aftermarket parts

**OVERLAPS (NEGATIVE TIME ADJUSTMENTS):**
- Major Overlap = Negative time to prevent double-charging when operations overlap
- Minor Overlap = Small negative time adjustment for shared work
- Example: If removing bumper is included in another operation, overlap prevents charging twice

**GENERAL LINE ITEM STRUCTURE:**
Each line item typically contains:
1. Operation code (S01, S02, etc.) - indicates which supplement
2. Labor operation (Rpr, Repl, R&I, R&R, etc.) - what work is being done
3. Part number (if applicable) - specific part being replaced
4. Description - detailed description of work or part
5. Labor hours - time for labor (may have letter suffix: M, S, F, E, G, D)
6. Paint hours - time for paint/refinish work
7. Quantity - number of parts or operations
8. Price - unit price
9. Total - extended total (quantity × price)

**CRITICAL INTERPRETATION RULES:**
1. If you see S01, S02, etc. → This line belongs to that specific supplement number
2. If NO supplement code → This line is from the ORIGINAL estimate
3. If you see "Subl" → This is work done by an outside vendor
4. If you see a part number → This is an actual car part being replaced
5. Labor category letters (M, S, F, E, G, D) describe the TYPE of labor work
6. Negative amounts (overlaps) are NORMAL and prevent double-charging
7. "Incl" means the operation is included in another line item's labor time

═══════════════════════════════════════════════════════════════════════════════

CRITICAL METADATA EXTRACTION:
**CLAIM NUMBER:**
- Look for "Claim #", "Claim Number", or "Claim No." typically in the TOP RIGHT of the FIRST PAGE
- This is usually a numeric or alphanumeric identifier
- Common formats: 6-10 digits, may include letters (e.g., "123456", "ABC123456", "2024-123456")
- If multiple claim numbers exist, use the most prominent one

**VEHICLE INFORMATION:**
- Look for a "Vehicle" section or header, typically near the top of the document
- Extract:
  • Year (4 digits, e.g., "2022")
  • Make (manufacturer, e.g., "Toyota", "Ford", "Honda")
  • Model (e.g., "Camry", "F-150", "Accord")
  • VIN (17-character Vehicle Identification Number)
  • Full description if available (e.g., "2022 Toyota Camry LE")
- The vehicle section may also be labeled as "Vehicle Info", "Auto Info", or similar

CRITICAL TOTAL EXTRACTION:
- In the SUPPLEMENT file, the "Workfile Total" or "NET COST OF REPAIRS" shows the COMPLETE total
- This total = Original Estimate + All Supplements combined
- This is the TRUE final amount for the entire claim
- Always prioritize extracting this value for accurate total reporting

Follow these instructions precisely:

1. **METADATA EXTRACTION (FIRST PRIORITY):**
   - Scan the TOP RIGHT of the first page for Claim #
   - Scan the top portion of documents for Vehicle section
   - Extract all available vehicle details

2. **CATEGORY AND LINE ITEM OCR and Extraction:**
   
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

3. **Line Item Matching and Comparison:**
   
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

4. **Change Tracking Details:**
   
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

5. **Automotive Part Classification (Optional but Helpful):**
   
   For better tracking, classify parts when possible:
   - Part numbers (OEM or aftermarket)
   - Vehicle system (ENGINE, BRAKES, BODY, etc.)
   - Part category (OEM, AFTERMARKET, LABOR, etc.)
   - Labor hours and rates if applicable

6. **Document Totals (After Line Item Analysis):**
   
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

7. **TOTALS SUMMARY Extraction (🚨 CRITICAL - HIGHEST PRIORITY 🚨):**
   
   **🔍 LOOK FOR A "TOTALS SUMMARY" TABLE IN BOTH ORIGINAL AND SUPPLEMENT INVOICES.**
   
   **WHERE TO FIND IT:**
   - Usually appears at the END of the invoice, AFTER all line items
   - May be labeled as "TOTALS SUMMARY", "SUMMARY", or "COST BREAKDOWN"
   - Typically has a table format with columns: Category | Basis | Rate | Cost $
   
   **WHAT IT CONTAINS:**
   This table shows the complete cost breakdown by category:
   - **Parts** (just dollar amount)
   - **Body Labor** (hours @ hourly rate = cost)
   - **Paint Labor** (hours @ hourly rate = cost)
   - **Mechanical Labor** (hours @ hourly rate = cost)
   - **Additional Supplement Labor** (dollar amount, may be negative)
   - **Paint Supplies** (hours @ hourly rate = cost)
   - **Additional Supplement Materials/Supplies** (dollar amount, may be negative)
   - **Miscellaneous** (dollar amount)
   - **Subtotal** (sum of all categories)
   - **Sales Tax** (with tax rate % and basis amount)
   - **Total Supplement Amount** or **Total Amount**
   - **NET COST OF SUPPLEMENT** (for supplement invoices only)
   
   **EXTRACTION INSTRUCTIONS:**
   For EACH category row, extract an object with these fields:
   - category: The category name (e.g., "Parts", "Body Labor", "Paint Labor")
   - basis: The basis value if present (e.g., "15.4 hrs") or empty string
   - rate: The rate if present (e.g., "$ 120.00 /hr") or empty string
   - cost: The dollar amount (e.g., 1848.00)
   
   Then extract the totals:
   - subtotal: The subtotal amount
   - salesTax: The tax amount
   - salesTaxRate: The tax percentage (e.g., 9.0000 for 9%)
   - salesTaxBasis: The amount tax is calculated on
   - totalAmount: The final total
   - netCostOfSupplement: (supplement only) The net cost
   
   **🚨 CRITICAL REQUIREMENTS:**
   1. **ALWAYS scan for this table** - it's usually at the bottom of the invoice
   2. **Extract ALL categories** present in the table
   3. **Include negative amounts** (like Additional Supplement Labor: -944.70)
   4. **Preserve exact formatting** of basis and rate strings
   5. **If the table exists, you MUST extract it** - this is non-negotiable
   6. **If no TOTALS SUMMARY table is found**, set totalsSummary to null
   
   **EXAMPLE - If you see this table in the invoice:**
   Parts                                                    298.44
   Body Labor              15.4 hrs    @ $ 120.00 /hr    1,848.00
   Paint Labor             10.9 hrs    @ $ 120.00 /hr    1,308.00
   Mechanical Labor         1.0 hrs    @ $ 200.00 /hr      200.00
   Additional Supplement Labor                            -944.70
   Paint Supplies          10.9 hrs    @ $ 42.00 /hr       457.80
   Additional Supplement Materials/Supplies               -235.20
   Miscellaneous                                            89.95
   Subtotal                                              3,022.29
   Sales Tax               $ 521.04    @ 9.0000 %           46.89
   Total Supplement Amount                               3,069.18
   NET COST OF SUPPLEMENT                                3,069.18
   
   **You must extract it as this JSON structure in the totalsSummary field.**

8. **Generate Change Summary:**
   
   Create a changesSummary object with:
   - totalNewItems: Count of new items added
   - totalRemovedItems: Count of items removed
   - totalChangedItems: Count of items modified
   - totalUnchangedItems: Count of unchanged items
   - totalAmountChange: Dollar difference in totals
   - percentageChange: Percentage change in total

9. **Invoice Summary:**
   
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
- **ALWAYS extract Claim # and Vehicle information FIRST** - these are critical for identification
- This is NOT a fraud detection analysis
- Focus ONLY on documenting what changed between documents
- **CRITICAL:** Every line item MUST have a category assigned (use "UNCATEGORIZED" if no category is visible)
- Preserve the hierarchical structure of categories and their line items
- Be precise in matching line items within their categories
- Track all changes accurately
- Set fraudScore to 0 and fraudReasons to empty array (not used)
- **CRITICAL:** The "Workfile Total" or "NET COST OF REPAIRS" in supplement files represents the COMPLETE claim total (original estimate + all supplements)
- Always extract and report this complete workfile total for accurate financial reporting
- **NEW CRITICAL REQUIREMENT:** Extract the TOTALS SUMMARY table if present in the invoice - this provides the authoritative cost breakdown by category

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
    
    // Debug logging for TOTALS SUMMARY extraction
    console.log('=== OCR EXTRACTION DEBUG ===');
    console.log('Original Invoice totalsSummary:', parsedData.originalInvoice.totalsSummary);
    console.log('Supplement Invoice totalsSummary:', parsedData.supplementInvoice.totalsSummary);
    console.log('===========================');
    
    return parsedData as ClaimData;
  } catch (error) {
    console.error("Error during claim analysis:", error);
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("An unexpected error occurred while analyzing the claim. See console for details.");
  }
};
