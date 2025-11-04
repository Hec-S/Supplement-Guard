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
      
      // Claim info
      this.addText(`Claim ID: ${claimData.id}`, this.config.safeZone, this.currentY, this.config.maxContentWidth / 2);
      this.addText(`Generated: ${new Date().toLocaleDateString()}`, this.config.pageWidth - this.config.safeZone - 60, this.currentY - this.config.lineHeight, 60, {
        align: 'right'
      });
      
      this.currentY += 10;
      
      // Fraud Risk Assessment Section
      this.addSectionHeader('Fraud Risk Assessment');
      
      const riskLevel = claimData.fraudScore > 75 ? 'High Risk' : 
                       claimData.fraudScore > 40 ? 'Medium Risk' : 'Low Risk';
      
      this.addText(`Fraud Score: ${claimData.fraudScore}/100`, this.config.safeZone, this.currentY, this.config.maxContentWidth / 2);
      this.addText(`Risk Level: ${riskLevel}`, this.config.safeZone + this.config.maxContentWidth / 2, this.currentY - this.config.lineHeight, this.config.maxContentWidth / 2);
      
      this.currentY += 10;
      
      // Contributing Factors
      this.addText('Contributing Factors:', this.config.safeZone, this.currentY, this.config.maxContentWidth, {
        fontStyle: 'bold'
      });
      
      claimData.fraudReasons.forEach((reason, index) => {
        const text = `${index + 1}. ${reason}`;
        this.addText(text, this.config.safeZone, this.currentY, this.config.maxContentWidth);
      });
      
      this.currentY += 10;
      
      // AI Analysis Summary
      this.addSectionHeader('AI Analysis Summary');
      
      const summaryLines = claimData.invoiceSummary.split('\n').filter(line => line.trim() !== '');
      summaryLines.forEach(line => {
        const cleanLine = line.replace(/\*\*/g, '').replace(/^- |^\* /, '• ');
        if (cleanLine.trim()) {
          this.addText(cleanLine, this.config.safeZone, this.currentY, this.config.maxContentWidth);
        }
      });
      
      // Original Invoice Section
      this.addSectionHeader('Original Invoice');
      
      const originalHeaders = ['Description', 'Qty', 'Price', 'Total'];
      const originalData = claimData.originalInvoice.lineItems.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.total)
      ]);
      
      // Add totals row
      originalData.push([
        'SUBTOTAL',
        '',
        '',
        formatCurrency(claimData.originalInvoice.subtotal)
      ]);
      originalData.push([
        'TAX',
        '',
        '',
        formatCurrency(claimData.originalInvoice.tax)
      ]);
      originalData.push([
        'TOTAL',
        '',
        '',
        formatCurrency(claimData.originalInvoice.total)
      ]);
      
      this.createTable(originalHeaders, originalData, [80, 20, 30, 30]);
      
      // Supplement Invoice Section
      this.addSectionHeader('Supplement Invoice');
      
      const supplementHeaders = ['Description', 'Qty', 'Price', 'Total', 'Status'];
      const supplementData = claimData.supplementInvoice.lineItems.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.total),
        item.isNew ? 'NEW' : item.isChanged ? 'CHANGED' : 'SAME'
      ]);
      
      // Add totals
      supplementData.push([
        'SUBTOTAL',
        '',
        '',
        formatCurrency(claimData.supplementInvoice.subtotal),
        ''
      ]);
      supplementData.push([
        'TAX',
        '',
        '',
        formatCurrency(claimData.supplementInvoice.tax),
        ''
      ]);
      supplementData.push([
        'TOTAL',
        '',
        '',
        formatCurrency(claimData.supplementInvoice.total),
        ''
      ]);
      
      // Cost difference
      const difference = claimData.supplementInvoice.total - claimData.originalInvoice.total;
      supplementData.push([
        'COST DIFFERENCE',
        '',
        '',
        formatCurrency(difference),
        difference > 0 ? 'INCREASE' : 'DECREASE'
      ]);
      
      this.createTable(supplementHeaders, supplementData, [70, 15, 25, 25, 25]);
      
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
  csvContent += 'AI Analysis Summary\n';
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