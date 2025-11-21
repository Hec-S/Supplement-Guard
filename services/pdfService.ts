import jsPDF from 'jspdf';
import { ClaimData, ComparisonAnalysis } from '../types';
import { analysisSummaryService } from './analysisSummaryService';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

const formatPercentage = (value: number | null) =>
  value !== null ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : 'N/A';

/**
 * Generates a comprehensive PDF report for a claim analysis.
 * @param claimData The claim data to be included in the report.
 * @param comparisonAnalysis Optional comparison analysis for enhanced reporting.
 */
export const generatePdfReport = (claimData: ClaimData, comparisonAnalysis?: ComparisonAnalysis) => {
  try {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const safeZone = 25; // Increased safe margin for printing
    const maxContentWidth = pageWidth - (2 * safeZone);
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

    // Header
    doc.setTextColor(30, 64, 175); // Blue color
    addSafeText('SupplementGuard Claim Report', safeZone, maxContentWidth, 20, 'bold');
    
    currentY += 8;
    
    // Debug logging to see what data we have
    console.log('=== PDF HEADER DEBUG ===');
    console.log('Claim Number:', claimData.claimNumber);
    console.log('Vehicle Info:', claimData.vehicleInfo);
    console.log('=======================');
    
    // Create prominent header info section with claim number and vehicle
    doc.setFillColor(240, 245, 255); // Light blue background
    const headerBoxHeight = claimData.vehicleInfo ? 25 : 15; // Adjust height based on content
    doc.rect(safeZone - 5, currentY - 5, maxContentWidth + 10, headerBoxHeight, 'F');
    
    // Use actual Claim # if available, otherwise fall back to generated ID
    const claimText = claimData.claimNumber
      ? `Claim #: ${claimData.claimNumber}`
      : `Claim ID: ${claimData.id}`;
    
    // Create vehicle text if vehicle info is available
    let vehicleText = '';
    if (claimData.vehicleInfo) {
      const { year, make, model, vin, description } = claimData.vehicleInfo;
      
      // Try to use the full description first if available
      if (description) {
        vehicleText = description;
      } else {
        // Otherwise build from year, make, model
        const vehicleDescription = [year, make, model].filter(Boolean).join(' ');
        if (vehicleDescription) {
          vehicleText = vehicleDescription;
        }
      }
    }
    
    // Display claim number prominently
    doc.setTextColor(30, 64, 175); // Blue color
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(claimText, safeZone, currentY + 5);
    
    // Display vehicle info prominently if available
    if (vehicleText) {
      doc.setTextColor(51, 51, 51); // Dark gray
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      // Wrap long vehicle descriptions
      const wrappedVehicle = doc.splitTextToSize(`Vehicle: ${vehicleText}`, maxContentWidth - 40);
      doc.text(wrappedVehicle, safeZone, currentY + 13);
    }
    
    // Position date text on the right
    const dateText = `Generated: ${new Date().toLocaleDateString()}`;
    doc.setTextColor(102, 102, 102); // Gray color
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - safeZone - dateWidth, currentY + 8);
    
    currentY += headerBoxHeight + 5;

    // Line separator
    currentY += 10;
    checkPageSpace(20);
    doc.setDrawColor(200, 200, 200);
    doc.line(safeZone, currentY, pageWidth - safeZone, currentY);
    currentY += 15;

    // Changes Overview Section
    checkPageSpace(60);
    doc.setTextColor(51, 51, 51);
    addSafeText('Changes Overview', safeZone, maxContentWidth, 16, 'bold');
    currentY += 5;

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
      addSafeText(point, safeZone, maxContentWidth, 12, 'normal');
      currentY += 3;
    });

    currentY += 10;

    // Disclaimer Section (moved here from bottom)
    checkPageSpace(100);
    
    // Disclaimer box with border
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    
    // Calculate disclaimer height
    const disclaimerTitle = 'IMPORTANT DISCLAIMER';
    const disclaimerText = `ALL ESTIMATE AND SUPPLEMENT PAYMENTS WILL BE ISSUED TO THE VEHICLE OWNER.

The repair contract exists solely between the vehicle owner and the repair facility. The insurance company is not involved in this agreement and does not assume responsibility for repair quality, timelines, or costs. All repair-related disputes must be handled directly with the repair facility.

Please note: Any misrepresentation of repairs, labor, parts, or supplements—including unnecessary operations or inflated charges—may constitute insurance fraud and will result in further review or investigation.`;
    
    // Draw disclaimer background
    const disclaimerStartY = currentY;
    
    // Add disclaimer title
    doc.setTextColor(139, 0, 0); // Dark red color for title
    doc.setFont(undefined, 'bold');
    addSafeText(disclaimerTitle, safeZone, maxContentWidth, 14, 'bold');
    currentY += 8;
    
    // Add disclaimer content
    doc.setTextColor(51, 51, 51); // Dark gray for text
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    
    // Split disclaimer into paragraphs for better formatting
    const disclaimerParagraphs = disclaimerText.split('\n\n');
    disclaimerParagraphs.forEach((paragraph, index) => {
      const lines = doc.splitTextToSize(paragraph, maxContentWidth - 10);
      checkPageSpace(lines.length * 4 + 5);
      
      // Add some padding for readability
      if (index > 0) currentY += 5;
      
      doc.text(lines, safeZone + 5, currentY);
      currentY += lines.length * 4;
    });
    
    // Draw border around disclaimer
    const disclaimerEndY = currentY + 5;
    const disclaimerHeight = disclaimerEndY - disclaimerStartY;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(safeZone - 5, disclaimerStartY - 5, maxContentWidth + 10, disclaimerHeight, 'S');
    
    currentY = disclaimerEndY + 15;

    // Original Invoice Section - Check if categories exist
    // Add visual distinction with colored header box
    checkPageSpace(100);
    
    // Draw blue background box for Original Invoice header
    doc.setFillColor(59, 130, 246); // Blue color
    doc.rect(safeZone - 5, currentY - 5, maxContentWidth + 10, 15, 'F');
    
    // Add white text on blue background
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('ORIGINAL INVOICE', safeZone, currentY + 5);
    
    currentY += 20;
    doc.setTextColor(51, 51, 51); // Reset to dark gray

    // Check if items have categories
    const originalHasCategories = claimData.originalInvoice.lineItems.some(item => item.category);

    if (originalHasCategories) {
      // Group items by category
      const originalByCategory = claimData.originalInvoice.lineItems.reduce((acc, item) => {
        const category = item.category || 'UNCATEGORIZED';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, typeof claimData.originalInvoice.lineItems>);

      // Process each category
      Object.keys(originalByCategory).sort().forEach(category => {
        const categoryItems = originalByCategory[category];
        if (categoryItems.length === 0) return;

        // Add category header
        checkPageSpace(15);
        doc.setFillColor(240, 240, 240);
        doc.rect(safeZone, currentY, maxContentWidth, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(category, safeZone + 2, currentY + 5);
        currentY += 10;

        // Create table for this category
        const originalHeaders = ['Description', 'Qty', 'Price', 'Total'];
        const categoryData = categoryItems.map(item => [
          item.description,
          item.quantity.toString(),
          formatCurrency(item.price),
          formatCurrency(item.total)
        ]);

        createImprovedTable(doc, originalHeaders, categoryData, safeZone, currentY, maxContentWidth);
        currentY += (categoryData.length + 1) * 8 + 5;
      });

      // Add totals section
      currentY += 10;
      checkPageSpace(30);
      doc.setFillColor(230, 230, 230);
      doc.rect(safeZone, currentY, maxContentWidth, 25, 'F');
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      
      doc.text(`SUBTOTAL: ${formatCurrency(claimData.originalInvoice.subtotal)}`, safeZone + 5, currentY + 8);
      doc.text(`TAX: ${formatCurrency(claimData.originalInvoice.tax)}`, safeZone + 5, currentY + 15);
      doc.text(`TOTAL: ${formatCurrency(claimData.originalInvoice.total)}`, safeZone + 5, currentY + 22);
      
      currentY += 30;
    } else {
      // Fallback to original flat table if no categories
      // Create table for original invoice
      const originalHeaders = ['Description', 'Qty', 'Price', 'Total'];
      const originalData = claimData.originalInvoice.lineItems.map(item => [
        item.description,
        item.quantity.toString(),
        formatCurrency(item.price),
        formatCurrency(item.total)
      ]);
      
      // Add totals rows
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
      
      createImprovedTable(doc, originalHeaders, originalData, safeZone, currentY, maxContentWidth);
      currentY += (originalData.length + 1) * 8 + 10;
    }

    // Add TOTALS SUMMARY for Original Invoice
    currentY += 10;
    const originalTotalsSummary = claimData.originalInvoice.totalsSummary ||
                                  generateTotalsSummaryFromLineItems(claimData.originalInvoice);
    currentY = createTotalsSummaryTable(doc, originalTotalsSummary, safeZone, currentY, maxContentWidth, false);

    // Supplement Invoice Section - Check if categories exist
    // Add page break for clear separation
    doc.addPage();
    currentY = safeZone;
    
    // Draw green background box for Supplement Invoice header
    doc.setFillColor(34, 197, 94); // Green color
    doc.rect(safeZone - 5, currentY - 5, maxContentWidth + 10, 15, 'F');
    
    // Add white text on green background
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('SUPPLEMENT INVOICE', safeZone, currentY + 5);
    
    currentY += 20;
    doc.setTextColor(51, 51, 51); // Reset to dark gray

    // Check if items have categories
    const hasCategories = claimData.supplementInvoice.lineItems.some(item => item.category);

    if (hasCategories) {
      // Group items by category
      const itemsByCategory = claimData.supplementInvoice.lineItems.reduce((acc, item) => {
        const category = item.category || 'UNCATEGORIZED';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      }, {} as Record<string, typeof claimData.supplementInvoice.lineItems>);

      // Also add removed items from original
      const removedItems = claimData.originalInvoice.lineItems.filter(origItem =>
        !claimData.supplementInvoice.lineItems.some(suppItem =>
          suppItem.description.toLowerCase() === origItem.description.toLowerCase()
        )
      );

      removedItems.forEach(item => {
        const category = item.category || 'UNCATEGORIZED';
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push({ ...item, isRemoved: true });
      });

      // Process each category
      Object.keys(itemsByCategory).sort().forEach(category => {
        const categoryItems = itemsByCategory[category];
        if (categoryItems.length === 0) return;

        // Add category header
        checkPageSpace(15);
        doc.setFillColor(240, 240, 240);
        doc.rect(safeZone, currentY, maxContentWidth, 8, 'F');
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(category, safeZone + 2, currentY + 5);
        currentY += 10;

        // Create table for this category
        const supplementHeaders = ['Description', 'Original Price', 'Price Change', 'New Price', 'Status'];
        const categoryData = categoryItems.map(item => {
          // Find the corresponding original item
          const originalItem = claimData.originalInvoice.lineItems.find(
            orig => orig.description.toLowerCase().trim() === item.description.toLowerCase().trim()
          );
          
          const originalTotal = originalItem ? originalItem.total : 0;
          const priceChange = item.total - originalTotal;
          
          let status = 'SAME';
          if (item.isNew) status = 'NEW';
          else if (item.isRemoved) status = 'REMOVED';
          else if (item.isChanged) status = 'CHANGED';
          
          return [
            item.description,
            originalItem ? formatCurrency(originalTotal) : '-',
            priceChange !== 0 ? formatCurrency(priceChange) : '-',
            item.isRemoved ? '-' : formatCurrency(item.total),
            status
          ];
        });

        createImprovedTableWithColors(doc, supplementHeaders, categoryData, safeZone, currentY, maxContentWidth, categoryItems, claimData.originalInvoice.lineItems);
        currentY += (categoryData.length + 1) * 8 + 5;
      });

      // Add totals section
      currentY += 10;
      checkPageSpace(40);
      doc.setFillColor(230, 230, 230);
      doc.rect(safeZone, currentY, maxContentWidth, 30, 'F');
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(10);
      doc.setTextColor(51, 51, 51);
      
      doc.text(`SUBTOTAL: ${formatCurrency(claimData.supplementInvoice.subtotal)}`, safeZone + 5, currentY + 8);
      doc.text(`TAX: ${formatCurrency(claimData.supplementInvoice.tax)}`, safeZone + 5, currentY + 15);
      doc.text(`TOTAL: ${formatCurrency(claimData.supplementInvoice.total)}`, safeZone + 5, currentY + 22);
      
      const difference = claimData.supplementInvoice.total - claimData.originalInvoice.total;
      doc.setTextColor(difference > 0 ? 200 : 0, difference > 0 ? 0 : 150, 0);
      doc.text(`COST DIFFERENCE: ${difference > 0 ? '+' : ''}${formatCurrency(difference)}`, safeZone + maxContentWidth/2, currentY + 15);
      
      currentY += 35;
    } else {
      // Fallback to original flat table if no categories
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

      // Create table for supplement invoice with color coding
      const supplementHeaders = ['Description', 'Original Price', 'Price Change', 'New Price', 'Status'];
      const supplementData = sortedSupplementItems.map(item => {
        // Find the corresponding original item to get original price
        const originalItem = claimData.originalInvoice.lineItems.find(
          orig => orig.description.toLowerCase().trim() === item.description.toLowerCase().trim()
        );
        
        const originalTotal = originalItem ? originalItem.total : 0;
        const priceChange = item.total - originalTotal;
        
        return [
          item.description,
          originalItem ? formatCurrency(originalTotal) : '-',
          priceChange !== 0 ? formatCurrency(priceChange) : '-',
          formatCurrency(item.total),
          item.isNew ? 'NEW' : item.isChanged ? 'CHANGED' : 'SAME'
        ];
      });
      
      // Add totals rows
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
      
      createImprovedTableWithColors(doc, supplementHeaders, supplementData, safeZone, currentY, maxContentWidth, sortedSupplementItems, claimData.originalInvoice.lineItems);
      currentY += (supplementData.length + 1) * 8 + 10;
    }

    // Add TOTALS SUMMARY for Supplement Invoice
    currentY += 10;
    const supplementTotalsSummary = claimData.supplementInvoice.totalsSummary ||
                                    generateTotalsSummaryFromLineItems(claimData.supplementInvoice);
    // Add NET COST OF SUPPLEMENT to the summary if not present
    if (!supplementTotalsSummary.netCostOfSupplement) {
      supplementTotalsSummary.netCostOfSupplement = claimData.supplementInvoice.total;
    }
    currentY = createTotalsSummaryTable(doc, supplementTotalsSummary, safeZone, currentY, maxContentWidth, true);

    // CUMULATIVE EFFECTS OF SUPPLEMENT(S) Section
    currentY += 15;
    checkPageSpace(80);
    
    // Draw purple background box for Cumulative Effects header
    doc.setFillColor(147, 51, 234); // Purple color
    doc.rect(safeZone - 5, currentY - 5, maxContentWidth + 10, 15, 'F');
    
    // Add white text on purple background
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('CUMULATIVE EFFECTS OF SUPPLEMENT(S)', safeZone, currentY + 5);
    
    currentY += 20;
    doc.setTextColor(51, 51, 51); // Reset to dark gray
    
    // Create cumulative effects table - use extracted data if available, otherwise calculate
    const cumulativeHeaders = ['', 'Amount', 'Adjuster'];
    let cumulativeData: string[][] = [];
    
    if (claimData.supplementInvoice.cumulativeEffects) {
      // Use the extracted cumulative effects data
      const cumEffects = claimData.supplementInvoice.cumulativeEffects;
      
      // Add Estimate row
      cumulativeData.push(['Estimate', formatCurrency(cumEffects.estimateAmount), '']);
      
      // Add each supplement row
      cumEffects.supplements.forEach(supp => {
        cumulativeData.push([
          `Supplement ${supp.supplementCode}`,
          formatCurrency(supp.amount),
          supp.adjuster || ''
        ]);
      });
    } else {
      // Fallback to old calculation if cumulative effects not extracted
      cumulativeData = [
        ['Estimate', formatCurrency(claimData.originalInvoice.total), ''],
        ['Supplement S01', formatCurrency(claimData.supplementInvoice.total - claimData.originalInvoice.total), '']
      ];
    }
    
    // Calculate column widths
    const cumColWidths = [80, 40, 40];
    let cumTableY = currentY;
    
    // Draw header background
    doc.setFillColor(240, 240, 240);
    doc.rect(safeZone, cumTableY, maxContentWidth, 8, 'F');
    
    // Draw header text
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    
    let cumCurrentX = safeZone;
    cumulativeHeaders.forEach((header, index) => {
      const cellWidth = cumColWidths[index];
      doc.text(header, cumCurrentX + 2, cumTableY + 6);
      cumCurrentX += cellWidth;
    });
    
    cumTableY += 10;
    
    // Draw data rows
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    
    cumulativeData.forEach((row, rowIndex) => {
      const rowHeight = 7;
      
      // Alternating row background
      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(safeZone, cumTableY - 2, maxContentWidth, rowHeight, 'F');
      }
      
      cumCurrentX = safeZone;
      
      // Row label
      doc.setFont(undefined, 'normal');
      doc.setTextColor(51, 51, 51);
      doc.text(row[0], cumCurrentX + 2, cumTableY + 4);
      cumCurrentX += cumColWidths[0];
      
      // Amount
      doc.setFont(undefined, 'bold');
      doc.text(row[1], cumCurrentX + 2, cumTableY + 4);
      cumCurrentX += cumColWidths[1];
      
      // Adjuster (empty for now)
      doc.setFont(undefined, 'normal');
      doc.text(row[2], cumCurrentX + 2, cumTableY + 4);
      
      cumTableY += rowHeight;
    });
    
    // Add separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(safeZone, cumTableY, safeZone + maxContentWidth, cumTableY);
    cumTableY += 5;
    
    // Determine the workfile total - use extracted value if available
    const workfileTotal = claimData.supplementInvoice.cumulativeEffects?.workfileTotal || claimData.supplementInvoice.total;
    const netCostOfRepairs = claimData.supplementInvoice.cumulativeEffects?.netCostOfRepairs || claimData.supplementInvoice.total;
    
    // Workfile Total row with gray background
    doc.setFillColor(230, 230, 230);
    doc.rect(safeZone, cumTableY - 2, maxContentWidth, 10, 'F');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Workfile Total:', safeZone + 2, cumTableY + 5);
    doc.text('$', safeZone + cumColWidths[0] + 2, cumTableY + 5);
    doc.text(formatCurrency(workfileTotal).replace('$', ''), safeZone + cumColWidths[0] + 10, cumTableY + 5);
    cumTableY += 12;
    
    // NET COST OF REPAIRS row with gray background
    doc.setFillColor(230, 230, 230);
    doc.rect(safeZone, cumTableY - 2, maxContentWidth, 10, 'F');
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('NET COST OF REPAIRS:', safeZone + 2, cumTableY + 5);
    doc.text('$', safeZone + cumColWidths[0] + 2, cumTableY + 5);
    doc.text(formatCurrency(netCostOfRepairs).replace('$', ''), safeZone + cumColWidths[0] + 10, cumTableY + 5);
    cumTableY += 12;
    
    currentY = cumTableY + 10;

    // Needs Warranty Section
    currentY += 10;
    checkPageSpace(80);
    
    // Filter items from SUPPLEMENT INVOICE ONLY that need warranty (contain "Rpr" or "Repl" in description)
    const warrantyItems = claimData.supplementInvoice.lineItems
      .filter(item => {
        const desc = item.description;
        // Check for "Rpr" or "Repl" (case-sensitive to match actual abbreviations)
        return desc.includes('Rpr') || desc.includes('Repl');
      });
    
    if (warrantyItems.length > 0) {
      // Section title - RED COLOR
      doc.setTextColor(255, 0, 0); // Red color for title
      doc.setFont(undefined, 'bold');
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize('NEEDS WARRANTY', maxContentWidth);
      doc.text(titleLines, safeZone, currentY);
      currentY += titleLines.length * 6 + 8;
      
      // Warranty notice
      doc.setTextColor(102, 102, 102);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const warrantyNotice = 'The following supplement items require warranty coverage as they involve repairs or replacements:';
      const noticeLines = doc.splitTextToSize(warrantyNotice, maxContentWidth);
      doc.text(noticeLines, safeZone, currentY);
      currentY += noticeLines.length * 4 + 8;
      
      // Create warranty items table - REMOVED "Warranty Status" column
      const warrantyHeaders = ['Description', 'Type', 'Original Price', 'New Price', 'Change'];
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
          priceChange !== 0 ? formatCurrency(priceChange) : '-'
        ];
      });
      
      // Create table with red "NEEDS WARRANTY" text
      createWarrantyTable(doc, warrantyHeaders, warrantyData, safeZone, currentY, maxContentWidth);
      currentY += (warrantyData.length + 1) * 8 + 15;
    }

    // Helper function to create warranty table with red highlighting
    function createWarrantyTable(
      doc: jsPDF,
      headers: string[],
      data: string[][],
      x: number,
      y: number,
      width: number
    ): void {
      const colWidths = [70, 30, 30, 30, 30]; // Adjusted column widths for 5 columns (removed Warranty Status)
      let tableY = y;
      
      // Check if table fits on current page
      const estimatedTableHeight = (data.length + 1) * 10;
      if (tableY + estimatedTableHeight > pageHeight - safeZone) {
        doc.addPage();
        tableY = safeZone;
        currentY = safeZone;
      }
      
      // Headers
      doc.setFillColor(240, 240, 240);
      doc.rect(x, tableY, width, 10, 'F');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      
      let currentX = x;
      headers.forEach((header, i) => {
        const cellWidth = colWidths[i];
        const wrappedHeader = doc.splitTextToSize(header, cellWidth - 4);
        doc.text(wrappedHeader, currentX + 2, tableY + 7);
        currentX += cellWidth;
      });
      tableY += 12;

      // Data rows
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      
      data.forEach((row, rowIndex) => {
        // Calculate row height based on content
        let maxRowHeight = 8;
        const wrappedCells: string[][] = [];
        
        row.forEach((cell, colIndex) => {
          const cellWidth = colWidths[colIndex] - 4;
          const cellText = String(cell || '');
          const wrapped = doc.splitTextToSize(cellText, cellWidth);
          wrappedCells.push(wrapped);
          maxRowHeight = Math.max(maxRowHeight, wrapped.length * 4 + 4);
        });
        
        // Check if row fits on current page
        if (tableY + maxRowHeight > pageHeight - safeZone) {
          doc.addPage();
          tableY = safeZone;
          
          // Redraw headers on new page
          doc.setFillColor(240, 240, 240);
          doc.rect(x, tableY, width, 10, 'F');
          doc.setFont(undefined, 'bold');
          doc.setFontSize(10);
          doc.setTextColor(51, 51, 51);
          
          currentX = x;
          headers.forEach((header, i) => {
            const cellWidth = colWidths[i];
            const wrappedHeader = doc.splitTextToSize(header, cellWidth - 4);
            doc.text(wrappedHeader, currentX + 2, tableY + 7);
            currentX += cellWidth;
          });
          tableY += 12;
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
        }
        
        // Draw alternating row background
        if (rowIndex % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(x, tableY, width, maxRowHeight, 'F');
        }
        
        // Draw cell content with color coding
        currentX = x;
        wrappedCells.forEach((cellLines, colIndex) => {
          // Set colors based on column
          if (colIndex === 1) {
            // Work type column - color coded
            const workType = row[1];
            if (workType === 'REPLACEMENT') {
              doc.setTextColor(220, 38, 127); // Pink for replacement
            } else if (workType === 'REPAIR') {
              doc.setTextColor(234, 88, 12); // Orange for repair
            } else {
              doc.setTextColor(51, 51, 51); // Default color
            }
            doc.setFont(undefined, 'bold');
          } else if (colIndex === 4) {
            // Price change column - color based on increase/decrease
            const changeValue = row[4];
            if (changeValue && changeValue !== '-') {
              if (changeValue.includes('-')) {
                doc.setTextColor(0, 128, 0); // Green for decrease
              } else {
                doc.setTextColor(255, 0, 0); // Red for increase
              }
              doc.setFont(undefined, 'bold');
            } else {
              doc.setTextColor(51, 51, 51); // Default color
              doc.setFont(undefined, 'normal');
            }
          } else {
            doc.setTextColor(51, 51, 51); // Default color
            doc.setFont(undefined, 'normal');
          }
          
          doc.text(cellLines, currentX + 2, tableY + 6);
          currentX += colWidths[colIndex];
        });
        
        tableY += maxRowHeight;
      });
      
      currentY = tableY;
    }

    // Helper function to create improved tables with color coding
    function createImprovedTableWithColors(
      doc: jsPDF,
      headers: string[],
      data: string[][],
      x: number,
      y: number,
      width: number,
      lineItems: any[],
      originalLineItems?: any[]
    ): void {
      const colWidth = width / headers.length;
      let tableY = y;
      
      // Check if table fits on current page
      const estimatedTableHeight = (data.length + 1) * 10;
      if (tableY + estimatedTableHeight > pageHeight - safeZone) {
        doc.addPage();
        tableY = safeZone;
        currentY = safeZone;
      }
      
      // Headers
      doc.setFillColor(240, 240, 240);
      doc.rect(x, tableY, width, 10, 'F');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      
      headers.forEach((header, i) => {
        const cellX = x + i * colWidth;
        const maxCellWidth = colWidth - 4;
        const wrappedHeader = doc.splitTextToSize(header, maxCellWidth);
        doc.text(wrappedHeader, cellX + 2, tableY + 7);
      });
      tableY += 12;

      // Data rows
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
        if (tableY + maxRowHeight > pageHeight - safeZone) {
          doc.addPage();
          tableY = safeZone;
          
          // Redraw headers on new page
          doc.setFillColor(240, 240, 240);
          doc.rect(x, tableY, width, 10, 'F');
          doc.setFont(undefined, 'bold');
          doc.setFontSize(10);
          headers.forEach((header, i) => {
            const cellX = x + i * colWidth;
            const maxCellWidth = colWidth - 4;
            const wrappedHeader = doc.splitTextToSize(header, maxCellWidth);
            doc.text(wrappedHeader, cellX + 2, tableY + 7);
          });
          tableY += 12;
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
        }
        
        // Draw alternating row background
        if (rowIndex % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(x, tableY, width, maxRowHeight, 'F');
        }
        
        // Draw cell content with color coding for status column
        wrappedCells.forEach((cellLines, colIndex) => {
          const cellX = x + colIndex * colWidth;
          
          // Apply color coding for status column (last column) and price change column
          if (colIndex === headers.length - 1 && rowIndex < lineItems.length) {
            // Status column
            const item = lineItems[rowIndex];
            if (item.isNew) {
              doc.setTextColor(255, 0, 0); // Red for NEW
            } else if (item.isChanged) {
              doc.setTextColor(255, 140, 0); // Orange for CHANGED
            } else {
              doc.setTextColor(51, 51, 51); // Default color for SAME
            }
          } else if (colIndex === 2 && rowIndex < lineItems.length) {
            // Price change column - color based on increase/decrease
            const cellValue = row[colIndex];
            if (cellValue && cellValue !== '-') {
              if (cellValue.includes('+') || !cellValue.includes('-')) {
                doc.setTextColor(255, 0, 0); // Red for increases
              } else {
                doc.setTextColor(0, 128, 0); // Green for decreases
              }
            } else {
              doc.setTextColor(51, 51, 51); // Default color
            }
          } else {
            doc.setTextColor(51, 51, 51); // Default color for other columns
          }
          
          doc.text(cellLines, cellX + 2, tableY + 6);
        });
        
        tableY += maxRowHeight;
      });
      
      currentY = tableY;
    }

    // Helper function to create improved tables
    function createImprovedTable(
      doc: jsPDF,
      headers: string[],
      data: string[][],
      x: number,
      y: number,
      width: number
    ): void {
      const colWidth = width / headers.length;
      let tableY = y;
      
      // Check if table fits on current page
      const estimatedTableHeight = (data.length + 1) * 10;
      if (tableY + estimatedTableHeight > pageHeight - safeZone) {
        doc.addPage();
        tableY = safeZone;
        currentY = safeZone;
      }
      
      // Headers
      doc.setFillColor(240, 240, 240);
      doc.rect(x, tableY, width, 10, 'F');
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.setFontSize(10);
      
      headers.forEach((header, i) => {
        const cellX = x + i * colWidth;
        const maxCellWidth = colWidth - 4;
        const wrappedHeader = doc.splitTextToSize(header, maxCellWidth);
        doc.text(wrappedHeader, cellX + 2, tableY + 7);
      });
      tableY += 12;

      // Data rows
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
        if (tableY + maxRowHeight > pageHeight - safeZone) {
          doc.addPage();
          tableY = safeZone;
          
          // Redraw headers on new page
          doc.setFillColor(240, 240, 240);
          doc.rect(x, tableY, width, 10, 'F');
          doc.setFont(undefined, 'bold');
          doc.setFontSize(10);
          headers.forEach((header, i) => {
            const cellX = x + i * colWidth;
            const maxCellWidth = colWidth - 4;
            const wrappedHeader = doc.splitTextToSize(header, maxCellWidth);
            doc.text(wrappedHeader, cellX + 2, tableY + 7);
          });
          tableY += 12;
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
        }
        
        // Draw alternating row background
        if (rowIndex % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(x, tableY, width, maxRowHeight, 'F');
        }
        
        // Draw cell content
        wrappedCells.forEach((cellLines, colIndex) => {
          const cellX = x + colIndex * colWidth;
          doc.text(cellLines, cellX + 2, tableY + 6);
        });
        
        tableY += maxRowHeight;
      });
      
      currentY = tableY;
    }

    // Helper function to generate totals summary from line items if not provided
    function generateTotalsSummaryFromLineItems(invoice: any): any {
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

    // Helper function to create totals summary table
    function createTotalsSummaryTable(
      doc: jsPDF,
      totalsSummary: any,
      x: number,
      y: number,
      width: number,
      isSupplementInvoice: boolean = false
    ): number {
      if (!totalsSummary || !totalsSummary.categories || totalsSummary.categories.length === 0) {
        return y; // No totals summary to display
      }

      let tableY = y;
      
      // Check if table fits on current page
      const estimatedTableHeight = (totalsSummary.categories.length + 5) * 10;
      if (tableY + estimatedTableHeight > pageHeight - safeZone) {
        doc.addPage();
        tableY = safeZone;
        currentY = safeZone;
      }
      
      // Add section header
      tableY += 5;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('TOTALS SUMMARY', x, tableY);
      tableY += 8;
      
      // Table headers
      const headers = ['Category', 'Basis', 'Rate', 'Cost $'];
      const colWidths = [60, 30, 35, 35];
      
      // Draw header background
      doc.setFillColor(240, 240, 240);
      doc.rect(x, tableY, width, 8, 'F');
      
      // Draw header text
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      
      let currentX = x;
      headers.forEach((header, index) => {
        const cellWidth = colWidths[index];
        doc.text(header, currentX + 2, tableY + 6);
        currentX += cellWidth;
      });
      
      tableY += 10;
      
      // Draw category rows
      totalsSummary.categories.forEach((category: any, index: number) => {
        const rowHeight = 7;
        
        // Check if row fits on current page
        if (tableY + rowHeight > pageHeight - safeZone) {
          doc.addPage();
          tableY = safeZone;
          
          // Redraw headers on new page
          doc.setFillColor(240, 240, 240);
          doc.rect(x, tableY, width, 8, 'F');
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(51, 51, 51);
          
          currentX = x;
          headers.forEach((header, i) => {
            const cellWidth = colWidths[i];
            doc.text(header, currentX + 2, tableY + 6);
            currentX += cellWidth;
          });
          tableY += 10;
        }
        
        // Alternating row background
        if (index % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(x, tableY - 2, width, rowHeight, 'F');
        }
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(51, 51, 51);
        
        currentX = x;
        
        // Category name
        const categoryText = doc.splitTextToSize(category.category || '', colWidths[0] - 4);
        doc.text(categoryText, currentX + 2, tableY + 4);
        currentX += colWidths[0];
        
        // Basis
        doc.text(category.basis || '', currentX + 2, tableY + 4);
        currentX += colWidths[1];
        
        // Rate
        doc.text(category.rate || '', currentX + 2, tableY + 4);
        currentX += colWidths[2];
        
        // Cost
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(category.cost || 0), currentX + 2, tableY + 4);
        
        tableY += rowHeight;
      });
      
      // Add separator line
      doc.setDrawColor(200, 200, 200);
      doc.line(x, tableY, x + width, tableY);
      tableY += 5;
      
      // Subtotal row
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Subtotal', x + 2, tableY);
      doc.text(formatCurrency(totalsSummary.subtotal), x + width - 35, tableY);
      tableY += 7;
      
      // Sales Tax row
      const taxText = totalsSummary.salesTaxRate
        ? `Sales Tax (${totalsSummary.salesTaxRate.toFixed(4)}%)`
        : 'Sales Tax';
      doc.setFont(undefined, 'normal');
      doc.text(taxText, x + 2, tableY);
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(totalsSummary.salesTax), x + width - 35, tableY);
      tableY += 7;
      
      // Total row with background
      doc.setFillColor(230, 230, 230);
      doc.rect(x, tableY - 5, width, 10, 'F');
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(30, 64, 175);
      doc.text('Total Amount', x + 2, tableY);
      doc.text(formatCurrency(totalsSummary.totalAmount), x + width - 35, tableY);
      tableY += 10;
      
      // NET COST OF SUPPLEMENT for supplement invoices
      if (isSupplementInvoice) {
        doc.setFillColor(30, 64, 175);
        doc.rect(x, tableY - 5, width, 10, 'F');
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('NET COST OF SUPPLEMENT', x + 2, tableY);
        doc.text(formatCurrency(totalsSummary.totalAmount || totalsSummary.netCostOfSupplement || 0), x + width - 35, tableY);
        tableY += 12;
      }
      
      return tableY;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('Generated by SupplementGuard', pageWidth - safeZone, pageHeight - 10, { align: 'right' });
    }

    doc.save(`Claim-Report-${claimData.id}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Failed to generate PDF report. Please try again.');
  }
};

/**
 * Generates a CSV export of the claim analysis data.
 * @param claimData The claim data to be exported as CSV.
 */
export const generateCsvReport = (claimData: ClaimData) => {
  const formatCurrency = (amount: number) => amount.toFixed(2);
  
  // Create CSV content
  let csvContent = '';
  
  // Header information
  csvContent += 'SupplementGuard Claim Analysis Report\n';
  csvContent += `Claim ID,${claimData.id}\n`;
  csvContent += `Fraud Score,${claimData.fraudScore}\n`;
  csvContent += `Generated,${new Date().toLocaleDateString()}\n\n`;
  
  // Fraud reasons
  csvContent += 'Fraud Risk Factors\n';
  claimData.fraudReasons.forEach((reason, index) => {
    csvContent += `${index + 1},"${reason.replace(/"/g, '""')}"\n`;
  });
  csvContent += '\n';
  
  // Original invoice
  csvContent += 'Original Invoice\n';
  csvContent += 'Description,Quantity,Unit Price,Total\n';
  claimData.originalInvoice.lineItems.forEach(item => {
    csvContent += `"${item.description.replace(/"/g, '""')}",${item.quantity},${formatCurrency(item.price)},${formatCurrency(item.total)}\n`;
  });
  csvContent += `Subtotal,,,${formatCurrency(claimData.originalInvoice.subtotal)}\n`;
  csvContent += `Tax,,,${formatCurrency(claimData.originalInvoice.tax)}\n`;
  csvContent += `Total,,,${formatCurrency(claimData.originalInvoice.total)}\n\n`;
  
  // Supplement invoice
  csvContent += 'Supplement Invoice\n';
  csvContent += 'Description,Quantity,Unit Price,Total,Status\n';
  claimData.supplementInvoice.lineItems.forEach(item => {
    const status = item.isNew ? 'New Item' : item.isChanged ? 'Changed' : 'Unchanged';
    csvContent += `"${item.description.replace(/"/g, '""')}",${item.quantity},${formatCurrency(item.price)},${formatCurrency(item.total)},"${status}"\n`;
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
    csvContent += `"${cleanLine.replace(/"/g, '""')}"\n`;
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
