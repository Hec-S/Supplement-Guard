import React from 'react';
import { changeFocusedPdfService } from '../services/changeFocusedPdfService';
import Button from './Button';
import { DownloadIcon } from './icons/DownloadIcon';

const ChangeFocusedPdfTest: React.FC = () => {
  const handleTestChangeFocusedPdf = async () => {
    try {
      console.log('Testing Change-Focused PDF Generation...');
      
      // Create a simple mock analysis for testing
      const mockAnalysis = {
        analysisId: 'TEST-001',
        timestamp: new Date(),
        statistics: {
          totalVariance: 2376,
          totalVariancePercent: 44.0,
          itemCount: 8,
          averageVariance: 297,
          medianVariance: 150,
          standardDeviation: 125,
          varianceRange: { min: -50, max: 600 },
          categoryVariances: {},
          varianceTypeDistribution: {},
          dataQuality: {
            completeness: 0.95,
            consistency: 0.92,
            accuracy: 0.88,
            precision: 0.90,
            issues: []
          },
          suspiciousPatterns: []
        },
        reconciliation: {
          matchedItems: [
            {
              original: {
                id: 'ORIG-001',
                description: 'Front Brake Pads',
                quantity: 1,
                price: 150,
                total: 150,
                category: 'parts'
              },
              supplement: {
                id: 'SUPP-001',
                description: 'Front Brake Pads - Premium',
                quantity: 1,
                price: 250,
                total: 250,
                category: 'parts',
                priceVariance: 100,
                quantityVariance: 0,
                totalVariance: 100,
                totalChangePercent: 66.7,
                hasSignificantVariance: true
              },
              matchConfidence: 0.9
            },
            {
              original: {
                id: 'ORIG-002',
                description: 'Labor - Brake Service',
                quantity: 2,
                price: 120,
                total: 240,
                category: 'labor'
              },
              supplement: {
                id: 'SUPP-002',
                description: 'Labor - Brake Service',
                quantity: 3,
                price: 140,
                total: 420,
                category: 'labor',
                priceVariance: 20,
                quantityVariance: 1,
                totalVariance: 180,
                totalChangePercent: 75.0,
                hasSignificantVariance: true
              },
              matchConfidence: 1.0
            }
          ],
          newSupplementItems: [
            {
              id: 'NEW-001',
              description: 'Brake Fluid Flush',
              quantity: 1,
              price: 80,
              total: 80,
              category: 'materials'
            },
            {
              id: 'NEW-002',
              description: 'Rotor Resurfacing',
              quantity: 2,
              price: 60,
              total: 120,
              category: 'labor'
            },
            {
              id: 'NEW-003',
              description: 'Premium Brake Rotors',
              quantity: 2,
              price: 300,
              total: 600,
              category: 'parts'
            }
          ],
          unmatchedOriginalItems: [
            {
              id: 'REMOVED-001',
              description: 'Basic Brake Inspection',
              quantity: 1,
              price: 50,
              total: 50,
              category: 'labor'
            }
          ],
          matchingAccuracy: 0.85
        },
        riskAssessment: {
          overallRiskScore: 75,
          riskLevel: 'high',
          riskFactors: [
            {
              description: 'Significant cost increase of 44%',
              impact: 0.8
            },
            {
              description: 'Multiple new high-value items added',
              impact: 0.6
            },
            {
              description: 'Price increases on existing items',
              impact: 0.5
            }
          ],
          recommendations: [
            'Review justification for premium brake pad upgrade',
            'Verify necessity of rotor resurfacing',
            'Confirm labor hour calculations',
            'Request additional documentation for new items'
          ]
        },
        discrepancies: [
          {
            id: 'DISC-001',
            type: 'price_anomaly',
            description: 'Unusual price increase pattern',
            severity: 'high',
            detailedExplanation: 'Multiple items show significant price increases that exceed typical market rates.',
            affectedItems: ['SUPP-001', 'SUPP-002'],
            recommendedAction: 'Request vendor justification for price increases',
            potentialImpact: 0.8,
            autoResolvable: false,
            detectedAt: new Date()
          }
        ]
      };

      const mockClaimData = {
        id: 'TEST-CLAIM-001',
        fraudScore: 75,
        fraudReasons: [
          'Significant price increases detected',
          'New high-value items added',
          'Unusual pattern in labor costs'
        ],
        invoiceSummary: 'AI Analysis detected multiple changes between original and supplement invoices.',
        originalInvoice: {
          fileName: 'original-invoice.pdf',
          lineItems: [],
          subtotal: 5000,
          tax: 400,
          total: 5400
        },
        supplementInvoice: {
          fileName: 'supplement-invoice.pdf',
          lineItems: [],
          subtotal: 7200,
          tax: 576,
          total: 7776
        }
      };

      const pdfBlob = await changeFocusedPdfService.generateChangeFocusedReport(
        mockAnalysis as any, // Type assertion to bypass complex type checking
        mockClaimData,
        {
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
        }
      );

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `test-ai-analysis-changes-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Change-Focused PDF generated successfully!');
      alert('✅ Change-Focused PDF generated successfully! Check your downloads folder.');
    } catch (error) {
      console.error('❌ Error generating change-focused PDF:', error);
      alert('❌ Failed to generate change-focused PDF. Check console for details.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          🧪 Change-Focused PDF Test
        </h2>
        <p className="text-slate-600 mb-6">
          Test the new AI Analysis PDF that shows only changes between documents with color coding:
        </p>
        
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-slate-800 mb-3">Test Data Summary:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-red-600">New Items (Red Background):</strong>
              <ul className="list-disc list-inside text-slate-600 mt-1">
                <li>Brake Fluid Flush - $80</li>
                <li>Rotor Resurfacing - $120</li>
                <li>Premium Brake Rotors - $600</li>
              </ul>
            </div>
            <div>
              <strong className="text-orange-600">Changed Items (Orange Background):</strong>
              <ul className="list-disc list-inside text-slate-600 mt-1">
                <li>Brake Pads: $150 → $250 (+$100)</li>
                <li>Labor: $240 → $420 (+$180)</li>
              </ul>
            </div>
            <div>
              <strong className="text-gray-600">Removed Items (Gray Background):</strong>
              <ul className="list-disc list-inside text-slate-600 mt-1">
                <li>Basic Brake Inspection - $50</li>
              </ul>
            </div>
            <div>
              <strong className="text-blue-600">Total Change:</strong>
              <ul className="list-disc list-inside text-slate-600 mt-1">
                <li>Original: $5,400</li>
                <li>Supplement: $7,776</li>
                <li><strong>Increase: +$2,376 (44%)</strong></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={handleTestChangeFocusedPdf}
            variant="primary"
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <DownloadIcon />
            Generate AI Analysis PDF (Changes Only)
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">📋 What to Expect:</h4>
          <ul className="text-blue-700 text-sm space-y-1">
            <li>• <strong>Page 1:</strong> Executive Summary & AI Insights</li>
            <li>• <strong>Page 2:</strong> Detailed Changes with Color Coding</li>
            <li>• <strong>Red Background:</strong> New items added</li>
            <li>• <strong>Orange Background:</strong> Items that changed</li>
            <li>• <strong>Gray Background:</strong> Items removed</li>
            <li>• <strong>No Original Invoices:</strong> Focus only on what changed</li>
            <li>• <strong>AI Insights:</strong> Smart analysis of patterns and risks</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ChangeFocusedPdfTest;