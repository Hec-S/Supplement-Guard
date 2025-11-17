import jsPDF from 'jspdf';
import { ComparisonAnalysis, ClaimData } from '../types';
import { analysisSummaryService } from './analysisSummaryService';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

const formatPercentage = (value: number | null) =>
  value !== null ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : 'N/A';

export interface ChangeFocusedPdfOptions {
  includeExecutiveSummary?: boolean;
  includeRiskAssessment?: boolean;
  colorCoding?: boolean;
  branding?: {
    companyName?: string;
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
    };
  };
}

export class ChangeFocusedPdfService {
  private readonly defaultOptions: ChangeFocusedPdfOptions = {
    includeExecutiveSummary: true,
    includeRiskAssessment: true,
    colorCoding: true,
    branding: {
      companyName: 'SupplementGuard',
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        accent: '#3b82f6'
      }
    }
  };

  /**
   * Generates a change-focused PDF report showing only AI analysis of what changed
   */
  async generateChangeFocusedReport(
    analysis: ComparisonAnalysis,
    claimData?: ClaimData,
    options: Partial<ChangeFocusedPdfOptions> = {}
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options };
    const doc = new jsPDF('p', 'mm', 'a4');
    
    try {
      // Page 1: Analysis Summary
      await this.generateAIAnalysisPage(doc, analysis, claimData, opts);
      
      // Page 2+: Detailed Change Analysis
      doc.addPage();
      await this.generateDetailedChangesPage(doc, analysis, opts);
      
      // Add Disclaimer Page
      doc.addPage();
      await this.generateDisclaimerPage(doc, opts);
      
      // Add page numbers and footers
      this.addPageNumbersAndFooters(doc, opts);
      
      return new Blob([doc.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating change-focused PDF report:', error);
      throw new Error('Failed to generate change-focused PDF report');
    }
  }

  /**
   * Generates the main AI analysis page
   */
  private async generateAIAnalysisPage(
    doc: jsPDF,
    analysis: ComparisonAnalysis,
    claimData: ClaimData | undefined,
    options: ChangeFocusedPdfOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const safeZone = 25;
    let currentY = safeZone;

    // Helper function to check page space and add new page if needed
    const checkPageSpace = (requiredHeight: number) => {
      const availableSpace = pageHeight - safeZone - currentY;
      if (availableSpace < requiredHeight) {
        doc.addPage();
        currentY = safeZone;
      }
    };

    // Helper function to add text with proper wrapping
    const addSafeText = (text: string, x: number, maxWidth: number, fontSize: number = 12, fontStyle: string = 'normal') => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, fontStyle);
      const splitText = doc.splitTextToSize(text, maxWidth);
      const textHeight = splitText.length * 5;
      
      checkPageSpace(textHeight + 5);
      doc.text(splitText, x, currentY);
      currentY += textHeight;
      return textHeight;
    };

    // Header with branding
    if (options.branding?.companyName) {
      doc.setFontSize(24);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 64, 175); // Blue color
      const headerText = options.branding.companyName;
      const maxHeaderWidth = pageWidth - (2 * safeZone);
      addSafeText(headerText, safeZone, maxHeaderWidth, 24, 'bold');
      currentY += 5;
    }

    // Report title
    doc.setTextColor(51, 51, 51);
    const titleText = 'AI Analysis Report - Document Changes & Modifications';
    const maxTitleWidth = pageWidth - (2 * safeZone);
    addSafeText(titleText, safeZone, maxTitleWidth, 18, 'bold');
    currentY += 5;

    // Claim information
    doc.setTextColor(102, 102, 102);
    const claimText = claimData ? `Claim ID: ${claimData.id}` : `Analysis ID: ${analysis.analysisId}`;
    const dateText = `Generated: ${analysis.timestamp.toLocaleDateString()}`;
    
    addSafeText(claimText, safeZone, maxTitleWidth / 2, 12, 'normal');
    // Position date text properly
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - safeZone - dateWidth, currentY - 5);
    currentY += 10;

    // Separator line
    checkPageSpace(20);
    doc.setDrawColor(200, 200, 200);
    doc.line(safeZone, currentY, pageWidth - safeZone, currentY);
    currentY += 15;

    // Executive Summary Section
    if (options.includeExecutiveSummary) {
      checkPageSpace(80);
      doc.setTextColor(51, 51, 51);
      addSafeText('Executive Summary', safeZone, pageWidth - (2 * safeZone), 16, 'bold');
      currentY += 5;

      try {
        // Generate summary data
        const summaryData = analysisSummaryService.generateSummaryData(analysis);

        // Key metrics
        const summaryMetrics = [
          `Total Change: ${formatCurrency(summaryData.grandTotalSummary.netChange)}`,
          `Percentage Change: ${formatPercentage(summaryData.grandTotalSummary.percentageChange)}`,
          `Items Added: ${summaryData.changesByType.additions.count}`,
          `Items Removed: ${summaryData.changesByType.removals.count}`,
          `Price Increases: ${summaryData.changesByType.increases.count}`,
          `Price Decreases: ${summaryData.changesByType.decreases.count}`
        ];

        summaryMetrics.forEach(metric => {
          addSafeText(`• ${metric}`, safeZone, pageWidth - (2 * safeZone), 12, 'normal');
          currentY += 2;
        });

        currentY += 10;
      } catch (error) {
        console.error('Error generating executive summary:', error);
        addSafeText('Error generating executive summary. Please check the data and try again.', safeZone, pageWidth - (2 * safeZone), 12, 'normal');
        currentY += 10;
      }
    }

    // AI Analysis Insights Section
    checkPageSpace(60);
    doc.setTextColor(51, 51, 51);
    addSafeText('AI Analysis Insights', safeZone, pageWidth - (2 * safeZone), 16, 'bold');
    currentY += 5;

    // Generate AI insights based on the analysis
    const insights = this.generateAIInsights(analysis);
    insights.forEach(insight => {
      const text = `• ${insight}`;
      addSafeText(text, safeZone, pageWidth - (2 * safeZone), 12, 'normal');
      currentY += 3;
    });

    currentY += 10;

    // Risk Assessment Section
    if (options.includeRiskAssessment && analysis.riskAssessment) {
      checkPageSpace(60);
      doc.setTextColor(51, 51, 51);
      addSafeText('Risk Assessment', safeZone, pageWidth - (2 * safeZone), 16, 'bold');
      currentY += 5;

      // Risk level indicator
      const riskColor = this.getRiskColor(analysis.riskAssessment.riskLevel);
      doc.setFillColor(riskColor.r, riskColor.g, riskColor.b);
      doc.rect(safeZone, currentY, 100, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(analysis.riskAssessment.riskLevel.toUpperCase(), safeZone + 5, currentY + 6);
      currentY += 15;

      // Risk factors
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Key Risk Factors:', safeZone, currentY);
      currentY += 8;

      doc.setFont(undefined, 'normal');
      doc.setTextColor(102, 102, 102);
      analysis.riskAssessment.riskFactors.slice(0, 5).forEach(factor => {
        const text = `• ${factor.description}`;
        const splitText = doc.splitTextToSize(text, pageWidth - 2 * safeZone);
        doc.text(splitText, safeZone, currentY);
        currentY += splitText.length * 5 + 2;
      });

      currentY += 10;
    }

    // Change Summary Statistics
    checkPageSpace(80);
    doc.setTextColor(51, 51, 51);
    addSafeText('Change Summary Statistics', safeZone, pageWidth - (2 * safeZone), 16, 'bold');
    currentY += 10;

    // Statistics grid
    const statsData = [
      ['Total Items Analyzed', analysis.statistics.itemCount.toString()],
      ['Items with Changes', (analysis.reconciliation.matchedItems.filter(m => m.supplement.totalVariance !== 0).length + analysis.reconciliation.newSupplementItems.length + analysis.reconciliation.unmatchedOriginalItems.length).toString()],
      ['New Items Added', analysis.reconciliation.newSupplementItems.length.toString()],
      ['Items Removed', analysis.reconciliation.unmatchedOriginalItems.length.toString()],
      ['Total Variance', formatCurrency(analysis.statistics.totalVariance)],
      ['Match Accuracy', `${(analysis.reconciliation.matchingAccuracy * 100).toFixed(1)}%`]
    ];

    const colWidth = (pageWidth - 2 * margin) / 2;
    for (let i = 0; i < statsData.length; i += 2) {
      const y = currentY + Math.floor(i / 2) * 12;
      
      // Left column
      doc.setFont(undefined, 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(statsData[i][0] + ':', margin, y);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text(statsData[i][1], margin + 60, y);
      
      // Right column
      if (i + 1 < statsData.length) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(102, 102, 102);
        doc.text(statsData[i + 1][0] + ':', margin + colWidth, y);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(51, 51, 51);
        doc.text(statsData[i + 1][1], margin + colWidth + 60, y);
      }
    }
    currentY += Math.ceil(statsData.length / 2) * 12 + 15;
  }

  /**
   * Generates detailed changes page with color-coded line items
   */
  private async generateDetailedChangesPage(
    doc: jsPDF,
    analysis: ComparisonAnalysis,
    options: ChangeFocusedPdfOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const safeZone = 25;
    let currentY = safeZone;

    // Helper function to check page space and add new page if needed
    const checkPageSpace = (requiredHeight: number) => {
      const availableSpace = pageHeight - safeZone - currentY;
      if (availableSpace < requiredHeight) {
        doc.addPage();
        currentY = safeZone;
      }
    };

    // Page title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Detailed Change Analysis - Line by Line', margin, currentY);
    currentY += 15;

    // Color legend
    if (options.colorCoding) {
      checkPageSpace(40);
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Color Legend:', margin, currentY);
      currentY += 8;

      // Red for new items
      doc.setFillColor(254, 226, 226); // Light red
      doc.rect(margin, currentY, 15, 6, 'F');
      doc.setFont(undefined, 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text('New Items Added', margin + 20, currentY + 4);

      // Orange for changed items
      doc.setFillColor(255, 237, 213); // Light orange
      doc.rect(margin + 100, currentY, 15, 6, 'F');
      doc.text('Items Changed', margin + 120, currentY + 4);

      currentY += 15;
    }

    // NEW ITEMS SECTION
    if (analysis.reconciliation.newSupplementItems.length > 0) {
      checkPageSpace(60);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(220, 38, 127); // Pink/Red color
      doc.text(`NEW ITEMS ADDED (${analysis.reconciliation.newSupplementItems.length})`, margin, currentY);
      currentY += 12;

      // Table headers for new items
      const newItemHeaders = ['Description', 'Category', 'Quantity', 'Price', 'Total'];
      const newItemColWidths = [70, 30, 20, 25, 25];
      
      this.createTableHeader(doc, newItemHeaders, newItemColWidths, margin, currentY);
      currentY += 12;

      // New items data
      analysis.reconciliation.newSupplementItems.forEach((item, index) => {
        checkPageSpace(12);
        
        // RED background for new items
        if (options.colorCoding) {
          doc.setFillColor(254, 226, 226); // Light red
          doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 10, 'F');
        }

        const itemRowData = [
          this.truncateText(item.description, 40),
          this.truncateText(item.category, 15),
          item.quantity.toString(),
          formatCurrency(item.price),
          formatCurrency(item.total)
        ];

        this.createTableRow(doc, itemRowData, newItemColWidths, margin, currentY);
        currentY += 10;
      });

      currentY += 15;
    }

    // CHANGED ITEMS SECTION
    const changedItems = analysis.reconciliation.matchedItems.filter(match => match.supplement.totalVariance !== 0);
    if (changedItems.length > 0) {
      checkPageSpace(60);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(234, 88, 12); // Orange color
      doc.text(`ITEMS CHANGED (${changedItems.length})`, margin, currentY);
      currentY += 12;

      // Table headers for changed items
      const changedItemHeaders = ['Description', 'Change Type', 'Original', 'New', 'Variance', '%'];
      const changedItemColWidths = [60, 25, 25, 25, 25, 15];
      
      this.createTableHeader(doc, changedItemHeaders, changedItemColWidths, margin, currentY);
      currentY += 12;

      // Changed items data
      changedItems.forEach((match, index) => {
        checkPageSpace(12);
        
        // ORANGE background for changed items
        if (options.colorCoding) {
          doc.setFillColor(255, 237, 213); // Light orange
          doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 10, 'F');
        }

        const changeType = this.determineChangeType(match);
        const itemRowData = [
          this.truncateText(match.supplement.description, 35),
          changeType,
          formatCurrency(match.original.total),
          formatCurrency(match.supplement.total),
          formatCurrency(match.supplement.totalVariance),
          formatPercentage(match.supplement.totalChangePercent)
        ];

        this.createTableRow(doc, itemRowData, changedItemColWidths, margin, currentY);
        currentY += 10;
      });

      currentY += 15;
    }

    // REMOVED ITEMS SECTION
    if (analysis.reconciliation.unmatchedOriginalItems.length > 0) {
      checkPageSpace(60);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(107, 114, 128); // Gray color
      doc.text(`ITEMS REMOVED (${analysis.reconciliation.unmatchedOriginalItems.length})`, margin, currentY);
      currentY += 12;

      // Table headers for removed items
      const removedItemHeaders = ['Description', 'Category', 'Quantity', 'Price', 'Total'];
      const removedItemColWidths = [70, 30, 20, 25, 25];
      
      this.createTableHeader(doc, removedItemHeaders, removedItemColWidths, margin, currentY);
      currentY += 12;

      // Removed items data
      analysis.reconciliation.unmatchedOriginalItems.forEach((item, index) => {
        checkPageSpace(12);
        
        // Gray background for removed items
        if (options.colorCoding) {
          doc.setFillColor(229, 231, 235); // Light gray
          doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 10, 'F');
        }

        const itemRowData = [
          this.truncateText(item.description, 40),
          this.truncateText(item.category, 15),
          item.quantity.toString(),
          formatCurrency(item.price),
          formatCurrency(item.total)
        ];

        this.createTableRow(doc, itemRowData, removedItemColWidths, margin, currentY);
        currentY += 10;
      });

      currentY += 15;
    }

    // UNCHANGED ITEMS SUMMARY (if space allows)
    const unchangedItems = analysis.reconciliation.matchedItems.filter(match => match.supplement.totalVariance === 0);
    if (unchangedItems.length > 0 && currentY < pageHeight - 100) {
      checkPageSpace(40);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(34, 197, 94); // Green color
      doc.text(`UNCHANGED ITEMS: ${unchangedItems.length}`, margin, currentY);
      currentY += 8;

      doc.setFont(undefined, 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text('These items remained identical between the original and supplement documents.', margin, currentY);
      currentY += 15;
    }
  }

  // Helper methods
  private createTableHeader(doc: jsPDF, headers: string[], colWidths: number[], x: number, y: number): void {
    doc.setFillColor(240, 240, 240);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    
    let currentX = x;
    headers.forEach((header, i) => {
      const cellWidth = colWidths[i];
      doc.rect(currentX, y - 2, cellWidth, 10, 'F');
      
      // Wrap header text if needed
      const maxHeaderWidth = cellWidth - 4;
      const wrappedHeader = doc.splitTextToSize(header, maxHeaderWidth);
      doc.text(wrappedHeader, currentX + 2, y + 6);
      currentX += cellWidth;
    });
  }

  private createTableRow(doc: jsPDF, data: string[], colWidths: number[], x: number, y: number): void {
    doc.setFont(undefined, 'normal');
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(9);
    
    let currentX = x;
    data.forEach((cell, i) => {
      const cellWidth = colWidths[i] - 4;
      const cellText = String(cell || '');
      const wrapped = doc.splitTextToSize(cellText, cellWidth);
      doc.text(wrapped, currentX + 2, y + 6);
      currentX += colWidths[i];
    });
  }

  private addPageNumbersAndFooters(doc: jsPDF, options: ChangeFocusedPdfOptions): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Page number
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
      // Footer
      if (options.branding?.companyName) {
        doc.text(`Generated by ${options.branding.companyName}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
      }
    }
  }

  private getRiskColor(riskLevel: string): { r: number; g: number; b: number } {
    switch (riskLevel) {
      case 'critical': return { r: 239, g: 68, b: 68 };
      case 'high': return { r: 249, g: 115, b: 22 };
      case 'medium': return { r: 245, g: 158, b: 11 };
      default: return { r: 16, g: 185, b: 129 };
    }
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }

  private determineChangeType(match: any): string {
    if (match.supplement.priceVariance !== 0 && match.supplement.quantityVariance !== 0) {
      return 'PRICE+QTY';
    } else if (match.supplement.priceVariance !== 0) {
      return 'PRICE';
    } else if (match.supplement.quantityVariance !== 0) {
      return 'QUANTITY';
    } else {
      return 'OTHER';
    }
  }

  /**
   * Generates disclaimer page
   */
  private async generateDisclaimerPage(
    doc: jsPDF,
    options: ChangeFocusedPdfOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const safeZone = 25;
    let currentY = safeZone;
    
    // Helper function to check page space and add new page if needed
    const checkPageSpace = (requiredHeight: number) => {
      const availableSpace = pageHeight - safeZone - currentY;
      if (availableSpace < requiredHeight) {
        doc.addPage();
        currentY = safeZone;
      }
    };
    
    // Disclaimer title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(139, 0, 0); // Dark red
    doc.text('IMPORTANT DISCLAIMER', margin, currentY);
    currentY += 15;
    
    // Disclaimer content
    const disclaimerText = `ALL ESTIMATE AND SUPPLEMENT PAYMENTS WILL BE ISSUED TO THE VEHICLE OWNER.

The repair contract exists solely between the vehicle owner and the repair facility. The insurance company is not involved in this agreement and does not assume responsibility for repair quality, timelines, or costs. All repair-related disputes must be handled directly with the repair facility.

Please note: Any misrepresentation of repairs, labor, parts, or supplements—including unnecessary operations or inflated charges—may constitute insurance fraud and will result in further review or investigation.`;
    
    // Draw disclaimer box with border
    const disclaimerStartY = currentY - 5;
    
    // Split disclaimer into paragraphs for better formatting
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(51, 51, 51);
    
    const disclaimerParagraphs = disclaimerText.split('\n\n');
    disclaimerParagraphs.forEach((paragraph, index) => {
      if (index > 0) currentY += 8;
      
      const lines = doc.splitTextToSize(paragraph, pageWidth - 2 * margin - 10);
      checkPageSpace(lines.length * 5 + 5);
      doc.text(lines, margin + 5, currentY);
      currentY += lines.length * 5;
    });
    
    // Draw border around disclaimer
    const disclaimerEndY = currentY + 5;
    const disclaimerHeight = disclaimerEndY - disclaimerStartY;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(margin - 5, disclaimerStartY, pageWidth - 2 * margin + 10, disclaimerHeight, 'S');
  }

  private generateAIInsights(analysis: ComparisonAnalysis): string[] {
    const insights: string[] = [];
    
    // Total variance insight
    if (analysis.statistics.totalVariance > 0) {
      insights.push(`Total cost increased by ${formatCurrency(analysis.statistics.totalVariance)} (${formatPercentage(analysis.statistics.totalVariancePercent)})`);
    } else if (analysis.statistics.totalVariance < 0) {
      insights.push(`Total cost decreased by ${formatCurrency(Math.abs(analysis.statistics.totalVariance))} (${formatPercentage(Math.abs(analysis.statistics.totalVariancePercent || 0))})`);
    }

    // New items insight
    if (analysis.reconciliation.newSupplementItems.length > 0) {
      const newItemsTotal = analysis.reconciliation.newSupplementItems.reduce((sum, item) => sum + item.total, 0);
      insights.push(`${analysis.reconciliation.newSupplementItems.length} new items were added, contributing ${formatCurrency(newItemsTotal)} to the total cost`);
    }

    // Removed items insight
    if (analysis.reconciliation.unmatchedOriginalItems.length > 0) {
      const removedItemsTotal = analysis.reconciliation.unmatchedOriginalItems.reduce((sum, item) => sum + item.total, 0);
      insights.push(`${analysis.reconciliation.unmatchedOriginalItems.length} items were removed, reducing cost by ${formatCurrency(removedItemsTotal)}`);
    }

    // Changed items insight
    const changedItems = analysis.reconciliation.matchedItems.filter(match => match.supplement.totalVariance !== 0);
    if (changedItems.length > 0) {
      insights.push(`${changedItems.length} existing items had price or quantity changes`);
    }

    // Risk level insight
    if (analysis.riskAssessment.riskLevel === 'high' || analysis.riskAssessment.riskLevel === 'critical') {
      insights.push(`High risk detected: ${analysis.riskAssessment.riskFactors.length} risk factors identified`);
    }

    // Matching accuracy insight
    if (analysis.reconciliation.matchingAccuracy < 0.9) {
      insights.push(`Matching accuracy is ${(analysis.reconciliation.matchingAccuracy * 100).toFixed(1)}%, indicating potential data quality issues`);
    }

    return insights;
  }
}

// Export singleton instance
export const changeFocusedPdfService = new ChangeFocusedPdfService();