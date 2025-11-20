// Enhanced types for comprehensive comparison analysis

// Cost Categories for Automated Classification
export enum CostCategory {
  LABOR = 'labor',
  PARTS = 'parts',
  MATERIALS = 'materials',
  EQUIPMENT = 'equipment',
  OVERHEAD = 'overhead',
  OTHER = 'other'
}

// Vehicle Systems for Automotive Classification
export enum VehicleSystem {
  ENGINE = 'engine',
  TRANSMISSION = 'transmission',
  BRAKES = 'brakes',
  SUSPENSION = 'suspension',
  ELECTRICAL = 'electrical',
  BODY = 'body',
  HVAC = 'hvac',
  FUEL = 'fuel',
  EXHAUST = 'exhaust',
  STEERING = 'steering',
  GENERAL = 'general',
  UNKNOWN = 'unknown'
}

// Part Categories for Automotive Parts
export enum PartCategory {
  OEM = 'oem',
  AFTERMARKET = 'aftermarket',
  REMANUFACTURED = 'remanufactured',
  USED = 'used',
  LABOR = 'labor',
  CONSUMABLE = 'consumable',
  UNKNOWN = 'unknown'
}

// Automotive Fraud Pattern Types
export enum AutomotiveFraudType {
  SHOTGUN_REPAIR = 'shotgun_repair',
  PREMIUM_PARTS_BIAS = 'premium_parts_bias',
  EXCESSIVE_FLUIDS = 'excessive_fluids',
  INCOMPATIBLE_PARTS = 'incompatible_parts',
  OVERPRICED_PARTS = 'overpriced_parts',
  UNNECESSARY_LABOR = 'unnecessary_labor',
  DUPLICATE_OPERATIONS = 'duplicate_operations'
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

// Original interfaces (maintained for backward compatibility)
export interface InvoiceLineItem {
  id: string;
  category?: string; // Category the item belongs to (e.g., 'REAR BUMPER', 'VEHICLE DIAGNOSTICS')
  lineNumber?: number; // Line number from the invoice
  operation?: string; // Operation code (e.g., 'S01', 'R&I', 'Repl')
  description: string;
  quantity: number;
  price: number;
  total: number;
  laborHours?: number; // Labor hours if applicable
  paintHours?: number; // Paint hours if applicable
  isNew?: boolean;
  isChanged?: boolean;
  isRemoved?: boolean; // True if item was removed from original
  // Change tracking fields
  originalQuantity?: number;
  originalPrice?: number;
  originalTotal?: number;
  quantityChange?: number;
  priceChange?: number;
  totalChange?: number;
  changeType?: 'NEW' | 'REMOVED' | 'QUANTITY_CHANGED' | 'PRICE_CHANGED' | 'BOTH_CHANGED' | 'UNCHANGED';
  // Enhanced automotive fields
  partNumber?: string;
  vehicleSystem?: 'ENGINE' | 'TRANSMISSION' | 'BRAKES' | 'SUSPENSION' | 'ELECTRICAL' | 'BODY' | 'INTERIOR' | 'EXHAUST' | 'COOLING' | 'FUEL' | 'STEERING' | 'HVAC' | 'SAFETY' | 'WHEELS_TIRES' | 'OTHER';
  partCategory?: 'OEM' | 'AFTERMARKET' | 'LABOR' | 'PAINT_MATERIALS' | 'CONSUMABLES' | 'RENTAL' | 'STORAGE' | 'OTHER';
  isOEM?: boolean;
  laborRate?: number;
}

// Enhanced Automotive Line Item Interface
export interface AutomotiveLineItem extends InvoiceLineItem {
  // Additional automotive-specific fields
  laborCode?: string;
  estimatedLaborHours?: number;
  partCompatibility?: string;
  fraudRiskFlags: string[];
  
  // Part classification details
  partType?: string;
  riskLevel: 'low' | 'medium' | 'medium-high' | 'high' | 'critical';
  
  // Industry pricing comparison
  marketPrice?: number;
  priceVarianceFromMarket?: number;
  priceVariancePercentFromMarket?: number;
}

// Totals Summary Interface for category-based totals
export interface TotalsSummaryCategory {
  category: string;
  basis?: string;  // e.g., "15.4 hrs"
  rate?: string;   // e.g., "$ 120.00 /hr"
  cost: number;
}

export interface TotalsSummary {
  categories: TotalsSummaryCategory[];
  subtotal: number;
  salesTax: number;
  salesTaxRate?: number;  // e.g., 9.0000 for 9%
  salesTaxBasis?: number; // The amount tax is calculated on
  totalAmount: number;
  netCostOfSupplement?: number; // For supplement invoices
}

export interface Invoice {
  fileName: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  totalsSummary?: TotalsSummary; // Optional totals summary extracted from invoice
}

export interface ClaimData {
  id: string;
  claimNumber?: string;  // Claim # from top right of first page
  vehicleInfo?: {        // Vehicle information from Vehicle section
    year?: string;
    make?: string;
    model?: string;
    vin?: string;
    description?: string; // Full vehicle description if available
  };
  originalInvoice: Invoice;
  supplementInvoice: Invoice;
  fraudScore: number;
  fraudReasons: string[];
  invoiceSummary: string;
  changesSummary?: {
    totalNewItems: number;
    totalRemovedItems: number;
    totalChangedItems: number;
    totalUnchangedItems: number;
    totalAmountChange: number;
    percentageChange: number;
  };
}

// Enhanced interfaces for comprehensive analysis
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
  
  // Percentage Changes (with null handling for zero values)
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

// Statistical Analysis Interfaces
export interface VarianceDetail {
  absolute: number;
  percentage: number | null;
  isIncrease: boolean;
  significance: 'negligible' | 'minor' | 'moderate' | 'major' | 'extreme';
}

export interface ItemVarianceAnalysis {
  quantityVariance: VarianceDetail;
  priceVariance: VarianceDetail;
  totalVariance: VarianceDetail;
  isSignificant: boolean;
  riskLevel: SeverityLevel;
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
  type: 'duplicate_items' | 'round_number_bias' | 'excessive_markup' | 'inconsistent_pricing' | AutomotiveFraudType;
  description: string;
  confidence: number;
  affectedItems: string[];
  potentialImpact: number;
}

// Automotive-specific fraud pattern interface
export interface AutomotiveFraudPattern extends SuspiciousPattern {
  type: AutomotiveFraudType;
  vehicleSystemsAffected: VehicleSystem[];
  partCategoriesAffected: PartCategory[];
  industryBenchmark?: {
    expectedCount: number;
    expectedPrice: number;
    deviationPercentage: number;
  };
}

export interface DataQualityIssue {
  type: 'missing_data' | 'inconsistent_format' | 'calculation_error' | 'duplicate_entry';
  description: string;
  severity: SeverityLevel;
  affectedFields: string[];
  suggestedFix?: string;
}

export interface DataQualityMetrics {
  completeness: number; // 0-1 scale
  consistency: number; // 0-1 scale
  accuracy: number; // 0-1 scale
  precision: number; // 0-1 scale
  issues: DataQualityIssue[];
}

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

// Reconciliation and Matching
export interface MatchingCriteria {
  exactDescriptionMatch: number;
  fuzzyDescriptionMatch: number;
  categoryMatch: number;
  priceRangeMatch: number;
  overallScore: number;
}

export interface MatchedItemPair {
  original: EnhancedInvoiceLineItem;
  supplement: EnhancedInvoiceLineItem;
  matchingScore: number; // 0-1 scale
  matchingCriteria: MatchingCriteria;
  varianceAnalysis: ItemVarianceAnalysis;
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

// Discrepancy and Risk Assessment
export enum DiscrepancyType {
  CALCULATION_ERROR = 'calculation_error',
  DUPLICATE_ITEM = 'duplicate_item',
  MISSING_ITEM = 'missing_item',
  SUSPICIOUS_CHANGE = 'suspicious_change',
  DATA_INCONSISTENCY = 'data_inconsistency',
  FORMATTING_ERROR = 'formatting_error'
}

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

export interface RiskFactor {
  type: string;
  description: string;
  impact: number; // 0-100 scale
  likelihood: number; // 0-1 scale
  mitigation: string;
}

export interface RiskAssessment {
  overallRiskScore: number; // 0-100 scale
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  recommendations: string[];
  confidenceLevel: number; // 0-1 scale
}

// Comprehensive Comparison Analysis
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

// Service Options and Configuration
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

// Classification and Validation
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

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  qualityScore: number; // 0-1 scale
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'range' | 'format' | 'calculation' | 'custom';
  parameters: any;
  errorMessage: string;
}

// Chart and Visualization Types
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

// PDF Export Options
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

// Error Types
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

// Legacy interface for backward compatibility
export interface ImagePair {
  id: string;
  description: string;
  originalUrl: string;
  supplementUrl: string;
  heatmapUrl: string;
}

// Analysis Summary specific types
export interface AnalysisSummaryData {
  categoryBreakdown: CategorySummary[];
  changesByType: ChangeTypeSummary;
  grandTotalSummary: GrandTotalSummary;
  visualIndicators: VisualIndicatorConfig;
  metadata: SummaryMetadata;
}

export interface CategorySummary {
  category: CostCategory;
  categoryName: string;
  categoryDisplayName: string;
  items: SummaryLineItem[];
  subtotal: CategorySubtotal;
  hasChanges: boolean;
}

export interface SummaryLineItem {
  id: string;
  description: string;
  category: CostCategory;
  changeType: ChangeType;
  originalAmount: number | null;
  supplementAmount: number | null;
  dollarChange: number;
  percentageChange: number | null;
  visualIndicator: VisualIndicator;
  significance: 'low' | 'medium' | 'high' | 'critical';
  isSignificant: boolean;
}

export interface CategorySubtotal {
  originalTotal: number;
  supplementTotal: number;
  totalIncrease: number;
  totalDecrease: number;
  netChange: number;
  percentageChange: number | null;
  itemCount: number;
  significantItemCount: number;
}

export interface ChangeTypeSummary {
  increases: ChangeTypeDetail;
  decreases: ChangeTypeDetail;
  additions: ChangeTypeDetail;
  removals: ChangeTypeDetail;
  unchanged: ChangeTypeDetail;
}

export interface ChangeTypeDetail {
  count: number;
  totalAmount: number;
  averageAmount: number;
  percentageOfTotal: number;
  items: string[];
}

export interface GrandTotalSummary {
  originalTotal: number;
  supplementTotal: number;
  netChange: number;
  percentageChange: number;
  breakdown: ChangeTypeSummary;
  riskIndicators: RiskIndicator[];
}

export interface VisualIndicator {
  color: string;
  backgroundColor: string;
  borderColor: string;
  icon: string;
  label: string;
  cssClass: string;
}

export interface VisualIndicatorConfig {
  colorScheme: 'default' | 'colorblind' | 'high-contrast';
  showIcons: boolean;
  showLabels: boolean;
}

export interface SummaryMetadata {
  generatedAt: Date;
  processingTime: number;
  dataQualityScore: number;
  completenessScore: number;
  version: string;
}

export interface RiskIndicator {
  type: 'high_variance' | 'scope_creep' | 'pricing_anomaly' | 'calculation_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedItems: string[];
  recommendedAction: string;
}

export type ChangeType = 'increase' | 'decrease' | 'new' | 'removed' | 'unchanged';
