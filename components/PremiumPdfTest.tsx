import React, { useState } from 'react';
import { PremiumPdfGenerator } from '../services/premiumPdfService';
import { ClaimData, InvoiceLineItem } from '../types';

// Extended interface for premium PDF testing
interface PremiumClaimData extends ClaimData {
  claimId?: string;
  riskLevel?: string;
  contributingFactors?: string[];
  aiAnalysis?: {
    summary: string;
    keyChanges?: string[];
  };
}

const PremiumPdfTest: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Sample data with enhanced properties for testing color-coding
  const sampleClaimData: PremiumClaimData = {
    id: 'CLM-2025-080512',
    claimId: 'CLM-2025-080512',
    fraudScore: 85,
    riskLevel: 'High Risk',
    fraudReasons: [
      'A 79% increase in body and paint labor rates ($67/hr to $120/hr) within 14 days, without clear justification.',
      'Significant scope creep: original repair for bumper is replaced with aftermarket parts, and numerous new, high-cost operations (e.g., pre/post scans, alignment, roof/rocker repairs) are added.',
      'Total repair cost increased by over 250% ($1,215.24 to $4,284.42), indicating a substantial and potentially unwarranted escalation.'
    ],
    contributingFactors: [
      'Excessive labor rate increases without market justification',
      'Scope expansion from repair to replacement with aftermarket parts',
      'Addition of multiple high-cost operations not in original estimate',
      'Lack of documentation for cost escalation rationale'
    ],
    aiAnalysis: {
      summary: 'This claim shows a significant increase in repair costs from the original estimate to the supplement, rising from $1,215.24 to $4,284.42, an increase of $3,069.18 (252%). The analysis reveals substantial labor rate increases, scope changes from repair to replacement, and addition of numerous operations not present in the original estimate.',
      keyChanges: [
        'Labor Rate Increase: Body Labor from $67.00/hr to $120.00/hr, Paint Labor from $67.00/hr to $120.00/hr',
        'Scope Change: Original estimate included R&I bumper cover and Rpr Bumper cover, supplement now includes O/H rear bumper and Repl A/M CAPA Bumper cover',
        'New Operations Added: Pre/post scans, alignment, roof/rocker repairs, wheel cover replacement',
        'Mechanical Labor: Added at $200.00/hr (not present in original)',
        'Multiple paint and body work hours increased significantly across various panels'
      ]
    },
    invoiceSummary: 'Comprehensive analysis of auto repair claim showing significant cost escalation and scope changes.',
    originalInvoice: {
      fileName: 'original_estimate.pdf',
      subtotal: 1192.90,
      tax: 22.34,
      total: 1215.24,
      lineItems: [
        {
          id: '1',
          description: 'R&I bumper cover',
          quantity: 1,
          price: 0.00,
          total: 239.70
        },
        {
          id: '2',
          description: 'Rpr Bumper cover',
          quantity: 1,
          price: 0.00,
          total: 320.90
        },
        {
          id: '3',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 0.00,
          total: 119.90
        },
        {
          id: '4',
          description: 'Rpr RT Quarter panel',
          quantity: 1,
          price: 0.00,
          total: 298.30
        },
        {
          id: '5',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 0.00,
          total: 109.00
        },
        {
          id: '6',
          description: 'Rpr RT Outer panel (HSS)',
          quantity: 1,
          price: 0.00,
          total: 176.00
        },
        {
          id: '7',
          description: 'Overlap Major Adj. Panel',
          quantity: 1,
          price: 0.00,
          total: -163.50
        },
        {
          id: '8',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 0.00,
          total: 32.70
        },
        {
          id: '9',
          description: 'R&I RT Belt molding',
          quantity: 1,
          price: 0.00,
          total: 20.10
        },
        {
          id: '10',
          description: 'R&I RT Handle, outside gray',
          quantity: 1,
          price: 0.00,
          total: 26.80
        },
        {
          id: '11',
          description: 'HAZ WASTE',
          quantity: 1,
          price: 3.00,
          total: 3.00
        },
        {
          id: '12',
          description: 'CAR COVER',
          quantity: 1,
          price: 5.00,
          total: 5.00
        },
        {
          id: '13',
          description: 'Flex additive',
          quantity: 1,
          price: 5.00,
          total: 5.00
        }
      ]
    },
    supplementInvoice: {
      fileName: 'supplement_estimate.pdf',
      subtotal: 4162.08,
      tax: 122.34,
      total: 4284.42,
      lineItems: [
        {
          id: '1',
          description: 'Repl RT/Rear Wheel cover',
          quantity: 1,
          price: 105.94,
          total: 105.94,
          isNew: true
        },
        {
          id: '2',
          description: 'Blnd RT Roof side panel',
          quantity: 1,
          price: 0.00,
          total: 129.60,
          isNew: true
        },
        {
          id: '3',
          description: 'R&I RT Roof molding',
          quantity: 1,
          price: 0.00,
          total: 48.00,
          isNew: true
        },
        {
          id: '4',
          description: 'R&I RT Rocker molding',
          quantity: 1,
          price: 0.00,
          total: 108.00,
          isNew: true
        },
        {
          id: '5',
          description: 'Rpr RT Rocker molding',
          quantity: 1,
          price: 0.00,
          total: 351.60,
          isNew: true
        },
        {
          id: '6',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 0.00,
          total: 113.40,
          isNew: true
        },
        {
          id: '7',
          description: 'Basecoat reduction',
          quantity: 1,
          price: 0.00,
          total: -97.20,
          isNew: true
        },
        {
          id: '8',
          description: 'Rpr RT Outer panel (HSS)',
          quantity: 1,
          price: 0.00,
          total: 684.00,
          isChanged: true
        },
        {
          id: '9',
          description: 'Overlap Major Non-Adj. Panel',
          quantity: 1,
          price: 0.00,
          total: -32.40,
          isNew: true
        },
        {
          id: '10',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 0.00,
          total: 64.80,
          isNew: true
        },
        {
          id: '11',
          description: 'Basecoat reduction',
          quantity: 1,
          price: 0.00,
          total: -48.60,
          isNew: true
        },
        {
          id: '12',
          description: 'R&I RT Belt molding',
          quantity: 1,
          price: 0.00,
          total: 36.00
        },
        {
          id: '13',
          description: 'R&I RT Handle, outside gray',
          quantity: 1,
          price: 0.00,
          total: 48.00
        },
        {
          id: '14',
          description: 'R&I RT R&I trim panel',
          quantity: 1,
          price: 0.00,
          total: 48.00,
          isNew: true
        },
        {
          id: '15',
          description: 'Rpr RT Quarter panel',
          quantity: 1,
          price: 0.00,
          total: 1108.80,
          isChanged: true
        },
        {
          id: '16',
          description: 'Overlap Major Adj. Panel',
          quantity: 1,
          price: 0.00,
          total: -64.80,
          isChanged: true
        },
        {
          id: '17',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 0.00,
          total: 64.80,
          isNew: true
        },
        {
          id: '18',
          description: 'Basecoat reduction',
          quantity: 1,
          price: 0.00,
          total: -48.60,
          isNew: true
        },
        {
          id: '19',
          description: 'Repl RT Quarter panel protector',
          quantity: 1,
          price: 20.54,
          total: 44.54,
          isNew: true
        }
      ]
    }
  };

  const generatePremiumPdf = async () => {
    setIsGenerating(true);
    try {
      const generator = new PremiumPdfGenerator();
      generator.generateClaimReport(sampleClaimData);
      
      const pdfBlob = generator.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `premium-claim-report-${sampleClaimData.claimId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      setLastGenerated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error generating premium PDF:', error);
      alert('Error generating PDF. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  const previewPremiumPdf = async () => {
    setIsGenerating(true);
    try {
      const generator = new PremiumPdfGenerator();
      generator.generateClaimReport(sampleClaimData);
      
      const pdfBlob = generator.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      
      // Open in new tab for preview
      window.open(url, '_blank');
      
      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      setLastGenerated(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error generating premium PDF:', error);
      alert('Error generating PDF. Check console for details.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Premium PDF Generator Test
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Test the visually stunning PDF output with professional formatting, dynamic color-coding, 
          and elegant design elements.
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-lg border border-blue-200">
          <h3 className="text-xl font-semibold text-blue-900 mb-3">
            🎨 Visual Enhancements
          </h3>
          <ul className="text-blue-800 space-y-2">
            <li>• Professional header with company branding</li>
            <li>• Elegant typography and optimal spacing</li>
            <li>• Color-coded fraud risk assessment card</li>
            <li>• Sophisticated page layout and margins</li>
            <li>• Professional footer with metadata</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-100 p-6 rounded-lg border border-red-200">
          <h3 className="text-xl font-semibold text-red-900 mb-3">
            🔴 Dynamic Color-Coding
          </h3>
          <ul className="text-red-800 space-y-2">
            <li>• <span className="font-bold text-red-600">Vibrant Red (#FF0000)</span> for NEW items</li>
            <li>• <span className="font-bold text-orange-600">Orange (#FF8C00)</span> for CHANGED items</li>
            <li>• Light background highlights for emphasis</li>
            <li>• Bold text formatting for modified items</li>
            <li>• Color legend for easy interpretation</li>
          </ul>
        </div>
      </div>

      {/* Sample Data Preview */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          📊 Sample Data Overview
        </h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700">Claim ID:</p>
            <p className="text-gray-600">{sampleClaimData.claimId}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Fraud Score:</p>
            <p className="text-red-600 font-bold">{sampleClaimData.fraudScore}/100</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Risk Level:</p>
            <p className="text-red-600 font-bold">{sampleClaimData.riskLevel}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Original Total:</p>
            <p className="text-gray-600">${sampleClaimData.originalInvoice.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Supplement Total:</p>
            <p className="text-gray-600">${sampleClaimData.supplementInvoice.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-700">Cost Increase:</p>
            <p className="text-red-600 font-bold">
              +${(sampleClaimData.supplementInvoice.total - sampleClaimData.originalInvoice.total).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Color-Coding Examples */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          🎯 Color-Coding Examples
        </h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-4 p-3 bg-red-50 border border-red-200 rounded">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="font-bold text-red-600">NEW ITEMS</span>
            <span className="text-gray-600">- Items added in supplement (e.g., "Repl RT/Rear Wheel cover")</span>
          </div>
          <div className="flex items-center space-x-4 p-3 bg-orange-50 border border-orange-200 rounded">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span className="font-bold text-orange-600">CHANGED ITEMS</span>
            <span className="text-gray-600">- Items modified from original (e.g., "Rpr RT Quarter panel")</span>
          </div>
          <div className="flex items-center space-x-4 p-3 bg-gray-50 border border-gray-200 rounded">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span className="font-bold text-gray-600">UNCHANGED ITEMS</span>
            <span className="text-gray-600">- Items that remain the same</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <button
          onClick={previewPremiumPdf}
          disabled={isGenerating}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            '👁️ Preview Premium PDF'
          )}
        </button>

        <button
          onClick={generatePremiumPdf}
          disabled={isGenerating}
          className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating...
            </span>
          ) : (
            '📥 Download Premium PDF'
          )}
        </button>
      </div>

      {/* Status */}
      {lastGenerated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">
            ✅ <strong>Success!</strong> Premium PDF generated at {lastGenerated}
          </p>
        </div>
      )}

      {/* Technical Details */}
      <div className="mt-8 bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          🔧 Technical Features
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Layout & Typography:</h4>
            <ul className="space-y-1">
              <li>• 30mm safe margins for professional printing</li>
              <li>• Helvetica font family for optimal readability</li>
              <li>• Hierarchical font sizing (8pt to 24pt)</li>
              <li>• Proper line spacing and paragraph breaks</li>
              <li>• Automatic page breaks with header/footer</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Visual Elements:</h4>
            <ul className="space-y-1">
              <li>• Professional color palette with brand consistency</li>
              <li>• Fraud risk assessment card with dynamic colors</li>
              <li>• Enhanced tables with alternating row colors</li>
              <li>• Color-coded status indicators</li>
              <li>• Elegant section dividers and spacing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPdfTest;