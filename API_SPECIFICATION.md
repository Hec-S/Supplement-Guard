# API Specification: Enhanced Comparison Analysis System

## Overview
This document defines the API interfaces, data structures, and service contracts for the comprehensive comparison analysis system.

## Core Data Types

### Enhanced Type Definitions
```typescript
// Cost Categories for Automated Classification
export enum CostCategory {
  LABOR = 'labor',
  PARTS = 'parts', 
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  OVERHEAD = 'overhead',
  OTHER = 'other'
}

// Variance Types for Precise Tracking
export enum VarianceType {
  NEW_ITEM = 'new_item',
  REMOVED_ITEM = 'removed_item',
  QUANTITY_CHANGE = 'quantity_change',
  PRICE_CHANGE = 'price_change',
  DESCRIPTION_CHANGE = 'description_change',
  NO_CHANGE = 'no_change'
}

// Severity Levels for Discrepancies
export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

### Enhanced Line Item Interface
```typescript
export interface EnhancedInvoiceLineItem extends InvoiceLineItem {
  // Classification
  category: CostCategory;
  categoryConfidence: number; // 0-1 scale
  
  // Matching and Reconciliation
  originalId?: string;
  matchingConfidence: number; // 0-1 scale
  varianceType: VarianceType;
  
  // Precise Variance Calculations
  quantityVariance: number;
  priceVariance: number;
  totalVariance: number;
  
  // Percentage Changes (with null handling)
  quantityChangePercent: number | null;
  priceChangePercent: number | null;
  totalChangePercent: number | null;
  
  // Analysis Flags
  isPotentialDuplicate: boolean;
  hasSignificantVariance: boolean;
  requiresReview: boolean;
  
  // Audit Trail
  lastModified: Date;
  modificationReason?: string;
}
```

### Statistical Analysis Interfaces
```typescript
export interface VarianceStatistics {
  // Overall Statistics
  totalVariance: number;
  totalVariancePercent: number;
  itemCount: number;
  
  // Category Breakdown
  categoryVariances: Record<CostCategory, CategoryVariance>;
  
  // Variance Type Distribution
  varianceTypeDistribution: Record<VarianceType, VarianceDistribution>;
  
  // Statistical Measures
  averageVariance: number;
  medianVariance: number;
  standardDeviation: number;
  varianceRange: {
    min: number;
    max: number;
  };
  
  // Risk Indicators
  highVarianceItems: EnhancedInvoiceLineItem[];
  suspiciousPatterns: SuspiciousPattern[];
  
  // Data Quality Metrics
  dataQuality: DataQualityMetrics;
}

export interface CategoryVariance {
  variance: number;
  variancePercent: number;
  itemCount: number;
  averageVariance: number;
  significantItems: string[]; // Item IDs with significant variance
}

export interface VarianceDistribution {
  count: number;
  totalAmount: number;
  percentage: number;
  averageAmount: number;
}

export interface SuspiciousPattern {
  type: 'duplicate_items' | 'round_number_bias' | 'excessive_markup' | 'inconsistent_pricing';
  description: string;
  confidence: number;
  affectedItems: string[];
  potentialImpact: number;
}

export interface DataQualityMetrics {
  completeness: number; // 0-1 scale
  consistency: number; // 0-1 scale
  accuracy: number; // 0-1 scale
  precision: number; // 0-1 scale
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  type: 'missing_data' | 'inconsistent_format' | 'calculation_error' | 'duplicate_entry';
  description: string;
  severity: SeverityLevel;
  affectedFields: string[];
  suggestedFix?: string;
}
```

### Comprehensive Comparison Result
```typescript
export interface ComparisonAnalysis {
  // Metadata
  analysisId: string;
  timestamp: Date;
  version: string;
  
  // Source Data
  originalInvoice: EnhancedInvoice;
  supplementInvoice: EnhancedInvoice;
  
  // Reconciliation Results
  reconciliation: ReconciliationResult;
  
  // Statistical Analysis
  statistics: VarianceStatistics;
  
  // Discrepancy Analysis
  discrepancies: Discrepancy[];
  
  // Risk Assessment
  riskAssessment: RiskAssessment;
  
  // Performance Metrics
  processingTime: number; // milliseconds
  memoryUsage?: number; // bytes
}

export interface EnhancedInvoice extends Invoice {
  lineItems: EnhancedInvoiceLineItem[];
  metadata: InvoiceMetadata;
  qualityScore: number; // 0-1 scale
}

export interface InvoiceMetadata {
  processingDate: Date;
  ocrConfidence?: number;
  dataSource: 'manual' | 'ocr' | 'api';
  validationStatus: 'pending' | 'validated' | 'rejected';
  validationErrors: string[];
}

export interface ReconciliationResult {
  // Matched Items
  matchedItems: MatchedItemPair[];
  
  // Unmatched Items
  unmatchedOriginalItems: EnhancedInvoiceLineItem[];
  newSupplementItems: EnhancedInvoiceLineItem[];
  
  // Reconciliation Statistics
  matchingAccuracy: number; // 0-1 scale
  totalItemsProcessed: number;
  matchingAlgorithmUsed: string;
  processingTime: number;
}

export interface MatchedItemPair {
  original: EnhancedInvoiceLineItem;
  supplement: EnhancedInvoiceLineItem;
  matchingScore: number; // 0-1 scale
  matchingCriteria: MatchingCriteria;
  varianceAnalysis: ItemVarianceAnalysis;
}

export interface MatchingCriteria {
  exactDescriptionMatch: number;
  fuzzyDescriptionMatch: number;
  categoryMatch: number;
  priceRangeMatch: number;
  overallScore: number;
}

export interface ItemVarianceAnalysis {
  quantityVariance: VarianceDetail;
  priceVariance: VarianceDetail;
  totalVariance: VarianceDetail;
  isSignificant: boolean;
  riskLevel: SeverityLevel;
}

export interface VarianceDetail {
  absolute: number;
  percentage: number | null;
  isIncrease: boolean;
  significance: 'negligible' | 'minor' | 'moderate' | 'major' | 'extreme';
}
```

### Discrepancy and Risk Assessment
```typescript
export interface Discrepancy {
  id: string;
  type: DiscrepancyType;
  severity: SeverityLevel;
  description: string;
  detailedExplanation: string;
  affectedItems: string[];
  potentialImpact: number;
  recommendedAction: string;
  autoResolvable: boolean;
  detectedAt: Date;
}

export enum DiscrepancyType {
  CALCULATION_ERROR = 'calculation_error',
  DUPLICATE_ITEM = 'duplicate_item',
  MISSING_ITEM = 'missing_item',
  SUSPICIOUS_CHANGE = 'suspicious_change',
  DATA_INCONSISTENCY = 'data_inconsistency',
  FORMATTING_ERROR = 'formatting_error'
}

export interface RiskAssessment {
  overallRiskScore: number; // 0-100 scale
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: string[];
  confidenceLevel: number; // 0-1 scale
}

export interface RiskFactor {
  type: string;
  description: string;
  impact: number; // 0-100 scale
  likelihood: number; // 0-1 scale
  mitigation: string;
}
```

## Service Interfaces

### Comparison Engine Service
```typescript
export interface IComparisonEngine {
  /**
   * Performs comprehensive comparison analysis
   */
  analyzeComparison(
    originalInvoice: Invoice,
    supplementInvoice: Invoice,
    options?: ComparisonOptions
  ): Promise<ComparisonAnalysis>;
  
  /**
   * Reconciles line items between invoices
   */
  reconcileLineItems(
    originalItems: InvoiceLineItem[],
    supplementItems: InvoiceLineItem[],
    options?: ReconciliationOptions
  ): Promise<ReconciliationResult>;
  
  /**
   * Calculates detailed variance statistics
   */
  calculateVarianceStatistics(
    reconciliation: ReconciliationResult
  ): VarianceStatistics;
  
  /**
   * Identifies discrepancies and anomalies
   */
  identifyDiscrepancies(
    analysis: ComparisonAnalysis
  ): Discrepancy[];
}

export interface ComparisonOptions {
  enableFuzzyMatching: boolean;
  matchingThreshold: number; // 0-1 scale
  significanceThreshold: number; // Percentage threshold for significant variance
  enableCategoryClassification: boolean;
  enableDiscrepancyDetection: boolean;
  precision: number; // Decimal places for calculations
}

export interface ReconciliationOptions {
  matchingAlgorithm: 'exact' | 'fuzzy' | 'hybrid';
  fuzzyThreshold: number;
  enableManualReview: boolean;
  categoryWeighting: Record<CostCategory, number>;
}
```

### Category Classification Service
```typescript
export interface ICategoryClassifier {
  /**
   * Classifies a line item into a cost category
   */
  classifyItem(item: InvoiceLineItem): Promise<ClassificationResult>;
  
  /**
   * Batch classifies multiple items
   */
  classifyItems(items: InvoiceLineItem[]): Promise<ClassificationResult[]>;
  
  /**
   * Updates classification rules
   */
  updateClassificationRules(rules: ClassificationRule[]): Promise<void>;
  
  /**
   * Gets classification confidence for an item
   */
  getClassificationConfidence(
    item: InvoiceLineItem,
    category: CostCategory
  ): number;
}

export interface ClassificationResult {
  category: CostCategory;
  confidence: number;
  alternativeCategories: Array<{
    category: CostCategory;
    confidence: number;
  }>;
  reasoning: string[];
}

export interface ClassificationRule {
  id: string;
  category: CostCategory;
  keywords: string[];
  patterns: RegExp[];
  priceRanges?: Array<{
    min: number;
    max: number;
    weight: number;
  }>;
  priority: number;
}
```

### Data Validation Service
```typescript
export interface IDataValidator {
  /**
   * Validates invoice data integrity
   */
  validateInvoice(invoice: Invoice): ValidationResult;
  
  /**
   * Validates line item calculations
   */
  validateLineItem(item: InvoiceLineItem): ValidationResult;
  
  /**
   * Validates comparison analysis results
   */
  validateAnalysis(analysis: ComparisonAnalysis): ValidationResult;
  
  /**
   * Performs cross-field validation
   */
  validateCrossFields(data: any, rules: ValidationRule[]): ValidationResult;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  qualityScore: number; // 0-1 scale
}

export interface ValidationError {
  field: string;
  message: string;
  severity: SeverityLevel;
  suggestedFix?: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'range' | 'format' | 'calculation' | 'custom';
  parameters: any;
  errorMessage: string;
}
```

### Enhanced PDF Export Service
```typescript
export interface IEnhancedPdfService {
  /**
   * Generates comprehensive PDF report
   */
  generateComprehensiveReport(
    analysis: ComparisonAnalysis,
    options?: PdfExportOptions
  ): Promise<Blob>;
  
  /**
   * Generates executive summary PDF
   */
  generateExecutiveSummary(
    analysis: ComparisonAnalysis,
    options?: PdfExportOptions
  ): Promise<Blob>;
  
  /**
   * Generates detailed variance report
   */
  generateVarianceReport(
    statistics: VarianceStatistics,
    options?: PdfExportOptions
  ): Promise<Blob>;
  
  /**
   * Generates chart images for PDF inclusion
   */
  generateChartImage(
    chartData: ChartData,
    chartType: ChartType
  ): Promise<string>; // Base64 image data
}

export interface PdfExportOptions {
  includeCharts: boolean;
  includeDetailedAnalysis: boolean;
  includeDiscrepancies: boolean;
  includeStatistics: boolean;
  colorCoding: boolean;
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  branding?: BrandingOptions;
}

export interface BrandingOptions {
  logo?: string; // Base64 image data
  companyName?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
  }>;
}

export enum ChartType {
  BAR = 'bar',
  PIE = 'pie',
  LINE = 'line',
  DOUGHNUT = 'doughnut',
  GAUGE = 'gauge'
}
```

## Error Handling

### Error Types
```typescript
export class ComparisonError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ComparisonError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ReconciliationError extends Error {
  constructor(
    message: string,
    public originalItems: number,
    public supplementItems: number
  ) {
    super(message);
    this.name = 'ReconciliationError';
  }
}
```

### Error Codes
```typescript
export enum ErrorCode {
  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_DATA_TYPE = 'INVALID_DATA_TYPE',
  
  // Calculation Errors
  CALCULATION_ERROR = 'CALCULATION_ERROR',
  PRECISION_ERROR = 'PRECISION_ERROR',
  OVERFLOW_ERROR = 'OVERFLOW_ERROR',
  
  // Reconciliation Errors
  MATCHING_FAILED = 'MATCHING_FAILED',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',
  AMBIGUOUS_MATCH = 'AMBIGUOUS_MATCH',
  
  // System Errors
  PROCESSING_TIMEOUT = 'PROCESSING_TIMEOUT',
  MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## Performance Specifications

### Response Time Requirements
- **Basic Comparison**: < 2 seconds
- **Comprehensive Analysis**: < 5 seconds
- **PDF Generation**: < 10 seconds
- **Chart Generation**: < 3 seconds

### Memory Usage Limits
- **Maximum Invoice Size**: 10,000 line items
- **Memory per Analysis**: < 100MB
- **Concurrent Analyses**: Up to 5

### Accuracy Requirements
- **Calculation Precision**: 4 decimal places
- **Matching Accuracy**: > 95% for clear matches
- **Classification Accuracy**: > 90% for standard categories

This API specification provides the foundation for implementing a robust, accurate, and comprehensive comparison analysis system with clear interfaces and well-defined data contracts.