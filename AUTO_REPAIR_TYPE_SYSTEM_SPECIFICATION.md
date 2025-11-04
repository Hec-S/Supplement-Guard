# Auto-Repair Claims Auditor Type System Specification

## Overview

This document defines the comprehensive type system for the Auto-Repair Claims Auditor, extending the existing SupplementGuard types with specialized auto-repair claim analysis capabilities. The type system supports the complete JSON output specification for advanced dashboard visualization and analytics.

## Core Type System Architecture

### Base Type Extensions

```typescript
// Extend existing types from types.ts
import {
  InvoiceLineItem,
  EnhancedInvoiceLineItem,
  ComparisonAnalysis,
  SeverityLevel,
  CostCategory,
  VarianceType
} from './types';

// Auto-repair specific enhancements
export interface AutoRepairLineItem extends EnhancedInvoiceLineItem {
  // Auto-repair specific identification
  part_number?: string;
  labor_operation?: string;
  oem_aftermarket: OEMAftermarketType;
  supplier?: string;
  
  // Labor analysis
  labor_hours?: number;
  paint_time?: number;
  industry_standard_hours?: number;
  
  // Damage and impact analysis
  impact_zone: ImpactZone;
  damage_severity: DamageSeverity;
  repair_necessity: RepairNecessity;
  
  // Cost analysis
  rate_comparison: RateComparison;
  scope_justification?: string;
  
  // Quality indicators
  warranty_coverage?: WarrantyCoverage;
  installation_complexity?: InstallationComplexity;
}
```

## Primary Data Structures

### 1. Auto-Repair Claim Data Structure

```typescript
/**
 * Main data structure for auto-repair claim analysis
 * Implements the comprehensive JSON output specification
 */
export interface AutoRepairClaimData {
  // Core metadata
  claim_metadata: ClaimMetadata;
  
  // Document analysis results
  documents: DocumentAnalysis[];
  
  // Enhanced comparison analysis
  changes_analysis: ChangesAnalysis;
  
  // Multi-dimensional risk assessment
  risk_assessment: EnhancedRiskAssessment;
  
  // Dashboard-ready metrics
  dashboard_metrics: DashboardMetrics;
  
  // Professional recommendations
  recommendations: ProfessionalRecommendations;
  
  // Data quality assessment
  data_quality: DataQualityAssessment;
}
```

### 2. Claim & Vehicle Metadata

```typescript
export interface ClaimMetadata {
  claim_number: string;
  vehicle: VehicleInfo;
  point_of_impact: string;
  inspection_location: string;
  shop_info: ShopInfo;
  labor_rate_table: LaborRateTable;
  adjuster_info: AdjusterInfo;
  claim_dates: ClaimDates;
}

export interface VehicleInfo {
  year: number;
  make: string;
  model: string;
  trim?: string;
  vin: string;
  mileage: number;
  
  // Enhanced vehicle data
  engine_size?: string;
  transmission?: TransmissionType;
  drive_type?: DriveType;
  body_style?: BodyStyle;
  fuel_type?: FuelType;
  safety_features?: SafetyFeature[];
  
  // Market data
  market_value?: number;
  depreciation_rate?: number;
  repair_complexity_rating?: ComplexityRating;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  certification_level: CertificationLevel;
  
  // Enhanced shop data
  dre_number?: string;
  insurance_preferred?: boolean;
  specializations?: ShopSpecialization[];
  quality_rating?: number;
  historical_performance?: ShopPerformanceMetrics;
}

export interface LaborRateTable {
  body: number;
  paint: number;
  mechanical: number;
  frame: number;
  sublet: number;
  
  // Enhanced rate analysis
  effective_date?: string;
  rate_justification?: string;
  market_comparison?: MarketRateComparison;
  regional_adjustment?: number;
}
```

### 3. Financial Data & Analysis

```typescript
export interface DocumentAnalysis {
  document_type: DocumentType;
  document_date: string;
  total_cost: number;
  parts_cost: number;
  labor_breakdown: LaborBreakdown;
  paint_supplies: number;
  miscellaneous: number;
  sales_tax: number;
  betterment_deduction: number;
  depreciation: number;
  
  // Enhanced financial analysis
  line_items: AutoRepairLineItem[];
  cost_categories: CostCategoryBreakdown;
  timeline_impact: TimelineImpact;
  rental_car_analysis: RentalCarAnalysis;
}

export interface LaborBreakdown {
  body: LaborDetail;
  paint: LaborDetail;
  mechanical: LaborDetail;
  frame: LaborDetail;
  sublet: SubletDetail[];
  
  // Enhanced labor analysis
  total_labor_hours: number;
  average_hourly_rate: number;
  efficiency_metrics: LaborEfficiencyMetrics;
  overtime_analysis?: OvertimeAnalysis;
}

export interface LaborDetail {
  hours: number;
  rate: number;
  total: number;
  
  // Enhanced analysis
  efficiency_score?: number;
  industry_benchmark?: number;
  complexity_adjustment?: number;
  skill_level_required?: SkillLevel;
  operations: LaborOperation[];
}

export interface LaborOperation {
  operation_code: string;
  description: string;
  hours_claimed: number;
  hours_standard: number;
  variance_percentage: number;
  justification?: string;
  complexity_factors?: ComplexityFactor[];
}
```

### 4. Enhanced Line-Item Analysis

```typescript
export interface EnhancedLineItemAnalysis {
  parts_added: PartsAddedAnalysis[];
  parts_deleted: PartsDeletedAnalysis[];
  parts_modified: PartsModifiedAnalysis[];
  trim_changes: TrimChangeAnalysis;
  repeated_operations: RepeatedOperationAnalysis[];
  structural_additions: StructuralAdditionAnalysis[];
  diagnostics_calibrations: DiagnosticsCalibrationAnalysis[];
  rental_car_days: RentalCarDaysAnalysis;
}

export interface PartsAddedAnalysis {
  part_name: string;
  cost: number;
  category: AutoRepairPartCategory;
  oem_aftermarket: OEMAftermarketType;
  supplier: string;
  justification: string;
  
  // Enhanced analysis
  market_price_comparison: MarketPriceComparison;
  availability_status: AvailabilityStatus;
  warranty_implications: WarrantyImplications;
  installation_requirements: InstallationRequirements;
}

export interface PartsDeletedAnalysis {
  part_name: string;
  cost: number;
  reason: DeletionReason;
  
  // Impact analysis
  cost_impact: number;
  timeline_impact: number;
  quality_impact?: QualityImpact;
}

export interface PartsModifiedAnalysis {
  part_name: string;
  original_cost: number;
  new_cost: number;
  change_reason: ChangeReason;
  
  // Detailed analysis
  price_variance_analysis: PriceVarianceAnalysis;
  specification_changes: SpecificationChange[];
  quality_implications: QualityImplication[];
}
```

## Advanced Risk Assessment Types

### 1. Multi-Dimensional Labor Analysis

```typescript
export interface LaborAnalysisResult {
  labor_rate_progression: LaborRateProgression[];
  labor_efficiency_flags: LaborEfficiencyFlag[];
  cross_shop_rate_comparison: CrossShopRateComparison;
  overtime_analysis: OvertimeAnalysis;
  skill_level_analysis: SkillLevelAnalysis;
}

export interface LaborRateProgression {
  document: DocumentType;
  rates_by_type: Record<LaborType, number>;
  date: string;
  
  // Trend analysis
  rate_change_velocity: number;
  market_alignment: MarketAlignment;
  justification_quality: JustificationQuality;
}

export interface LaborEfficiencyFlag {
  operation: string;
  hours_claimed: number;
  industry_standard: number;
  variance_pct: number;
  
  // Enhanced analysis
  efficiency_rating: EfficiencyRating;
  complexity_factors: ComplexityFactor[];
  historical_comparison: HistoricalComparison;
  red_flags: RedFlag[];
}

export interface CrossShopRateComparison {
  percentile_ranking: number;
  market_average: number;
  regional_variance: number;
  
  // Competitive analysis
  comparable_shops: ComparableShop[];
  rate_justification_score: number;
  market_positioning: MarketPositioning;
}
```

### 2. Enhanced Scope Creep Detection

```typescript
export interface ScopeCreepAnalysis {
  unrelated_items: UnrelatedItemAnalysis[];
  damage_progression: DamageProgressionAnalysis[];
  hidden_damage_legitimacy: HiddenDamageLegitimacy;
  impact_zone_mapping: ImpactZoneMapping;
  severity_escalation: SeverityEscalationAnalysis[];
}

export interface UnrelatedItemAnalysis {
  item: string;
  zone: ImpactZone;
  distance_from_impact: number;
  likelihood_score: number;
  
  // Enhanced analysis
  damage_correlation: DamageCorrelation;
  physics_validation: PhysicsValidation;
  precedent_analysis: PrecedentAnalysis;
  expert_opinion_alignment: ExpertOpinionAlignment;
}

export interface DamageProgressionAnalysis {
  component: string;
  discovery_date: string;
  plausibility_score: number;
  
  // Detailed analysis
  discovery_timeline: DiscoveryTimeline;
  inspection_quality: InspectionQuality;
  documentation_completeness: DocumentationCompleteness;
  technical_feasibility: TechnicalFeasibility;
}

export interface ImpactZoneMapping {
  primary_impact_zone: ImpactZoneDetail;
  secondary_impact_zones: ImpactZoneDetail[];
  energy_transfer_analysis: EnergyTransferAnalysis;
  damage_pattern_consistency: DamagePatternConsistency;
}
```

### 3. Comprehensive Cost Pattern Analysis

```typescript
export interface CostPatternAnalysis {
  cost_escalation_velocity: number;
  high_margin_parts_ratio: number;
  sublet_dependency_score: number;
  administrative_overhead: number;
  parts_availability_delays: PartsAvailabilityDelayAnalysis;
  
  // Advanced patterns
  pricing_anomalies: PricingAnomaly[];
  markup_analysis: MarkupAnalysis;
  vendor_relationship_indicators: VendorRelationshipIndicator[];
  seasonal_adjustments: SeasonalAdjustment[];
}

export interface PartsAvailabilityDelayAnalysis {
  impact_on_rental_costs: number;
  delay_patterns: DelayPattern[];
  supplier_performance: SupplierPerformance[];
  alternative_parts_analysis: AlternativePartsAnalysis[];
}

export interface PricingAnomaly {
  type: PricingAnomalyType;
  description: string;
  confidence: number;
  financial_impact: number;
  
  // Supporting evidence
  market_comparison: MarketComparison;
  historical_pricing: HistoricalPricing;
  vendor_analysis: VendorAnalysis;
}
```

## Predictive Risk Modeling Types

### 1. Predictive Indicators

```typescript
export interface PredictiveRiskModel {
  likely_final_cost: number;
  probability_additional_supplements: number;
  estimated_completion_date: string;
  
  // Enhanced predictions
  cost_escalation_trajectory: CostEscalationTrajectory;
  timeline_risk_factors: TimelineRiskFactor[];
  quality_risk_indicators: QualityRiskIndicator[];
  
  // Confidence intervals
  confidence_intervals: {
    cost_range: ConfidenceRange;
    timeline_range: TimelineConfidenceRange;
    quality_range: QualityConfidenceRange;
  };
}

export interface CostEscalationTrajectory {
  current_velocity: number;
  projected_acceleration: number;
  inflection_points: InflectionPoint[];
  risk_mitigation_opportunities: RiskMitigationOpportunity[];
}

export interface TimelineRiskFactor {
  factor_type: TimelineRiskFactorType;
  impact_days: number;
  probability: number;
  mitigation_strategies: MitigationStrategy[];
}
```

### 2. Dashboard Analytics Types

```typescript
export interface DashboardMetrics {
  cost_trend_analysis: CostTrendAnalysis;
  efficiency_metrics: EfficiencyMetrics;
  quality_indicators: QualityIndicators;
  comparative_benchmarks: ComparativeBenchmarks;
  kpi_summary: KPISummary;
  
  // Enhanced dashboard data
  executive_summary: ExecutiveSummary;
  risk_heat_map: RiskHeatMap;
  timeline_visualization: TimelineVisualization;
  cost_waterfall: CostWaterfall;
}

export interface CostTrendAnalysis {
  daily_burn_rate: number;
  projected_total: number;
  variance_from_initial: number;
  cost_velocity: number;
  trend_direction: TrendDirection;
  
  // Advanced trend analysis
  seasonal_factors: SeasonalFactor[];
  market_influences: MarketInfluence[];
  predictive_bands: PredictiveBand[];
}

export interface EfficiencyMetrics {
  cost_per_labor_hour: number;
  parts_to_labor_ratio: number;
  cycle_time: number;
  productivity_score: number;
  
  // Enhanced efficiency metrics
  resource_utilization: ResourceUtilization;
  workflow_optimization_score: number;
  bottleneck_analysis: BottleneckAnalysis[];
  performance_benchmarks: PerformanceBenchmark[];
}

export interface QualityIndicators {
  supplement_frequency: number;
  rework_probability: number;
  customer_satisfaction_predictors: number;
  documentation_quality_score: number;
  
  // Advanced quality metrics
  defect_prediction_score: number;
  compliance_rating: ComplianceRating;
  audit_readiness_score: number;
  regulatory_risk_score: number;
}
```

## Enumeration Types

### 1. Auto-Repair Specific Enums

```typescript
export enum DocumentType {
  ORIGINAL = 'original',
  SUPPLEMENT_1 = 'supplement_1',
  SUPPLEMENT_2 = 'supplement_2',
  SUPPLEMENT_3 = 'supplement_3',
  SUPPLEMENT_4 = 'supplement_4',
  SUPPLEMENT_5 = 'supplement_5'
}

export enum OEMAftermarketType {
  OEM = 'OEM',
  AFTERMARKET = 'Aftermarket',
  RECYCLED = 'Recycled',
  REMANUFACTURED = 'Remanufactured',
  GENERIC = 'Generic'
}

export enum ImpactZone {
  PRIMARY = 'primary',
  SECONDARY = 'secondary',
  TERTIARY = 'tertiary',
  UNRELATED = 'unrelated'
}

export enum DamageSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  TOTAL_LOSS = 'total_loss'
}

export enum RepairNecessity {
  REQUIRED = 'required',
  RECOMMENDED = 'recommended',
  OPTIONAL = 'optional',
  QUESTIONABLE = 'questionable'
}

export enum AutoRepairPartCategory {
  BODY_PANELS = 'body_panels',
  MECHANICAL_PARTS = 'mechanical_parts',
  ELECTRICAL_COMPONENTS = 'electrical_components',
  INTERIOR_COMPONENTS = 'interior_components',
  GLASS = 'glass',
  PAINT_MATERIALS = 'paint_materials',
  FASTENERS = 'fasteners',
  FLUIDS = 'fluids',
  CONSUMABLES = 'consumables'
}

export enum LaborType {
  BODY = 'body',
  PAINT = 'paint',
  MECHANICAL = 'mechanical',
  FRAME = 'frame',
  ELECTRICAL = 'electrical',
  GLASS = 'glass',
  TRIM = 'trim',
  SUBLET = 'sublet'
}

export enum CertificationLevel {
  BASIC = 'basic',
  CERTIFIED = 'certified',
  PREFERRED = 'preferred',
  ELITE = 'elite',
  MANUFACTURER_CERTIFIED = 'manufacturer_certified'
}

export enum SkillLevel {
  APPRENTICE = 'apprentice',
  JOURNEYMAN = 'journeyman',
  MASTER = 'master',
  SPECIALIST = 'specialist'
}

export enum EfficiencyRating {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  AVERAGE = 'average',
  BELOW_AVERAGE = 'below_average',
  POOR = 'poor',
  SUSPICIOUS = 'suspicious'
}

export enum HiddenDamageLegitimacy {
  JUSTIFIED = 'justified',
  QUESTIONABLE = 'questionable',
  SUSPICIOUS = 'suspicious'
}

export enum TrendDirection {
  INCREASING = 'increasing',
  STABLE = 'stable',
  DECREASING = 'decreasing',
  VOLATILE = 'volatile'
}
```

### 2. Risk and Quality Enums

```typescript
export enum RiskLevel {
  MINIMAL = 'minimal',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ConfidenceLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum PricingAnomalyType {
  EXCESSIVE_MARKUP = 'excessive_markup',
  BELOW_MARKET_PRICING = 'below_market_pricing',
  INCONSISTENT_PRICING = 'inconsistent_pricing',
  ROUND_NUMBER_BIAS = 'round_number_bias',
  VENDOR_FAVORITISM = 'vendor_favoritism'
}

export enum TimelineRiskFactorType {
  PARTS_AVAILABILITY = 'parts_availability',
  LABOR_SCHEDULING = 'labor_scheduling',
  EQUIPMENT_AVAILABILITY = 'equipment_availability',
  QUALITY_ISSUES = 'quality_issues',
  REGULATORY_DELAYS = 'regulatory_delays',
  WEATHER_CONDITIONS = 'weather_conditions'
}
```

## Utility Types and Interfaces

### 1. Supporting Data Structures

```typescript
export interface ConfidenceRange {
  min: number;
  max: number;
  confidence: number;
}

export interface TimelineConfidenceRange {
  min_days: number;
  max_days: number;
  confidence: number;
}

export interface MarketComparison {
  market_price: number;
  variance_percentage: number;
  price_ranking: number;
  comparable_sources: string[];
}

export interface HistoricalComparison {
  historical_average: number;
  trend_direction: TrendDirection;
  volatility_score: number;
  seasonal_adjustment: number;
}

export interface ComplexityFactor {
  factor_type: string;
  impact_multiplier: number;
  description: string;
  justification: string;
}
```

### 2. Professional Recommendations

```typescript
export interface ProfessionalRecommendations {
  immediate_actions: ImmediateAction[];
  monitoring_points: MonitoringPoint[];
  cost_optimization_opportunities: CostOptimizationOpportunity[];
  
  // Enhanced recommendations
  risk_mitigation_strategies: RiskMitigationStrategy[];
  quality_improvement_suggestions: QualityImprovementSuggestion[];
  compliance_requirements: ComplianceRequirement[];
}

export interface ImmediateAction {
  action_type: ActionType;
  description: string;
  priority: Priority;
  expected_impact: ExpectedImpact;
  timeline: string;
  resources_required: string[];
}

export interface MonitoringPoint {
  metric: string;
  threshold: number;
  monitoring_frequency: MonitoringFrequency;
  escalation_criteria: EscalationCriteria;
}

export interface CostOptimizationOpportunity {
  opportunity_type: OpportunityType;
  description: string;
  potential_savings: number;
  implementation_effort: ImplementationEffort;
  risk_level: RiskLevel;
}
```

## Data Quality Assessment Types

```typescript
export interface DataQualityAssessment {
  extraction_confidence: number;
  missing_fields: string[];
  assumptions_made: Assumption[];
  
  // Enhanced quality metrics
  data_completeness: DataCompletenessMetrics;
  data_consistency: DataConsistencyMetrics;
  data_accuracy: DataAccuracyMetrics;
  validation_results: ValidationResult[];
}

export interface DataCompletenessMetrics {
  overall_completeness: number;
  critical_fields_completeness: number;
  optional_fields_completeness: number;
  missing_field_impact: MissingFieldImpact[];
}

export interface DataConsistencyMetrics {
  cross_field_consistency: number;
  temporal_consistency: number;
  logical_consistency: number;
  format_consistency: number;
}

export interface DataAccuracyMetrics {
  calculation_accuracy: number;
  reference_data_accuracy: number;
  business_rule_compliance: number;
  data_validation_score: number;
}

export interface Assumption {
  field: string;
  assumed_value: any;
  confidence: number;
  impact_on_analysis: ImpactLevel;
  alternative_scenarios: AlternativeScenario[];
}
```

## Type System Integration

### 1. Backward Compatibility

```typescript
// Maintain compatibility with existing types
export interface LegacyClaimDataAdapter {
  convertToAutoRepairClaim(legacyData: ClaimData): AutoRepairClaimData;
  convertFromAutoRepairClaim(autoRepairData: AutoRepairClaimData): ClaimData;
  validateCompatibility(data: any): CompatibilityResult;
}

export interface CompatibilityResult {
  is_compatible: boolean;
  missing_fields: string[];
  type_mismatches: TypeMismatch[];
  conversion_warnings: ConversionWarning[];
}
```

### 2. Type Guards and Validation

```typescript
// Type guards for runtime validation
export function isAutoRepairClaimData(data: any): data is AutoRepairClaimData {
  return (
    data &&
    typeof data === 'object' &&
    'claim_metadata' in data &&
    'documents' in data &&
    'changes_analysis' in data &&
    'risk_assessment' in data &&
    'dashboard_metrics' in data
  );
}

export function isAutoRepairLineItem(item: any): item is AutoRepairLineItem {
  return (
    item &&
    typeof item === 'object' &&
    'impact_zone' in item &&
    'damage_severity' in item &&
    'repair_necessity' in item &&
    'oem_aftermarket' in item
  );
}

// Validation schemas
export interface ValidationSchema {
  validateClaimMetadata(metadata: ClaimMetadata): ValidationResult;
  validateDocumentAnalysis(document: DocumentAnalysis): ValidationResult;
  validateRiskAssessment(assessment: EnhancedRiskAssessment): ValidationResult;
  validateDashboardMetrics(metrics: DashboardMetrics): ValidationResult;
}
```

## Implementation Guidelines

### 1. Type System Best Practices

1. **Strict Type Safety**: All interfaces must be strictly typed with no `any` types
2. **Null Safety**: Use optional properties (`?`) and null unions where appropriate
3. **Enum Usage**: Prefer enums over string literals for better type safety
4. **Generic Types**: Use generics for reusable type patterns
5. **Documentation**: All interfaces must include comprehensive JSDoc comments

### 2. Performance Considerations

1. **Memory Efficiency**: Use readonly arrays and objects where possible
2. **Serialization**: All types must be JSON serializable
3. **Validation**: Implement efficient runtime validation for critical paths
4. **Caching**: Design types to support efficient caching strategies

### 3. Extensibility

1. **Modular Design**: Types should be composable and extensible
2. **Version Compatibility**: Support backward compatibility with version flags
3. **Plugin Architecture**: Allow for custom type extensions
4. **Future Proofing**: Design for easy addition of new fields and capabilities

## Conclusion

This comprehensive type system provides the foundation for a professional-grade auto-repair claims auditor that can handle complex analysis scenarios while maintaining type safety, performance, and extensibility. The system supports the complete JSON output specification while building upon the existing SupplementGuard architecture.

The type system is designed to evolve with changing requirements while maintaining backward compatibility and providing clear migration paths for future enhancements.