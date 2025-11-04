import React, { useState } from 'react';
import { generatePdfReport, generateCsvReport } from '../services/pdfService';
import { generateImprovedPdfReport, generateEnhancedCsvReport } from '../services/improvedPdfService';
import { ClaimData } from '../types';

const SimplePdfTest: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  // Sample claim data that would cause text truncation issues
  const sampleClaimData: ClaimData = {
    id: 'CLM-2025-080512',
    fraudScore: 85,
    fraudReasons: [
      'A 79% increase in body and paint labor rates ($67/hr to $120/hr) within 14 days, without clear justification or market analysis to support such a dramatic rate adjustment.',
      'Significant scope creep: original repair for bumper is replaced with aftermarket parts, and numerous new, high-cost operations (e.g., pre/post scans, alignment, roof/rocker repairs) are added without proper documentation.',
      'Total repair cost increased by over 250% ($1,215.24 to $4,284.42), indicating a substantial and potentially unwarranted escalation that requires detailed investigation.',
      'Multiple line items show inconsistent pricing patterns and questionable labor hour allocations that deviate significantly from industry standards.',
      'Addition of premium aftermarket parts and specialized operations that were not identified in the initial damage assessment, suggesting possible billing irregularities.'
    ],
    invoiceSummary: `**Invoice Comparison Summary**
This claim shows a significant increase in repair costs from the original estimate to the supplement, rising from $1,215.24 to $4,284.42, an increase of $3,069.18 (252%).

**Key Changes:**
• Labor Rate Increase: A substantial increase in labor rates is observed:
  * Body Labor: From $67.00/hr to $120.00/hr
  * Paint Labor: From $67.00/hr to $120.00/hr  
  * Mechanical Labor: Added at $200.00/hr (not present in original)

• Scope Change from Repair to Replacement for Bumper:
  * Original estimate included 'R&I bumper cover' and 'Rpr Bumper cover'.
  * Supplement now includes 'O/H rear bumper' and 'Repl A/M CAPA Bumper cover' (an aftermarket part), indicating a change from repair to replacement with a third-party part.

• Changed Items (increased labor/paint hours):
  * Rpr RT Quarter panel: Labor increased from 2.5 hrs to 6.0 hrs, Paint from 1.2 hrs to 2.4 hrs.
  * Rpr RT Outer panel (HSS): Labor increased from 1.0 hr to 3.0 hrs, Paint from 1.0 hr to 2.0 hrs.
  * Overlap Major Adj. Panel: Adjusted paint hours (original -1.5, supplement -0.4).

• New Items Added: Several operations and parts were added in the supplement that were not present in the original estimate, significantly contributing to the cost increase:
  * Repl RT/Rear Wheel cover
  * Roof side panel and molding work (Blnd RT Roof side panel, R&I RT Roof molding)
  * Additional clear coat and basecoat operations
  * Pre/post repair scans and calibration procedures
  * Rental car coverage extension
  * Storage fees for extended repair duration

**Risk Assessment:**
The dramatic increase in both labor rates and scope of work, combined with the addition of numerous high-value operations, presents significant fraud risk indicators that warrant detailed investigation and verification of all charges.`,
    originalInvoice: {
      fileName: 'original-estimate.pdf',
      lineItems: [
        {
          id: '1',
          description: 'R&I bumper cover',
          quantity: 1,
          price: 239.70,
          total: 239.70,
          isNew: false,
          isChanged: false
        },
        {
          id: '2',
          description: 'Rpr Bumper cover',
          quantity: 1,
          price: 320.90,
          total: 320.90,
          isNew: false,
          isChanged: false
        },
        {
          id: '3',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 119.90,
          total: 119.90,
          isNew: false,
          isChanged: false
        },
        {
          id: '4',
          description: 'Rpr RT Quarter panel',
          quantity: 1,
          price: 298.30,
          total: 298.30,
          isNew: false,
          isChanged: false
        },
        {
          id: '5',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 109.00,
          total: 109.00,
          isNew: false,
          isChanged: false
        },
        {
          id: '6',
          description: 'Rpr RT Outer panel (HSS)',
          quantity: 1,
          price: 176.00,
          total: 176.00,
          isNew: false,
          isChanged: false
        },
        {
          id: '7',
          description: 'Overlap Major Adj. Panel',
          quantity: 1,
          price: -163.50,
          total: -163.50,
          isNew: false,
          isChanged: false
        },
        {
          id: '8',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 32.70,
          total: 32.70,
          isNew: false,
          isChanged: false
        },
        {
          id: '9',
          description: 'R&I RT Belt molding',
          quantity: 1,
          price: 20.10,
          total: 20.10,
          isNew: false,
          isChanged: false
        },
        {
          id: '10',
          description: 'R&I RT Handle, outside gray',
          quantity: 1,
          price: 26.80,
          total: 26.80,
          isNew: false,
          isChanged: false
        },
        {
          id: '11',
          description: 'HAZ WASTE',
          quantity: 1,
          price: 3.00,
          total: 3.00,
          isNew: false,
          isChanged: false
        },
        {
          id: '12',
          description: 'CAR COVER',
          quantity: 1,
          price: 5.00,
          total: 5.00,
          isNew: false,
          isChanged: false
        },
        {
          id: '13',
          description: 'Flex additive',
          quantity: 1,
          price: 5.00,
          total: 5.00,
          isNew: false,
          isChanged: false
        }
      ],
      subtotal: 1192.90,
      tax: 22.34,
      total: 1215.24
    },
    supplementInvoice: {
      fileName: 'supplement-invoice.pdf',
      lineItems: [
        {
          id: '1',
          description: 'Repl RT/Rear Wheel cover',
          quantity: 1,
          price: 105.94,
          total: 105.94,
          isNew: true,
          isChanged: false
        },
        {
          id: '2',
          description: 'Blnd RT Roof side panel',
          quantity: 1,
          price: 129.60,
          total: 129.60,
          isNew: true,
          isChanged: false
        },
        {
          id: '3',
          description: 'R&I RT Roof molding',
          quantity: 1,
          price: 48.00,
          total: 48.00,
          isNew: true,
          isChanged: false
        },
        {
          id: '4',
          description: 'R&I RT Rocker molding',
          quantity: 1,
          price: 108.00,
          total: 108.00,
          isNew: true,
          isChanged: false
        },
        {
          id: '5',
          description: 'Rpr RT Rocker molding',
          quantity: 1,
          price: 351.60,
          total: 351.60,
          isNew: true,
          isChanged: false
        },
        {
          id: '6',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 113.40,
          total: 113.40,
          isNew: true,
          isChanged: false
        },
        {
          id: '7',
          description: 'Basecoat reduction',
          quantity: 1,
          price: -97.20,
          total: -97.20,
          isNew: true,
          isChanged: false
        },
        {
          id: '8',
          description: 'Rpr RT Outer panel (HSS)',
          quantity: 1,
          price: 684.00,
          total: 684.00,
          isNew: false,
          isChanged: true
        },
        {
          id: '9',
          description: 'Overlap Major Non-Adj. Panel',
          quantity: 1,
          price: -32.40,
          total: -32.40,
          isNew: true,
          isChanged: false
        },
        {
          id: '10',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 64.80,
          total: 64.80,
          isNew: true,
          isChanged: false
        },
        {
          id: '11',
          description: 'Basecoat reduction',
          quantity: 1,
          price: -48.60,
          total: -48.60,
          isNew: true,
          isChanged: false
        },
        {
          id: '12',
          description: 'R&I RT Belt molding',
          quantity: 1,
          price: 36.00,
          total: 36.00,
          isNew: false,
          isChanged: false
        },
        {
          id: '13',
          description: 'R&I RT Handle, outside gray',
          quantity: 1,
          price: 48.00,
          total: 48.00,
          isNew: false,
          isChanged: false
        },
        {
          id: '14',
          description: 'R&I RT R&I trim panel',
          quantity: 1,
          price: 48.00,
          total: 48.00,
          isNew: true,
          isChanged: false
        },
        {
          id: '15',
          description: 'Rpr RT Quarter panel',
          quantity: 1,
          price: 1108.80,
          total: 1108.80,
          isNew: false,
          isChanged: true
        },
        {
          id: '16',
          description: 'Overlap Major Adj. Panel',
          quantity: 1,
          price: -64.80,
          total: -64.80,
          isNew: false,
          isChanged: true
        },
        {
          id: '17',
          description: 'Add for Clear Coat',
          quantity: 1,
          price: 64.80,
          total: 64.80,
          isNew: true,
          isChanged: false
        },
        {
          id: '18',
          description: 'Basecoat reduction',
          quantity: 1,
          price: -48.60,
          total: -48.60,
          isNew: true,
          isChanged: false
        },
        {
          id: '19',
          description: 'Repl RT Quarter panel protector',
          quantity: 1,
          price: 44.54,
          total: 44.54,
          isNew: true,
          isChanged: false
        },
        {
          id: '20',
          description: 'Pre-repair scan',
          quantity: 1,
          price: 150.00,
          total: 150.00,
          isNew: true,
          isChanged: false
        },
        {
          id: '21',
          description: 'Post-repair scan and calibration',
          quantity: 1,
          price: 275.00,
          total: 275.00,
          isNew: true,
          isChanged: false
        },
        {
          id: '22',
          description: 'Rental car coverage extension (14 days)',
          quantity: 14,
          price: 45.00,
          total: 630.00,
          isNew: true,
          isChanged: false
        },
        {
          id: '23',
          description: 'Storage fees for extended repair duration',
          quantity: 7,
          price: 25.00,
          total: 175.00,
          isNew: true,
          isChanged: false
        }
      ],
      subtotal: 4142.68,
      tax: 141.74,
      total: 4284.42
    }
  };

  const handleGenerateOriginalPdf = async () => {
    setIsGenerating(true);
    try {
      generatePdfReport(sampleClaimData);
      setLastGenerated('Original PDF (Fixed)');
    } catch (error) {
      console.error('Error generating original PDF:', error);
      alert('Failed to generate original PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateImprovedPdf = async () => {
    setIsGenerating(true);
    try {
      generateImprovedPdfReport(sampleClaimData);
      setLastGenerated('Improved PDF');
    } catch (error) {
      console.error('Error generating improved PDF:', error);
      alert('Failed to generate improved PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCsv = () => {
    try {
      generateEnhancedCsvReport(sampleClaimData);
      setLastGenerated('Enhanced CSV');
    } catch (error) {
      console.error('Error generating CSV:', error);
      alert('Failed to generate CSV');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            PDF Generation Test Suite
          </h1>
          <p className="text-slate-600">
            Test the fixed PDF generation services to verify text truncation issues are resolved.
            All PDFs should now render properly without cut-off text or overflow issues.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">PDF Generation Options</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleGenerateOriginalPdf}
              disabled={isGenerating}
              className="flex flex-col items-center p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="font-medium text-blue-800">Original PDF (Fixed)</div>
              <div className="text-sm text-blue-600 text-center mt-1">
                Fixed version of the original PDF service
              </div>
            </button>

            <button
              onClick={handleGenerateImprovedPdf}
              disabled={isGenerating}
              className="flex flex-col items-center p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-2xl mb-2">📋</div>
              <div className="font-medium text-green-800">Improved PDF</div>
              <div className="text-sm text-green-600 text-center mt-1">
                New improved PDF service with better formatting
              </div>
            </button>

            <button
              onClick={handleGenerateCsv}
              disabled={isGenerating}
              className="flex flex-col items-center p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-2xl mb-2">📈</div>
              <div className="font-medium text-orange-800">Enhanced CSV</div>
              <div className="text-sm text-orange-600 text-center mt-1">
                Improved CSV export with proper formatting
              </div>
            </button>
          </div>

          {isGenerating && (
            <div className="mt-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-slate-600">Generating document...</span>
            </div>
          )}

          {lastGenerated && !isGenerating && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <div className="text-green-600 mr-2">✅</div>
                <span className="text-green-800">Successfully generated: {lastGenerated}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Fixed Issues</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-medium text-slate-700">✅ Resolved Problems</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Text truncation and cut-off issues</li>
                <li>• Inadequate margin management</li>
                <li>• Poor text wrapping in tables</li>
                <li>• Fixed column widths causing overflow</li>
                <li>• Missing page break logic</li>
                <li>• Insufficient page height calculations</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-medium text-slate-700">🔧 Improvements Made</h3>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>• Increased safe margins (20mm → 25mm)</li>
                <li>• Dynamic text wrapping and sizing</li>
                <li>• Automatic page break detection</li>
                <li>• Responsive table column widths</li>
                <li>• Proper content height calculations</li>
                <li>• Enhanced error handling</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimplePdfTest;