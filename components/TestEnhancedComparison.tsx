import React from 'react';
import EnhancedComparisonTable from './EnhancedComparisonTable';
import { 
  ComparisonAnalysis, 
  EnhancedInvoiceLineItem, 
  CostCategory, 
  VarianceType, 
  SeverityLevel,
  EnhancedInvoice,
  ReconciliationResult,
  VarianceStatistics,
  RiskAssessment
} from '../types';

// Sample test data for the enhanced comparison table
const createSampleData = (): ComparisonAnalysis => {
  // Sample original items
  const originalItems: EnhancedInvoiceLineItem[] = [
    {
      id: '1',
      description: 'Engine Oil Change',
      quantity: 1,
      price: 50.00,
      total: 50.00,
      category: CostCategory.LABOR,
      categoryConfidence: 0.9,
      matchingConfidence: 1.0,
      varianceType: VarianceType.PRICE_CHANGE,
      quantityVariance: 0,
      priceVariance: 25.00,
      totalVariance: 25.00,
      quantityChangePercent: 0,
      priceChangePercent: 50.0,
      totalChangePercent: 50.0,
      isPotentialDuplicate: false,
      hasSignificantVariance: true,
      requiresReview: true,
      lastModified: new Date(),
      modificationReason: 'Price increase detected'
    },
    {
      id: '2',
      description: 'Air Filter Replacement',
      quantity: 2,
      price: 25.00,
      total: 50.00,
      category: CostCategory.PARTS,
      categoryConfidence: 0.95,
      matchingConfidence: 1.0,
      varianceType: VarianceType.PRICE_CHANGE,
      quantityVariance: 0,
      priceVariance: -10.00,
      totalVariance: -20.00,
      quantityChangePercent: 0,
      priceChangePercent: -28.57,
      totalChangePercent: -28.57,
      isPotentialDuplicate: false,
      hasSignificantVariance: true,
      requiresReview: false,
      lastModified: new Date(),
      modificationReason: 'Price decrease detected'
    },
    {
      id: '3',
      description: 'Brake Pad Installation',
      quantity: 1,
      price: 150.00,
      total: 150.00,
      category: CostCategory.LABOR,
      categoryConfidence: 0.85,
      matchingConfidence: 1.0,
      varianceType: VarianceType.NO_CHANGE,
      quantityVariance: 0,
      priceVariance: 0,
      totalVariance: 0,
      quantityChangePercent: 0,
      priceChangePercent: 0,
      totalChangePercent: 0,
      isPotentialDuplicate: false,
      hasSignificantVariance: false,
      requiresReview: false,
      lastModified: new Date()
    }
  ];

  // Sample supplement items (modified versions + new items)
  const supplementItems: EnhancedInvoiceLineItem[] = [
    {
      ...originalItems[0],
      price: 75.00,
      total: 75.00,
      priceVariance: 25.00,
      totalVariance: 25.00,
      priceChangePercent: 50.0,
      totalChangePercent: 50.0,
      hasSignificantVariance: true,
      requiresReview: true
    },
    {
      ...originalItems[1],
      price: 17.86,
      total: 35.72,
      priceVariance: -7.14,
      totalVariance: -14.28,
      priceChangePercent: -28.57,
      totalChangePercent: -28.57,
      hasSignificantVariance: true
    },
    {
      ...originalItems[2]
    },
    // New item
    {
      id: '4',
      description: 'Additional Diagnostic Service',
      quantity: 1,
      price: 120.00,
      total: 120.00,
      category: CostCategory.LABOR,
      categoryConfidence: 0.8,
      matchingConfidence: 0.0,
      varianceType: VarianceType.NEW_ITEM,
      quantityVariance: 0,
      priceVariance: 0,
      totalVariance: 120.00,
      quantityChangePercent: null,
      priceChangePercent: null,
      totalChangePercent: null,
      isPotentialDuplicate: false,
      hasSignificantVariance: true,
      requiresReview: true,
      lastModified: new Date(),
      modificationReason: 'New item added',
      isNew: true
    },
    // Another new item
    {
      id: '5',
      description: 'Premium Synthetic Oil',
      quantity: 1,
      price: 45.00,
      total: 45.00,
      category: CostCategory.MATERIALS,
      categoryConfidence: 0.9,
      matchingConfidence: 0.0,
      varianceType: VarianceType.NEW_ITEM,
      quantityVariance: 0,
      priceVariance: 0,
      totalVariance: 45.00,
      quantityChangePercent: null,
      priceChangePercent: null,
      totalChangePercent: null,
      isPotentialDuplicate: false,
      hasSignificantVariance: true,
      requiresReview: false,
      lastModified: new Date(),
      modificationReason: 'New material added',
      isNew: true
    }
  ];

  const originalInvoice: EnhancedInvoice = {
    fileName: 'original-invoice.pdf',
    lineItems: originalItems,
    subtotal: 250.00,
    tax: 20.00,
    total: 270.00,
    metadata: {
      processingDate: new Date(),
      dataSource: 'api',
      validationStatus: 'validated',
      validationErrors: []
    },
    qualityScore: 0.95
  };

  const supplementInvoice: EnhancedInvoice = {
    fileName: 'supplement-invoice.pdf',
    lineItems: supplementItems,
    subtotal: 375.72,
    tax: 30.06,
    total: 405.78,
    metadata: {
      processingDate: new Date(),
      dataSource: 'api',
      validationStatus: 'validated',
      validationErrors: []
    },
    qualityScore: 0.92
  };

  const reconciliation: ReconciliationResult = {
    matchedItems: [
      {
        original: originalItems[0],
        supplement: supplementItems[0],
        matchingScore: 1.0,
        matchingCriteria: {
          exactDescriptionMatch: 1.0,
          fuzzyDescriptionMatch: 1.0,
          categoryMatch: 1.0,
          priceRangeMatch: 0.8,
          overallScore: 0.95
        },
        varianceAnalysis: {
          quantityVariance: { absolute: 0, percentage: 0, isIncrease: false, significance: 'negligible' },
          priceVariance: { absolute: 25.00, percentage: 50.0, isIncrease: true, significance: 'major' },
          totalVariance: { absolute: 25.00, percentage: 50.0, isIncrease: true, significance: 'major' },
          isSignificant: true,
          riskLevel: SeverityLevel.HIGH
        }
      },
      {
        original: originalItems[1],
        supplement: supplementItems[1],
        matchingScore: 1.0,
        matchingCriteria: {
          exactDescriptionMatch: 1.0,
          fuzzyDescriptionMatch: 1.0,
          categoryMatch: 1.0,
          priceRangeMatch: 0.7,
          overallScore: 0.92
        },
        varianceAnalysis: {
          quantityVariance: { absolute: 0, percentage: 0, isIncrease: false, significance: 'negligible' },
          priceVariance: { absolute: -7.14, percentage: -28.57, isIncrease: false, significance: 'moderate' },
          totalVariance: { absolute: -14.28, percentage: -28.57, isIncrease: false, significance: 'moderate' },
          isSignificant: true,
          riskLevel: SeverityLevel.MEDIUM
        }
      },
      {
        original: originalItems[2],
        supplement: supplementItems[2],
        matchingScore: 1.0,
        matchingCriteria: {
          exactDescriptionMatch: 1.0,
          fuzzyDescriptionMatch: 1.0,
          categoryMatch: 1.0,
          priceRangeMatch: 1.0,
          overallScore: 1.0
        },
        varianceAnalysis: {
          quantityVariance: { absolute: 0, percentage: 0, isIncrease: false, significance: 'negligible' },
          priceVariance: { absolute: 0, percentage: 0, isIncrease: false, significance: 'negligible' },
          totalVariance: { absolute: 0, percentage: 0, isIncrease: false, significance: 'negligible' },
          isSignificant: false,
          riskLevel: SeverityLevel.LOW
        }
      }
    ],
    unmatchedOriginalItems: [],
    newSupplementItems: [supplementItems[3], supplementItems[4]],
    matchingAccuracy: 0.6, // 3 matched out of 5 total items
    totalItemsProcessed: 8,
    matchingAlgorithmUsed: 'hybrid',
    processingTime: 150
  };

  const statistics: VarianceStatistics = {
    totalVariance: 155.72,
    totalVariancePercent: 57.67,
    itemCount: 5,
    categoryVariances: {
      [CostCategory.LABOR]: {
        variance: 145.00,
        variancePercent: 72.5,
        itemCount: 2,
        averageVariance: 72.5,
        significantItems: ['1', '4']
      },
      [CostCategory.PARTS]: {
        variance: -14.28,
        variancePercent: -28.57,
        itemCount: 1,
        averageVariance: -14.28,
        significantItems: ['2']
      },
      [CostCategory.MATERIALS]: {
        variance: 45.00,
        variancePercent: 100,
        itemCount: 1,
        averageVariance: 45.00,
        significantItems: ['5']
      },
      [CostCategory.EQUIPMENT]: {
        variance: 0,
        variancePercent: 0,
        itemCount: 0,
        averageVariance: 0,
        significantItems: []
      },
      [CostCategory.OVERHEAD]: {
        variance: 0,
        variancePercent: 0,
        itemCount: 0,
        averageVariance: 0,
        significantItems: []
      },
      [CostCategory.OTHER]: {
        variance: 0,
        variancePercent: 0,
        itemCount: 0,
        averageVariance: 0,
        significantItems: []
      }
    },
    varianceTypeDistribution: {
      [VarianceType.NEW_ITEM]: { count: 2, totalAmount: 165.00, percentage: 40, averageAmount: 82.5 },
      [VarianceType.PRICE_CHANGE]: { count: 2, totalAmount: 39.28, percentage: 40, averageAmount: 19.64 },
      [VarianceType.NO_CHANGE]: { count: 1, totalAmount: 0, percentage: 20, averageAmount: 0 },
      [VarianceType.REMOVED_ITEM]: { count: 0, totalAmount: 0, percentage: 0, averageAmount: 0 },
      [VarianceType.QUANTITY_CHANGE]: { count: 0, totalAmount: 0, percentage: 0, averageAmount: 0 },
      [VarianceType.DESCRIPTION_CHANGE]: { count: 0, totalAmount: 0, percentage: 0, averageAmount: 0 }
    },
    averageVariance: 31.14,
    medianVariance: 25.00,
    standardDeviation: 45.23,
    varianceRange: { min: -14.28, max: 120.00 },
    highVarianceItems: [supplementItems[0], supplementItems[3], supplementItems[4]],
    suspiciousPatterns: [],
    dataQuality: {
      completeness: 1.0,
      consistency: 0.95,
      accuracy: 0.98,
      precision: 0.99,
      issues: []
    }
  };

  const riskAssessment: RiskAssessment = {
    overallRiskScore: 65,
    riskLevel: 'medium',
    riskFactors: [
      {
        type: 'high_variance',
        description: 'Total variance of 57.67% exceeds normal thresholds',
        impact: 58,
        likelihood: 0.9,
        mitigation: 'Detailed review of high-variance items recommended'
      },
      {
        type: 'new_items',
        description: '2 new items added totaling $165.00',
        impact: 35,
        likelihood: 0.7,
        mitigation: 'Verify necessity and pricing of new items'
      }
    ],
    recommendations: [
      'Detailed review of high-variance items recommended',
      'Verify pricing against industry standards',
      'Review justification for new items'
    ],
    confidenceLevel: 0.85
  };

  return {
    analysisId: 'TEST-001',
    timestamp: new Date(),
    version: '1.0.0',
    originalInvoice,
    supplementInvoice,
    reconciliation,
    statistics,
    discrepancies: [],
    riskAssessment,
    processingTime: 150
  };
};

const TestEnhancedComparison: React.FC = () => {
  const sampleAnalysis = createSampleData();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Enhanced Comparison Table Test
          </h1>
          <p className="text-slate-600">
            Testing the detailed line-by-line comparison analysis with sample data
          </p>
        </div>
        
        <EnhancedComparisonTable 
          analysis={sampleAnalysis}
          viewMode="table"
          showViewToggle={true}
          onItemSelect={(itemId) => {
            console.log('Selected item:', itemId);
          }}
        />
      </div>
    </div>
  );
};

export default TestEnhancedComparison;