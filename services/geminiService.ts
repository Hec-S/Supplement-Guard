import { GoogleGenAI, Type } from "@google/genai";
import { ClaimData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set. This application requires a valid API key to function.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const invoiceLineItemSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "A unique ID for the line item, e.g., 'sli-1'." },
    description: { type: Type.STRING },
    quantity: { type: Type.NUMBER },
    price: { type: Type.NUMBER },
    total: { type: Type.NUMBER },
    isNew: { type: Type.BOOLEAN, nullable: true, description: "True if this item only exists in the supplement invoice." },
    isChanged: { type: Type.BOOLEAN, nullable: true, description: "True if quantity or price changed from the original." }
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
        description: "A list of 2-3 strings explaining the key factors that contributed to the fraud score.",
        items: { type: Type.STRING }
    },
    invoiceSummary: { type: Type.STRING, description: "A markdown-formatted summary of changes between the original and supplement invoices (new items, changed items, cost impact)." }
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

  const prompt = `You are a meticulous insurance fraud analyst with exceptional Optical Character Recognition (OCR) capabilities. Your primary goal is accuracy. Your task is to analyze a claim package and return your findings in a single JSON object.

Follow these instructions precisely:

1.  **Invoice OCR and Data Extraction:**
    *   For each invoice document (original and supplement), perform a detailed OCR to extract its contents.
    *   **Line Items:** Meticulously extract every line item. Capture the description, quantity, unit price, and total for each item.
    *   **Totals Extraction:** Search the document for the explicit 'Subtotal', 'Tax', and 'Total' amounts. You MUST extract these exact values as they appear on the invoice. Do not calculate them yourself. The values printed on the document are the source of truth.
    *   **Verification (Internal Check):** After extracting line items, sum their totals. This sum MUST match the 'Subtotal' you extracted from the document. If it does not, re-examine the line items for OCR errors until they match.

2.  **Compare Invoices:**
    *   Compare the line items from the supplement invoice to the original.
    *   Mark items that only appear in the supplement as 'isNew: true'.
    *   Mark items that exist in both but have a different quantity or price as 'isChanged: true'.

3.  **Assess Fraud Risk:**
    *   Analyze the invoice changes. Are the new items or cost increases justified? Are there any red flags like unusually large increases in labor hours or part costs compared to industry standards?

4.  **Generate Fraud Score & Justify Score:**
    *   Based on your assessment, provide a fraud score from 0 (low risk) to 100 (high risk).
    *   Provide a list of 2-3 concise, human-readable reasons that justify the fraud score based on the invoice data.

5.  **Summarize Invoice Changes:**
    *   Create a concise, markdown-formatted summary of the key differences between the invoices.

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
