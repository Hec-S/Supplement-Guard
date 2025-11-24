import React, { useMemo } from 'react';
import { classifyCharge } from '../services/chargeClassificationService';
import { InvoiceLineItem, ChargeType, ChargeClassificationResult } from '../types';

/**
 * Test Charge Classification Component
 * 
 * Demonstrates and validates the charge classification service with realistic
 * auto repair invoice line items covering all charge types and edge cases.
 */

interface TestCase {
  id: string;
  name: string;
  category: string;
  lineItem: InvoiceLineItem;
  expectedType: ChargeType;
  expectedConfidence: number;
}

const TestChargeClassification: React.FC = () => {
  // Define comprehensive test cases
  const testCases: TestCase[] = useMemo(() => [
    // ========================================================================
    // PARTS WITH LABOR (PART_WITH_LABOR)
    // ========================================================================
    {
      id: 'pwl-1',
      name: 'Bumper Replacement with Explicit Labor',
      category: 'Parts with Labor',
      lineItem: {
        id: 'pwl-1',
        description: 'Repl Rear Bumper Cover',
        operation: 'Repl',
        partNumber: '3CN807421BGRU',
        laborHours: 2.5,
        laborRate: 120,
        quantity: 1,
        price: 750,
        total: 750,
        partCategory: 'OEM',
        vehicleSystem: 'BODY'
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.95
    },
    {
      id: 'pwl-2',
      name: 'Brake Pad Replacement',
      category: 'Parts with Labor',
      lineItem: {
        id: 'pwl-2',
        description: 'Replace Front Brake Pads',
        operation: 'Repl',
        partNumber: 'BP-45678',
        laborHours: 1.5,
        laborRate: 150,
        quantity: 1,
        price: 425,
        total: 425,
        partCategory: 'AFTERMARKET',
        vehicleSystem: 'BRAKES'
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.95
    },
    {
      id: 'pwl-3',
      name: 'Alternator Replacement',
      category: 'Parts with Labor',
      lineItem: {
        id: 'pwl-3',
        description: 'R&R Alternator',
        operation: 'R&R',
        partNumber: 'ALT-98765',
        laborHours: 2.0,
        laborRate: 150,
        quantity: 1,
        price: 650,
        total: 650,
        partCategory: 'OEM',
        vehicleSystem: 'ELECTRICAL'
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.95
    },
    {
      id: 'pwl-4',
      name: 'Headlight Assembly Replacement',
      category: 'Parts with Labor',
      lineItem: {
        id: 'pwl-4',
        description: 'Replace Left Headlight Assembly',
        operation: 'Repl',
        partNumber: 'HL-12345',
        laborHours: 0.8,
        laborRate: 120,
        quantity: 1,
        price: 296,
        total: 296,
        partCategory: 'OEM'
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.95
    },

    // ========================================================================
    // LABOR-ONLY (LABOR_ONLY)
    // ========================================================================
    {
      id: 'lo-1',
      name: 'Diagnostic Testing',
      category: 'Labor-Only',
      lineItem: {
        id: 'lo-1',
        description: 'Vehicle Diagnostic Testing',
        operation: 'Diagnostic',
        laborHours: 1.0,
        laborRate: 150,
        quantity: 1,
        price: 150,
        total: 150
      },
      expectedType: ChargeType.LABOR_ONLY,
      expectedConfidence: 0.90
    },
    {
      id: 'lo-2',
      name: 'Wheel Alignment',
      category: 'Labor-Only',
      lineItem: {
        id: 'lo-2',
        description: 'Four Wheel Alignment',
        laborHours: 1.0,
        laborRate: 120,
        quantity: 1,
        price: 120,
        total: 120,
        vehicleSystem: 'SUSPENSION'
      },
      expectedType: ChargeType.LABOR_ONLY,
      expectedConfidence: 0.80
    },
    {
      id: 'lo-3',
      name: 'Vehicle Inspection',
      category: 'Labor-Only',
      lineItem: {
        id: 'lo-3',
        description: 'Pre-Repair Inspection',
        laborHours: 0.5,
        laborRate: 120,
        quantity: 1,
        price: 60,
        total: 60
      },
      expectedType: ChargeType.LABOR_ONLY,
      expectedConfidence: 0.80
    },
    {
      id: 'lo-4',
      name: 'R&I Door Panel',
      category: 'Labor-Only',
      lineItem: {
        id: 'lo-4',
        description: 'R&I Front Door Panel',
        operation: 'R&I',
        laborHours: 1.2,
        laborRate: 120,
        quantity: 1,
        price: 144,
        total: 144,
        vehicleSystem: 'BODY'
      },
      expectedType: ChargeType.LABOR_ONLY,
      expectedConfidence: 0.90
    },
    {
      id: 'lo-5',
      name: 'Fluid Flush Service',
      category: 'Labor-Only',
      lineItem: {
        id: 'lo-5',
        description: 'Brake Fluid Flush and Fill',
        laborHours: 0.8,
        laborRate: 150,
        quantity: 1,
        price: 120,
        total: 120,
        vehicleSystem: 'BRAKES'
      },
      expectedType: ChargeType.LABOR_ONLY,
      expectedConfidence: 0.80
    },

    // ========================================================================
    // MATERIALS (MATERIAL)
    // ========================================================================
    {
      id: 'mat-1',
      name: 'Paint Materials',
      category: 'Materials',
      lineItem: {
        id: 'mat-1',
        description: 'Paint Supplies',
        laborHours: 10.5,
        laborRate: 42,
        quantity: 1,
        price: 441,
        total: 441,
        partCategory: 'PAINT_MATERIALS'
      },
      expectedType: ChargeType.MATERIAL,
      expectedConfidence: 0.85
    },
    {
      id: 'mat-2',
      name: 'Shop Supplies',
      category: 'Materials',
      lineItem: {
        id: 'mat-2',
        description: 'Shop Supplies',
        quantity: 1,
        price: 75,
        total: 75,
        partCategory: 'CONSUMABLES'
      },
      expectedType: ChargeType.MATERIAL,
      expectedConfidence: 0.85
    },
    {
      id: 'mat-3',
      name: 'Fluids and Lubricants',
      category: 'Materials',
      lineItem: {
        id: 'mat-3',
        description: 'Brake Fluid (DOT 4)',
        quantity: 2,
        price: 24,
        total: 24
      },
      expectedType: ChargeType.MATERIAL,
      expectedConfidence: 0.85
    },
    {
      id: 'mat-4',
      name: 'Sandpaper and Consumables',
      category: 'Materials',
      lineItem: {
        id: 'mat-4',
        description: 'Sandpaper and Masking Materials',
        quantity: 1,
        price: 35,
        total: 35
      },
      expectedType: ChargeType.MATERIAL,
      expectedConfidence: 0.85
    },

    // ========================================================================
    // SUBLET WORK (SUBLET)
    // ========================================================================
    {
      id: 'sub-1',
      name: 'Glass Replacement (Sublet)',
      category: 'Sublet Work',
      lineItem: {
        id: 'sub-1',
        description: 'Sublet Windshield Replacement',
        operation: 'Subl',
        quantity: 1,
        price: 450,
        total: 450
      },
      expectedType: ChargeType.SUBLET,
      expectedConfidence: 0.95
    },
    {
      id: 'sub-2',
      name: 'Towing Service',
      category: 'Sublet Work',
      lineItem: {
        id: 'sub-2',
        description: 'Sublet Towing Service',
        operation: 'Subl',
        quantity: 1,
        price: 200,
        total: 200
      },
      expectedType: ChargeType.SUBLET,
      expectedConfidence: 0.95
    },
    {
      id: 'sub-3',
      name: 'ADAS Calibration (Sublet)',
      category: 'Sublet Work',
      lineItem: {
        id: 'sub-3',
        description: 'Sublet ADAS Camera Calibration',
        operation: 'Subl',
        quantity: 1,
        price: 350,
        total: 350
      },
      expectedType: ChargeType.SUBLET,
      expectedConfidence: 0.95
    },

    // ========================================================================
    // EDGE CASES
    // ========================================================================
    {
      id: 'edge-1',
      name: 'Combined Line Item (Part + Paint + Labor)',
      category: 'Edge Cases',
      lineItem: {
        id: 'edge-1',
        description: 'Repl Front Bumper Cover, Grille, and Fog Lamps',
        operation: 'Repl',
        quantity: 1,
        price: 1250,
        total: 1250
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.60
    },
    {
      id: 'edge-2',
      name: 'Missing Labor Hours (Should Estimate)',
      category: 'Edge Cases',
      lineItem: {
        id: 'edge-2',
        description: 'Replace Door Mirror',
        operation: 'Repl',
        partNumber: 'MIR-54321',
        quantity: 1,
        price: 380,
        total: 380,
        partCategory: 'OEM'
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.80
    },
    {
      id: 'edge-3',
      name: 'Zero-Cost Warranty Work',
      category: 'Edge Cases',
      lineItem: {
        id: 'edge-3',
        description: 'Repl Defective Sensor (Warranty)',
        operation: 'Repl',
        partNumber: 'SENS-99999',
        quantity: 1,
        price: 0,
        total: 0
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.85
    },
    {
      id: 'edge-4',
      name: 'High-Value Part with Low Labor',
      category: 'Edge Cases',
      lineItem: {
        id: 'edge-4',
        description: 'Replace Engine Control Module',
        operation: 'Repl',
        partNumber: 'ECM-77777',
        laborHours: 0.5,
        laborRate: 150,
        quantity: 1,
        price: 1275,
        total: 1275,
        partCategory: 'OEM',
        vehicleSystem: 'ELECTRICAL'
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.95
    },
    {
      id: 'edge-5',
      name: 'Low-Value Part with High Labor',
      category: 'Edge Cases',
      lineItem: {
        id: 'edge-5',
        description: 'Replace Cabin Air Filter',
        operation: 'Repl',
        partNumber: 'CAF-11111',
        laborHours: 2.0,
        laborRate: 150,
        quantity: 1,
        price: 325,
        total: 325,
        partCategory: 'AFTERMARKET',
        vehicleSystem: 'HVAC'
      },
      expectedType: ChargeType.PART_WITH_LABOR,
      expectedConfidence: 0.95
    }
  ], []);

  // Run classification on all test cases
  const results = useMemo(() => {
    return testCases.map(testCase => {
      const classification = classifyCharge(testCase.lineItem);
      const isTypeCorrect = classification.chargeType === testCase.expectedType;
      const isConfidenceAcceptable = classification.confidence >= (testCase.expectedConfidence - 0.15);
      
      return {
        testCase,
        classification,
        isTypeCorrect,
        isConfidenceAcceptable,
        isValid: isTypeCorrect && isConfidenceAcceptable
      };
    });
  }, [testCases]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    const total = results.length;
    const successful = results.filter(r => r.isValid).length;
    const failed = total - successful;
    
    const byChargeType: Record<string, { total: number; avgConfidence: number; successful: number }> = {};
    
    results.forEach(r => {
      const type = r.classification.chargeType;
      if (!byChargeType[type]) {
        byChargeType[type] = { total: 0, avgConfidence: 0, successful: 0 };
      }
      byChargeType[type].total++;
      byChargeType[type].avgConfidence += r.classification.confidence;
      if (r.isValid) byChargeType[type].successful++;
    });
    
    Object.keys(byChargeType).forEach(type => {
      byChargeType[type].avgConfidence /= byChargeType[type].total;
    });
    
    return {
      total,
      successful,
      failed,
      successRate: (successful / total) * 100,
      byChargeType
    };
  }, [results]);

  // Get charge type badge style
  const getChargeTypeBadge = (type: ChargeType) => {
    const styles: Record<ChargeType, { bg: string; text: string; label: string; icon: string }> = {
      [ChargeType.PART_WITH_LABOR]: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'PART + LABOR', icon: '🔧' },
      [ChargeType.LABOR_ONLY]: { bg: 'bg-green-100', text: 'text-green-800', label: 'LABOR ONLY', icon: '⚙️' },
      [ChargeType.MATERIAL]: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'MATERIAL', icon: '🎨' },
      [ChargeType.SUBLET]: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'SUBLET', icon: '🏢' },
      [ChargeType.MISCELLANEOUS]: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'MISC', icon: '📋' },
      [ChargeType.UNKNOWN]: { bg: 'bg-red-100', text: 'text-red-800', label: 'UNKNOWN', icon: '❓' }
    };
    
    const style = styles[type];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text} border border-current`}>
        <span>{style.icon}</span>
        <span>{style.label}</span>
      </span>
    );
  };

  // Get confidence indicator
  const getConfidenceIndicator = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    let color = 'bg-red-500';
    if (confidence >= 0.9) color = 'bg-green-500';
    else if (confidence >= 0.7) color = 'bg-yellow-500';
    else if (confidence >= 0.5) color = 'bg-orange-500';
    
    return (
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="text-sm font-medium">{percentage}%</span>
      </div>
    );
  };

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof results> = {};
    results.forEach(result => {
      const category = result.testCase.category;
      if (!groups[category]) groups[category] = [];
      groups[category].push(result);
    });
    return groups;
  }, [results]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Charge Classification Service Tests
        </h1>
        <p className="text-gray-600">
          Comprehensive validation of the charge classification service with realistic auto repair scenarios
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 font-medium">Total Tests</div>
          <div className="text-3xl font-bold text-gray-900">{summary.total}</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-sm text-green-600 font-medium">Successful</div>
          <div className="text-3xl font-bold text-green-900">{summary.successful}</div>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
          <div className="text-sm text-red-600 font-medium">Failed</div>
          <div className="text-3xl font-bold text-red-900">{summary.failed}</div>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 border border-blue-200">
          <div className="text-sm text-blue-600 font-medium">Success Rate</div>
          <div className="text-3xl font-bold text-blue-900">{summary.successRate.toFixed(1)}%</div>
        </div>
      </div>

      {/* Average Confidence by Charge Type */}
      <div className="mb-8 bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Average Confidence by Charge Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(summary.byChargeType).map(([type, stats]: [string, any]) => (
            <div key={type} className="border border-gray-200 rounded-lg p-4">
              <div className="mb-2">{getChargeTypeBadge(type as ChargeType)}</div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {(stats.avgConfidence * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">
                {stats.successful}/{stats.total} tests passed
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Test Results by Category */}
      {Object.entries(groupedResults).map(([category, categoryResults]) => (
        <div key={category} className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{category}</h2>
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Test Case
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Charge Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Part Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Labor Cost
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(categoryResults as typeof results).map((result) => (
                    <tr key={result.testCase.id} className={result.isValid ? '' : 'bg-red-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {result.testCase.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div className="max-w-xs">
                          {result.testCase.lineItem.description}
                          {result.testCase.lineItem.operation && (
                            <div className="text-xs text-gray-500 mt-1">
                              Op: {result.testCase.lineItem.operation}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getChargeTypeBadge(result.classification.chargeType)}
                        {!result.isTypeCorrect && (
                          <div className="text-xs text-red-600 mt-1">
                            Expected: {result.testCase.expectedType}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getConfidenceIndicator(result.classification.confidence)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {result.classification.costBreakdown ? (
                          <span className="font-medium">
                            ${result.classification.costBreakdown.partCost.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {result.classification.costBreakdown ? (
                          <span className="font-medium">
                            ${result.classification.costBreakdown.laborCost.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        ${result.testCase.lineItem.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {result.isValid ? (
                          <span className="text-green-600 text-xl">✓</span>
                        ) : (
                          <span className="text-red-600 text-xl">✗</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {/* Warnings Section */}
      <div className="bg-yellow-50 rounded-lg shadow p-6 border border-yellow-200">
        <h2 className="text-xl font-bold text-yellow-900 mb-4">⚠️ Warnings and Issues</h2>
        <div className="space-y-2">
          {results
            .filter(r => r.classification.warnings && r.classification.warnings.length > 0)
            .map(r => (
              <div key={r.testCase.id} className="text-sm">
                <span className="font-medium text-yellow-900">{r.testCase.name}:</span>
                <ul className="ml-4 mt-1 list-disc text-yellow-800">
                  {r.classification.warnings?.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              </div>
            ))}
          {results.every(r => !r.classification.warnings || r.classification.warnings.length === 0) && (
            <p className="text-yellow-800">No warnings detected in any test cases.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestChargeClassification;