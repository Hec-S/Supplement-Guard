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
    description: { type: Type.STRING },
    quantity: { type: Type.NUMBER },
    price: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    isNew: { type: Type.BOOLEAN, nullable: true, description: "True if this item only exists in the supplement invoice." },
    isChanged: { type: Type.BOOLEAN, nullable: true, description: "True if quantity or price changed from the original." },
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
    isOEM: { type: Type.BOOLEAN, nullable: true, description: "True if identified as OEM part, false if aftermarket" },
    laborHours: { type: Type.NUMBER, nullable: true, description: "Labor hours if this is a labor line item" },
    laborRate: { type: Type.NUMBER, nullable: true, description: "Hourly labor rate if this is a labor line item" }
  },
  required: ['id', 'description', 'quantity', 'price', 'total']
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
    fraudScore: { type: Type.INTEGER, description: "A fraud risk score from 0 (low risk) to 100 (high risk)." },
    fraudReasons: {
        type: Type.ARRAY,
        description: "A list of 2-3 simple reasons why this claim might be fake or wrong. Use easy words that anyone can understand.",
        items: { type: Type.STRING }
    },
    invoiceSummary: { type: Type.STRING, description: "A simple summary of what changed between the two bills. Use easy words and short sentences." }
  },
  required: ['id', 'originalInvoice', 'supplementInvoice', 'fraudScore', 'fraudReasons', 'invoiceSummary']
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

    // Sample check of the first line item for structure
    if (invoice.lineItems.length > 0) {
      const firstItem = invoice.lineItems[0];
      checkProperty(firstItem, 'id', 'string');
      checkProperty(firstItem, 'description', 'string');
      checkProperty(firstItem, 'quantity', 'number');
      checkProperty(firstItem, 'price', 'number');
      checkProperty(firstItem, 'total', 'number');
    }
  };
  
  checkProperty(data, 'id', 'string');
  checkProperty(data, 'fraudScore', 'number');
  checkProperty(data, 'fraudReasons', 'object', true);
  checkProperty(data, 'invoiceSummary', 'string');
  validateInvoice(data.originalInvoice, 'originalInvoice');
  validateInvoice(data.supplementInvoice, 'supplementInvoice');

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

  const prompt = `You are a meticulous automotive insurance fraud analyst with exceptional Optical Character Recognition (OCR) capabilities and deep knowledge of automotive parts and repair procedures. Your primary goal is accuracy. Your task is to analyze a claim package and return your findings in a single JSON object.

Follow these instructions precisely:

1.  **Invoice OCR and Data Extraction:**
    *   For each invoice document (original and supplement), perform a detailed OCR to extract its contents.
    *   **Line Items:** Meticulously extract every line item. Capture the description, quantity, unit price, and total for each item.
    *   **Totals Extraction:** Search the document for the explicit 'Subtotal', 'Tax', and 'Total' amounts. You MUST extract these exact values as they appear on the invoice. Do not calculate them yourself. The values printed on the document are the source of truth.
    *   **Verification (Internal Check):** After extracting line items, sum their totals. This sum MUST match the 'Subtotal' you extracted from the document. If it does not, re-examine the line items for OCR errors until they match.

2.  **Enhanced Automotive Part Analysis:**
    For each line item, perform detailed automotive part identification:
    
    **Part Number Identification:**
    *   Look for OEM part numbers (e.g., Toyota: 90311-38003, Honda: 06164-P2A-000, Ford: F1TZ-6731-A)
    *   Look for aftermarket part numbers (e.g., Dorman: 924-5208, Beck Arnley: 158-0632)
    *   Extract any visible part numbers from the description
    
    **Vehicle System Classification:**
    Categorize each part into one of these systems:
    *   ENGINE: Engine blocks, pistons, valves, timing components, gaskets, filters
    *   TRANSMISSION: Transmission cases, gears, clutches, torque converters, fluid
    *   BRAKES: Brake pads, rotors, calipers, brake lines, master cylinders, ABS components
    *   SUSPENSION: Shocks, struts, springs, control arms, ball joints, sway bars
    *   ELECTRICAL: Alternators, starters, batteries, wiring harnesses, sensors, ECUs
    *   BODY: Panels, bumpers, fenders, doors, hoods, mirrors, trim pieces
    *   INTERIOR: Seats, dashboard components, carpets, door panels, airbags
    *   EXHAUST: Catalytic converters, mufflers, exhaust pipes, manifolds
    *   COOLING: Radiators, water pumps, thermostats, cooling fans, hoses
    *   FUEL: Fuel pumps, injectors, fuel lines, tanks, filters
    *   STEERING: Steering wheels, columns, racks, power steering pumps
    *   HVAC: Air conditioning compressors, heaters, blower motors, evaporators
    *   SAFETY: Airbags, seatbelts, safety sensors, crash components
    *   WHEELS_TIRES: Wheels, tires, tire pressure sensors, wheel bearings
    *   OTHER: Items that don't fit the above categories
    
    **Part Category Classification:**
    *   OEM: Original Equipment Manufacturer parts (Toyota, Honda, Ford, GM, etc.)
    *   AFTERMARKET: Third-party manufactured parts (Dorman, Beck Arnley, Febi, etc.)
    *   LABOR: Labor charges, diagnostic time, shop supplies
    *   PAINT_MATERIALS: Paint, primer, clear coat, masking materials, sandpaper
    *   CONSUMABLES: Fluids, oils, filters, gaskets, small hardware
    *   RENTAL: Car rental, equipment rental
    *   STORAGE: Storage fees, towing fees
    *   OTHER: Items that don't fit the above categories
    
    **Labor Analysis:**
    *   For labor items, extract hourly rate and hours worked
    *   Look for patterns like "Labor: 2.5 hrs @ $125/hr = $312.50"
    *   Identify if labor rates are within industry standards ($80-$150/hr typical)
    
    **OEM vs Aftermarket Detection:**
    *   OEM indicators: Manufacturer logos, "Genuine" parts, dealer part numbers
    *   Aftermarket indicators: Third-party brand names, generic descriptions, lower prices

3.  **Compare Invoices:**
    *   Compare the line items from the supplement invoice to the original.
    *   Mark items that only appear in the supplement as 'isNew: true'.
    *   Mark items that exist in both but have a different quantity or price as 'isChanged: true'.

4.  **Automotive Fraud Risk Assessment:**
    Analyze for automotive-specific fraud patterns:
    *   **Part Inflation:** Are OEM parts being charged when aftermarket parts are used?
    *   **Labor Padding:** Are labor hours excessive for the type of repair?
    *   **Unnecessary Repairs:** Are parts being replaced that shouldn't need replacement?
    *   **Duplicate Parts:** Are the same parts listed multiple times?
    *   **Incompatible Parts:** Are parts listed that don't belong to the vehicle model?
    *   **Price Gouging:** Are parts priced significantly above market rates?
    *   **Phantom Repairs:** Are repairs listed that weren't actually performed?

5.  **Generate Fraud Score & Explain Why:**
    *   Give a fraud score from 0 (safe) to 100 (very risky).
    *   Write 2-3 simple reasons why this claim looks suspicious. Use easy words. Explain like you're talking to someone who doesn't know about cars.

6.  **Explain What Changed:**
    *   Write a simple summary of what changed between the two bills.
    *   Use easy words. Explain what parts were added, what costs went up, and why.
    *   Don't use technical car terms. Say "car part" instead of "OEM component."

IMPORTANT: Write all explanations using simple, easy English. Pretend you're explaining to someone who doesn't speak English as their first language. Use short sentences. Avoid big words.

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
