import { documentAIService } from './documentAIService';
import { ClaimData, Invoice } from '../types';
import { GoogleGenAI } from "@google/genai";

/**
 * Hybrid Analysis Service
 * Combines Document AI for structured OCR with Gemini for fraud analysis
 */
export class HybridAnalysisService {
  private geminiClient: GoogleGenAI;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is required for fraud analysis');
    }
    this.geminiClient = new GoogleGenAI({ apiKey });
  }

  /**
   * Analyze claim package using hybrid approach:
   * 1. Document AI extracts structured data (OCR)
   * 2. Gemini analyzes for fraud patterns
   */
  async analyzeClaimPackage(
    originalFiles: File[],
    supplementFiles: File[]
  ): Promise<ClaimData> {
    console.log('Starting hybrid analysis...');
    console.log(`Processing ${originalFiles.length} original files and ${supplementFiles.length} supplement files`);

    try {
      // Step 1: Extract structured data using Document AI
      console.log('Step 1: Extracting structured data with Document AI...');
      const originalInvoices = await this.processFilesWithDocumentAI(originalFiles);
      const supplementInvoices = await this.processFilesWithDocumentAI(supplementFiles);

      // Merge multiple invoices if needed
      const originalInvoice = this.mergeInvoices(originalInvoices, 'original');
      const supplementInvoice = this.mergeInvoices(supplementInvoices, 'supplement');

      console.log('Document AI extraction complete');
      console.log(`Original: ${originalInvoice.lineItems.length} items, Total: $${originalInvoice.total.toFixed(2)}`);
      console.log(`Supplement: ${supplementInvoice.lineItems.length} items, Total: $${supplementInvoice.total.toFixed(2)}`);

      // Step 2: Perform comparison and change tracking
      console.log('Step 2: Comparing invoices and tracking changes...');
      const changesSummary = this.calculateChangesSummary(originalInvoice, supplementInvoice);

      // Step 3: Use Gemini for fraud analysis (optional, can be added later)
      console.log('Step 3: Fraud analysis (placeholder - to be implemented)...');
      const fraudScore = 0; // Placeholder
      const fraudReasons: string[] = []; // Placeholder

      // Step 4: Generate summary
      const invoiceSummary = this.generateInvoiceSummary(
        originalInvoice,
        supplementInvoice,
        changesSummary
      );

      // Generate claim ID
      const claimId = `CLM-${Date.now()}`;

      const claimData: ClaimData = {
        id: claimId,
        claimNumber: 'EXTRACTED-BY-DOCAI', // Will be extracted by Document AI
        originalInvoice,
        supplementInvoice,
        fraudScore,
        fraudReasons,
        invoiceSummary,
        changesSummary,
      };

      console.log('Hybrid analysis complete');
      return claimData;
    } catch (error) {
      console.error('Hybrid analysis failed:', error);
      throw new Error(
        `Hybrid analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Process multiple files with Document AI
   */
  private async processFilesWithDocumentAI(files: File[]): Promise<Invoice[]> {
    const invoices: Invoice[] = [];

    for (const file of files) {
      try {
        const invoice = await documentAIService.processCCCEstimate(file);
        invoices.push(invoice);
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        // Continue with other files
      }
    }

    if (invoices.length === 0) {
      throw new Error('No files were successfully processed');
    }

    return invoices;
  }

  /**
   * Merge multiple invoices into one
   */
  private mergeInvoices(invoices: Invoice[], type: 'original' | 'supplement'): Invoice {
    if (invoices.length === 0) {
      throw new Error(`No ${type} invoices to merge`);
    }

    if (invoices.length === 1) {
      return invoices[0];
    }

    // Merge multiple invoices
    const mergedLineItems = invoices.flatMap((inv) => inv.lineItems);
    const mergedSubtotal = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const mergedTax = invoices.reduce((sum, inv) => sum + inv.tax, 0);
    const mergedTotal = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      fileName: invoices.map((inv) => inv.fileName).join(', '),
      lineItems: mergedLineItems,
      subtotal: mergedSubtotal,
      tax: mergedTax,
      total: mergedTotal,
    };
  }

  /**
   * Calculate changes summary between original and supplement
   */
  private calculateChangesSummary(
    originalInvoice: Invoice,
    supplementInvoice: Invoice
  ) {
    const originalItems = originalInvoice.lineItems;
    const supplementItems = supplementInvoice.lineItems;

    // Simple matching by description (can be enhanced with fuzzy matching)
    const originalDescriptions = new Set(originalItems.map((item) => item.description));
    const supplementDescriptions = new Set(supplementItems.map((item) => item.description));

    const newItems = supplementItems.filter(
      (item) => !originalDescriptions.has(item.description)
    );
    const removedItems = originalItems.filter(
      (item) => !supplementDescriptions.has(item.description)
    );

    // Find changed items (same description but different values)
    const changedItems = supplementItems.filter((suppItem) => {
      const origItem = originalItems.find((o) => o.description === suppItem.description);
      if (!origItem) return false;
      return (
        origItem.quantity !== suppItem.quantity ||
        origItem.price !== suppItem.price ||
        origItem.total !== suppItem.total
      );
    });

    const unchangedItems = supplementItems.filter((suppItem) => {
      const origItem = originalItems.find((o) => o.description === suppItem.description);
      if (!origItem) return false;
      return (
        origItem.quantity === suppItem.quantity &&
        origItem.price === suppItem.price &&
        origItem.total === suppItem.total
      );
    });

    const totalAmountChange = supplementInvoice.total - originalInvoice.total;
    const percentageChange =
      originalInvoice.total > 0
        ? (totalAmountChange / originalInvoice.total) * 100
        : 0;

    return {
      totalNewItems: newItems.length,
      totalRemovedItems: removedItems.length,
      totalChangedItems: changedItems.length,
      totalUnchangedItems: unchangedItems.length,
      totalAmountChange,
      percentageChange,
    };
  }

  /**
   * Generate invoice summary text
   */
  private generateInvoiceSummary(
    originalInvoice: Invoice,
    supplementInvoice: Invoice,
    changesSummary: any
  ): string {
    const lines: string[] = [];

    lines.push('**FINAL TOTALS:**');
    lines.push(`- Original Estimate Total: $${originalInvoice.total.toFixed(2)}`);
    lines.push(`- Supplement Total: $${supplementInvoice.total.toFixed(2)}`);
    lines.push(
      `- Net Change: $${changesSummary.totalAmountChange.toFixed(2)} (${changesSummary.percentageChange.toFixed(1)}% ${changesSummary.totalAmountChange >= 0 ? 'increase' : 'decrease'})`
    );
    lines.push('');

    lines.push('**CHANGES SUMMARY:**');
    lines.push(`- New Items Added: ${changesSummary.totalNewItems}`);
    lines.push(`- Items Removed: ${changesSummary.totalRemovedItems}`);
    lines.push(`- Items Changed: ${changesSummary.totalChangedItems}`);
    lines.push(`- Items Unchanged: ${changesSummary.totalUnchangedItems}`);
    lines.push('');

    lines.push('**ANALYSIS:**');
    lines.push(
      'This analysis was performed using Google Document AI for structured data extraction.'
    );
    lines.push(
      'The comparison shows line-by-line differences between the original estimate and supplement.'
    );

    return lines.join('\n');
  }
}

// Export singleton instance
export const hybridAnalysisService = new HybridAnalysisService();