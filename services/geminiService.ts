import { GoogleGenAI, Type } from "@google/genai";
import { ClaimData } from '../types';

if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable not set. This application requires a valid API key to function.");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

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
    laborRate: { type: Type.NUMBER, nullable: true, description: "Labor rate per hour (e.g., 120.00 for $120/hr)" },
    // CRITICAL: Cost breakdown fields for separating part and labor costs
    partCost: {
      type: Type.NUMBER,
      nullable: true,
      description: "Cost of the physical part ONLY (excluding labor). For parts-with-labor items, this is the part component. For labor-only items, this is 0 or null."
    },
    laborCost: {
      type: Type.NUMBER,
      nullable: true,
      description: "Cost of labor to install/repair ONLY (excluding part). Calculate from laborHours × laborRate, or extract from invoice breakdown."
    },
    materialCost: {
      type: Type.NUMBER,
      nullable: true,
      description: "Cost of consumable materials (paint, fluids, supplies). Separate from part and labor costs."
    },
    costBreakdownValidated: {
      type: Type.BOOLEAN,
      nullable: true,
      description: "True if partCost + laborCost + materialCost = total (within $0.01). False if estimated or cannot validate."
    },
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
    differenceType: {
      type: Type.STRING,
      nullable: true,
      description: "Specific difference type for comparison table: 'Added Labor', 'Added Part', 'Changed Part Type', 'Increased Price', 'Decreased Price', 'Increased Quantity', 'Decreased Quantity', 'Removed Operation', 'Modified Labor Hours', 'Changed Part Number', etc."
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

const supplementEntrySchema = {
  type: Type.OBJECT,
  properties: {
    supplementNumber: { type: Type.INTEGER, description: "Supplement number (1, 2, 3, 4, or 5)" },
    supplementCode: { type: Type.STRING, description: "Supplement code (S01, S02, S03, S04, or S05)" },
    amount: { type: Type.NUMBER, description: "Dollar amount for this supplement" },
    adjuster: { type: Type.STRING, nullable: true, description: "Adjuster name if available" }
  },
  required: ['supplementNumber', 'supplementCode', 'amount']
};

const cumulativeEffectsSchema = {
  type: Type.OBJECT,
  properties: {
    estimateAmount: { type: Type.NUMBER, description: "Original estimate amount" },
    supplements: {
      type: Type.ARRAY,
      items: supplementEntrySchema,
      description: "Array of all supplements found (S01, S02, S03, S04, S05)"
    },
    workfileTotal: { type: Type.NUMBER, description: "Total of estimate + all supplements" },
    netCostOfRepairs: { type: Type.NUMBER, description: "Final net cost of repairs" }
  },
  required: ['estimateAmount', 'supplements', 'workfileTotal', 'netCostOfRepairs']
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
    },
    cumulativeEffects: {
      ...cumulativeEffectsSchema,
      nullable: true,
      description: "Cumulative effects table if present in supplement invoice (look for 'CUMULATIVE EFFECTS OF SUPPLEMENT(S)' section)"
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
      description: "The actual Claim # from the document, typically found in the top right of the first page (REQUIRED - must always be extracted)"
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
        
        // Validate cost breakdown if present
        if (item.partCost !== undefined || item.laborCost !== undefined || item.materialCost !== undefined) {
          const partCost = item.partCost || 0;
          const laborCost = item.laborCost || 0;
          const materialCost = item.materialCost || 0;
          const sum = partCost + laborCost + materialCost;
          const variance = Math.abs(item.total - sum);
          
          // Warn if variance is significant (more than $0.10)
          if (variance > 0.10) {
            console.warn(`Line item ${index} (${item.description}): Cost breakdown variance of $${variance.toFixed(2)}. Total: $${item.total}, Sum: $${sum.toFixed(2)}`);
          }
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

  const prompt = `## 🎯 CCC ESTIMATE ANALYSIS SPECIALIST

You are a specialized insurance/auto repair analyst with exceptional Optical Character Recognition (OCR) capabilities. You analyze "CCC Estimate of Record" and "Supplement of Record Summary" documents with precision.

**PRIMARY GOALS (MUST-HAVE ITEMS):**
1. **Extract final total costs** for both Estimate and Supplement documents
2. **Generate detailed comparison** showing ONLY line items with differences
3. **Identify difference types** for each changed item (Added Labor, Changed Part Type, Increased Price, Removed Operation, etc.)
4. **Extract complete metadata** (Claim #, Vehicle Info, Workfile Total)
5. **Separate part costs from labor costs** for accurate analysis

**YOUR ANALYSIS TASKS:**
1. Extract CLAIM NUMBER and VEHICLE INFORMATION from documents
2. Extract all line items WITH THEIR CATEGORIES from both documents
3. **EXTRACT "TOTALS SUMMARY" TABLE** (CRITICAL - see section 7)
4. **EXTRACT "CUMULATIVE EFFECTS" TABLE** (CRITICAL - see section 6b)
5. Compare line items to identify what changed
6. Track additions, removals, and modifications with specific difference types
7. Extract COMPLETE workfile total (estimate + all supplements)
8. Return structured JSON with comprehensive change tracking

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

**PART INFORMATION & PART NUMBER EXTRACTION (🚨 CRITICAL 🚨):**

**ALWAYS EXTRACT PART NUMBERS WHEN VISIBLE - THIS IS MANDATORY**

Part numbers are the PRIMARY identifier for physical parts and MUST be extracted for warranty tracking.

**WHERE TO FIND PART NUMBERS:**
- Dedicated "Part #" or "Part Number" column in the invoice table
- After the description text (e.g., "Bumper Cover 0471530AA00ZZ")
- In a separate row below the description
- In parentheses after the description (e.g., "Bumper Cover (0471530AA00ZZ)")
- Between the operation code and description

**PART NUMBER FORMATS TO RECOGNIZE:**
- Alphanumeric codes: 10-15 characters (e.g., "0471530AA00ZZ", "3CN807421BGRU", "1K0615301AA")
- May contain letters, numbers, and hyphens
- Usually ALL CAPS or mixed case
- Examples from real invoices:
  • "0471530AA00ZZ" (Bumper cover)
  • "3CN807421BGRU" (Rear bumper)
  • "1K0615301AA" (Brake rotor)
  • "5Q0945095" (Tail lamp)

**EXTRACTION RULES:**
1. **SCAN EVERY LINE ITEM** for part numbers
2. **EXTRACT TO partNumber FIELD** - do not leave null if a part number exists
3. **For replacement operations (Repl, R&R)** - part numbers are almost always present
4. **For labor-only operations (R&I, Refn, Blnd)** - part numbers are usually absent
5. **If multiple formats exist** - prefer the dedicated part number column
6. **If part number is clearly visible** - extract it exactly as shown

**VISUAL LAYOUT EXAMPLES:**

Example 1: Dedicated Part Number Column
┌──────────────────────────────────────────────────────────┐
│ Line  Oper  Description           Part #        Qty  Price│
│ 62    S01   Repl Bumper cover     0471530AA00ZZ  1  492.90│
└──────────────────────────────────────────────────────────┘
**Extract:** partNumber: "0471530AA00ZZ"

Example 2: Part Number After Description
┌──────────────────────────────────────────────────────────┐
│ Repl Bumper cover w/o prk sensor 0471530AA00ZZ  $492.90  │
└──────────────────────────────────────────────────────────┘
**Extract:** partNumber: "0471530AA00ZZ"

Example 3: Part Number in Separate Row
┌──────────────────────────────────────────────────────────┐
│ Repl Rear Bumper Cover                                    │
│   Part #: 3CN807421BGRU                    $298.44        │
└──────────────────────────────────────────────────────────┘
**Extract:** partNumber: "3CN807421BGRU"

**OEM vs AFTERMARKET IDENTIFICATION:**
- Part numbers typically indicate OEM (Original Equipment Manufacturer) parts
- Generic descriptions without part numbers may indicate aftermarket parts
- Look for "OEM", "OE", "Genuine", "Original" to identify OEM parts
- Look for "Aftermarket", "AM", "Alternative" to identify aftermarket parts
- If part number is present → likely OEM, set isOEM: true
- If no part number and says "Aftermarket" → set isOEM: false

**CRITICAL REQUIREMENTS:**
- 🚨 **NEVER leave partNumber null if a part number is visible in the invoice**
- 🚨 **Extract part numbers for ALL replacement operations (Repl, R&R)**
- 🚨 **Part numbers are ESSENTIAL for warranty tracking**
- 🚨 **Double-check every line item for part numbers before finalizing extraction**

**OVERLAPS (NEGATIVE TIME ADJUSTMENTS):**
- Major Overlap = Negative time to prevent double-charging when operations overlap
- Minor Overlap = Small negative time adjustment for shared work
- Example: If removing bumper is included in another operation, overlap prevents charging twice
═══════════════════════════════════════════════════════════════════════════════
🔧 CRITICAL: SEPARATING PART COSTS FROM LABOR COSTS 🔧
═══════════════════════════════════════════════════════════════════════════════

**YOUR MOST IMPORTANT TASK: For EVERY line item, you MUST separate the total cost into:**
1. **partCost** - Cost of the physical part/component (if applicable)
2. **laborCost** - Cost of labor to install/repair (if applicable)
3. **materialCost** - Cost of consumable materials like paint, fluids (if applicable)

**VISUAL LAYOUT PATTERNS TO RECOGNIZE:**

Auto repair invoices show costs in these common formats:

**FORMAT 1: Separate Part and Labor Lines (MOST COMMON)**
┌────────────────────────────────────────────────────────────┐
│ Line  Operation  Description           Qty  Price   Total  │
│ 1     Part      Bumper Cover 3CN807421  1   $298.44 $298.44│ ← PART COST
│ 2     Repl      Replace Bumper Cover   2.5h $120/hr $300.00│ ← LABOR COST
└────────────────────────────────────────────────────────────┘
**EXTRACTION:**
- Line 1: partCost: $298.44, laborCost: $0, total: $298.44
- Line 2: partCost: $0, laborCost: $300.00, total: $300.00

**FORMAT 2: Combined Line with Hours Column**
┌────────────────────────────────────────────────────────────────┐
│ Line  Operation  Description        Hours  Rate   Price  Total │
│ 1     Repl      Bumper Cover        2.5h  $120   $298   $598  │
│                 Part: 3CN807421                                │
└────────────────────────────────────────────────────────────────┘
**EXTRACTION:**
- Hours × Rate = Labor Cost: 2.5 × $120 = $300
- Price = Part Cost: $298
- Total = Part + Labor: $598
- Result: partCost: $298, laborCost: $300, total: $598

**FORMAT 3: Itemized with Part Number**
┌────────────────────────────────────────────────────────────┐
│ Repl Rear Bumper Cover                                     │
│   Part #3CN807421              $298.44                     │ ← PART
│   Labor: 2.5 hrs @ $120/hr     $300.00                     │ ← LABOR
│   Total:                       $598.44                     │
└────────────────────────────────────────────────────────────┘
**EXTRACTION:**
- partCost: $298.44, laborCost: $300.00, total: $598.44

**FORMAT 4: Single Line with Embedded Hours**
┌────────────────────────────────────────────────────────────┐
│ Repl Bumper Cover 3CN807421  2.5M  $598.44                │
└────────────────────────────────────────────────────────────┘
**EXTRACTION:**
- "2.5M" means 2.5 hours Mechanical labor
- Assume standard rate: $120/hr
- laborCost: 2.5 × $120 = $300
- partCost: $598.44 - $300 = $298.44
- Result: partCost: $298.44, laborCost: $300, total: $598.44

**EXTRACTION RULES BY OPERATION CODE:**

1. **"Repl" or "R&R" (Replace/Remove & Replace):**
   - ALWAYS has BOTH part cost AND labor cost
   - Look for part number → that line is the PART COST
   - Look for labor hours → calculate laborCost = hours × rate
   - If combined: estimate 60% part, 40% labor as fallback
   - Example: "Repl Bumper" with $600 total, 2.5h @ $120/hr
     → laborCost: $300, partCost: $300

2. **"R&I" (Remove & Install):**
   - LABOR ONLY (no new part, reinstalling same part)
   - partCost: $0 or null
   - laborCost: total amount
   - Example: "R&I Door Panel" $150 → laborCost: $150, partCost: $0

3. **"Refn" or "Blnd" (Refinish/Blend):**
   - LABOR for paint work
   - Check if line also mentions "Paint" or "Supplies" → materialCost
   - partCost: $0 or null
   - laborCost: hours × rate
   - Example: "Refn Bumper 1.5P @ $120/hr" → laborCost: $180, partCost: $0

4. **"Subl" (Sublet):**
   - Work done by outside vendor
   - Usually labor only, sometimes includes parts
   - If unclear, put entire amount in laborCost
   - Example: "Subl Alignment" $89.95 → laborCost: $89.95, partCost: $0

5. **"Part" or "Parts" in description:**
   - PART COST ONLY
   - laborCost: $0 or null
   - Example: "Bumper Cover Part #3CN807421" $298.44 → partCost: $298.44, laborCost: $0

6. **"Labor" in description or just hours:**
   - LABOR COST ONLY
   - partCost: $0 or null
   - Example: "Body Labor 15.4 hrs @ $120/hr" $1,848 → laborCost: $1,848, partCost: $0

7. **Paint/Materials (Refn, Paint Supplies, Fluids):**
   - If "Supplies" or "Materials" → materialCost
   - If "Refinish" or "Blend" → laborCost
   - Example: "Paint Supplies 10.9 hrs @ $42/hr" $457.80 → materialCost: $457.80

**CALCULATION METHODS (in priority order):**

**Method 1: Explicit Breakdown (BEST - use when available)**
If invoice shows separate lines for part and labor:
- Extract each cost directly
- Validate: partCost + laborCost = total

**Method 2: Hours × Rate Calculation (PREFERRED)**
If you see labor hours and rate:
- laborCost = laborHours × laborRate
- partCost = total - laborCost
- Validate: partCost + laborCost = total
- Example: 2.5h @ $120/hr, total $598
  → laborCost: $300, partCost: $298

**Method 3: Standard Labor Rates (if rate not shown)**
If you see hours but no rate, use these standard rates:
- Body Labor: $120/hr
- Paint Labor: $120/hr
- Mechanical Labor: $150/hr
- Diagnostic: $140/hr
- Frame: $130/hr
- laborCost = hours × standard rate
- partCost = total - laborCost

**Method 4: Typical Ratios (FALLBACK)**
If no hours or breakdown visible, use typical ratios:
- Replacement (Repl): 60% part, 40% labor
- Overhaul (O/H): 70% part, 30% labor
- Example: "Repl Bumper" $600, no hours shown
  → partCost: $360, laborCost: $240
  → Set costBreakdownValidated: false

**VALIDATION REQUIREMENTS:**

For EVERY line item, you MUST:
1. ✅ Identify if it contains part, labor, material, or combination
2. ✅ Extract or calculate individual costs
3. ✅ Validate: partCost + laborCost + materialCost = total (within $0.01)
4. ✅ Set costBreakdownValidated = true if validation passes
5. ✅ Set costBreakdownValidated = false if estimated or validation fails

**VALIDATION EXAMPLES:**

✅ **CORRECT - Validated:**
- Description: "Repl Bumper Cover, Part #3CN807421"
- laborHours: 2.5, laborRate: 120
- Calculation: laborCost = 2.5 × 120 = $300
- partCost: $298.44 (from part line or total - labor)
- total: $598.44
- Validation: $298.44 + $300 = $598.44 ✓
- costBreakdownValidated: true

✅ **CORRECT - Estimated:**
- Description: "Repl Bumper Cover"
- total: $600
- No hours or breakdown visible
- Estimation: partCost = $600 × 0.60 = $360
- Estimation: laborCost = $600 × 0.40 = $240
- Validation: $360 + $240 = $600 ✓
- costBreakdownValidated: false (estimated, not from invoice)

❌ **INCORRECT - Don't do this:**
- Description: "Repl Bumper Cover"
- total: $598.44
- partCost: null, laborCost: null ✗
- **You MUST always provide cost breakdown, even if estimated!**

**SPECIAL CASES:**

1. **Negative Amounts (Overlaps):**
   - These are labor adjustments to prevent double-charging
   - Put entire amount in laborCost (will be negative)
   - partCost: $0
   - Example: "Major Overlap" -$50 → laborCost: -$50, partCost: $0

2. **Diagnostic/Inspection:**
   - LABOR ONLY, no parts
   - Example: "Diagnostic Scan" $89.95 → laborCost: $89.95, partCost: $0

3. **Fluids/Consumables:**
   - MATERIAL COST, not part or labor
   - Example: "Brake Fluid" $12.95 → materialCost: $12.95, partCost: $0, laborCost: $0

4. **Sublet with Parts:**
   - If sublet includes parts (rare), try to separate
   - If unclear, put in laborCost and note in description
   - Example: "Subl Glass Replacement" $450 → laborCost: $450, partCost: $0

5. **Paint Operations:**
   - "Refinish" or "Blend" → laborCost
   - "Paint Supplies" or "Paint Materials" → materialCost
   - Example: "Refn Bumper 1.5P @ $120" → laborCost: $180, partCost: $0
   - Example: "Paint Supplies 1.5P @ $42" → materialCost: $63, partCost: $0, laborCost: $0

**CONFIDENCE INDICATORS:**

Set costBreakdownValidated based on extraction method:
- ✅ **true**: Explicit breakdown in invoice, or hours × rate calculation that validates
- ❌ **false**: Estimated using ratios, inferred rates, or cannot validate

**CRITICAL REMINDERS:**
- 🚨 NEVER leave partCost, laborCost, and materialCost ALL null
- 🚨 ALWAYS provide cost breakdown, even if estimated
- 🚨 For labor-only items: partCost = $0, laborCost = total
- 🚨 For part-only items: partCost = total, laborCost = $0
- 🚨 Validate your math: sum of costs should equal total
- 🚨 If you can't determine breakdown, use typical ratios and set costBreakdownValidated: false

═══════════════════════════════════════════════════════════════════════════════


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

CRITICAL METADATA EXTRACTION (🚨 HIGHEST PRIORITY - EXTRACT FIRST 🚨):

**CLAIM NUMBER (🚨 HIGHEST PRIORITY - EXTRACT FIRST 🚨):**
- **LOCATION:** TOP RIGHT corner of EVERY PAGE, displayed as plain text
- **LOOK FOR:** The exact label "Claim #:" followed by the claim number
- **SCANNING INSTRUCTIONS:**
  1. **SCAN THE TOP RIGHT CORNER OF THE FIRST PAGE FIRST** - this is the most reliable location
  2. **If not found on first page, scan the top right of ALL subsequent pages** - it appears on every page
  3. **Look within the top 2 inches of the page** on the right side
  4. **The text "Claim #:" is always present** - never abbreviated as "Claim" or "Claim Number"
- **FORMAT:** Appears as a hyphenated number format: XX-XXXXXXXXXX-XX (e.g., "72-0000527150-02", "65-0000545744-01")
- **VISUAL APPEARANCE:** Plain black text on white background, aligned to the right side of the page
- **TYPICAL POSITION:** Located near other header information like "Workfile ID:" in the top right area
- **EXAMPLE:** "Claim #: 72-0000527150-02"
- **IMPORTANT:** This is plain text, NOT in a highlighted box or special formatting
- **CRITICAL:** This field is REQUIRED and must ALWAYS be extracted - do not skip this field
- **IF YOU CANNOT FIND IT:**
  * Re-scan the top right corner of EVERY page in the document
  * Look for any text containing "Claim" followed by a colon and numbers
  * Check if it's slightly offset or in a different position than expected
  * This field is MANDATORY - you must find it before proceeding with other extraction

**VEHICLE INFORMATION:**
- **LOCATION:** Look for a section labeled "VEHICLE" (all caps, bold header)
- **TYPICAL POSITION:** Below the claim information, often after owner/claimant details
- **VISUAL CUES:** The word "VEHICLE" is usually a bold, standalone header
- **WHAT TO EXTRACT:** The complete vehicle description line that appears immediately after the "VEHICLE" header
- **FORMAT:** Usually a single line with: Year Make Model Trim Engine Type Color
- **EXAMPLE FROM IMAGE:** "2025 VW Atlas SEL Premium R-Line 4MOTION 4D UTV 4-2.0L Turbocharged Gasoline Gasoline Direct Injection Red"
- **PARSING INSTRUCTIONS:**
  • Year: First 4 digits (e.g., "2025")
  • Make: Next word(s) - manufacturer (e.g., "VW" or "Volkswagen")
  • Model: Following word(s) (e.g., "Atlas")
  • Full description: Store the entire line for reference
- **ALSO EXTRACT FROM VEHICLE SECTION:**
  • VIN: Look for "VIN:" label (17-character alphanumeric, e.g., "1V2FR2CA5SC505340")
  • License: Look for "License:" label
  • State: Look for "State:" label
- The vehicle section may span multiple lines with additional details like VIN, license plate, odometer, colors, etc.
- **CRITICAL:** Always extract the main vehicle description line - this is essential for claim identification

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
   
   **COMPARISON TABLE FOCUS:**
   - Generate comparison data for ONLY items with ANY difference
   - For each changed item, identify the specific **Difference Type**:
     * "Added Labor" - New labor operation added
     * "Added Part" - New part added
     * "Changed Part Type" - Part specification changed (OEM to Aftermarket, etc.)
     * "Increased Price" - Price went up
     * "Decreased Price" - Price went down
     * "Increased Quantity" - Quantity increased
     * "Decreased Quantity" - Quantity decreased
     * "Removed Operation" - Operation removed from estimate
     * "Modified Labor Hours" - Labor time changed
     * "Changed Part Number" - Different part number used
   
   **MATCHING RULES:**
   - Match items between original and supplement based on BOTH category AND description
   - Items should be compared within the same category when possible
   - Use fuzzy matching for similar descriptions (e.g., "Front Bumper" vs "Frnt Bumper")
   - Track the following changes:
     
     a) **NEW ITEMS** (isNew: true):
        - Items that appear ONLY in the supplement
        - Not present in the original at all
        - Difference Type: "Added Labor" or "Added Part" based on item type
     
     b) **REMOVED ITEMS** (isRemoved: true):
        - Items that were in the original
        - But are NOT in the supplement
        - Difference Type: "Removed Operation"
     
     c) **CHANGED ITEMS** (isChanged: true):
        - Items in both documents but with different:
          • Quantity → Difference Type: "Increased Quantity" or "Decreased Quantity"
          • Price → Difference Type: "Increased Price" or "Decreased Price"
          • Part Number → Difference Type: "Changed Part Number"
          • Labor Hours → Difference Type: "Modified Labor Hours"
          • Part Category → Difference Type: "Changed Part Type"
        - Store original values for comparison
        - Calculate the differences
        - Specify the exact nature of the change
     
     d) **UNCHANGED ITEMS**:
        - Items identical in both documents
        - Same quantity, price, and total
        - These should NOT be included in the comparison table

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

6b. **CUMULATIVE EFFECTS OF SUPPLEMENT(S) Extraction (🚨 CRITICAL FOR SUPPLEMENT INVOICES 🚨):**
   
   **🔍 LOOK FOR THE "CUMULATIVE EFFECTS OF SUPPLEMENT(S)" TABLE IN SUPPLEMENT INVOICES.**
   
   **WHERE TO FIND IT:**
   - Usually appears AFTER the TOTALS SUMMARY section
   - May be on a separate page
   - Has a distinct header: "CUMULATIVE EFFECTS OF SUPPLEMENT(S)"
   - Contains a table with columns: [Description] | Amount | Adjuster
   
   **WHAT IT CONTAINS:**
   This table shows the breakdown of the original estimate plus each supplement:
   - **Estimate** - The original estimate amount (first row)
   - **Supplement S01** - First supplement amount (if present)
   - **Supplement S02** - Second supplement amount (if present)
   - **Supplement S03** - Third supplement amount (if present)
   - **Supplement S04** - Fourth supplement amount (if present)
   - **Supplement S05** - Fifth supplement amount (if present)
   - **Workfile Total** - Sum of estimate + all supplements
   - **NET COST OF REPAIRS** - Final net cost (usually same as Workfile Total)
   
   **EXTRACTION INSTRUCTIONS:**
   1. **Identify the Estimate row** - Extract the amount (this is the original estimate)
   2. **Count ALL supplement rows** - Look for S01, S02, S03, S04, S05
   3. **For EACH supplement found**, extract:
      - supplementNumber: 1, 2, 3, 4, or 5 (from S01, S02, etc.)
      - supplementCode: "S01", "S02", "S03", "S04", or "S05"
      - amount: The dollar amount for that supplement
      - adjuster: The adjuster name if present in the third column
   4. **Extract Workfile Total** - The cumulative total
   5. **Extract NET COST OF REPAIRS** - The final amount
   
   **🚨 CRITICAL REQUIREMENTS:**
   1. **ALWAYS scan for this table** in supplement invoices
   2. **Count ALL supplements present** - there may be 1, 2, 3, 4, or 5 supplements
   3. **Extract EACH supplement individually** - don't combine them
   4. **Preserve the supplement order** - S01 first, then S02, etc.
   5. **If the table exists, you MUST extract it** - this is non-negotiable
   6. **If no CUMULATIVE EFFECTS table is found**, set cumulativeEffects to null
   
   **EXAMPLE - If you see this table in the supplement invoice:**
   
   CUMULATIVE EFFECTS OF SUPPLEMENT(S)
   
                                    Amount      Adjuster
   Estimate                      $10,000.00
   Supplement S01                 $2,500.00    John Doe
   Supplement S02                 $1,200.00    Jane Smith
   Supplement S03                   $800.00    John Doe
   
   Workfile Total:               $14,500.00
   NET COST OF REPAIRS:          $14,500.00
   
   **You must extract it as this JSON structure in the cumulativeEffects field:**
   - estimateAmount: 10000.00
   - supplements array with 3 entries (S01, S02, S03)
   - workfileTotal: 14500.00
   - netCostOfRepairs: 14500.00

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
   
   Write a clear, detailed summary in this format:
   
   **FINAL TOTALS:**
   - Original Estimate Total: $X,XXX.XX
   - Supplement Total: $X,XXX.XX
   - Workfile Total (Estimate + All Supplements): $X,XXX.XX
   - Net Change: $X,XXX.XX (XX.X% increase/decrease)
   
   **COMPARISON TABLE - ITEMS WITH DIFFERENCES:**
   For each changed item, provide:
   - Part/Operation name
   - Estimate Value (from original)
   - Supplement Value (from supplement)
   - Difference Type (Added Labor, Changed Part Type, Increased Price, etc.)
   
   **SUMMARY BY CATEGORY:**
   - What specific items were added (organized by category)
   - What specific items were removed (organized by category)
   - What items had price or quantity changes (organized by category)
   - The overall impact on the total cost
   
   **IMPORTANT NOTES:**
   - Mention the Workfile Total or NET COST OF REPAIRS as the complete total
   - Clarify that this total includes the original estimate plus all supplements
   - Use clear, simple language
   - Focus on facts and specific differences, not fraud detection
   - Emphasize the nature of each change (type of difference)

═══════════════════════════════════════════════════════════════════════════════
📋 CRITICAL REQUIREMENTS SUMMARY
═══════════════════════════════════════════════════════════════════════════════

**EXTRACTION PRIORITIES (IN ORDER):**
1. ✅ **Claim # and Vehicle Info** - ALWAYS extract first (REQUIRED)
2. ✅ **Final Total Costs** - Extract for both Estimate and Supplement
3. ✅ **TOTALS SUMMARY Table** - Complete cost breakdown by category
4. ✅ **CUMULATIVE EFFECTS Table** - Estimate + all supplements (S01-S05)
5. ✅ **Line Items with Categories** - All items with their category assignments
6. ✅ **Part/Labor Cost Separation** - Break down every line item
7. ✅ **Change Tracking with Difference Types** - Identify what changed and HOW

**COMPARISON TABLE FOCUS:**
- Include ONLY items with differences (exclude unchanged items)
- For each changed item, specify the **differenceType** field:
  * "Added Labor", "Added Part", "Changed Part Type"
  * "Increased Price", "Decreased Price"
  * "Increased Quantity", "Decreased Quantity"
  * "Removed Operation", "Modified Labor Hours", "Changed Part Number"

**DATA QUALITY REQUIREMENTS:**
- Every line item MUST have a category (use "UNCATEGORIZED" if none visible)
- Preserve hierarchical structure of categories and line items
- Be precise in matching line items within their categories
- Track all changes with specific difference types
- Validate cost breakdowns: partCost + laborCost + materialCost = total

**IMPORTANT NOTES:**
- This is NOT a fraud detection analysis - focus on factual comparison
- Set fraudScore to 0 and fraudReasons to empty array (not used)
- The "Workfile Total" or "NET COST OF REPAIRS" represents the COMPLETE claim total (estimate + all supplements)
- Always extract and report this complete workfile total for accurate financial reporting
- Extract TOTALS SUMMARY table if present - provides authoritative cost breakdown
- Extract CUMULATIVE EFFECTS table if present - shows estimate + each supplement breakdown

**OUTPUT FORMAT:**
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
    
    // Debug logging for TOTALS SUMMARY and CUMULATIVE EFFECTS extraction
    console.log('=== OCR EXTRACTION DEBUG ===');
    console.log('Original Invoice totalsSummary:', parsedData.originalInvoice.totalsSummary);
    console.log('Supplement Invoice totalsSummary:', parsedData.supplementInvoice.totalsSummary);
    console.log('Supplement Invoice cumulativeEffects:', parsedData.supplementInvoice.cumulativeEffects);
    if (parsedData.supplementInvoice.cumulativeEffects) {
      console.log('Number of supplements found:', parsedData.supplementInvoice.cumulativeEffects.supplements.length);
      parsedData.supplementInvoice.cumulativeEffects.supplements.forEach((supp, idx) => {
        console.log(`  Supplement ${idx + 1}: ${supp.supplementCode} - $${supp.amount.toFixed(2)}`);
      });
    }
    
    // Debug logging for cost breakdown extraction
    console.log('\n=== COST BREAKDOWN DEBUG ===');
    const sampleItems = parsedData.supplementInvoice.lineItems.slice(0, 5);
    sampleItems.forEach((item: any, idx: number) => {
      console.log(`\nItem ${idx + 1}: ${item.description}`);
      console.log(`  Total: $${item.total.toFixed(2)}`);
      console.log(`  Part Cost: ${item.partCost !== undefined && item.partCost !== null ? '$' + item.partCost.toFixed(2) : 'null'}`);
      console.log(`  Labor Cost: ${item.laborCost !== undefined && item.laborCost !== null ? '$' + item.laborCost.toFixed(2) : 'null'}`);
      console.log(`  Material Cost: ${item.materialCost !== undefined && item.materialCost !== null ? '$' + item.materialCost.toFixed(2) : 'null'}`);
      console.log(`  Validated: ${item.costBreakdownValidated !== undefined ? item.costBreakdownValidated : 'not set'}`);
      
      if (item.partCost !== undefined || item.laborCost !== undefined || item.materialCost !== undefined) {
        const sum = (item.partCost || 0) + (item.laborCost || 0) + (item.materialCost || 0);
        const variance = Math.abs(item.total - sum);
        console.log(`  Sum: $${sum.toFixed(2)}, Variance: $${variance.toFixed(2)}`);
      }
    });
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
