// Make sure jspdf and jspdf-autotable are loaded from CDN before this script runs.
// The UMD builds will attach themselves to the window object.

declare global {
  interface Window {
    jspdf: any;
  }
}

import { ClaimData } from '../types';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

/**
 * Generates a comprehensive, multi-page PDF report for a claim analysis.
 * @param claimData The claim data to be included in the report.
 */
export const generatePdfReport = (claimData: ClaimData) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'pt', 'a4');

  // Define document-wide styles
  const HEADER_COLOR = [30, 41, 59]; // slate-800 (RGB)
  const TEXT_COLOR = [71, 85, 105]; // slate-600 (RGB)
  const BORDER_COLOR = [226, 232, 240]; // slate-200 (RGB)
  const PAGE_MARGIN = 40;

  // --- Reusable Page Elements ---
  const drawPageHeader = (pageTitle: string) => {
    doc.setFontSize(10);
    doc.setTextColor(...TEXT_COLOR);
    doc.text('SupplementGuard Claim Report', PAGE_MARGIN, 30);
    doc.text(`Claim ID: ${claimData.id}`, doc.internal.pageSize.getWidth() - PAGE_MARGIN, 30, {
      align: 'right',
    });
    doc.setFontSize(18);
    doc.setTextColor(...HEADER_COLOR);
    doc.setFont(undefined, 'bold');
    doc.text(pageTitle, PAGE_MARGIN, 60);
    doc.setDrawColor(...BORDER_COLOR);
    doc.line(PAGE_MARGIN, 70, doc.internal.pageSize.getWidth() - PAGE_MARGIN, 70);
  };

  const drawPageFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 20, {
        align: 'center',
      });
    }
  };

  // --- Page 1: Analysis Summary ---
  drawPageHeader('Analysis Summary');

  const getScoreColor = () => {
    if (claimData.fraudScore > 75) return [[239, 68, 68], [254, 226, 226]]; // red
    if (claimData.fraudScore > 40) return [[245, 158, 11], [254, 243, 199]]; // amber
    return [[34, 197, 94], [220, 252, 231]]; // green
  };

  const [scoreColor, scoreBgColor] = getScoreColor();

  doc.setFontSize(11);
  doc.setTextColor(...HEADER_COLOR);
  doc.setFont(undefined, 'bold');
  doc.text('Fraud Risk Score', PAGE_MARGIN, 100);
  doc.text('Top Contributing Factors', 220, 100);

  // Score circle visual
  doc.setLineWidth(6);
  doc.setDrawColor(...scoreBgColor);
  doc.circle(PAGE_MARGIN + 50, 150, 40, 'S');

  doc.setDrawColor(...scoreColor);
  const scoreAngle = -90 + (claimData.fraudScore / 100) * 360;
  doc.arc(PAGE_MARGIN + 50, 150, 40, -90, scoreAngle, 'S');

  doc.setFontSize(26);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...scoreColor);
  doc.text(String(claimData.fraudScore), PAGE_MARGIN + 50, 155, { align: 'center' });

  // Fraud reasons list
  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.setFont(undefined, 'normal');
  const reasonsText = claimData.fraudReasons.map((r) => `• ${r}`);
  doc.text(reasonsText, 220, 120, {
    maxWidth: doc.internal.pageSize.getWidth() - 220 - PAGE_MARGIN,
  });

  let finalY = 220;
  doc.setDrawColor(...BORDER_COLOR);
  doc.line(PAGE_MARGIN, finalY, doc.internal.pageSize.getWidth() - PAGE_MARGIN, finalY);

  // AI Summary of Changes
  doc.setFontSize(11);
  doc.setTextColor(...HEADER_COLOR);
  doc.setFont(undefined, 'bold');
  doc.text('AI Summary of Changes', PAGE_MARGIN, finalY + 25);

  doc.setFontSize(10);
  doc.setTextColor(...TEXT_COLOR);
  doc.setFont(undefined, 'normal');
  const summaryLines = claimData.invoiceSummary
    .split('\n')
    .filter((line) => line.trim() !== '');

  let currentY = finalY + 45;
  summaryLines.forEach((line) => {
    const isBold = line.startsWith('**') && line.endsWith('**');
    const text = line.replace(/\*\*/g, '').replace(/^- |^\* /, '  • ');
    doc.setFont(undefined, isBold ? 'bold' : 'normal');
    const splitText = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2);
    doc.text(splitText, PAGE_MARGIN, currentY);
    currentY += splitText.length * 12 + (isBold ? 4 : 0);
  });

  // --- Page 2+: Invoice Comparison ---
  doc.addPage();
  drawPageHeader('Invoice Comparison');

  const tableWidth = (doc.internal.pageSize.getWidth() - PAGE_MARGIN * 2 - 10) / 2;
  const columns = ['Description', 'Qty', 'Price', 'Total'];
  const baseTableConfig = {
    startY: 120,
    tableWidth: tableWidth,
    headStyles: {
      fillColor: HEADER_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: [241, 245, 249], // slate-100
      textColor: HEADER_COLOR,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      textColor: TEXT_COLOR,
      fontSize: 9,
    }
  };


  // Original Invoice
  const originalBody = claimData.originalInvoice.lineItems.map((item) => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.price),
    formatCurrency(item.total),
  ]);

  const originalFoot = [
    [{ content: 'Subtotal', colSpan: 3, styles: { halign: 'right' } }, { content: formatCurrency(claimData.originalInvoice.subtotal), styles: { halign: 'right' } }],
    [{ content: 'Tax', colSpan: 3, styles: { halign: 'right' } }, { content: formatCurrency(claimData.originalInvoice.tax), styles: { halign: 'right' } }],
    [{ content: 'Total', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(claimData.originalInvoice.total), styles: { halign: 'right', fontStyle: 'bold' } }],
  ];

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...HEADER_COLOR);
  doc.text('Original Repair Estimate', PAGE_MARGIN, 100);

  doc.autoTable({
    ...baseTableConfig,
    head: [columns],
    body: originalBody,
    foot: originalFoot,
    margin: { left: PAGE_MARGIN, right: doc.internal.pageSize.getWidth() - PAGE_MARGIN - tableWidth },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        if (data.column.index === 1) data.cell.styles.halign = 'center'; // Qty
        if (data.column.index === 2 || data.column.index === 3) data.cell.styles.halign = 'right'; // Price & Total
      }
    },
  });

  // Supplement Invoice
  const supplementBody = claimData.supplementInvoice.lineItems.map((item) => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.price),
    formatCurrency(item.total),
  ]);
  
  const supplementFoot = [
    [{ content: 'Subtotal', colSpan: 3, styles: { halign: 'right' } }, { content: formatCurrency(claimData.supplementInvoice.subtotal), styles: { halign: 'right' } }],
    [{ content: 'Tax', colSpan: 3, styles: { halign: 'right' } }, { content: formatCurrency(claimData.supplementInvoice.tax), styles: { halign: 'right' } }],
    [{ content: 'Total', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, { content: formatCurrency(claimData.supplementInvoice.total), styles: { halign: 'right', fontStyle: 'bold' } }],
  ];

  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(...HEADER_COLOR);
  doc.text('Final Invoice (with Supplement)', PAGE_MARGIN + tableWidth + 10, 100);

  doc.autoTable({
    ...baseTableConfig,
    head: [columns],
    body: supplementBody,
    foot: supplementFoot,
    margin: { left: PAGE_MARGIN + tableWidth + 10, right: PAGE_MARGIN },
    didParseCell: (data: any) => {
      if (data.section === 'body') {
        if (data.column.index === 1) data.cell.styles.halign = 'center'; // Qty
        if (data.column.index === 2 || data.column.index === 3) data.cell.styles.halign = 'right'; // Price & Total

        const item = claimData.supplementInvoice.lineItems[data.row.index];
        if (item?.isNew) {
          data.cell.styles.fillColor = [220, 252, 231]; // green-100
        } else if (item?.isChanged) {
          data.cell.styles.fillColor = [254, 249, 195]; // yellow-100
        }
      }
    },
  });

  // --- Final Touches ---
  drawPageFooter();
  doc.save(`Claim-Report-${claimData.id}.pdf`);
};
