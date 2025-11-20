import jsPDF from 'jspdf';
import { ClaimData } from '../types';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

interface PdfConfig {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  safeZone: number;
  lineHeight: number;
  maxContentWidth: number;
  maxContentHeight: number;
}

class ImprovedPdfGenerator {
  private doc: jsPDF;
  private config: PdfConfig;
  private currentY: number = 0;
  private currentPage: number = 1;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.config = {
      pageWidth: this.doc.internal.pageSize.getWidth(),
      pageHeight: this.doc.internal.pageSize.getHeight(),
      margin: 20,
      safeZone: 25, // Extra safe margin for printing
      lineHeight: 5,
      maxContentWidth: 0,
      maxContentHeight: 0
    };
    
    // Calculate safe content area
    this.config.maxContentWidth = this.config.pageWidth - (2 * this.config.safeZone);
    this.config.maxContentHeight = this.config.pageHeight - (2 * this.config.safeZone);
    this.currentY = this.config.safeZone;
  }

  /**
   * Checks if there's enough space for content, adds new page if needed
   */
  private checkPageSpace(requiredHeight: number): void {
    const availableSpace = this.config.pageHeight - this.config.safeZone - this.currentY;
    
    if (availableSpace < requiredHeight) {
      this.addNewPage();
    }
  }

  /**
   * Adds a new page and resets position
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.currentPage++;
    this.currentY = this.config.safeZone;
  }

  /**
   * Safely adds text with proper wrapping and page breaks
   */
  private addText(text: string, x: number, y: number, maxWidth: number, options: {
    fontSize?: number;
    fontStyle?: string;
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
  } = {}): number {
    const { fontSize = 12, fontStyle = 'normal', color = [0, 0, 0], align = 'left' } = options;
    
    // Set font properties
    this.doc.setFontSize(fontSize);
    this.doc.setFont(undefined, fontStyle);
    this.doc.setTextColor(color[0], color[1], color[2]);
    
    // Split text to fit within maxWidth
    const splitText = this.doc.splitTextToSize(text, maxWidth);
    const textHeight = splitText.length * this.config.lineHeight;
    
    // Check if we need a new page
    this.checkPageSpace(textHeight + 5);
    
    // Add text
    const textOptions: any = {};
    if (align !== 'left') {
      textOptions.align = align;
    }
    
    this.doc.text(splitText, x, this.currentY, textOptions);
    this.currentY += textHeight;
    
    return textHeight;
  }

  /**
   * Adds a section header with proper spacing
   */
  private addSectionHeader(title: string): void {
    this.checkPageSpace(20);
    
    // Add some space before header
    this.currentY += 10;
    
    this.addText(title, this.config.safeZone, this.currentY, this.config.maxContentWidth, {
      fontSize: 16,
      fontStyle: 'bold',
      color: [51, 51, 51]
    });
    
    // Add line under header
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(
      this.config.safeZone, 
      this.currentY + 2, 
      this.config.pageWidth - this.config.safeZone, 
      this.currentY + 2
    );
    
    this.currentY += 8;
  }

  /**
   * Creates a properly formatted table with overflow handling
   */
  private createTable(headers: string[], data: any[][], columnWidths: number[]): void {
    const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    const startX = this.config.safeZone;
    
    // Ensure table fits within page width
    if (tableWidth > this.config.maxContentWidth) {
      // Adjust column widths proportionally
      const scaleFactor = this.config.maxContentWidth / tableWidth;
      columnWidths = columnWidths.map(width => width * scaleFactor);
    }
    
    // Calculate required height for headers
    const headerHeight = 10;
    this.checkPageSpace(headerHeight);
    
    // Draw table headers
    this.drawTableHeaders(headers, columnWidths, startX);
    
    // Draw data rows
    data.forEach((row, index) => {
      this.drawTableRow(row, columnWidths, startX, index % 2 === 1);
    });
  }

  /**
   * Creates a warranty table with red highlighting for warranty status
   */
  private createWarrantyTable(headers: string[], data: string[][]): void {
    const colWidths = [60, 25, 25, 25, 25, 30]; // Adjusted column widths for 6 columns
    const startX = this.config.safeZone;
    
    // Headers
    const headerHeight = 8;
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(startX, this.currentY, colWidths.reduce((sum, w) => sum + w, 0), headerHeight, 'F');
    
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(51, 51, 51);
    
    let currentX = startX;
    headers.forEach((header, index) => {
      const cellWidth = colWidths[index];
      const wrappedText = this.doc.splitTextToSize(header, cellWidth - 4);
      this.doc.text(wrappedText, currentX + 2, this.currentY + 6);
      currentX += cellWidth;
    });
    
    this.currentY += headerHeight + 2;
    
    // Data rows
    data.forEach((row, rowIndex) => {
      // Calculate row height based on content
      let maxRowHeight = 6;
      const wrappedCells: string[][] = [];
      
      row.forEach((cellData, index) => {
        const cellWidth = colWidths[index];
        const cellText = String(cellData || '');
        const wrapped = this.doc.splitTextToSize(cellText, cellWidth - 4);
        wrappedCells.push(wrapped);
        maxRowHeight = Math.max(maxRowHeight, wrapped.length * 4 + 2);
      });
      
      // Check if row fits on current page
      this.checkPageSpace(maxRowHeight);
      
      // Draw alternating row background
      if (rowIndex % 2 === 1) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(startX, this.currentY, colWidths.reduce((sum, w) => sum + w, 0), maxRowHeight, 'F');
      }
      
      // Draw cell content with special formatting
      this.doc.setFontSize(9);
      
      currentX = startX;
      wrappedCells.forEach((cellLines, index) => {
        // Set colors based on column
        if (index === 5) {
          // "NEEDS WARRANTY" column - RED
          this.doc.setTextColor(255, 0, 0); // Red color
          this.doc.setFont(undefined, 'bold');
        } else if (index === 1) {
          // Work type column - color coded
          const workType = row[1];
          if (workType === 'REPLACEMENT') {
            this.doc.setTextColor(220, 38, 127); // Pink for replacement
          } else if (workType === 'REPAIR') {
            this.doc.setTextColor(234, 88, 12); // Orange for repair
          } else {
            this.doc.setTextColor(51, 51, 51); // Default color
          }
          this.doc.setFont(undefined, 'bold');
        } else if (index === 4) {
          // Price change column - color based on increase/decrease
          const changeValue = row[4];
          if (changeValue && changeValue !== '-') {
            if (changeValue.includes('-')) {
              this.doc.setTextColor(0, 128, 0); // Green for decrease
            } else {
              this.doc.setTextColor(255, 0, 0); // Red for increase
            }
            this.doc.setFont(undefined, 'bold');
          } else {
            this.doc.setTextColor(51, 51, 51); // Default color
            this.doc.setFont(undefined, 'normal');
          }
        } else {
          this.doc.setTextColor(51, 51, 51); // Default color
          this.doc.setFont(undefined, 'normal');
        }
        
        this.doc.text(cellLines, currentX + 2, this.currentY + 4);
        currentX += colWidths[index];
      });
      
      this.currentY += maxRowHeight;
    });
  }

  /**
   * Draws table headers with background
   */
  private drawTableHeaders(headers: string[], columnWidths: number[], startX: number): void {
    const headerHeight = 8;
    
    // Background for headers
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(startX, this.currentY, columnWidths.reduce((sum, w) => sum + w, 0), headerHeight, 'F');
    
    // Header text
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(51, 51, 51);
    
    let currentX = startX;
    headers.forEach((header, index) => {
      const cellWidth = columnWidths[index];
      const wrappedText = this.doc.splitTextToSize(header, cellWidth - 4);
      this.doc.text(wrappedText, currentX + 2, this.currentY + 6);
      currentX += cellWidth;
    });
    
    this.currentY += headerHeight + 2;
  }

  /**
   * Draws a table row with proper text wrapping
   */
  private drawTableRow(rowData: any[], columnWidths: number[], startX: number, isAlternate: boolean = false): void {
    // Calculate row height based on content
    let maxRowHeight = 6;
    const wrappedCells: string[][] = [];
    
    rowData.forEach((cellData, index) => {
      const cellWidth = columnWidths[index];
      const cellText = String(cellData || '');
      const wrapped = this.doc.splitTextToSize(cellText, cellWidth - 4);
      wrappedCells.push(wrapped);
      maxRowHeight = Math.max(maxRowHeight, wrapped.length * 4 + 2);
    });
    
    // Check if row fits on current page
    this.checkPageSpace(maxRowHeight);
    
    // Draw alternating row background
    if (isAlternate) {
      this.doc.setFillColor(248, 250, 252);
      this.doc.rect(startX, this.currentY, columnWidths.reduce((sum, w) => sum + w, 0), maxRowHeight, 'F');
    }
    
    // Draw cell content
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'normal');
    this.doc.setTextColor(51, 51, 51);
    
    let currentX = startX;
    wrappedCells.forEach((cellLines, index) => {
      const cellWidth = columnWidths[index];
      this.doc.text(cellLines, currentX + 2, this.currentY + 4);
      currentX += cellWidth;
    });
    
    this.currentY += maxRowHeight;
  }

  /**
   * Generates a totals summary from line items if not provided
   */
  private generateTotalsSummaryFromLineItems(invoice: any): any {
    // Group line items by category
    const categoryTotals = new Map<string, number>();
    let laborHours = 0;
    let paintHours = 0;
    
    invoice.lineItems.forEach((item: any) => {
      const category = item.category || 'Miscellaneous';
      
      // Accumulate totals by category
      if (category.toLowerCase().includes('labor') || category.toLowerCase().includes('body')) {
        categoryTotals.set('Body Labor', (categoryTotals.get('Body Labor') || 0) + item.total);
        laborHours += item.laborHours || 0;
      } else if (category.toLowerCase().includes('paint')) {
        if (category.toLowerCase().includes('supplies') || category.toLowerCase().includes('materials')) {
          categoryTotals.set('Paint Supplies', (categoryTotals.get('Paint Supplies') || 0) + item.total);
        } else {
          categoryTotals.set('Paint Labor', (categoryTotals.get('Paint Labor') || 0) + item.total);
          paintHours += item.paintHours || 0;
        }
      } else if (category.toLowerCase().includes('parts') || category.toLowerCase().includes('bumper') || category.toLowerCase().includes('panel')) {
        categoryTotals.set('Parts', (categoryTotals.get('Parts') || 0) + item.total);
      } else if (category.toLowerCase().includes('mechanical')) {
        categoryTotals.set('Mechanical Labor', (categoryTotals.get('Mechanical Labor') || 0) + item.total);
      } else {
        categoryTotals.set('Miscellaneous', (categoryTotals.get('Miscellaneous') || 0) + item.total);
      }
    });
    
    // Create categories array
    const categories = [];
    
    // Add Parts
    if (categoryTotals.has('Parts')) {
      categories.push({
        category: 'Parts',
        basis: '',
        rate: '',
        cost: categoryTotals.get('Parts')
      });
    }
    
    // Add Body Labor
    if (categoryTotals.has('Body Labor')) {
      categories.push({
        category: 'Body Labor',
        basis: laborHours > 0 ? `${laborHours.toFixed(1)} hrs` : '',
        rate: laborHours > 0 ? '$ 120.00 /hr' : '',
        cost: categoryTotals.get('Body Labor')
      });
    }
    
    // Add Paint Labor
    if (categoryTotals.has('Paint Labor')) {
      categories.push({
        category: 'Paint Labor',
        basis: paintHours > 0 ? `${paintHours.toFixed(1)} hrs` : '',
        rate: paintHours > 0 ? '$ 120.00 /hr' : '',
        cost: categoryTotals.get('Paint Labor')
      });
    }
    
    // Add Mechanical Labor
    if (categoryTotals.has('Mechanical Labor')) {
      categories.push({
        category: 'Mechanical Labor',
        basis: '',
        rate: '',
        cost: categoryTotals.get('Mechanical Labor')
      });
    }
    
    // Add Paint Supplies
    if (categoryTotals.has('Paint Supplies')) {
      categories.push({
        category: 'Paint Supplies',
        basis: paintHours > 0 ? `${paintHours.toFixed(1)} hrs` : '',
        rate: paintHours > 0 ? '$ 42.00 /hr' : '',
        cost: categoryTotals.get('Paint Supplies')
      });
    }
    
    // Add Miscellaneous
    if (categoryTotals.has('Miscellaneous')) {
      categories.push({
        category: 'Miscellaneous',
        basis: '',
        rate: '',
        cost: categoryTotals.get('Miscellaneous')
      });
    }
    
    // Calculate tax rate
    const taxRate = invoice.subtotal > 0 ? (invoice.tax / invoice.subtotal) * 100 : 0;
    
    return {
      categories: categories,
      subtotal: invoice.subtotal,
      salesTax: invoice.tax,
      salesTaxRate: taxRate,
      totalAmount: invoice.total
    };
  }

  /**
   * Creates a totals summary table showing category breakdown
   */
  private createTotalsSummaryTable(totalsSummary: any, isSupplementInvoice: boolean = false): void {
    if (!totalsSummary || !totalsSummary.categories || totalsSummary.categories.length === 0) {
      return; // No totals summary to display
    }

    const startX = this.config.safeZone;
    const tableWidth = this.config.maxContentWidth;
    
    // Add section header
    this.checkPageSpace(20);
    this.currentY += 5;
    
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(51, 51, 51);
    this.doc.text('TOTALS SUMMARY', startX, this.currentY);
    this.currentY += 8;
    
    // Table headers
    const headers = ['Category', 'Basis', 'Rate', 'Cost $'];
    const colWidths = [60, 30, 35, 35];
    
    // Draw header background
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(startX, this.currentY, tableWidth, 8, 'F');
    
    // Draw header text
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(51, 51, 51);
    
    let currentX = startX;
    headers.forEach((header, index) => {
      const cellWidth = colWidths[index];
      this.doc.text(header, currentX + 2, this.currentY + 6);
      currentX += cellWidth;
    });
    
    this.currentY += 10;
    
    // Draw category rows
    totalsSummary.categories.forEach((category: any, index: number) => {
      const rowHeight = 7;
      this.checkPageSpace(rowHeight);
      
      // Alternating row background
      if (index % 2 === 1) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(startX, this.currentY - 2, tableWidth, rowHeight, 'F');
      }
      
      this.doc.setFontSize(9);
      this.doc.setFont(undefined, 'normal');
      this.doc.setTextColor(51, 51, 51);
      
      currentX = startX;
      
      // Category name
      const categoryText = this.doc.splitTextToSize(category.category || '', colWidths[0] - 4);
      this.doc.text(categoryText, currentX + 2, this.currentY + 4);
      currentX += colWidths[0];
      
      // Basis
      this.doc.text(category.basis || '', currentX + 2, this.currentY + 4);
      currentX += colWidths[1];
      
      // Rate
      this.doc.text(category.rate || '', currentX + 2, this.currentY + 4);
      currentX += colWidths[2];
      
      // Cost
      this.doc.setFont(undefined, 'bold');
      this.doc.text(formatCurrency(category.cost || 0), currentX + 2, this.currentY + 4);
      
      this.currentY += rowHeight;
    });
    
    // Add separator line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(startX, this.currentY, startX + tableWidth, this.currentY);
    this.currentY += 5;
    
    // Subtotal row
    this.doc.setFontSize(10);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(51, 51, 51);
    this.doc.text('Subtotal', startX + 2, this.currentY);
    this.doc.text(formatCurrency(totalsSummary.subtotal), startX + tableWidth - 35, this.currentY);
    this.currentY += 7;
    
    // Sales Tax row
    const taxText = totalsSummary.salesTaxRate
      ? `Sales Tax (${totalsSummary.salesTaxRate.toFixed(4)}%)`
      : 'Sales Tax';
    this.doc.setFont(undefined, 'normal');
    this.doc.text(taxText, startX + 2, this.currentY);
    this.doc.setFont(undefined, 'bold');
    this.doc.text(formatCurrency(totalsSummary.salesTax), startX + tableWidth - 35, this.currentY);
    this.currentY += 7;
    
    // Total row with background
    this.doc.setFillColor(230, 230, 230);
    this.doc.rect(startX, this.currentY - 5, tableWidth, 10, 'F');
    
    this.doc.setFontSize(12);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(30, 64, 175);
    this.doc.text('Total Amount', startX + 2, this.currentY);
    this.doc.text(formatCurrency(totalsSummary.totalAmount), startX + tableWidth - 35, this.currentY);
    this.currentY += 10;
    
    // NET COST OF SUPPLEMENT for supplement invoices
    if (isSupplementInvoice) {
      this.doc.setFillColor(30, 64, 175);
      this.doc.rect(startX, this.currentY - 5, tableWidth, 10, 'F');
      
      this.doc.setFontSize(12);
      this.doc.setFont(undefined, 'bold');
      this.doc.setTextColor(255, 255, 255);
      this.doc.text('NET COST OF SUPPLEMENT', startX + 2, this.currentY);
      this.doc.text(formatCurrency(totalsSummary.totalAmount || totalsSummary.netCostOfSupplement || 0), startX + tableWidth - 35, this.currentY);
      this.currentY += 12;
    }
  }

  /**
   * Adds page numbers and footers to all pages
   */
  private addPageNumbersAndFooters(): void {
    const totalPages = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      
      // Page number
      this.doc.setFontSize(8);
      this.doc.setTextColor(128, 128, 128);
      this.doc.text(
        `Page ${i} of ${totalPages}`, 
        this.config.pageWidth / 2, 
        this.config.pageHeight - 10, 
        { align: 'center' }
      );
      
      // Footer
      this.doc.text(
        'Generated by SupplementGuard', 
        this.config.pageWidth - this.config.safeZone, 
        this.config.pageHeight - 10, 
        { align: 'right' }
      );
    }
  }

  /**
   * Generates the complete PDF report
   */
  public generateReport(claimData: ClaimData): void {
    try {
      // Header
      this.addText('SupplementGuard Claim Report', this.config.safeZone, this.currentY, this.config.maxContentWidth, {
        fontSize: 20,
        fontStyle: 'bold',
        color: [30, 64, 175]
      });
      
      this.currentY += 5;
      
      // Use actual Claim # if available, otherwise fall back to generated ID
      const claimText = claimData.claimNumber
        ? `Claim #: ${claimData.claimNumber}`
        : `Claim ID: ${claimData.id}`;
      
      // Create vehicle text if vehicle info is available
      let vehicleText = '';
      if (claimData.vehicleInfo) {
        const { year, make, model, vin } = claimData.vehicleInfo;
        const vehicleDescription = [year, make, model].filter(Boolean).join(' ');
        if (vehicleDescription) {
          vehicleText = `Vehicle: ${vehicleDescription}`;
          if (vin) {
            vehicleText += ` | VIN: ${vin}`;
          }
        }
      }
      
      // Display claim number
      this.addText(claimText, this.config.safeZone, this.currentY, this.config.maxContentWidth / 2);
      
      // Display vehicle info if available
      if (vehicleText) {
        this.currentY += 1;
        this.addText(vehicleText, this.config.safeZone, this.currentY, this.config.maxContentWidth * 0.7, {
          fontSize: 11
        });
      }
      
      // Display date
      this.addText(`Generated: ${new Date().toLocaleDateString()}`, this.config.pageWidth - this.config.safeZone - 60, this.currentY - (vehicleText ? this.config.lineHeight * 2 : this.config.lineHeight), 60, {
        align: 'right'
      });
      
      this.currentY += 10;
      
      // Changes Overview Section
      this.addSectionHeader('Changes Overview');
      
      // Calculate and display key changes
      const originalTotal = claimData.originalInvoice.total;
      const supplementTotal = claimData.supplementInvoice.total;
      const totalDifference = supplementTotal - originalTotal;
      const percentChange = ((totalDifference / originalTotal) * 100).toFixed(2);
      
      // Count new and changed items
      const newItems = claimData.supplementInvoice.lineItems.filter(item => item.isNew).length;
      const changedItems = claimData.supplementInvoice.lineItems.filter(item => item.isChanged).length;
      const unchangedItems = claimData.supplementInvoice.lineItems.filter(item => !item.isNew && !item.isChanged).length;
      
      const changePoints = [
        `• Total amount changed from ${formatCurrency(originalTotal)} to ${formatCurrency(supplementTotal)}`,
        `• Overall difference: ${formatCurrency(Math.abs(totalDifference))} (${percentChange}%)`,
        `• ${newItems} new item${newItems !== 1 ? 's' : ''} added to supplement`,
        `• ${changedItems} item${changedItems !== 1 ? 's' : ''} modified from original`,
        `• ${unchangedItems} item${unchangedItems !== 1 ? 's' : ''} remained unchanged`
      ];
      
      changePoints.forEach(point => {
        this.addText(point, this.config.safeZone, this.currentY, this.config.maxContentWidth);
        this.currentY += 3;
      });
      
      this.currentY += 10;
      
      // Disclaimer Section (moved here from bottom)
      this.checkPageSpace(100);
      
      // Disclaimer title
      this.doc.setTextColor(139, 0, 0); // Dark red color for title
      this.addText('IMPORTANT DISCLAIMER', this.config.safeZone, this.currentY, this.config.maxContentWidth, {
        fontSize: 14,
        fontStyle: 'bold',
        color: [139, 0, 0]
      });
      
      this.currentY += 8;
      
      // Disclaimer content
      const disclaimerText = `ALL ESTIMATE AND SUPPLEMENT PAYMENTS WILL BE ISSUED TO THE VEHICLE OWNER.

The repair contract exists solely between the vehicle owner and the repair facility. The insurance company is not involved in this agreement and does not assume responsibility for repair quality, timelines, or costs. All repair-related disputes must be handled directly with the repair facility.

Please note: Any misrepresentation of repairs, labor, parts, or supplements—including unnecessary operations or inflated charges—may constitute insurance fraud and will result in further review or investigation.`;
      
      // Draw disclaimer box with border
      const disclaimerStartY = this.currentY - 10;
      
      // Split disclaimer into paragraphs for better formatting
      const disclaimerParagraphs = disclaimerText.split('\n\n');
      disclaimerParagraphs.forEach((paragraph, index) => {
        if (index > 0) this.currentY += 5;
        
        this.addText(paragraph, this.config.safeZone + 5, this.currentY, this.config.maxContentWidth - 10, {
          fontSize: 10,
          color: [51, 51, 51]
        });
      });
      
      // Draw border around disclaimer
      const disclaimerEndY = this.currentY + 5;
      const disclaimerHeight = disclaimerEndY - disclaimerStartY;
      this.doc.setDrawColor(200, 200, 200);
      this.doc.setLineWidth(0.5);
      this.doc.rect(this.config.safeZone - 5, disclaimerStartY, this.config.maxContentWidth + 10, disclaimerHeight, 'S');
      
      this.currentY = disclaimerEndY + 15;
      
      // Original Invoice Section
      this.addSectionHeader('Original Invoice');
      
      const originalHeaders = ['Description', 'Qty', 'Price', 'Total'];
      const originalData = claimData.originalInvoice.lineItems.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.total)
      ]);
      
      // Create table WITHOUT totals rows
      this.createTable(originalHeaders, originalData, [80, 20, 30, 30]);
      
      // Add totals in a gray box
      this.currentY += 5;
      this.checkPageSpace(30);
      
      const boxWidth = this.config.maxContentWidth;
      const boxHeight = 25;
      
      // Draw gray background box
      this.doc.setFillColor(230, 230, 230);
      this.doc.rect(this.config.safeZone, this.currentY, boxWidth, boxHeight, 'F');
      
      // Add totals text
      this.doc.setFontSize(10);
      this.doc.setFont(undefined, 'bold');
      this.doc.setTextColor(51, 51, 51);
      
      this.doc.text(`SUBTOTAL: ${formatCurrency(claimData.originalInvoice.subtotal)}`, this.config.safeZone + 5, this.currentY + 8);
      this.doc.text(`TAX: ${formatCurrency(claimData.originalInvoice.tax)}`, this.config.safeZone + 5, this.currentY + 15);
      this.doc.text(`TOTAL: ${formatCurrency(claimData.originalInvoice.total)}`, this.config.safeZone + 5, this.currentY + 22);
      
      this.currentY += boxHeight + 5;
      
      // Always add Original Invoice Totals Summary
      this.currentY += 10;
      const originalTotalsSummary = claimData.originalInvoice.totalsSummary ||
                                    this.generateTotalsSummaryFromLineItems(claimData.originalInvoice);
      this.createTotalsSummaryTable(originalTotalsSummary, false);
      
      // Supplement Invoice Section
      this.addSectionHeader('Supplement Invoice');
      
      // Sort supplement items by status: NEW first, then CHANGED, then SAME
      const sortedSupplementItems = [...claimData.supplementInvoice.lineItems].sort((a, b) => {
        // Define status priority: NEW = 1, CHANGED = 2, SAME = 3
        const getStatusPriority = (item: any) => {
          if (item.isNew) return 1;
          if (item.isChanged) return 2;
          return 3;
        };
        
        return getStatusPriority(a) - getStatusPriority(b);
      });
      
      const supplementHeaders = ['Description', 'Qty', 'Price', 'Total', 'Status'];
      const supplementData = sortedSupplementItems.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.total),
        item.isNew ? 'NEW' : item.isChanged ? 'CHANGED' : 'SAME'
      ]);
      
      // Create table WITHOUT totals rows
      this.createTable(supplementHeaders, supplementData, [70, 15, 25, 25, 25]);
      
      // Add totals in a gray box with cost difference
      this.currentY += 5;
      this.checkPageSpace(35);
      
      const suppBoxWidth = this.config.maxContentWidth;
      const difference = claimData.supplementInvoice.total - claimData.originalInvoice.total;
      const suppBoxHeight = 30;
      
      // Draw gray background box
      this.doc.setFillColor(230, 230, 230);
      this.doc.rect(this.config.safeZone, this.currentY, suppBoxWidth, suppBoxHeight, 'F');
      
      // Add totals text (left side)
      this.doc.setFontSize(10);
      this.doc.setFont(undefined, 'bold');
      this.doc.setTextColor(51, 51, 51);
      
      this.doc.text(`SUBTOTAL: ${formatCurrency(claimData.supplementInvoice.subtotal)}`, this.config.safeZone + 5, this.currentY + 8);
      this.doc.text(`TAX: ${formatCurrency(claimData.supplementInvoice.tax)}`, this.config.safeZone + 5, this.currentY + 15);
      this.doc.text(`TOTAL: ${formatCurrency(claimData.supplementInvoice.total)}`, this.config.safeZone + 5, this.currentY + 22);
      
      // Add cost difference (right side) in red
      this.doc.setTextColor(difference > 0 ? 255 : 0, 0, 0);
      this.doc.text(`COST DIFFERENCE: ${difference > 0 ? '+' : ''}${formatCurrency(difference)}`, this.config.safeZone + suppBoxWidth - 80, this.currentY + 15, { align: 'right' });
      
      this.currentY += suppBoxHeight + 5;
      
      // Always add Supplement Invoice Totals Summary
      this.currentY += 10;
      const supplementTotalsSummary = claimData.supplementInvoice.totalsSummary ||
                                      this.generateTotalsSummaryFromLineItems(claimData.supplementInvoice);
      // Add NET COST OF SUPPLEMENT to the summary if not present
      if (!supplementTotalsSummary.netCostOfSupplement) {
        supplementTotalsSummary.netCostOfSupplement = claimData.supplementInvoice.total;
      }
      this.createTotalsSummaryTable(supplementTotalsSummary, true);
      
      // Needs Warranty Section
      this.currentY += 10;
      this.checkPageSpace(80);
      
      // Filter items from SUPPLEMENT INVOICE ONLY that need warranty (contain "Rpr" or "Repl" in description)
      const warrantyItems = claimData.supplementInvoice.lineItems
        .filter(item => {
          const desc = item.description;
          // Check for "Rpr" or "Repl" (case-sensitive to match actual abbreviations)
          return desc.includes('Rpr') || desc.includes('Repl');
        });
      
      if (warrantyItems.length > 0) {
        // Section title
        this.addText('NEEDS WARRANTY', this.config.safeZone, this.currentY, this.config.maxContentWidth, {
          fontSize: 16,
          fontStyle: 'bold',
          color: [51, 51, 51]
        });
        this.currentY += 8;
        
        // Warranty notice
        this.addText('The following supplement items require warranty coverage as they involve repairs or replacements:',
          this.config.safeZone, this.currentY, this.config.maxContentWidth, {
          fontSize: 10,
          color: [102, 102, 102]
        });
        this.currentY += 8;
        
        // Create warranty items table
        const warrantyHeaders = ['Description', 'Type', 'Original Price', 'New Price', 'Change', 'Warranty Status'];
        const warrantyData = warrantyItems.map(item => {
          // Find the corresponding original item to get price comparison
          const originalItem = claimData.originalInvoice.lineItems.find(
            orig => orig.description.toLowerCase().trim() === item.description.toLowerCase().trim()
          );
          
          const originalTotal = originalItem ? originalItem.total : 0;
          const priceChange = item.total - originalTotal;
          
          // Determine the type of work based on description
          const desc = item.description;
          let workType = '';
          if (desc.includes('Repl')) workType = 'REPLACEMENT';
          else if (desc.includes('Rpr')) workType = 'REPAIR';
          else workType = 'SERVICE';
          
          return [
            item.description,
            workType,
            originalItem ? formatCurrency(originalTotal) : '-',
            formatCurrency(item.total),
            priceChange !== 0 ? formatCurrency(priceChange) : '-',
            'NEEDS WARRANTY'
          ];
        });
        
        // Create warranty table with special formatting
        this.createWarrantyTable(warrantyHeaders, warrantyData);
        this.currentY += 15;
      }
      
      // Add page numbers and footers
      this.addPageNumbersAndFooters();
      
      // Save the PDF
      this.doc.save(`Claim-Report-${claimData.id}.pdf`);
      
    } catch (error) {
      console.error('Error generating improved PDF:', error);
      throw new Error('Failed to generate PDF report. Please try again.');
    }
  }
}

/**
 * Generates an improved PDF report with proper text handling and no truncation
 */
export const generateImprovedPdfReport = (claimData: ClaimData) => {
  const generator = new ImprovedPdfGenerator();
  generator.generateReport(claimData);
};

/**
 * Enhanced CSV export with better formatting
 */
export const generateEnhancedCsvReport = (claimData: ClaimData) => {
  const formatCurrency = (amount: number) => amount.toFixed(2);
  
  // Create CSV content with proper escaping
  let csvContent = '';
  
  // Header information
  csvContent += 'SupplementGuard Claim Analysis Report\n';
  csvContent += `Claim ID,"${claimData.id}"\n`;
  csvContent += `Fraud Score,${claimData.fraudScore}\n`;
  csvContent += `Generated,"${new Date().toLocaleDateString()}"\n\n`;
  
  // Fraud reasons
  csvContent += 'Fraud Risk Factors\n';
  claimData.fraudReasons.forEach((reason, index) => {
    const escapedReason = reason.replace(/"/g, '""');
    csvContent += `${index + 1},"${escapedReason}"\n`;
  });
  csvContent += '\n';
  
  // Original invoice
  csvContent += 'Original Invoice\n';
  csvContent += 'Description,Quantity,Unit Price,Total\n';
  claimData.originalInvoice.lineItems.forEach(item => {
    const escapedDesc = item.description.replace(/"/g, '""');
    csvContent += `"${escapedDesc}",${item.quantity},${formatCurrency(item.price)},${formatCurrency(item.total)}\n`;
  });
  csvContent += `Subtotal,,,${formatCurrency(claimData.originalInvoice.subtotal)}\n`;
  csvContent += `Tax,,,${formatCurrency(claimData.originalInvoice.tax)}\n`;
  csvContent += `Total,,,${formatCurrency(claimData.originalInvoice.total)}\n\n`;
  
  // Supplement invoice
  csvContent += 'Supplement Invoice\n';
  csvContent += 'Description,Quantity,Unit Price,Total,Status\n';
  claimData.supplementInvoice.lineItems.forEach(item => {
    const escapedDesc = item.description.replace(/"/g, '""');
    const status = item.isNew ? 'New Item' : item.isChanged ? 'Changed' : 'Unchanged';
    csvContent += `"${escapedDesc}",${item.quantity},${formatCurrency(item.price)},${formatCurrency(item.total)},"${status}"\n`;
  });
  csvContent += `Subtotal,,,,${formatCurrency(claimData.supplementInvoice.subtotal)}\n`;
  csvContent += `Tax,,,,${formatCurrency(claimData.supplementInvoice.tax)}\n`;
  csvContent += `Total,,,,${formatCurrency(claimData.supplementInvoice.total)}\n\n`;
  
  // Cost difference
  const difference = claimData.supplementInvoice.total - claimData.originalInvoice.total;
  csvContent += `Cost Difference,,,,${formatCurrency(difference)}\n\n`;
  
  // Summary
  csvContent += 'Analysis Summary\n';
  const summaryLines = claimData.invoiceSummary.split('\n').filter(line => line.trim() !== '');
  summaryLines.forEach(line => {
    const cleanLine = line.replace(/\*\*/g, '').replace(/^- |^\* /, '');
    const escapedLine = cleanLine.replace(/"/g, '""');
    if (cleanLine.trim()) {
      csvContent += `"${escapedLine}"\n`;
    }
  });
  
  // Create and download the file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `Claim-Report-${claimData.id}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};