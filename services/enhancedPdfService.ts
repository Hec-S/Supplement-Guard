import jsPDF from 'jspdf';
import {
  ComparisonAnalysis,
  PdfExportOptions,
  ChartData,
  ChartType,
  CostCategory,
  VarianceType,
  SeverityLevel,
  AnalysisSummaryData
} from '../types';
import { analysisSummaryService } from './analysisSummaryService';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

const formatPercentage = (value: number | null) => 
  value !== null ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : 'N/A';

export class EnhancedPdfService {
  private readonly defaultOptions: PdfExportOptions = {
    includeCharts: true,
    includeDetailedAnalysis: true,
    includeDiscrepancies: true,
    includeStatistics: true,
    colorCoding: true,
    pageSize: 'A4',
    orientation: 'portrait',
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
   * Generates comprehensive PDF report with professional formatting
   */
  async generateComprehensiveReport(
    analysis: ComparisonAnalysis,
    options: Partial<PdfExportOptions> = {}
  ): Promise<Blob> {
    const opts = { ...this.defaultOptions, ...options };
    const doc = new jsPDF(opts.orientation, 'mm', opts.pageSize);
    
    try {
      // Page 1: Executive Summary
      await this.generateExecutiveSummaryPage(doc, analysis, opts);
      
      // Page 2: Analysis Summary (NEW)
      doc.addPage();
      await this.generateAnalysisSummaryPage(doc, analysis, opts);
      
      // Page 3: Statistical Analysis
      if (opts.includeStatistics) {
        doc.addPage();
        await this.generateStatisticalAnalysisPage(doc, analysis, opts);
      }
      
      // Page 4+: Detailed Comparison
      if (opts.includeDetailedAnalysis) {
        doc.addPage();
        await this.generateDetailedComparisonPages(doc, analysis, opts);
      }
      
      // Additional pages: Discrepancy Report
      if (opts.includeDiscrepancies && analysis.discrepancies.length > 0) {
        doc.addPage();
        await this.generateDiscrepancyReportPage(doc, analysis, opts);
      }
      
      // Add page numbers and footers
      this.addPageNumbersAndFooters(doc, opts);
      
      return new Blob([doc.output('blob')], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating comprehensive PDF report:', error);
      throw new Error('Failed to generate PDF report');
    }
  }

  /**
   * Generates executive summary page
   */
  private async generateExecutiveSummaryPage(
    doc: jsPDF,
    analysis: ComparisonAnalysis,
    options: PdfExportOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25; // Increased safe margin
    const safeZone = 30; // Extra safe zone for printing
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
    const addSafeText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, fontStyle: string = 'normal') => {
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
      doc.setTextColor(30, 64, 175); // Convert hex to RGB
      const headerText = options.branding.companyName;
      const maxHeaderWidth = pageWidth - (2 * safeZone);
      addSafeText(headerText, safeZone, currentY, maxHeaderWidth, 24, 'bold');
      currentY += 5;
    }

    // Report title
    doc.setTextColor(51, 51, 51);
    const titleText = 'Comprehensive Comparison Analysis Report';
    const maxTitleWidth = pageWidth - (2 * safeZone);
    addSafeText(titleText, safeZone, currentY, maxTitleWidth, 20, 'bold');
    currentY += 5;

    // Claim information
    doc.setTextColor(102, 102, 102);
    const claimText = `Claim ID: ${analysis.analysisId}`;
    const dateText = `Generated: ${analysis.timestamp.toLocaleDateString()}`;
    
    addSafeText(claimText, safeZone, currentY, maxTitleWidth / 2, 12, 'normal');
    // Position date text properly
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - safeZone - dateWidth, currentY - 5);
    currentY += 10;

    // Separator line
    checkPageSpace(20);
    doc.setDrawColor(200, 200, 200);
    doc.line(safeZone, currentY, pageWidth - safeZone, currentY);
    currentY += 15;

    // Key Metrics Section
    checkPageSpace(80); // Ensure enough space for metrics section
    doc.setTextColor(51, 51, 51);
    addSafeText('Key Financial Metrics', safeZone, currentY, pageWidth - (2 * safeZone), 16, 'bold');
    currentY += 5;

    // Metrics grid
    const metricsData = [
      ['Total Variance', formatCurrency(analysis.statistics.totalVariance)],
      ['Percentage Change', formatPercentage(analysis.statistics.totalVariancePercent)],
      ['Risk Score', `${analysis.riskAssessment.overallRiskScore}/100`],
      ['Risk Level', analysis.riskAssessment.riskLevel.toUpperCase()],
      ['Items Analyzed', analysis.statistics.itemCount.toString()],
      ['Match Accuracy', `${(analysis.reconciliation.matchingAccuracy * 100).toFixed(1)}%`]
    ];

    const colWidth = (pageWidth - 2 * margin) / 2;
    for (let i = 0; i < metricsData.length; i += 2) {
      const y = currentY + Math.floor(i / 2) * 15;
      
      // Left column
      doc.setFont(undefined, 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(metricsData[i][0] + ':', margin, y);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text(metricsData[i][1], margin + 60, y);
      
      // Right column
      if (i + 1 < metricsData.length) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(102, 102, 102);
        doc.text(metricsData[i + 1][0] + ':', margin + colWidth, y);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(51, 51, 51);
        doc.text(metricsData[i + 1][1], margin + colWidth + 60, y);
      }
    }
    currentY += Math.ceil(metricsData.length / 2) * 15 + 10;

    // Risk Assessment Section
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Risk Assessment', margin, currentY);
    currentY += 10;

    // Risk level indicator
    const riskColor = this.getRiskColor(analysis.riskAssessment.riskLevel);
    doc.setFillColor(riskColor.r, riskColor.g, riskColor.b);
    doc.rect(margin, currentY, 100, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(analysis.riskAssessment.riskLevel.toUpperCase(), margin + 5, currentY + 6);
    currentY += 15;

    // Risk factors
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Key Risk Factors:', margin, currentY);
    currentY += 8;

    doc.setFont(undefined, 'normal');
    doc.setTextColor(102, 102, 102);
    analysis.riskAssessment.riskFactors.slice(0, 5).forEach(factor => {
      const text = `• ${factor.description}`;
      const splitText = doc.splitTextToSize(text, pageWidth - 2 * margin);
      doc.text(splitText, margin, currentY);
      currentY += splitText.length * 5 + 2;
    });

    currentY += 10;

    // Recommendations Section
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Recommendations', margin, currentY);
    currentY += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(102, 102, 102);
    analysis.riskAssessment.recommendations.forEach(recommendation => {
      const text = `• ${recommendation}`;
      const splitText = doc.splitTextToSize(text, pageWidth - 2 * margin);
      doc.text(splitText, margin, currentY);
      currentY += splitText.length * 5 + 3;
    });

    // Category Breakdown Summary
    if (currentY < 200) {
      currentY += 15;
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Category Breakdown', margin, currentY);
      currentY += 10;

      // Category table
      const categories = Object.keys(analysis.statistics.categoryVariances) as CostCategory[];
      categories.forEach(category => {
        const categoryData = analysis.statistics.categoryVariances[category];
        if (categoryData.itemCount > 0) {
          doc.setFont(undefined, 'normal');
          doc.setTextColor(102, 102, 102);
          doc.text(`${category.charAt(0).toUpperCase() + category.slice(1)}:`, margin, currentY);
          doc.text(`${categoryData.itemCount} items`, margin + 60, currentY);
          doc.text(formatCurrency(categoryData.variance), margin + 100, currentY);
          doc.text(formatPercentage(categoryData.variancePercent), margin + 150, currentY);
          currentY += 8;
        }
      });
    }
  }

  /**
   * Generates Analysis Summary page with detailed pricing changes
   */
  private async generateAnalysisSummaryPage(
    doc: jsPDF,
    analysis: ComparisonAnalysis,
    options: PdfExportOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const safeZone = 30;
    let currentY = safeZone;

    // Helper function to check page space and add new page if needed
    const checkPageSpace = (requiredHeight: number) => {
      const availableSpace = pageHeight - safeZone - currentY;
      if (availableSpace < requiredHeight) {
        doc.addPage();
        currentY = safeZone;
      }
    };

    try {
      // Generate summary data
      const summaryData: AnalysisSummaryData = analysisSummaryService.generateSummaryData(analysis);

      // Page title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Analysis Summary - Pricing Changes & Modifications', margin, currentY);
      currentY += 15;

      // Executive Summary Cards Section
      checkPageSpace(60);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Executive Summary', margin, currentY);
      currentY += 10;

      // Create summary metrics grid
      const summaryMetrics = [
        ['Total Change', formatCurrency(summaryData.grandTotalSummary.netChange)],
        ['Percentage Change', formatPercentage(summaryData.grandTotalSummary.percentageChange)],
        ['Items Added', summaryData.changesByType.additions.count.toString()],
        ['Items Removed', summaryData.changesByType.removals.count.toString()],
        ['Price Increases', summaryData.changesByType.increases.count.toString()],
        ['Price Decreases', summaryData.changesByType.decreases.count.toString()]
      ];

      const colWidth = (pageWidth - 2 * margin) / 2;
      for (let i = 0; i < summaryMetrics.length; i += 2) {
        const y = currentY + Math.floor(i / 2) * 12;
        
        // Left column
        doc.setFont(undefined, 'normal');
        doc.setTextColor(102, 102, 102);
        doc.text(summaryMetrics[i][0] + ':', margin, y);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(51, 51, 51);
        doc.text(summaryMetrics[i][1], margin + 60, y);
        
        // Right column
        if (i + 1 < summaryMetrics.length) {
          doc.setFont(undefined, 'normal');
          doc.setTextColor(102, 102, 102);
          doc.text(summaryMetrics[i + 1][0] + ':', margin + colWidth, y);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(51, 51, 51);
          doc.text(summaryMetrics[i + 1][1], margin + colWidth + 60, y);
        }
      }
      currentY += Math.ceil(summaryMetrics.length / 2) * 12 + 15;

      // Category Breakdown Section
      checkPageSpace(80);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Category Breakdown', margin, currentY);
      currentY += 10;

      // Category table headers
      const categoryHeaders = ['Category', 'Items', 'Net Change', 'Percentage'];
      const categoryColWidths = [50, 30, 40, 40];
      
      this.createTableHeader(doc, categoryHeaders, categoryColWidths, margin, currentY);
      currentY += 12;

      // Category data rows
      summaryData.categoryBreakdown.forEach((category, index) => {
        if (category.hasChanges) {
          checkPageSpace(10);
          
          // Color coding based on net change
          if (options.colorCoding) {
            if (category.subtotal.netChange > 0) {
              doc.setFillColor(254, 226, 226); // Light red for increases
            } else if (category.subtotal.netChange < 0) {
              doc.setFillColor(220, 252, 231); // Light green for decreases
            } else {
              doc.setFillColor(248, 250, 252); // Light gray for no change
            }
            doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 10, 'F');
          }

          const categoryRowData = [
            category.categoryDisplayName,
            category.subtotal.itemCount.toString(),
            formatCurrency(category.subtotal.netChange),
            category.subtotal.percentageChange !== null ? formatPercentage(category.subtotal.percentageChange) : 'N/A'
          ];

          this.createTableRow(doc, categoryRowData, categoryColWidths, margin, currentY);
          currentY += 10;
        }
      });

      currentY += 10;

      // Detailed Line Items Section (Top 10 Most Significant Changes)
      checkPageSpace(100);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Most Significant Changes (Top 10)', margin, currentY);
      currentY += 10;

      // Get top 10 most significant changes
      const allItems = summaryData.categoryBreakdown.flatMap(cat => cat.items);
      const significantItems = allItems
        .filter(item => item.isSignificant)
        .sort((a, b) => Math.abs(b.dollarChange) - Math.abs(a.dollarChange))
        .slice(0, 10);

      if (significantItems.length > 0) {
        // Line items table headers
        const itemHeaders = ['Description', 'Type', 'Original', 'Supplement', 'Change', '%'];
        const itemColWidths = [60, 20, 25, 25, 25, 15];
        
        this.createTableHeader(doc, itemHeaders, itemColWidths, margin, currentY);
        currentY += 12;

        significantItems.forEach((item, index) => {
          checkPageSpace(12);
          
          // Color coding based on change type
          if (options.colorCoding) {
            const colors = {
              increase: { r: 254, g: 226, b: 226 }, // Light red
              decrease: { r: 220, g: 252, b: 231 }, // Light green
              new: { r: 219, g: 234, b: 254 }, // Light blue
              removed: { r: 229, g: 231, b: 235 }, // Light gray
              unchanged: { r: 248, g: 250, b: 252 } // Very light gray
            };
            const color = colors[item.changeType] || colors.unchanged;
            doc.setFillColor(color.r, color.g, color.b);
            doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 10, 'F');
          }

          const itemRowData = [
            this.truncateText(item.description, 35),
            item.changeType.toUpperCase(),
            item.originalAmount !== null ? formatCurrency(item.originalAmount) : '-',
            item.supplementAmount !== null ? formatCurrency(item.supplementAmount) : '-',
            formatCurrency(item.dollarChange),
            item.percentageChange !== null ? formatPercentage(item.percentageChange) : 'N/A'
          ];

          this.createTableRow(doc, itemRowData, itemColWidths, margin, currentY);
          currentY += 10;
        });
      } else {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(102, 102, 102);
        doc.text('No significant changes detected.', margin, currentY);
        currentY += 15;
      }

      // Grand Total Summary Section
      checkPageSpace(60);
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Grand Total Summary', margin, currentY);
      currentY += 10;

      // Grand total box with background
      const boxHeight = 40;
      doc.setFillColor(51, 51, 51); // Dark background
      doc.rect(margin, currentY, pageWidth - 2 * margin, boxHeight, 'F');

      // Grand total content
      doc.setTextColor(255, 255, 255); // White text
      doc.setFont(undefined, 'normal');
      doc.setFontSize(12);
      doc.text('Original Total:', margin + 10, currentY + 12);
      doc.text(formatCurrency(summaryData.grandTotalSummary.originalTotal), margin + 80, currentY + 12);

      doc.text('Supplement Total:', margin + 10, currentY + 22);
      doc.text(formatCurrency(summaryData.grandTotalSummary.supplementTotal), margin + 80, currentY + 22);

      doc.setFont(undefined, 'bold');
      doc.setFontSize(14);
      const netChangeColor = summaryData.grandTotalSummary.netChange >= 0 ? 'red' : 'green';
      if (summaryData.grandTotalSummary.netChange >= 0) {
        doc.setTextColor(255, 182, 193); // Light red
      } else {
        doc.setTextColor(144, 238, 144); // Light green
      }
      doc.text('Net Change:', margin + 10, currentY + 34);
      doc.text(
        `${summaryData.grandTotalSummary.netChange >= 0 ? '+' : ''}${formatCurrency(summaryData.grandTotalSummary.netChange)}`,
        margin + 80,
        currentY + 34
      );

      currentY += boxHeight + 15;

      // Risk Indicators (if any)
      if (summaryData.grandTotalSummary.riskIndicators.length > 0) {
        checkPageSpace(40);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 102, 0); // Orange
        doc.text('Risk Indicators', margin, currentY);
        currentY += 10;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(12);
        doc.setTextColor(51, 51, 51);
        summaryData.grandTotalSummary.riskIndicators.forEach(indicator => {
          const text = `• ${indicator.description} (${indicator.severity.toUpperCase()})`;
          const splitText = doc.splitTextToSize(text, pageWidth - 2 * margin);
          doc.text(splitText, margin, currentY);
          currentY += splitText.length * 5 + 3;
        });
      }

    } catch (error) {
      console.error('Error generating Analysis Summary page:', error);
      // Fallback content
      doc.setFont(undefined, 'normal');
      doc.setTextColor(255, 0, 0);
      doc.text('Error generating Analysis Summary. Please check the data and try again.', margin, currentY);
    }
  }

  /**
   * Generates statistical analysis page with charts
   */
  private async generateStatisticalAnalysisPage(
    doc: jsPDF, 
    analysis: ComparisonAnalysis, 
    options: PdfExportOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = 30;

    // Page title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Statistical Analysis', margin, currentY);
    currentY += 15;

    // Variance Distribution Section
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Variance Distribution by Type', margin, currentY);
    currentY += 10;

    // Create variance type table
    const varianceTypes = Object.keys(analysis.statistics.varianceTypeDistribution) as VarianceType[];
    const tableData = varianceTypes.map(type => {
      const data = analysis.statistics.varianceTypeDistribution[type];
      return [
        this.getVarianceTypeLabel(type),
        data.count.toString(),
        formatCurrency(data.totalAmount),
        `${data.percentage.toFixed(1)}%`
      ];
    });

    this.createTable(doc, 
      ['Change Type', 'Count', 'Total Amount', 'Percentage'],
      tableData,
      margin,
      currentY,
      pageWidth - 2 * margin
    );
    currentY += (tableData.length + 2) * 8 + 15;

    // Statistical Measures
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Statistical Measures', margin, currentY);
    currentY += 10;

    const statsData = [
      ['Mean Variance', formatCurrency(analysis.statistics.averageVariance)],
      ['Median Variance', formatCurrency(analysis.statistics.medianVariance)],
      ['Standard Deviation', formatCurrency(analysis.statistics.standardDeviation)],
      ['Variance Range', `${formatCurrency(analysis.statistics.varianceRange.min)} to ${formatCurrency(analysis.statistics.varianceRange.max)}`]
    ];

    statsData.forEach(([label, value]) => {
      doc.setFont(undefined, 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(`${label}:`, margin, currentY);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text(value, margin + 80, currentY);
      currentY += 8;
    });

    currentY += 10;

    // Data Quality Assessment
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Data Quality Assessment', margin, currentY);
    currentY += 10;

    const qualityMetrics = [
      ['Completeness', `${(analysis.statistics.dataQuality.completeness * 100).toFixed(1)}%`],
      ['Consistency', `${(analysis.statistics.dataQuality.consistency * 100).toFixed(1)}%`],
      ['Accuracy', `${(analysis.statistics.dataQuality.accuracy * 100).toFixed(1)}%`],
      ['Precision', `${(analysis.statistics.dataQuality.precision * 100).toFixed(1)}%`]
    ];

    qualityMetrics.forEach(([metric, score]) => {
      doc.setFont(undefined, 'normal');
      doc.setTextColor(102, 102, 102);
      doc.text(`${metric}:`, margin, currentY);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text(score, margin + 80, currentY);
      currentY += 8;
    });

    // Suspicious Patterns
    if (analysis.statistics.suspiciousPatterns.length > 0) {
      currentY += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Suspicious Patterns Detected', margin, currentY);
      currentY += 10;

      analysis.statistics.suspiciousPatterns.forEach(pattern => {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(204, 102, 0); // Orange color for warnings
        const text = `• ${pattern.description} (Confidence: ${(pattern.confidence * 100).toFixed(1)}%)`;
        const splitText = doc.splitTextToSize(text, pageWidth - 2 * margin);
        doc.text(splitText, margin, currentY);
        currentY += splitText.length * 5 + 3;
      });
    }
  }

  /**
   * Generates detailed comparison pages
   */
  private async generateDetailedComparisonPages(
    doc: jsPDF, 
    analysis: ComparisonAnalysis, 
    options: PdfExportOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = 30;

    // Page title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Detailed Line Item Comparison', margin, currentY);
    currentY += 15;

    // Table headers
    const headers = ['Description', 'Category', 'Original', 'Supplement', 'Variance', 'Change %'];
    const colWidths = [60, 25, 30, 30, 25, 20];
    
    this.createTableHeader(doc, headers, colWidths, margin, currentY);
    currentY += 10;

    // Process matched items
    for (const match of analysis.reconciliation.matchedItems) {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = 30;
        this.createTableHeader(doc, headers, colWidths, margin, currentY);
        currentY += 10;
      }

      const rowData = [
        this.truncateText(match.supplement.description, 35),
        match.supplement.category.substring(0, 8),
        formatCurrency(match.original.total),
        formatCurrency(match.supplement.total),
        formatCurrency(match.supplement.totalVariance),
        formatPercentage(match.supplement.totalChangePercent)
      ];

      // Color coding based on variance
      if (options.colorCoding) {
        const variance = match.supplement.totalVariance;
        if (variance > 0) {
          doc.setFillColor(254, 226, 226); // Light red
        } else if (variance < 0) {
          doc.setFillColor(220, 252, 231); // Light green
        } else {
          doc.setFillColor(248, 250, 252); // Light gray
        }
        doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 8, 'F');
      }

      this.createTableRow(doc, rowData, colWidths, margin, currentY);
      currentY += 8;

      // Add significant variance indicator
      if (match.supplement.hasSignificantVariance) {
        doc.setTextColor(255, 102, 0);
        doc.setFont(undefined, 'bold');
        doc.text('⚠', margin - 5, currentY - 4);
      }
    }

    // Add new items
    if (analysis.reconciliation.newSupplementItems.length > 0) {
      currentY += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('New Items in Supplement', margin, currentY);
      currentY += 10;

      for (const item of analysis.reconciliation.newSupplementItems) {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 30;
        }

        if (options.colorCoding) {
          doc.setFillColor(219, 234, 254); // Light blue
          doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 8, 'F');
        }

        const rowData = [
          this.truncateText(item.description, 35),
          item.category.substring(0, 8),
          '-',
          formatCurrency(item.total),
          formatCurrency(item.total),
          'NEW'
        ];

        this.createTableRow(doc, rowData, colWidths, margin, currentY);
        currentY += 8;
      }
    }

    // Add removed items
    if (analysis.reconciliation.unmatchedOriginalItems.length > 0) {
      currentY += 10;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Items Removed from Original', margin, currentY);
      currentY += 10;

      for (const item of analysis.reconciliation.unmatchedOriginalItems) {
        if (currentY > pageHeight - 40) {
          doc.addPage();
          currentY = 30;
        }

        if (options.colorCoding) {
          doc.setFillColor(229, 231, 235); // Light gray
          doc.rect(margin, currentY - 2, pageWidth - 2 * margin, 8, 'F');
        }

        const rowData = [
          this.truncateText(item.description, 35),
          item.category.substring(0, 8),
          formatCurrency(item.total),
          '-',
          formatCurrency(-item.total),
          'REMOVED'
        ];

        this.createTableRow(doc, rowData, colWidths, margin, currentY);
        currentY += 8;
      }
    }
  }

  /**
   * Generates discrepancy report page
   */
  private async generateDiscrepancyReportPage(
    doc: jsPDF, 
    analysis: ComparisonAnalysis, 
    options: PdfExportOptions
  ): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = 30;

    // Page title
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Discrepancy Report', margin, currentY);
    currentY += 15;

    if (analysis.discrepancies.length === 0) {
      doc.setFontSize(12);
      doc.setTextColor(102, 102, 102);
      doc.text('No discrepancies detected in this analysis.', margin, currentY);
      return;
    }

    // Group discrepancies by severity
    const groupedDiscrepancies = analysis.discrepancies.reduce((groups, discrepancy) => {
      const severity = discrepancy.severity;
      if (!groups[severity]) groups[severity] = [];
      groups[severity].push(discrepancy);
      return groups;
    }, {} as Record<SeverityLevel, typeof analysis.discrepancies>);

    // Process each severity level
    const severityOrder: SeverityLevel[] = [SeverityLevel.CRITICAL, SeverityLevel.HIGH, SeverityLevel.MEDIUM, SeverityLevel.LOW];
    
    for (const severity of severityOrder) {
      const discrepancies = groupedDiscrepancies[severity];
      if (!discrepancies || discrepancies.length === 0) continue;

      // Severity section header
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      const severityColor = this.getSeverityColor(severity);
      doc.setTextColor(severityColor.r, severityColor.g, severityColor.b);
      doc.text(`${severity.toUpperCase()} SEVERITY (${discrepancies.length})`, margin, currentY);
      currentY += 10;

      // List discrepancies
      discrepancies.forEach(discrepancy => {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(51, 51, 51);
        doc.text(`• ${discrepancy.description}`, margin, currentY);
        currentY += 6;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(102, 102, 102);
        const explanation = doc.splitTextToSize(discrepancy.detailedExplanation, pageWidth - 2 * margin - 10);
        doc.text(explanation, margin + 5, currentY);
        currentY += explanation.length * 4 + 2;

        if (discrepancy.recommendedAction) {
          doc.setFont(undefined, 'italic');
          doc.setTextColor(0, 102, 204);
          const action = doc.splitTextToSize(`Recommended: ${discrepancy.recommendedAction}`, pageWidth - 2 * margin - 10);
          doc.text(action, margin + 5, currentY);
          currentY += action.length * 4 + 5;
        }

        currentY += 3;
      });

      currentY += 5;
    }
  }

  // Helper methods
  private createTable(
    doc: jsPDF,
    headers: string[],
    data: string[][],
    x: number,
    y: number,
    width: number
  ): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const safeZone = 30;
    const colWidth = width / headers.length;
    let currentY = y;
    
    // Check if table fits on current page
    const estimatedTableHeight = (data.length + 1) * 10; // Rough estimate
    if (currentY + estimatedTableHeight > pageHeight - safeZone) {
      doc.addPage();
      currentY = safeZone;
    }
    
    // Headers with proper text wrapping
    doc.setFillColor(240, 240, 240);
    doc.rect(x, currentY, width, 10, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(10);
    
    headers.forEach((header, i) => {
      const cellX = x + i * colWidth;
      const maxCellWidth = colWidth - 4;
      const wrappedHeader = doc.splitTextToSize(header, maxCellWidth);
      doc.text(wrappedHeader, cellX + 2, currentY + 7);
    });
    currentY += 12;

    // Data rows with proper wrapping and page breaks
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    
    data.forEach((row, rowIndex) => {
      // Calculate row height based on content
      let maxRowHeight = 8;
      const wrappedCells: string[][] = [];
      
      row.forEach((cell, colIndex) => {
        const cellWidth = colWidth - 4;
        const cellText = String(cell || '');
        const wrapped = doc.splitTextToSize(cellText, cellWidth);
        wrappedCells.push(wrapped);
        maxRowHeight = Math.max(maxRowHeight, wrapped.length * 4 + 4);
      });
      
      // Check if row fits on current page
      if (currentY + maxRowHeight > pageHeight - safeZone) {
        doc.addPage();
        currentY = safeZone;
        
        // Redraw headers on new page
        doc.setFillColor(240, 240, 240);
        doc.rect(x, currentY, width, 10, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        headers.forEach((header, i) => {
          const cellX = x + i * colWidth;
          const maxCellWidth = colWidth - 4;
          const wrappedHeader = doc.splitTextToSize(header, maxCellWidth);
          doc.text(wrappedHeader, cellX + 2, currentY + 7);
        });
        currentY += 12;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
      }
      
      // Draw alternating row background
      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(x, currentY, width, maxRowHeight, 'F');
      }
      
      // Draw cell content
      wrappedCells.forEach((cellLines, colIndex) => {
        const cellX = x + colIndex * colWidth;
        doc.text(cellLines, cellX + 2, currentY + 6);
      });
      
      currentY += maxRowHeight;
    });
  }

  private createTableHeader(doc: jsPDF, headers: string[], colWidths: number[], x: number, y: number): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const safeZone = 30;
    
    // Check if header fits on current page
    if (y + 10 > pageHeight - safeZone) {
      doc.addPage();
      y = safeZone;
    }
    
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const safeZone = 30;
    
    // Calculate row height based on content
    let maxRowHeight = 8;
    const wrappedCells: string[][] = [];
    
    data.forEach((cell, i) => {
      const cellWidth = colWidths[i] - 4;
      const cellText = String(cell || '');
      const wrapped = doc.splitTextToSize(cellText, cellWidth);
      wrappedCells.push(wrapped);
      maxRowHeight = Math.max(maxRowHeight, wrapped.length * 4 + 4);
    });
    
    // Check if row fits on current page
    if (y + maxRowHeight > pageHeight - safeZone) {
      doc.addPage();
      y = safeZone;
    }
    
    doc.setFont(undefined, 'normal');
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(9);
    
    let currentX = x;
    wrappedCells.forEach((cellLines, i) => {
      doc.text(cellLines, currentX + 2, y + 6);
      currentX += colWidths[i];
    });
  }

  private addPageNumbersAndFooters(doc: jsPDF, options: PdfExportOptions): void {
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

  private getSeverityColor(severity: SeverityLevel): { r: number; g: number; b: number } {
    switch (severity) {
      case SeverityLevel.CRITICAL: return { r: 239, g: 68, b: 68 };
      case SeverityLevel.HIGH: return { r: 249, g: 115, b: 22 };
      case SeverityLevel.MEDIUM: return { r: 245, g: 158, b: 11 };
      default: return { r: 59, g: 130, b: 246 };
    }
  }

  private getVarianceTypeLabel(type: VarianceType): string {
    switch (type) {
      case VarianceType.NEW_ITEM: return 'New Items';
      case VarianceType.REMOVED_ITEM: return 'Removed Items';
      case VarianceType.QUANTITY_CHANGE: return 'Quantity Changes';
      case VarianceType.PRICE_CHANGE: return 'Price Changes';
      case VarianceType.DESCRIPTION_CHANGE: return 'Description Changes';
      case VarianceType.NO_CHANGE: return 'No Changes';
      default: return type;
    }
  }

  private truncateText(text: string, maxLength: number): string {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  }
}

// Export singleton instance
export const enhancedPdfService = new EnhancedPdfService();