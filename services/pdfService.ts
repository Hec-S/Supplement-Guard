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
    
    currentY += 5;
    doc.setTextColor(102, 102, 102); // Gray color
    
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
    
    const dateText = `Generated: ${new Date().toLocaleDateString()}`;
    
    // Display claim number
    addSafeText(claimText, safeZone, maxContentWidth / 2, 12, 'normal');
    
    // Display vehicle info if available
    if (vehicleText) {
      currentY += 1;
      addSafeText(vehicleText, safeZone, maxContentWidth * 0.7, 11, 'normal');
    }
    
    // Position date text properly
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - safeZone - dateWidth, currentY - (vehicleText ? 10 : 5));

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
    checkPageSpace(100);
    addSafeText('Original Invoice', safeZone, maxContentWidth, 16, 'bold');
    currentY += 5;

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

    // Supplement Invoice Section - Check if categories exist
    checkPageSpace(100);
    addSafeText('Supplement Invoice', safeZone, maxContentWidth, 16, 'bold');
    currentY += 5;

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
