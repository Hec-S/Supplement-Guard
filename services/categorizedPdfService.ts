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

class CategorizedPdfGenerator {
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
      safeZone: 25,
      lineHeight: 5,
      maxContentWidth: 0,
      maxContentHeight: 0
    };
    
    this.config.maxContentWidth = this.config.pageWidth - (2 * this.config.safeZone);
    this.config.maxContentHeight = this.config.pageHeight - (2 * this.config.safeZone);
    this.currentY = this.config.safeZone;
  }

  private checkPageSpace(requiredHeight: number): void {
    const availableSpace = this.config.pageHeight - this.config.safeZone - this.currentY;
    
    if (availableSpace < requiredHeight) {
      this.addNewPage();
    }
  }

  private addNewPage(): void {
    this.doc.addPage();
    this.currentPage++;
    this.currentY = this.config.safeZone;
  }

  private addText(text: string, x: number, y: number, maxWidth: number, options: {
    fontSize?: number;
    fontStyle?: string;
    color?: [number, number, number];
    align?: 'left' | 'center' | 'right';
  } = {}): number {
    const { fontSize = 12, fontStyle = 'normal', color = [0, 0, 0], align = 'left' } = options;
    
    this.doc.setFontSize(fontSize);
    this.doc.setFont(undefined, fontStyle);
    this.doc.setTextColor(color[0], color[1], color[2]);
    
    const splitText = this.doc.splitTextToSize(text, maxWidth);
    const textHeight = splitText.length * this.config.lineHeight;
    
    this.checkPageSpace(textHeight + 5);
    
    const textOptions: any = {};
    if (align !== 'left') {
      textOptions.align = align;
    }
    
    this.doc.text(splitText, x, this.currentY, textOptions);
    this.currentY += textHeight;
    
    return textHeight;
  }

  private addSectionHeader(title: string): void {
    this.checkPageSpace(20);
    
    this.currentY += 10;
    
    this.addText(title, this.config.safeZone, this.currentY, this.config.maxContentWidth, {
      fontSize: 16,
      fontStyle: 'bold',
      color: [51, 51, 51]
    });
    
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(
      this.config.safeZone, 
      this.currentY + 2, 
      this.config.pageWidth - this.config.safeZone, 
      this.currentY + 2
    );
    
    this.currentY += 8;
  }

  private addCategoryHeader(category: string): void {
    this.checkPageSpace(15);
    
    // Add category background
    this.doc.setFillColor(240, 240, 240);
    this.doc.rect(this.config.safeZone, this.currentY - 2, this.config.maxContentWidth, 10, 'F');
    
    // Add category text
    this.addText(category, this.config.safeZone + 2, this.currentY, this.config.maxContentWidth - 4, {
      fontSize: 12,
      fontStyle: 'bold',
      color: [0, 0, 0]
    });
    
    this.currentY += 3;
  }

  private createCategorizedTable(
    headers: string[], 
    categorizedData: Record<string, any[]>,
    columnWidths: number[],
    showStatus: boolean = false
  ): void {
    const startX = this.config.safeZone;
    
    // Ensure table fits within page width
    const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    if (tableWidth > this.config.maxContentWidth) {
      const scaleFactor = this.config.maxContentWidth / tableWidth;
      columnWidths = columnWidths.map(width => width * scaleFactor);
    }
    
    // Process each category
    Object.keys(categorizedData).sort().forEach(category => {
      const categoryItems = categorizedData[category];
      if (categoryItems.length === 0) return;
      
      // Add category header
      this.addCategoryHeader(category);
      
      // Draw table headers
      this.drawTableHeaders(headers, columnWidths, startX);
      
      // Draw items in this category
      categoryItems.forEach((item, index) => {
        this.drawCategorizedTableRow(item, columnWidths, startX, index % 2 === 1, showStatus);
      });
      
      this.currentY += 5; // Space between categories
    });
  }

  private drawTableHeaders(headers: string[], columnWidths: number[], startX: number): void {
    const headerHeight = 8;
    
    this.checkPageSpace(headerHeight + 10);
    
    // Background for headers
    this.doc.setFillColor(220, 220, 220);
    this.doc.rect(startX, this.currentY, columnWidths.reduce((sum, w) => sum + w, 0), headerHeight, 'F');
    
    // Header text
    this.doc.setFontSize(9);
    this.doc.setFont(undefined, 'bold');
    this.doc.setTextColor(51, 51, 51);
    
    let currentX = startX;
    headers.forEach((header, index) => {
      const cellWidth = columnWidths[index];
      const wrappedText = this.doc.splitTextToSize(header, cellWidth - 4);
      this.doc.text(wrappedText, currentX + 2, this.currentY + 5);
      currentX += cellWidth;
    });
    
    this.currentY += headerHeight + 2;
  }

  private drawCategorizedTableRow(
    item: any, 
    columnWidths: number[], 
    startX: number, 
    isAlternate: boolean = false,
    showStatus: boolean = false
  ): void {
    // Prepare row data based on item properties
    const rowData = [];
    
    // Line number
    if (item.lineNumber) {
      rowData.push(item.lineNumber.toString());
    } else {
      rowData.push('-');
    }
    
    // Operation
    if (item.operation) {
      rowData.push(item.operation);
    } else {
      rowData.push('-');
    }
    
    // Description
    rowData.push(item.description || '');
    
    // Quantity
    rowData.push(item.quantity ? item.quantity.toString() : '0');
    
    // Price
    rowData.push(formatCurrency(item.price || 0));
    
    // Total
    rowData.push(formatCurrency(item.total || 0));
    
    // Labor/Paint hours
    if (item.laborHours || item.paintHours) {
      rowData.push(`${item.laborHours || 0}/${item.paintHours || 0}`);
    } else {
      rowData.push('-');
    }
    
    // Status if needed
    if (showStatus) {
      let status = 'UNCHANGED';
      let statusColor: [number, number, number] = [100, 100, 100];
      
      if (item.isNew) {
        status = 'NEW';
        statusColor = [0, 150, 0];
      } else if (item.isRemoved) {
        status = 'REMOVED';
        statusColor = [200, 0, 0];
      } else if (item.isChanged) {
        status = 'CHANGED';
        statusColor = [255, 140, 0];
      }
      
      rowData.push(status);
    }
    
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
    
    // Highlight row based on status
    if (showStatus) {
      if (item.isNew) {
        this.doc.setFillColor(220, 255, 220); // Light green
        this.doc.rect(startX, this.currentY, columnWidths.reduce((sum, w) => sum + w, 0), maxRowHeight, 'F');
      } else if (item.isRemoved) {
        this.doc.setFillColor(255, 220, 220); // Light red
        this.doc.rect(startX, this.currentY, columnWidths.reduce((sum, w) => sum + w, 0), maxRowHeight, 'F');
      } else if (item.isChanged) {
        this.doc.setFillColor(255, 240, 200); // Light orange
        this.doc.rect(startX, this.currentY, columnWidths.reduce((sum, w) => sum + w, 0), maxRowHeight, 'F');
      }
    }
    
    // Draw cell content
    this.doc.setFontSize(8);
    this.doc.setFont(undefined, 'normal');
    
    let currentX = startX;
    wrappedCells.forEach((cellLines, index) => {
      // Set color for status column
      if (showStatus && index === rowData.length - 1) {
        if (item.isNew) {
          this.doc.setTextColor(0, 150, 0);
          this.doc.setFont(undefined, 'bold');
        } else if (item.isRemoved) {
          this.doc.setTextColor(200, 0, 0);
          this.doc.setFont(undefined, 'bold');
        } else if (item.isChanged) {
          this.doc.setTextColor(255, 140, 0);
          this.doc.setFont(undefined, 'bold');
        } else {
          this.doc.setTextColor(51, 51, 51);
          this.doc.setFont(undefined, 'normal');
        }
      } else {
        this.doc.setTextColor(51, 51, 51);
        this.doc.setFont(undefined, 'normal');
      }
      
      this.doc.text(cellLines, currentX + 2, this.currentY + 4);
      currentX += columnWidths[index];
    });
    
    this.currentY += maxRowHeight;
  }

  private addPageNumbersAndFooters(): void {
    const totalPages = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      
      this.doc.setFontSize(8);
      this.doc.setTextColor(128, 128, 128);
      this.doc.text(
        `Page ${i} of ${totalPages}`, 
        this.config.pageWidth / 2, 
        this.config.pageHeight - 10, 
        { align: 'center' }
      );
      
      this.doc.text(
        'Generated by SupplementGuard', 
        this.config.pageWidth - this.config.safeZone, 
        this.config.pageHeight - 10, 
        { align: 'right' }
      );
    }
  }

  public generateReport(claimData: ClaimData): void {
    try {
      // Header
      this.addText('SupplementGuard Claim Report - Categorized Analysis', this.config.safeZone, this.currentY, this.config.maxContentWidth, {
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
      
      // Changes Overview Section
      this.addSectionHeader('Changes Overview');
      
      const originalTotal = claimData.originalInvoice.total;
      const supplementTotal = claimData.supplementInvoice.total;
      const totalDifference = supplementTotal - originalTotal;
      const percentChange = ((totalDifference / originalTotal) * 100).toFixed(2);
      
      // Use changesSummary if available
      const newItems = claimData.changesSummary?.totalNewItems || 
        claimData.supplementInvoice.lineItems.filter(item => item.isNew).length;
      const changedItems = claimData.changesSummary?.totalChangedItems || 
        claimData.supplementInvoice.lineItems.filter(item => item.isChanged).length;
      const removedItems = claimData.changesSummary?.totalRemovedItems || 0;
      const unchangedItems = claimData.changesSummary?.totalUnchangedItems || 
        claimData.supplementInvoice.lineItems.filter(item => !item.isNew && !item.isChanged).length;
      
      const changePoints = [
        `• Total amount changed from ${formatCurrency(originalTotal)} to ${formatCurrency(supplementTotal)}`,
        `• Overall difference: ${formatCurrency(Math.abs(totalDifference))} (${percentChange}%)`,
        `• ${newItems} new item${newItems !== 1 ? 's' : ''} added to supplement`,
        `• ${removedItems} item${removedItems !== 1 ? 's' : ''} removed from original`,
        `• ${changedItems} item${changedItems !== 1 ? 's' : ''} modified from original`,
        `• ${unchangedItems} item${unchangedItems !== 1 ? 's' : ''} remained unchanged`
      ];
      
      changePoints.forEach(point => {
        this.addText(point, this.config.safeZone, this.currentY, this.config.maxContentWidth);
        this.currentY += 3;
      });
      
      this.currentY += 10;
      
      // Original Invoice Section - Organized by Categories
      this.addSectionHeader('Original Invoice - By Category');
      
      // Group original items by category
      const originalByCategory = claimData.originalInvoice.lineItems.reduce((acc, item) => {
        const category = item.category || 'UNCATEGORIZED';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, typeof claimData.originalInvoice.lineItems>);
      
      const originalHeaders = ['Line', 'Op', 'Description', 'Qty', 'Price', 'Total', 'Hrs'];
      const originalColumnWidths = [10, 12, 70, 12, 20, 20, 16];
      
      this.createCategorizedTable(originalHeaders, originalByCategory, originalColumnWidths, false);
      
      // Original totals
      this.currentY += 5;
      this.doc.setFillColor(240, 240, 240);
      this.doc.rect(this.config.safeZone, this.currentY, this.config.maxContentWidth, 25, 'F');
      
      this.doc.setFontSize(10);
      this.doc.setFont(undefined, 'bold');
      this.doc.setTextColor(51, 51, 51);
      
      this.doc.text(`Subtotal: ${formatCurrency(claimData.originalInvoice.subtotal)}`, this.config.safeZone + 5, this.currentY + 6);
      this.doc.text(`Tax: ${formatCurrency(claimData.originalInvoice.tax)}`, this.config.safeZone + 5, this.currentY + 12);
      this.doc.text(`TOTAL: ${formatCurrency(claimData.originalInvoice.total)}`, this.config.safeZone + 5, this.currentY + 18);
      
      this.currentY += 30;
      
      // Supplement Invoice Section - Organized by Categories with Status
      this.addSectionHeader('Supplement Invoice - By Category with Changes');
      
      // Group supplement items by category
      const supplementByCategory = claimData.supplementInvoice.lineItems.reduce((acc, item) => {
        const category = item.category || 'UNCATEGORIZED';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, typeof claimData.supplementInvoice.lineItems>);
      
      // Also add removed items from original
      const removedItemsFromOriginal = claimData.originalInvoice.lineItems.filter(origItem => 
        !claimData.supplementInvoice.lineItems.some(suppItem => 
          suppItem.description.toLowerCase() === origItem.description.toLowerCase()
        )
      );
      
      removedItemsFromOriginal.forEach(item => {
        const category = item.category || 'UNCATEGORIZED';
        if (!supplementByCategory[category]) {
          supplementByCategory[category] = [];
        }
        supplementByCategory[category].push({ ...item, isRemoved: true });
      });
      
      const supplementHeaders = ['Line', 'Op', 'Description', 'Qty', 'Price', 'Total', 'Hrs', 'Status'];
      const supplementColumnWidths = [10, 12, 60, 12, 18, 18, 14, 16];
      
      this.createCategorizedTable(supplementHeaders, supplementByCategory, supplementColumnWidths, true);
      
      // Supplement totals with comparison
      this.currentY += 5;
      this.doc.setFillColor(240, 240, 240);
      this.doc.rect(this.config.safeZone, this.currentY, this.config.maxContentWidth, 35, 'F');
      
      this.doc.setFontSize(10);
      this.doc.setFont(undefined, 'bold');
      this.doc.setTextColor(51, 51, 51);
      
      this.doc.text(`Subtotal: ${formatCurrency(claimData.supplementInvoice.subtotal)}`, this.config.safeZone + 5, this.currentY + 6);
      this.doc.text(`Tax: ${formatCurrency(claimData.supplementInvoice.tax)}`, this.config.safeZone + 5, this.currentY + 12);
      this.doc.text(`TOTAL: ${formatCurrency(claimData.supplementInvoice.total)}`, this.config.safeZone + 5, this.currentY + 18);
      
      const difference = claimData.supplementInvoice.total - claimData.originalInvoice.total;
      this.doc.setTextColor(difference > 0 ? 200 : 0, difference > 0 ? 0 : 150, 0);
      this.doc.text(`DIFFERENCE: ${difference > 0 ? '+' : ''}${formatCurrency(difference)}`, this.config.safeZone + 5, this.currentY + 28);
      
      this.currentY += 40;
      
      // Category Summary Section
      this.addSectionHeader('Summary by Category');
      
      // Calculate changes by category
      const categoryStats: Record<string, { new: number; changed: number; removed: number; unchanged: number; total: number }> = {};
      
      // Process all categories
      const allCategories = new Set([
        ...Object.keys(originalByCategory),
        ...Object.keys(supplementByCategory)
      ]);
      
      allCategories.forEach(category => {
        categoryStats[category] = { new: 0, changed: 0, removed: 0, unchanged: 0, total: 0 };
        
        const suppItems = supplementByCategory[category] || [];
        suppItems.forEach(item => {
          if (item.isNew) categoryStats[category].new++;
          else if (item.isRemoved) categoryStats[category].removed++;
          else if (item.isChanged) categoryStats[category].changed++;
          else categoryStats[category].unchanged++;
          
          if (!item.isRemoved) {
            categoryStats[category].total += item.total || 0;
          }
        });
      });
      
      // Display category statistics
      Object.keys(categoryStats).sort().forEach(category => {
        const stats = categoryStats[category];
        if (stats.new + stats.changed + stats.removed + stats.unchanged > 0) {
          this.checkPageSpace(15);
          
          this.doc.setFillColor(245, 245, 245);
          this.doc.rect(this.config.safeZone, this.currentY, this.config.maxContentWidth, 12, 'F');
          
          this.doc.setFontSize(10);
          this.doc.setFont(undefined, 'bold');
          this.doc.setTextColor(0, 0, 0);
          this.doc.text(category, this.config.safeZone + 2, this.currentY + 4);
          
          this.doc.setFontSize(9);
          this.doc.setFont(undefined, 'normal');
          const statsText = `New: ${stats.new} | Changed: ${stats.changed} | Removed: ${stats.removed} | Unchanged: ${stats.unchanged} | Total: ${formatCurrency(stats.total)}`;
          this.doc.text(statsText, this.config.safeZone + 2, this.currentY + 9);
          
          this.currentY += 14;
        }
      });
      
      // Add workfile total if available
      if (claimData.supplementInvoice.total) {
        this.currentY += 10;
        this.checkPageSpace(30);
        
        this.doc.setFillColor(30, 64, 175);
        this.doc.rect(this.config.safeZone, this.currentY, this.config.maxContentWidth, 20, 'F');
        
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFontSize(12);
        this.doc.setFont(undefined, 'bold');
        this.doc.text('COMPLETE WORKFILE TOTAL', this.config.safeZone + 5, this.currentY + 7);
        this.doc.text('(Original Estimate + All Supplements)', this.config.safeZone + 5, this.currentY + 12);
        
        this.doc.setFontSize(16);
        this.doc.text(formatCurrency(claimData.supplementInvoice.total), this.config.pageWidth - this.config.safeZone - 5, this.currentY + 12, { align: 'right' });
        
        this.currentY += 25;
      }
      
      // Add page numbers and footers
      this.addPageNumbersAndFooters();
      
      // Save the PDF
      this.doc.save(`Categorized-Claim-Report-${claimData.id}.pdf`);
      
    } catch (error) {
      console.error('Error generating categorized PDF:', error);
      throw new Error('Failed to generate categorized PDF report. Please try again.');
    }
  }
}

/**
 * Generates a categorized PDF report with items organized by their categories
 */
export const generateCategorizedPdfReport = (claimData: ClaimData) => {
  const generator = new CategorizedPdfGenerator();
  generator.generateReport(claimData);
};

/**
 * Enhanced CSV export with category information
 */
export const generateCategorizedCsvReport = (claimData: ClaimData) => {
  const formatCurrency = (amount: number) => amount.toFixed(2);
  
  let csvContent = '';
  
  // Header information
  csvContent += 'SupplementGuard Categorized Claim Analysis Report\n';
  csvContent += `Claim ID,"${claimData.id}"\n`;
  csvContent += `Generated,"${new Date().toLocaleDateString()}"\n\n`;
  
  // Changes Summary
  if (claimData.changesSummary) {
    csvContent += 'Changes Summary\n';
    csvContent += `New Items,${claimData.changesSummary.totalNewItems}\n`;
    csvContent += `Removed Items,${claimData.changesSummary.totalRemovedItems}\n`;
    csvContent += `Changed Items,${claimData.changesSummary.totalChangedItems}\n`;
    csvContent += `Unchanged Items,${claimData.changesSummary.totalUnchangedItems}\n`;
    csvContent += `Total Amount Change,${formatCurrency(claimData.changesSummary.totalAmountChange)}\n`;
    csvContent += `Percentage Change,${claimData.changesSummary.percentageChange.toFixed(2)}%\n\n`;
  }
  
  // Original invoice by category
  csvContent += 'Original Invoice - By Category\n';
  csvContent += 'Category,Line,Operation,Description,Quantity,Unit Price,Total,Labor Hours,Paint Hours\n';
  
  // Group by category
  const originalByCategory = claimData.originalInvoice.lineItems.reduce((acc, item) => {
    const category = item.category || 'UNCATEGORIZED';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof claimData.originalInvoice.lineItems>);
  
  Object.keys(originalByCategory).sort().forEach(category => {
    originalByCategory[category].forEach(item => {
      const escapedDesc = item.description.replace(/"/g, '""');
      csvContent += `"${category}",`;
      csvContent += `${item.lineNumber || '-'},`;
      csvContent += `"${item.operation || '-'}",`;
      csvContent += `"${escapedDesc}",`;
      csvContent += `${item.quantity},`;
      csvContent += `${formatCurrency(item.price)},`;
      csvContent += `${formatCurrency(item.total)},`;
      csvContent += `${item.laborHours || '-'},`;
      csvContent += `${item.paintHours || '-'}\n`;
    });
  });
  
  csvContent += `Subtotal,,,,,${formatCurrency(claimData.originalInvoice.subtotal)}\n`;
  csvContent += `Tax,,,,,${formatCurrency(claimData.originalInvoice.tax)}\n`;
  csvContent += `Total,,,,,${formatCurrency(claimData.originalInvoice.total)}\n\n`;
  
  // Supplement invoice by category with status
  csvContent += 'Supplement Invoice - By Category with Changes\n';
  csvContent += 'Category,Line,Operation,Description,Quantity,Unit Price,Total,Labor Hours,Paint Hours,Status\n';
  
  // Group by category
  const supplementByCategory = claimData.supplementInvoice.lineItems.reduce((acc, item) => {
    const category = item.category || 'UNCATEGORIZED';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof claimData.supplementInvoice.lineItems>);
  
  Object.keys(supplementByCategory).sort().forEach(category => {
    supplementByCategory[category].forEach(item => {
      const escapedDesc = item.description.replace(/"/g, '""');
      const status = item.isNew ? 'NEW' : item.isChanged ? 'CHANGED' : 'UNCHANGED';
      csvContent += `"${category}",`;
      csvContent += `${item.lineNumber || '-'},`;
      csvContent += `"${item.operation || '-'}",`;
      csvContent += `"${escapedDesc}",`;
      csvContent += `${item.quantity},`;
      csvContent += `${formatCurrency(item.price)},`;
      csvContent += `${formatCurrency(item.total)},`;
      csvContent += `${item.laborHours || '-'},`;
      csvContent += `${item.paintHours || '-'},`;
      csvContent += `"${status}"\n`;
    });
  });
  
  csvContent += `Subtotal,,,,,,${formatCurrency(claimData.supplementInvoice.subtotal)}\n`;
  csvContent += `Tax,,,,,,${formatCurrency(claimData.supplementInvoice.tax)}\n`;
  csvContent += `Total,,,,,,${formatCurrency(claimData.supplementInvoice.total)}\n`;
  
  const difference = claimData.supplementInvoice.total - claimData.originalInvoice.total;
  csvContent += `Cost Difference,,,,,,${formatCurrency(difference)}\n\n`;
  
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
  link.setAttribute('download', `Categorized-Claim-Report-${claimData.id}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};