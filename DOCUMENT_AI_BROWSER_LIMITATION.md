# ⚠️ CRITICAL: Document AI Browser Limitation

## Issue

The `@google-cloud/documentai` package **cannot run directly in the browser** because it depends on Node.js modules (`fs`, `http2`, `child_process`, etc.) that are not available in browser environments.

## Current Build Warnings

```
Module "child_process" has been externalized for browser compatibility
Module "fs" has been externalized for browser compatibility
Module "http2" has been externalized for browser compatibility
Module "net" has been externalized for browser compatibility
... (and many more)
```

These warnings indicate that the Document AI client library is designed for **server-side use only**.

---

## Solution Options

### Option 1: Backend API (Recommended for Production)

Create a backend API to proxy Document AI requests:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Browser   │ ───> │ Vercel Edge  │ ───> │  Document AI    │
│  (React)    │      │  Function    │      │  (Google Cloud) │
└─────────────┘      └──────────────┘      └─────────────────┘
```

**Implementation:**

1. Create `/api/analyze-document.ts` in Vercel:

```typescript
// api/analyze-document.ts
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileContent, fileName } = req.body;
  
  const client = new DocumentProcessorServiceClient({
    apiKey: process.env.GCP_API_KEY,
  });

  const name = `projects/${process.env.GCP_PROJECT_ID}/locations/${process.env.DOCAI_LOCATION}/processors/${process.env.DOCAI_PROCESSOR_ID}`;

  const [result] = await client.processDocument({
    name,
    rawDocument: {
      content: fileContent,
      mimeType: 'application/pdf',
    },
  });

  res.status(200).json(result);
}
```

2. Update frontend to call the API:

```typescript
// services/documentAIService.ts (browser version)
async processCCCEstimate(pdfFile: File): Promise<Invoice> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const base64Content = this.arrayBufferToBase64(arrayBuffer);

  // Call backend API instead of Document AI directly
  const response = await fetch('/api/analyze-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileContent: base64Content,
      fileName: pdfFile.name,
    }),
  });

  const result = await response.json();
  return this.parseDocumentAIResponse(result.document, pdfFile.name);
}
```

**Pros:**
- ✅ Secure (API keys not exposed)
- ✅ Works in production
- ✅ Can add rate limiting, caching
- ✅ Better error handling

**Cons:**
- ❌ Requires backend infrastructure
- ❌ Additional latency
- ❌ More complex deployment

---

### Option 2: Continue with Gemini Vision (Current Approach)

Keep using Gemini Vision API for OCR, which **does work in the browser**:

```typescript
// services/geminiService.ts (already implemented)
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: { parts: [{ text: prompt }, ...imageParts] },
  config: {
    responseMimeType: "application/json",
    responseSchema: claimDataSchema,
  },
});
```

**Pros:**
- ✅ Works directly in browser
- ✅ No backend required
- ✅ Already implemented and working
- ✅ Lower cost (~$0.25 per 1000 pages)
- ✅ Includes fraud analysis

**Cons:**
- ❌ Less specialized for invoices
- ❌ May have lower accuracy for complex tables

---

### Option 3: Hybrid with REST API

Use Document AI's REST API directly from the browser:

```typescript
async processCCCEstimate(pdfFile: File): Promise<Invoice> {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const base64Content = this.arrayBufferToBase64(arrayBuffer);

  const url = `https://documentai.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}:process`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': import.meta.env.VITE_GCP_API_KEY,
    },
    body: JSON.stringify({
      rawDocument: {
        content: base64Content,
        mimeType: 'application/pdf',
      },
    }),
  });

  const result = await response.json();
  return this.parseDocumentAIResponse(result.document, pdfFile.name);
}
```

**Pros:**
- ✅ No backend required
- ✅ Direct API access
- ✅ Specialized for documents

**Cons:**
- ⚠️ API key exposed in browser (security risk)
- ⚠️ CORS issues possible
- ❌ Higher cost than Gemini

---

## Recommendation

### For Current Development: **Option 2 (Gemini Vision)**

**Reason:** The current Gemini implementation is:
- Already working
- Secure (API key can be rotated)
- Cost-effective
- Provides both OCR and fraud analysis
- No backend infrastructure needed

### For Production: **Option 1 (Backend API)**

**Reason:** If you need Document AI's specialized accuracy:
- Create Vercel serverless functions
- Keep API keys secure on server
- Add rate limiting and caching
- Better control over costs

---

## Current Status

The Document AI implementation in this codebase **will not work in production** because:

1. ❌ `@google-cloud/documentai` requires Node.js modules
2. ❌ Browser cannot access these modules
3. ❌ Build warnings indicate compatibility issues

**Files affected:**
- `services/documentAIService.ts` - Cannot run in browser
- `services/hybridAnalysisService.ts` - Uses documentAIService
- `App.tsx` - Calls hybridAnalysisService

---

## Action Required

Choose one of these paths:

### Path A: Revert to Gemini (Simplest)

```bash
# Revert App.tsx to use geminiService
git checkout App.tsx

# Remove Document AI files
rm services/documentAIService.ts
rm services/hybridAnalysisService.ts

# Uninstall package
npm uninstall @google-cloud/documentai
```

### Path B: Implement Backend API (Best for Production)

1. Create `/api` directory for Vercel functions
2. Move Document AI logic to serverless function
3. Update frontend to call API endpoint
4. Deploy to Vercel with server-side env vars

### Path C: Use REST API (Middle Ground)

1. Update `documentAIService.ts` to use fetch() instead of client library
2. Accept security risk of exposed API key
3. Implement API key rotation strategy
4. Add usage monitoring

---

## Conclusion

**For Supplement Guard, I recommend staying with Gemini Vision** because:

1. ✅ It's already implemented and working
2. ✅ No backend infrastructure needed
3. ✅ Lower cost
4. ✅ Provides comprehensive analysis (OCR + fraud detection)
5. ✅ Secure for client-side use

Document AI would be beneficial if:
- You need 99%+ accuracy for complex invoices
- You're processing thousands of documents
- You have backend infrastructure
- You need specialized invoice parsing

But for most use cases, **Gemini Vision provides excellent results** at a fraction of the cost and complexity.