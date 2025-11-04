import { Decimal } from 'decimal.js';
import {
  ClaimData,
  EnhancedInvoiceLineItem,
  ComparisonAnalysis,
  SeverityLevel,
  CostCategory,
  VarianceType
} from '../types';

// Configure Decimal.js for precise calculations
Decimal.config({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// Enhanced fraud detection interfaces
export interface StatisticalAnomalyResult {
  type: 'z_score' | 'benford_law' | 'regression' | 'temporal' | 'geographic';
  severity: SeverityLevel;
  confidence: number; // 0-1 scale
  description: string;
  affectedItems: string[];
  statisticalMeasure: number;
  threshold: number;
  evidence: AnomalyEvidence[];
}

export interface AnomalyEvidence {
  type: 'statistical' | 'pattern' | 'comparison' | 'historical';
  description: string;
  value: number;
  expectedValue: number;
  deviation: number;
  significance: number;
}

export interface ProfessionalRiskScore {
  overallScore: number; // 0-100 scale
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number; // e.g., 95%
  };
  componentScores: {
    statistical: number;
    behavioral: number;
    documentation: number;
    compliance: number;
  };
  riskLevel: 'minimal' | 'low' | 'moderate' | 'high' | 'critical';
  riskFactors: EnhancedRiskFactor[];
  recommendations: ProfessionalRecommendation[];
}

export interface EnhancedRiskFactor {
  id: string;
  type: 'statistical' | 'behavioral' | 'documentation' | 'compliance';
  category: string;
  description: string;
  impact: number; // 0-100 scale
  likelihood: number; // 0-1 scale
  confidence: number; // 0-1 scale
  evidence: AnomalyEvidence[];
  mitigation: string;
  severity: SeverityLevel;
  weight: number;
}

export interface ProfessionalRecommendation {
  id: string;
  priority: 'immediate' | 'high' | 'medium' | 'low';
  category: 'investigation' | 'verification' | 'documentation' | 'compliance';
  action: string;
  rationale: string;
  expectedOutcome: string;
  timeframe: string;
  resources: string[];
}

export interface BenfordAnalysis {
  expectedDistribution: number[];
  actualDistribution: number[];
  chiSquareStatistic: number;
  pValue: number;
  isSignificant: boolean;
  suspiciousDigits: number[];
}

export interface RegressionAnalysis {
  correlation: number;
  rSquared: number;
  slope: number;
  intercept: number;
  residuals: number[];
  outliers: Array<{
    itemId: string;
    residual: number;
    leverage: number;
    cookDistance: number;
  }>;
}

export class AdvancedFraudDetector {
  private readonly STATISTICAL_THRESHOLDS = {
    Z_SCORE_CRITICAL: 3.0,
    Z_SCORE_HIGH: 2.5,
    Z_SCORE_MEDIUM: 2.0,
    BENFORD_P_VALUE: 0.05,
    CORRELATION_THRESHOLD: 0.7,
    COOK_DISTANCE_THRESHOLD: 1.0
  };

  private readonly RISK_WEIGHTS = {
    STATISTICAL: 0.35,
    BEHAVIORAL: 0.25,
    DOCUMENTATION: 0.25,
    COMPLIANCE: 0.15
  };

  /**
   * Performs comprehensive statistical anomaly detection
   */
  async detectStatisticalAnomalies(
    analysis: ComparisonAnalysis
  ): Promise<StatisticalAnomalyResult[]> {
    const anomalies: StatisticalAnomalyResult[] = [];
    const allItems = this.getAllLineItems(analysis);

    try {
      // Z-Score Analysis for outlier detection
      const zScoreAnomalies = await this.performZScoreAnalysis(allItems);
      anomalies.push(...zScoreAnomalies);

      // Benford's Law Analysis for artificial number patterns
      const benfordAnomalies = await this.performBenfordAnalysis(allItems);
      anomalies.push(...benfordAnomalies);

      // Regression Analysis for price/quantity relationships
      const regressionAnomalies = await this.performRegressionAnalysis(allItems);
      anomalies.push(...regressionAnomalies);

      // Temporal Pattern Analysis
      const temporalAnomalies = await this.performTemporalAnalysis(analysis);
      anomalies.push(...temporalAnomalies);

      return anomalies.sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      console.error('Error in statistical anomaly detection:', error);
      throw new Error(`Statistical analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates professional risk score with confidence intervals
   */
  async calculateProfessionalRiskScore(
    analysis: ComparisonAnalysis,
    anomalies: StatisticalAnomalyResult[]
  ): Promise<ProfessionalRiskScore> {
    try {
      // Calculate component scores
      const statisticalScore = this.calculateStatisticalRiskScore(anomalies);
      const behavioralScore = this.calculateBehavioralRiskScore(analysis);
      const documentationScore = this.calculateDocumentationRiskScore(analysis);
      const complianceScore = this.calculateComplianceRiskScore(analysis);

      // Calculate weighted overall score
      const overallScore = Math.round(
        statisticalScore * this.RISK_WEIGHTS.STATISTICAL +
        behavioralScore * this.RISK_WEIGHTS.BEHAVIORAL +
        documentationScore * this.RISK_WEIGHTS.DOCUMENTATION +
        complianceScore * this.RISK_WEIGHTS.COMPLIANCE
      );

      // Calculate confidence interval
      const confidenceInterval = this.calculateConfidenceInterval(
        overallScore,
        [statisticalScore, behavioralScore, documentationScore, complianceScore]
      );

      // Determine risk level
      const riskLevel = this.determineRiskLevel(overallScore);

      // Generate enhanced risk factors
      const riskFactors = await this.generateEnhancedRiskFactors(analysis, anomalies);

      // Generate professional recommendations
      const recommendations = this.generateProfessionalRecommendations(
        overallScore,
        riskFactors,
        anomalies
      );

      return {
        overallScore,
        confidenceInterval,
        componentScores: {
          statistical: statisticalScore,
          behavioral: behavioralScore,
          documentation: documentationScore,
          compliance: complianceScore
        },
        riskLevel,
        riskFactors,
        recommendations
      };
    } catch (error) {
      console.error('Error calculating professional risk score:', error);
      throw new Error(`Risk score calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Z-Score analysis for statistical outliers
   */
  private async performZScoreAnalysis(
    items: EnhancedInvoiceLineItem[]
  ): Promise<StatisticalAnomalyResult[]> {
    const anomalies: StatisticalAnomalyResult[] = [];

    if (items.length < 3) return anomalies;

    // Analyze different metrics
    const metrics = [
      { name: 'price', values: items.map(item => item.price) },
      { name: 'quantity', values: items.map(item => item.quantity) },
      { name: 'total', values: items.map(item => item.total) }
    ];

    for (const metric of metrics) {
      const { mean, stdDev } = this.calculateStatistics(metric.values);
      
      if (stdDev === 0) continue; // Skip if no variation

      const outliers: Array<{ itemId: string; zScore: number; value: number }> = [];

      items.forEach((item, index) => {
        const value = metric.values[index];
        const zScore = Math.abs((value - mean) / stdDev);

        if (zScore >= this.STATISTICAL_THRESHOLDS.Z_SCORE_MEDIUM) {
          outliers.push({
            itemId: item.id,
            zScore,
            value
          });
        }
      });

      if (outliers.length > 0) {
        const maxZScore = Math.max(...outliers.map(o => o.zScore));
        const severity = this.determineSeverityFromZScore(maxZScore);

        anomalies.push({
          type: 'z_score',
          severity,
          confidence: Math.min(maxZScore / this.STATISTICAL_THRESHOLDS.Z_SCORE_CRITICAL, 1.0),
          description: `Statistical outliers detected in ${metric.name} values`,
          affectedItems: outliers.map(o => o.itemId),
          statisticalMeasure: maxZScore,
          threshold: this.STATISTICAL_THRESHOLDS.Z_SCORE_MEDIUM,
          evidence: outliers.map(outlier => ({
            type: 'statistical' as const,
            description: `${metric.name} value significantly deviates from expected range`,
            value: outlier.value,
            expectedValue: mean,
            deviation: Math.abs(outlier.value - mean),
            significance: outlier.zScore
          }))
        });
      }
    }

    return anomalies;
  }

  /**
   * Benford's Law analysis for detecting artificial number patterns
   */
  private async performBenfordAnalysis(
    items: EnhancedInvoiceLineItem[]
  ): Promise<StatisticalAnomalyResult[]> {
    const anomalies: StatisticalAnomalyResult[] = [];

    if (items.length < 30) return anomalies; // Need sufficient sample size

    // Extract first digits from prices and totals
    const priceDigits = items.map(item => this.getFirstDigit(item.price)).filter(d => d > 0);
    const totalDigits = items.map(item => this.getFirstDigit(item.total)).filter(d => d > 0);

    // Analyze both price and total distributions
    const analyses = [
      { name: 'price', digits: priceDigits },
      { name: 'total', digits: totalDigits }
    ];

    for (const analysis of analyses) {
      const benfordResult = this.performBenfordTest(analysis.digits);

      if (benfordResult.isSignificant) {
        const severity = benfordResult.pValue < 0.01 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM;

        anomalies.push({
          type: 'benford_law',
          severity,
          confidence: 1 - benfordResult.pValue,
          description: `Artificial number patterns detected in ${analysis.name} values (Benford's Law violation)`,
          affectedItems: items.map(item => item.id),
          statisticalMeasure: benfordResult.chiSquareStatistic,
          threshold: this.STATISTICAL_THRESHOLDS.BENFORD_P_VALUE,
          evidence: benfordResult.suspiciousDigits.map(digit => ({
            type: 'pattern' as const,
            description: `Digit ${digit} appears more frequently than expected by Benford's Law`,
            value: benfordResult.actualDistribution[digit - 1],
            expectedValue: benfordResult.expectedDistribution[digit - 1],
            deviation: Math.abs(benfordResult.actualDistribution[digit - 1] - benfordResult.expectedDistribution[digit - 1]),
            significance: benfordResult.chiSquareStatistic
          }))
        });
      }
    }

    return anomalies;
  }

  /**
   * Regression analysis for price/quantity relationships
   */
  private async performRegressionAnalysis(
    items: EnhancedInvoiceLineItem[]
  ): Promise<StatisticalAnomalyResult[]> {
    const anomalies: StatisticalAnomalyResult[] = [];

    if (items.length < 5) return anomalies;

    // Analyze price vs quantity relationship
    const quantities = items.map(item => item.quantity);
    const prices = items.map(item => item.price);
    const totals = items.map(item => item.total);

    // Check quantity * price = total relationship
    const calculationOutliers: Array<{ itemId: string; expectedTotal: number; actualTotal: number; deviation: number }> = [];

    items.forEach(item => {
      const expectedTotal = new Decimal(item.quantity).times(item.price).toNumber();
      const deviation = Math.abs(item.total - expectedTotal);
      const relativeDeviation = expectedTotal > 0 ? deviation / expectedTotal : 0;

      if (relativeDeviation > 0.01) { // More than 1% deviation
        calculationOutliers.push({
          itemId: item.id,
          expectedTotal,
          actualTotal: item.total,
          deviation
        });
      }
    });

    if (calculationOutliers.length > 0) {
      const maxDeviation = Math.max(...calculationOutliers.map(o => o.deviation));
      const severity = maxDeviation > 100 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM;

      anomalies.push({
        type: 'regression',
        severity,
        confidence: Math.min(maxDeviation / 100, 1.0),
        description: 'Calculation errors detected in quantity × price = total relationships',
        affectedItems: calculationOutliers.map(o => o.itemId),
        statisticalMeasure: maxDeviation,
        threshold: 0.01,
        evidence: calculationOutliers.map(outlier => ({
          type: 'comparison' as const,
          description: 'Total amount does not match quantity × price calculation',
          value: outlier.actualTotal,
          expectedValue: outlier.expectedTotal,
          deviation: outlier.deviation,
          significance: outlier.deviation / outlier.expectedTotal
        }))
      });
    }

    return anomalies;
  }

  /**
   * Temporal pattern analysis
   */
  private async performTemporalAnalysis(
    analysis: ComparisonAnalysis
  ): Promise<StatisticalAnomalyResult[]> {
    const anomalies: StatisticalAnomalyResult[] = [];

    // Check processing time anomalies
    if (analysis.processingTime > 30000) { // More than 30 seconds
      anomalies.push({
        type: 'temporal',
        severity: SeverityLevel.MEDIUM,
        confidence: 0.7,
        description: 'Unusually long processing time may indicate data complexity or quality issues',
        affectedItems: [],
        statisticalMeasure: analysis.processingTime,
        threshold: 30000,
        evidence: [{
          type: 'statistical',
          description: 'Processing time exceeds normal thresholds',
          value: analysis.processingTime,
          expectedValue: 5000,
          deviation: analysis.processingTime - 5000,
          significance: analysis.processingTime / 5000
        }]
      });
    }

    return anomalies;
  }

  /**
   * Calculate statistical risk score component
   */
  private calculateStatisticalRiskScore(anomalies: StatisticalAnomalyResult[]): number {
    if (anomalies.length === 0) return 0;

    const severityWeights = {
      [SeverityLevel.CRITICAL]: 100,
      [SeverityLevel.HIGH]: 75,
      [SeverityLevel.MEDIUM]: 50,
      [SeverityLevel.LOW]: 25
    };

    const weightedScore = anomalies.reduce((sum, anomaly) => {
      const baseScore = severityWeights[anomaly.severity];
      const confidenceAdjusted = baseScore * anomaly.confidence;
      return sum + confidenceAdjusted;
    }, 0);

    return Math.min(Math.round(weightedScore / anomalies.length), 100);
  }

  /**
   * Calculate behavioral risk score component
   */
  private calculateBehavioralRiskScore(analysis: ComparisonAnalysis): number {
    let score = 0;
    
    if (analysis.statistics.itemCount === 0) return 0;

    // High variance items indicate potential manipulation
    const highVarianceRatio = analysis.statistics.highVarianceItems.length / analysis.statistics.itemCount;
    score += highVarianceRatio * 40;

    // Suspicious patterns
    score += analysis.statistics.suspiciousPatterns.length * 15;

    // Data quality issues
    const qualityScore = analysis.statistics.dataQuality.accuracy * 
                        analysis.statistics.dataQuality.completeness * 
                        analysis.statistics.dataQuality.consistency;
    score += (1 - qualityScore) * 30;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate documentation risk score component
   */
  private calculateDocumentationRiskScore(analysis: ComparisonAnalysis): number {
    let score = 0;

    // Low matching accuracy suggests poor documentation
    const matchingAccuracy = analysis.reconciliation.matchingAccuracy;
    score += (1 - matchingAccuracy) * 50;

    // High number of unmatched items
    const totalItems = analysis.reconciliation.matchedItems.length + analysis.reconciliation.unmatchedOriginalItems.length;
    const unmatchedRatio = totalItems > 0 
      ? analysis.reconciliation.unmatchedOriginalItems.length / totalItems
      : 0;
    score += unmatchedRatio * 30;

    // Data quality issues
    score += analysis.statistics.dataQuality.issues.length * 5;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate compliance risk score component
   */
  private calculateComplianceRiskScore(analysis: ComparisonAnalysis): number {
    let score = 0;

    if (analysis.statistics.itemCount === 0) return 0;

    // Critical discrepancies indicate compliance issues
    const criticalDiscrepancies = analysis.discrepancies.filter(d => d.severity === SeverityLevel.CRITICAL);
    score += criticalDiscrepancies.length * 25;

    // High discrepancies
    const highDiscrepancies = analysis.discrepancies.filter(d => d.severity === SeverityLevel.HIGH);
    score += highDiscrepancies.length * 15;

    // Overall discrepancy ratio
    const discrepancyRatio = analysis.discrepancies.length / analysis.statistics.itemCount;
    score += discrepancyRatio * 20;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate confidence interval for risk score
   */
  private calculateConfidenceInterval(
    score: number,
    componentScores: number[]
  ): { lower: number; upper: number; confidence: number } {
    const variance = this.calculateVariance(componentScores);
    const standardError = Math.sqrt(variance / componentScores.length);
    const marginOfError = 1.96 * standardError; // 95% confidence interval

    return {
      lower: Math.max(0, Math.round(score - marginOfError)),
      upper: Math.min(100, Math.round(score + marginOfError)),
      confidence: 95
    };
  }

  /**
   * Generate enhanced risk factors
   */
  private async generateEnhancedRiskFactors(
    analysis: ComparisonAnalysis,
    anomalies: StatisticalAnomalyResult[]
  ): Promise<EnhancedRiskFactor[]> {
    const riskFactors: EnhancedRiskFactor[] = [];

    // Convert anomalies to risk factors
    anomalies.forEach((anomaly, index) => {
      riskFactors.push({
        id: `anomaly-${index}`,
        type: 'statistical',
        category: anomaly.type,
        description: anomaly.description,
        impact: this.severityToImpact(anomaly.severity),
        likelihood: anomaly.confidence,
        confidence: anomaly.confidence,
        evidence: anomaly.evidence,
        mitigation: this.generateMitigation(anomaly.type),
        severity: anomaly.severity,
        weight: this.calculateRiskWeight(anomaly.severity, anomaly.confidence)
      });
    });

    // Add variance-based risk factors
    if (analysis.statistics.totalVariancePercent > 20) {
      riskFactors.push({
        id: 'high-variance',
        type: 'behavioral',
        category: 'variance_analysis',
        description: `Total variance of ${analysis.statistics.totalVariancePercent.toFixed(2)}% exceeds normal thresholds`,
        impact: 75,
        likelihood: 0.8,
        confidence: 0.9,
        evidence: [{
          type: 'statistical',
          description: 'Total variance significantly exceeds industry norms',
          value: analysis.statistics.totalVariancePercent,
          expectedValue: 10,
          deviation: analysis.statistics.totalVariancePercent - 10,
          significance: analysis.statistics.totalVariancePercent / 10
        }],
        mitigation: 'Detailed review of high-variance items and supporting documentation',
        severity: analysis.statistics.totalVariancePercent > 50 ? SeverityLevel.HIGH : SeverityLevel.MEDIUM,
        weight: 0.8
      });
    }

    return riskFactors.sort((a, b) => (b.impact * b.likelihood) - (a.impact * a.likelihood));
  }

  /**
   * Generate professional recommendations
   */
  private generateProfessionalRecommendations(
    overallScore: number,
    riskFactors: EnhancedRiskFactor[],
    anomalies: StatisticalAnomalyResult[]
  ): ProfessionalRecommendation[] {
    const recommendations: ProfessionalRecommendation[] = [];

    if (overallScore >= 75) {
      recommendations.push({
        id: 'immediate-investigation',
        priority: 'immediate',
        category: 'investigation',
        action: 'Initiate comprehensive fraud investigation',
        rationale: 'High risk score indicates significant probability of fraudulent activity',
        expectedOutcome: 'Identification and quantification of potential fraud',
        timeframe: 'Within 24 hours',
        resources: ['Senior fraud investigator', 'Additional documentation', 'Expert consultation']
      });
    }

    if (anomalies.some(a => a.type === 'benford_law')) {
      recommendations.push({
        id: 'number-pattern-analysis',
        priority: 'high',
        category: 'investigation',
        action: 'Conduct detailed analysis of number patterns and their sources',
        rationale: 'Benford\'s Law violations suggest potential artificial number generation',
        expectedOutcome: 'Verification of number authenticity and identification of manipulation',
        timeframe: 'Within 48 hours',
        resources: ['Statistical analyst', 'Source document verification', 'Historical comparison data']
      });
    }

    if (riskFactors.some(rf => rf.type === 'documentation')) {
      recommendations.push({
        id: 'documentation-review',
        priority: 'high',
        category: 'verification',
        action: 'Comprehensive review of supporting documentation',
        rationale: 'Documentation quality issues identified that require verification',
        expectedOutcome: 'Validation of claim accuracy and completeness',
        timeframe: 'Within 72 hours',
        resources: ['Document specialist', 'Original source documents', 'Cross-reference databases']
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { immediate: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Helper methods
  private getAllLineItems(analysis: ComparisonAnalysis): EnhancedInvoiceLineItem[] {
    return [
      ...analysis.reconciliation.matchedItems.map(m => m.supplement),
      ...analysis.reconciliation.newSupplementItems
    ];
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number } {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private determineSeverityFromZScore(zScore: number): SeverityLevel {
    if (zScore >= this.STATISTICAL_THRESHOLDS.Z_SCORE_CRITICAL) return SeverityLevel.CRITICAL;
    if (zScore >= this.STATISTICAL_THRESHOLDS.Z_SCORE_HIGH) return SeverityLevel.HIGH;
    if (zScore >= this.STATISTICAL_THRESHOLDS.Z_SCORE_MEDIUM) return SeverityLevel.MEDIUM;
    return SeverityLevel.LOW;
  }

  private getFirstDigit(value: number): number {
    const str = Math.abs(value).toString();
    const firstChar = str.charAt(0);
    return firstChar === '0' ? 0 : parseInt(firstChar, 10);
  }

  private performBenfordTest(digits: number[]): BenfordAnalysis {
    // Benford's Law expected distribution for first digits
    const expectedDistribution = [
      30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6
    ].map(p => p / 100);

    // Calculate actual distribution
    const counts = new Array(9).fill(0);
    digits.forEach(digit => {
      if (digit >= 1 && digit <= 9) {
        counts[digit - 1]++;
      }
    });

    const actualDistribution = counts.map(count => count / digits.length);

    // Chi-square test
    let chiSquareStatistic = 0;
    for (let i = 0; i < 9; i++) {
      const expected = expectedDistribution[i] * digits.length;
      const actual = counts[i];
      if (expected > 0) {
        chiSquareStatistic += Math.pow(actual - expected, 2) / expected;
      }
    }

    // Calculate p-value (simplified approximation)
    const degreesOfFreedom = 8;
    const pValue = this.calculateChiSquarePValue(chiSquareStatistic, degreesOfFreedom);

    // Identify suspicious digits
    const suspiciousDigits: number[] = [];
    for (let i = 0; i < 9; i++) {
      const deviation = Math.abs(actualDistribution[i] - expectedDistribution[i]);
      if (deviation > 0.05) { // More than 5% deviation
        suspiciousDigits.push(i + 1);
      }
    }

    return {
      expectedDistribution,
      actualDistribution,
      chiSquareStatistic,
      pValue,
      isSignificant: pValue < this.STATISTICAL_THRESHOLDS.BENFORD_P_VALUE,
      suspiciousDigits
    };
  }

  private calculateChiSquarePValue(chiSquare: number, df: number): number {
    // Simplified p-value calculation (approximation)
    // In a production system, you would use a proper statistical library
    if (chiSquare > 20) return 0.01;
    if (chiSquare > 15) return 0.05;
    if (chiSquare > 10) return 0.1;
    return 0.5;
  }

  private determineRiskLevel(score: number): 'minimal' | 'low' | 'moderate' | 'high' | 'critical' {
    if (score >= 85) return 'critical';
    if (score >= 70) return 'high';
    if (score >= 50) return 'moderate';
    if (score >= 25) return 'low';
    return 'minimal';
  }

  private severityToImpact(severity: SeverityLevel): number {
    const impactMap = {
      [SeverityLevel.CRITICAL]: 95,
      [SeverityLevel.HIGH]: 75,
      [SeverityLevel.MEDIUM]: 50,
      [SeverityLevel.LOW]: 25
    };
    return impactMap[severity];
  }

  private generateMitigation(anomalyType: string): string {
    const mitigations = {
      z_score: 'Detailed review of outlier items and verification of supporting documentation',
      benford_law: 'Investigation of number generation processes and source document verification',
      regression: 'Recalculation verification and mathematical accuracy review',
      temporal: 'Process efficiency review and data quality assessment',
      geographic: 'Location-based verification and regional benchmark comparison'
    };
    return mitigations[anomalyType as keyof typeof mitigations] || 'General review and verification recommended';
  }

  private calculateRiskWeight(severity: SeverityLevel, confidence: number): number {
    const severityWeights = {
      [SeverityLevel.CRITICAL]: 1.0,
      [SeverityLevel.HIGH]: 0.8,
      [SeverityLevel.MEDIUM]: 0.6,
      [SeverityLevel.LOW]: 0.4
    };
    return severityWeights[severity] * confidence;
  }
}

// Export singleton instance
export const advancedFraudDetector = new AdvancedFraudDetector();