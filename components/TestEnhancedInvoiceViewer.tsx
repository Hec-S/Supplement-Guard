import React from 'react';
import InvoiceViewer from './InvoiceViewer';
import { Invoice } from '../types';

const TestEnhancedInvoiceViewer: React.FC = () => {
  // Sample original invoice data
  const originalInvoice: Invoice = {
    fileName: 'original-estimate.pdf',
    lineItems: [
      {
        id: '1',
        description: 'R&I R&I bumper cover (Labor)',
        quantity: 1.3,
        price: 67.00,
        total: 87.10,
        isNew: false,
        isChanged: false
      },
      {
        id: '2',
        description: 'Rpr Bumper cover (Labor)',
        quantity: 3,
        price: 67.00,
        total: 201.00,
        isNew: false,
        isChanged: false
      },
      {
        id: '3',
        description: 'Rpr Bumper cover (Paint Labor)',
        quantity: 1.4,
        price: 67.00,
        total: 93.80,
        isNew: false,
        isChanged: false
      },
      {
        id: '4',
        description: 'Add for Clear Coat (Paint Labor, Rear Bumper)',
        quantity: 1.1,
        price: 67.00,
        total: 73.70,
        isNew: false,
        isChanged: false
      },
      {
        id: '5',
        description: 'Rpr RT Quarter panel (Labor)',
        quantity: 2.5,
        price: 67.00,
        total: 167.50,
        isNew: false,
        isChanged: false
      },
      {
        id: '6',
        description: 'Paint Supplies',
        quantity: 5.6,
        price: 42.00,
        total: 235.20,
        isNew: false,
        isChanged: false
      },
      {
        id: '7',
        description: 'HAZ WASTE',
        quantity: 1,
        price: 3.00,
        total: 3.00,
        isNew: false,
        isChanged: false
      },
      {
        id: '8',
        description: 'CAR COVER',
        quantity: 1,
        price: 5.00,
        total: 5.00,
        isNew: false,
        isChanged: false
      }
    ],
    subtotal: 866.30,
    tax: 69.30,
    total: 935.60
  };

  // Sample supplement invoice data with changes
  const supplementInvoice: Invoice = {
    fileName: 'supplement-invoice.pdf',
    lineItems: [
      // Existing items with changes
      {
        id: '1',
        description: 'Repl RT/Rear Wheel cover',
        quantity: 1,
        price: 105.90,
        total: 105.90,
        isNew: false,
        isChanged: true
      },
      {
        id: '2',
        description: 'Blnd RT Roof side panel (Labor)',
        quantity: 0.5,
        price: 120.00,
        total: 60.00,
        isNew: false,
        isChanged: true
      },
      {
        id: '3',
        description: 'Blnd RT Roof side panel (Paint Labor)',
        quantity: 0.8,
        price: 120.00,
        total: 96.00,
        isNew: false,
        isChanged: true
      },
      {
        id: '4',
        description: 'R&I RT Roof molding (Labor)',
        quantity: 0.4,
        price: 120.00,
        total: 48.00,
        isNew: false,
        isChanged: true
      },
      {
        id: '5',
        description: 'R&I RT Rocker molding (Labor)',
        quantity: 0.9,
        price: 120.00,
        total: 108.00,
        isNew: false,
        isChanged: true
      },
      // New items
      {
        id: '9',
        description: 'Rpr RT Rocker molding (Labor)',
        quantity: 0.5,
        price: 120.00,
        total: 60.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '10',
        description: 'Rpr RT Rocker molding (Paint Labor)',
        quantity: 1.8,
        price: 120.00,
        total: 216.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '11',
        description: 'Add for Clear Coat (Paint Labor, Rocker Molding)',
        quantity: 0.7,
        price: 120.00,
        total: 84.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '12',
        description: 'Refn Basecoat reduction (Paint Labor, Rocker Molding)',
        quantity: -0.3,
        price: 120.00,
        total: -36.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '13',
        description: 'Rpr RT Outer panel (HSS) (Labor)',
        quantity: 3,
        price: 120.00,
        total: 360.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '14',
        description: 'Rpr RT Outer panel (HSS) (Paint Labor)',
        quantity: 2,
        price: 120.00,
        total: 240.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '15',
        description: 'Overlap Major Non-Adj. Panel (Paint Labor, Rear Door)',
        quantity: -0.2,
        price: 120.00,
        total: -24.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '16',
        description: 'Add for Clear Coat (Paint Labor, Rear Door)',
        quantity: 0.4,
        price: 120.00,
        total: 48.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '17',
        description: 'Refn Basecoat reduction (Paint Labor, Rear Door)',
        quantity: -0.3,
        price: 120.00,
        total: -36.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '18',
        description: 'R&I RT Belt molding (Labor)',
        quantity: 0.3,
        price: 120.00,
        total: 36.00,
        isNew: true,
        isChanged: false
      },
      {
        id: '19',
        description: 'R&I RT Handle, outside gray (Labor)',
        quantity: 0.4,
        price: 120.00,
        total: 48.00,
        isNew: true,
        isChanged: false
      },
      // Updated materials
      {
        id: '20',
        description: 'Paint Supplies (Enhanced)',
        quantity: 8.2,
        price: 45.00,
        total: 369.00,
        isNew: true,
        isChanged: false
      }
    ],
    subtotal: 1783.90,
    tax: 142.71,
    total: 1926.61
  };

  const aiSummary = `**Comprehensive Supplement Analysis**

**Major Changes Identified:**
* Significant scope expansion with 15 new line items added
* Complete replacement of original bumper work with roof and side panel repairs
* Labor rate increased from $67.00 to $120.00 per hour
* Total project cost increased by $991.01 (105.9% increase)

**Key Additions:**
- RT Roof side panel blending and paint work
- RT Rocker molding repair and refinishing
- RT Outer panel (HSS) comprehensive repair
- Enhanced paint supplies and materials

**Cost Impact Analysis:**
- Original estimate: $935.60
- Supplement total: $1,926.61
- Net increase: $991.01
- Percentage increase: 105.9%

**Risk Assessment:**
- High variance in labor rates suggests potential billing irregularities
- Scope creep indicates possible hidden damage discovery
- Material cost increases align with expanded work scope
- Recommend detailed review of labor hour justifications`;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Enhanced Invoice Viewer Test
          </h1>
          <p className="text-slate-600">
            Comprehensive demonstration of the enhanced invoice comparison with line-by-line analysis,
            statistical insights, and improved table display handling.
          </p>
        </div>

        <InvoiceViewer
          originalInvoice={originalInvoice}
          supplementInvoice={supplementInvoice}
          summary={aiSummary}
        />

        {/* Feature Highlights */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Enhanced Features Demonstrated</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">✅ Fixed Display Issues</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• No content cut-off</li>
                <li>• Proper table overflow handling</li>
                <li>• Sticky headers and footers</li>
                <li>• Responsive table dimensions</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">📊 Statistical Insights</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Total variance calculations</li>
                <li>• Percentage change indicators</li>
                <li>• Item count summaries</li>
                <li>• Change type categorization</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">🎯 Line-by-Line Analysis</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Color-coded variance indicators</li>
                <li>• NEW/CHANGED/REMOVED labels</li>
                <li>• Original → New value display</li>
                <li>• Percentage change calculations</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">🔄 View Modes</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Side-by-side comparison</li>
                <li>• Line-by-line analysis</li>
                <li>• Filter by change type</li>
                <li>• Seamless mode switching</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">💻 Web-First Design</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Desktop-optimized layout</li>
                <li>• Proper column sizing</li>
                <li>• Enhanced readability</li>
                <li>• Professional appearance</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-slate-700">🎨 Visual Enhancements</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Improved color contrast</li>
                <li>• Better typography</li>
                <li>• Consistent formatting</li>
                <li>• Hover interactions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestEnhancedInvoiceViewer;