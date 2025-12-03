import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { ClaimData, Invoice, InvoiceLineItem } from '../types';

/**
 * Document AI Service for CCC Estimate Processing
 * Uses Google Document AI to extract structured data from auto repair estimates
 */
export class DocumentAIService {
  private client: DocumentProcessorServiceClient;
  private readonly projectId: string;
  private readonly location: string;
  private readonly processorId: string;

  constructor() {
    // Get configuration from environment variables
    this.projectId = import.meta.env.VITE_GCP_PROJECT_ID;
    this.location = import.meta.env.VITE_DOCAI_LOCATION || 'us';
    this.processorId = import.meta.env.VITE_DOCAI_PROCESSOR_ID;

    if (!this.projectId || !this.processorId) {
      throw new Error(
        'Document AI configuration missing. Please set VITE_GCP_PROJECT_ID and VITE_DOCAI_PROCESSOR_ID'
      );
    }

    // Initialize Document AI client with API key
    const apiKey = import.meta.env.VITE_GCP_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GCP_API_KEY is required for Document AI');
    }

    this.client = new DocumentProcessorServiceClient({
      apiKey: apiKey,
    });
  }

  /**
   * Process a CCC Estimate PDF using Document AI
   * @param pdfFile - The PDF file to process
   * @returns Structured invoice data
   */
  async processCCCEstimate(pdfFile: File): Promise<Invoice> {
    try {
      console.log(`Processing ${pdfFile.name} with Document AI...`);

      // Convert File to ArrayBuffer then to base64
      const arrayBuffer = await pdfFile.arrayBuffer();
      const base64Content = this.arrayBufferToBase64(arrayBuffer);

      // Construct the processor name
      const name = `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`;

      // Create the request
      const request = {
        name,
        rawDocument: {
          content: base64Content,
          mimeType: 'application/pdf',
        },
      };

      // Process the document
      const [result] = await this.client.processDocument(request);
      const { document } = result;

      if (!document) {
        throw new Error('No document returned from Document AI');
      }

      console.log(`Document AI processing complete for ${pdfFile.name}`);

      // Parse the Document AI response into our Invoice format
      return this.parseDocumentAIResponse(document, pdfFile.name);
    } catch (error) {
      console.error(`Document AI processing failed for ${pdfFile.name}:`, error);
      throw new Error(
        `Failed to process ${pdfFile.name} with Document AI: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Parse Document AI response into Invoice format
   */
  private parseDocumentAIResponse(document: any, fileName: string): Invoice {
    const entities = document.entities || [];
    const pages = document.pages || [];
    const fullText = document.text || '';

    console.log(`Parsing Document AI response for ${fileName}`);
    console.log(`Found ${entities.length} entities and ${pages.length} pages`);

    // Extract line items from tables
    const lineItems = this.extractLineItems(pages, fullText);

    // Calculate totals
    const subtotal = this.calculateSubtotal(lineItems);
    const tax = this.extractTax(entities, fullText);
    const total = subtotal + tax;

    console.log(`Extracted ${lineItems.length} line items from ${fileName}`);
    console.log(`Subtotal: $${subtotal.toFixed(2)}, Tax: $${tax.toFixed(2)}, Total: $${total.toFixed(2)}`);

    return {
      fileName,
      lineItems,
      subtotal,
      tax,
      total,
    };
  }

  /**
   * Extract line items from Document AI tables
   */
  private extractLineItems(pages: any[], fullText: string): InvoiceLineItem[] {
    const lineItems: InvoiceLineItem[] = [];
    let itemIdCounter = 1;

    for (const page of pages) {
      const tables = page.tables || [];

      for (const table of tables) {
        // Extract headers to understand column structure
        const headers = this.extractTableHeaders(table, fullText);
        console.log('Table headers:', headers);

        // Process body rows
        const bodyRows = table.bodyRows || [];
        for (const row of bodyRows) {
          const lineItem = this.parseTableRow(
            row,
            headers,
            fullText,
            `dli-${itemIdCounter}`
          );

          if (lineItem) {
            lineItems.push(lineItem);
            itemIdCounter++;
          }
        }
      }
    }

    return lineItems;
  }

  /**
   * Extract table headers and map to column indices
   */
  private extractTableHeaders(table: any, fullText: string): Map<string, number> {
    const headerMap = new Map<string, number>();
    const headerRows = table.headerRows || [];

    if (headerRows.length === 0) {
      // No header row, use default column mapping
      return this.getDefaultColumnMapping();
    }

    const cells = headerRows[0].cells || [];
    cells.forEach((cell: any, index: number) => {
      const text = this.getCellText(cell, fullText).toLowerCase().trim();

      // Map common CCC column names
      if (text.includes('description') || text.includes('part') || text.includes('operation')) {
        headerMap.set('description', index);
      } else if (text.includes('qty') || text.includes('quantity')) {
        headerMap.set('quantity', index);
      } else if (text.includes('price') || text.includes('unit') || text.includes('rate')) {
        headerMap.set('price', index);
      } else if (text.includes('total') || text.includes('amount') || text.includes('ext')) {
        headerMap.set('total', index);
      } else if (text.includes('part') && text.includes('number')) {
        headerMap.set('partNumber', index);
      } else if (text.includes('hours') || text.includes('hrs')) {
        headerMap.set('hours', index);
      } else if (text.includes('line') || text.includes('#')) {
        headerMap.set('lineNumber', index);
      } else if (text.includes('oper') || text.includes('code')) {
        headerMap.set('operation', index);
      }
    });

    return headerMap;
  }

  /**
   * Get default column mapping when no headers are present
   */
  private getDefaultColumnMapping(): Map<string, number> {
    const map = new Map<string, number>();
    // Typical CCC format: Line# | Operation | Description | Qty | Price | Total
    map.set('lineNumber', 0);
    map.set('operation', 1);
    map.set('description', 2);
    map.set('quantity', 3);
    map.set('price', 4);
    map.set('total', 5);
    return map;
  }

  /**
   * Parse a table row into InvoiceLineItem
   */
  private parseTableRow(
    row: any,
    headers: Map<string, number>,
    fullText: string,
    id: string
  ): InvoiceLineItem | null {
    const cells = row.cells || [];

    if (cells.length === 0) {
      return null;
    }

    // Get column indices
    const descIndex = headers.get('description') ?? 2;
    const qtyIndex = headers.get('quantity') ?? 3;
    const priceIndex = headers.get('price') ?? 4;
    const totalIndex = headers.get('total') ?? 5;
    const lineNumIndex = headers.get('lineNumber');
    const operationIndex = headers.get('operation');
    const partNumIndex = headers.get('partNumber');
    const hoursIndex = headers.get('hours');

    // Extract description
    const description = this.getCellText(cells[descIndex], fullText).trim();

    // Skip empty rows or header-like rows
    if (
      !description ||
      description.toLowerCase().includes('description') ||
      description.toLowerCase().includes('total') ||
      description.length < 3
    ) {
      return null;
    }

    // Extract numeric values
    const quantity = this.parseNumber(this.getCellText(cells[qtyIndex], fullText)) || 1;
    const price = this.parsePrice(this.getCellText(cells[priceIndex], fullText));
    const total = this.parsePrice(this.getCellText(cells[totalIndex], fullText));

    // Extract optional fields
    const lineNumber = lineNumIndex !== undefined
      ? this.parseNumber(this.getCellText(cells[lineNumIndex], fullText))
      : undefined;

    const operation = operationIndex !== undefined
      ? this.getCellText(cells[operationIndex], fullText).trim()
      : undefined;

    const partNumber = partNumIndex !== undefined
      ? this.getCellText(cells[partNumIndex], fullText).trim()
      : this.extractPartNumberFromDescription(description);

    const laborHours = hoursIndex !== undefined
      ? this.parseNumber(this.getCellText(cells[hoursIndex], fullText))
      : this.extractLaborHours(description);

    // Determine category
    const category = this.categorizeLineItem(description, operation);

    // Calculate or estimate cost breakdown
    const costBreakdown = this.estimateCostBreakdown(
      description,
      operation,
      total,
      laborHours,
      price
    );

    return {
      id,
      category,
      lineNumber,
      operation,
      description,
      quantity,
      price,
      total: total || price * quantity,
      laborHours,
      partNumber: partNumber || undefined,
      partCost: costBreakdown.partCost,
      laborCost: costBreakdown.laborCost,
      materialCost: costBreakdown.materialCost,
      costBreakdownValidated: costBreakdown.validated,
    };
  }

  /**
   * Get text content from Document AI cell
   */
  private getCellText(cell: any, fullText: string): string {
    if (!cell?.layout?.textAnchor?.textSegments) {
      return '';
    }

    const segments = cell.layout.textAnchor.textSegments;
    return segments
      .map((segment: any) => {
        const start = parseInt(segment.startIndex || '0');
        const end = parseInt(segment.endIndex || '0');
        return fullText.substring(start, end);
      })
      .join(' ')
      .trim();
  }

  /**
   * Parse price string to number
   */
  private parsePrice(priceStr: string): number {
    if (!priceStr) return 0;
    const cleaned = priceStr.replace(/[$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parse number from string
   */
  private parseNumber(str: string): number | undefined {
    if (!str) return undefined;
    const cleaned = str.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Extract part number from description
   */
  private extractPartNumberFromDescription(description: string): string | null {
    // Look for alphanumeric part numbers (10-15 characters)
    const partNumberPattern = /\b[A-Z0-9]{10,15}\b/;
    const match = description.match(partNumberPattern);
    return match ? match[0] : null;
  }

  /**
   * Extract labor hours from description
   */
  private extractLaborHours(description: string): number | undefined {
    // Look for patterns like "2.5M", "1.5 hrs", "3.0 hours"
    const hoursPattern = /(\d+\.?\d*)\s*(M|S|F|E|G|D|P|hrs?|hours?)/i;
    const match = description.match(hoursPattern);
    return match ? parseFloat(match[1]) : undefined;
  }

  /**
   * Categorize line item based on description and operation
   */
  private categorizeLineItem(description: string, operation?: string): string {
    const lower = description.toLowerCase();

    // Check operation code first
    if (operation) {
      const opLower = operation.toLowerCase();
      if (opLower.includes('refn') || opLower.includes('blnd')) {
        return 'PAINT';
      } else if (opLower.includes('subl')) {
        return 'SUBLET';
      }
    }

    // Check description keywords
    if (lower.includes('labor') && !lower.includes('part')) {
      return 'LABOR';
    } else if (lower.includes('paint') || lower.includes('refinish') || lower.includes('blend')) {
      return 'PAINT';
    } else if (lower.includes('material') || lower.includes('supplies') || lower.includes('fluid')) {
      return 'MATERIALS';
    } else if (lower.includes('part') || lower.match(/\d{5,}/)) {
      return 'PARTS';
    } else if (lower.includes('diagnostic') || lower.includes('inspection')) {
      return 'DIAGNOSTIC';
    } else if (lower.includes('sublet') || lower.includes('alignment') || lower.includes('glass')) {
      return 'SUBLET';
    }

    return 'OTHER';
  }

  /**
   * Estimate cost breakdown for a line item
   */
  private estimateCostBreakdown(
    description: string,
    operation: string | undefined,
    total: number,
    laborHours: number | undefined,
    price: number
  ): {
    partCost: number | undefined;
    laborCost: number | undefined;
    materialCost: number | undefined;
    validated: boolean;
  } {
    const lower = description.toLowerCase();
    const opLower = operation?.toLowerCase() || '';

    // Labor-only operations
    if (
      opLower.includes('r&i') ||
      lower.includes('labor') ||
      lower.includes('diagnostic') ||
      lower.includes('inspection')
    ) {
      return {
        partCost: 0,
        laborCost: total,
        materialCost: 0,
        validated: false,
      };
    }

    // Material-only items
    if (
      lower.includes('supplies') ||
      lower.includes('materials') ||
      lower.includes('fluid')
    ) {
      return {
        partCost: 0,
        laborCost: 0,
        materialCost: total,
        validated: false,
      };
    }

    // Paint operations
    if (opLower.includes('refn') || opLower.includes('blnd') || lower.includes('refinish')) {
      if (lower.includes('supplies') || lower.includes('materials')) {
        return {
          partCost: 0,
          laborCost: 0,
          materialCost: total,
          validated: false,
        };
      }
      return {
        partCost: 0,
        laborCost: total,
        materialCost: 0,
        validated: false,
      };
    }

    // Replacement operations with labor hours
    if ((opLower.includes('repl') || opLower.includes('r&r')) && laborHours) {
      const laborRate = 120; // Standard rate
      const laborCost = laborHours * laborRate;
      const partCost = total - laborCost;

      if (partCost >= 0) {
        return {
          partCost,
          laborCost,
          materialCost: 0,
          validated: true,
        };
      }
    }

    // Replacement operations without hours - use ratio
    if (opLower.includes('repl') || opLower.includes('r&r')) {
      return {
        partCost: total * 0.6,
        laborCost: total * 0.4,
        materialCost: 0,
        validated: false,
      };
    }

    // Default: assume it's a part
    return {
      partCost: total,
      laborCost: 0,
      materialCost: 0,
      validated: false,
    };
  }

  /**
   * Calculate subtotal from line items
   */
  private calculateSubtotal(lineItems: InvoiceLineItem[]): number {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  }

  /**
   * Extract tax amount from entities or text
   */
  private extractTax(entities: any[], fullText: string): number {
    // Try to find tax entity
    const taxEntity = entities.find(
      (e) => e.type === 'sales_tax' || e.type === 'tax' || e.type === 'tax_amount'
    );

    if (taxEntity?.mentionText) {
      return this.parsePrice(taxEntity.mentionText);
    }

    // Try to find tax in text
    const taxPattern = /(?:sales\s+tax|tax)[:\s]+\$?\s*([\d,]+\.?\d*)/i;
    const match = fullText.match(taxPattern);

    if (match) {
      return this.parsePrice(match[1]);
    }

    return 0;
  }
}

// Export singleton instance
export const documentAIService = new DocumentAIService();