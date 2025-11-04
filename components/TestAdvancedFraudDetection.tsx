import React, { useState, useEffect } from 'react';
import { 
  advancedFraudDetector, 
  ProfessionalRiskScore, 
  StatisticalAnomalyResult 
} from '../services/advancedFraudDetector';
import { comparisonEngine } from '../services/comparisonEngine';
import EnhancedFraudScoreCard from './EnhancedFraudScoreCard';
import Button from './Button';
import {
  ClaimData,
  InvoiceLineItem,
  ComparisonAnalysis,
  CostCategory,
  VarianceType,
  SeverityLevel
} from '../types';

interface TestScenario {
  id: string;
  name: string;
  description: string;
  expectedRiskLevel: string;
  originalItems: InvoiceLineItem[];
  supplementItems: InvoiceLineItem[];
  expectedAnomalies: string[];
}

const TestAdvancedFraudDetection: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<{
    comparison: ComparisonAnalysis;
    riskScore: ProfessionalRiskScore;
    anomalies: StatisticalAnomalyResult[];
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Test scenarios with different fraud patterns
  const testScenarios: TestScenario[] = [
    {
      id: 'benford_violation',
      name: 'Benford\'s Law Violation',
      description: 'Artificial number patterns suggesting manipulated pricing',
      expectedRiskLevel: 'high',
      originalItems: [
        { id: 'orig-1', description: 'Engine Oil Change', quantity: 1, price: 45.00, total: 45.00 },
        { id: 'orig-2', description: 'Air Filter Replacement', quantity: 1, price: 25.00, total: 25.00 },
        { id: 'orig-3', description: 'Brake Inspection', quantity: 1, price: 35.00, total: 35.00 },
        { id: 'orig-4', description: 'Tire Rotation', quantity: 1, price: 20.00, total: 20.00 },
        { id: 'orig-5', description: 'Battery Test', quantity: 1, price: 15.00, total: 15.00 }
      ],
      supplementItems: [
        { id: 'supp-1', description: 'Engine Oil Change', quantity: 1, price: 100.00, total: 100.00 },
        { id: 'supp-2', description: 'Air Filter Replacement', quantity: 1, price: 100.00, total: 100.00 },
        { id: 'supp-3', description: 'Brake Inspection', quantity: 1, price: 100.00, total: 100.00 },
        { id: 'supp-4', description: 'Tire Rotation', quantity: 1, price: 100.00, total: 100.00 },
        { id: 'supp-5', description: 'Battery Test', quantity: 1, price: 100.00, total: 100.00 },
        { id: 'supp-6', description: 'Additional Service 1', quantity: 1, price: 111.11, total: 111.11 },
        { id: 'supp-7', description: 'Additional Service 2', quantity: 1, price: 111.11, total: 111.11 },
        { id: 'supp-8', description: 'Additional Service 3', quantity: 1, price: 111.11, total: 111.11 }
      ],
      expectedAnomalies: ['benford_law', 'z_score']
    },
    {
      id: 'statistical_outliers',
      name: 'Statistical Outliers',
      description: 'Extreme price variations indicating potential fraud',
      expectedRiskLevel: 'critical',
      originalItems: [
        { id: 'orig-1', description: 'Standard Labor Hour', quantity: 2, price: 85.00, total: 170.00 },
        { id: 'orig-2', description: 'Oil Filter', quantity: 1, price: 12.50, total: 12.50 },
        { id: 'orig-3', description: 'Brake Pads', quantity: 1, price: 45.00, total: 45.00 },
        { id: 'orig-4', description: 'Coolant', quantity: 2, price: 8.75, total: 17.50 },
        { id: 'orig-5', description: 'Spark Plugs', quantity: 4, price: 6.25, total: 25.00 }
      ],
      supplementItems: [
        { id: 'supp-1', description: 'Standard Labor Hour', quantity: 2, price: 85.00, total: 170.00 },
        { id: 'supp-2', description: 'Oil Filter', quantity: 1, price: 12.50, total: 12.50 },
        { id: 'supp-3', description: 'Brake Pads', quantity: 1, price: 45.00, total: 45.00 },
        { id: 'supp-4', description: 'Coolant', quantity: 2, price: 8.75, total: 17.50 },
        { id: 'supp-5', description: 'Spark Plugs', quantity: 4, price: 6.25, total: 25.00 },
        { id: 'supp-6', description: 'Premium Labor Adjustment', quantity: 1, price: 2500.00, total: 2500.00 },
        { id: 'supp-7', description: 'Special Equipment Fee', quantity: 1, price: 1850.00, total: 1850.00 }
      ],
      expectedAnomalies: ['z_score', 'regression']
    },
    {
      id: 'calculation_errors',
      name: 'Calculation Errors',
      description: 'Mathematical inconsistencies in quantity × price = total',
      expectedRiskLevel: 'high',
      originalItems: [
        { id: 'orig-1', description: 'Labor Hours', quantity: 3, price: 95.00, total: 285.00 },
        { id: 'orig-2', description: 'Parts Package', quantity: 1, price: 125.50, total: 125.50 },
        { id: 'orig-3', description: 'Materials', quantity: 2, price: 45.75, total: 91.50 }
      ],
      supplementItems: [
        { id: 'supp-1', description: 'Labor Hours', quantity: 3, price: 95.00, total: 285.00 },
        { id: 'supp-2', description: 'Parts Package', quantity: 1, price: 125.50, total: 125.50 },
        { id: 'supp-3', description: 'Materials', quantity: 2, price: 45.75, total: 91.50 },
        { id: 'supp-4', description: 'Additional Labor', quantity: 2, price: 110.00, total: 250.00 }, // Should be 220.00
        { id: 'supp-5', description: 'Extra Parts', quantity: 3, price: 75.25, total: 200.00 }, // Should be 225.75
        { id: 'supp-6', description: 'Miscellaneous', quantity: 1, price: 50.00, total: 75.00 } // Should be 50.00
      ],
      expectedAnomalies: ['regression']
    },
    {
      id: 'duplicate_items',
      name: 'Duplicate Items',
      description: 'Potential duplicate billing for the same services',
      expectedRiskLevel: 'medium',
      originalItems: [
        { id: 'orig-1', description: 'Engine Diagnostic', quantity: 1, price: 125.00, total: 125.00 },
        { id: 'orig-2', description: 'Oil Change Service', quantity: 1, price: 45.00, total: 45.00 },
        { id: 'orig-3', description: 'Brake Inspection', quantity: 1, price: 75.00, total: 75.00 }
      ],
      supplementItems: [
        { id: 'supp-1', description: 'Engine Diagnostic', quantity: 1, price: 125.00, total: 125.00 },
        { id: 'supp-2', description: 'Oil Change Service', quantity: 1, price: 45.00, total: 45.00 },
        { id: 'supp-3', description: 'Brake Inspection', quantity: 1, price: 75.00, total: 75.00 },
        { id: 'supp-4', description: 'Engine Diagnostic Service', quantity: 1, price: 125.00, total: 125.00 },
        { id: 'supp-5', description: 'Oil Change', quantity: 1, price: 45.00, total: 45.00 },
        { id: 'supp-6', description: 'Brake System Inspection', quantity: 1, price: 75.00, total: 75.00 }
      ],
      expectedAnomalies: ['duplicate_items']
    },
    {
      id: 'legitimate_claim',
      name: 'Legitimate Claim',
      description: 'Normal claim with reasonable variations',
      expectedRiskLevel: 'low',
      originalItems: [
        { id: 'orig-1', description: 'Oil Change', quantity: 1, price: 35.00, total: 35.00 },
        { id: 'orig-2', description: 'Air Filter', quantity: 1, price: 15.00, total: 15.00 },
        { id: 'orig-3', description: 'Labor', quantity: 1, price: 85.00, total: 85.00 }
      ],
      supplementItems: [
        { id: 'supp-1', description: 'Oil Change', quantity: 1, price: 38.50, total: 38.50 },
        { id: 'supp-2', description: 'Air Filter', quantity: 1, price: 18.75, total: 18.75 },
        { id: 'supp-3', description: 'Labor', quantity: 1, price: 92.50, total: 92.50 },
        { id: 'supp-4', description: 'Additional Inspection', quantity: 1, price: 25.00, total: 25.00 }
      ],
      expectedAnomalies: []
    }
  ];

  const runAnalysis = async (scenario: TestScenario) => {
    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      // Perform comparison analysis
      const comparison = await comparisonEngine.analyzeComparison(
        scenario.originalItems,
        scenario.supplementItems,
        {
          enableFuzzyMatching: true,
          matchingThreshold: 0.8,
          significanceThreshold: 10,
          enableCategoryClassification: true,
          enableDiscrepancyDetection: true,
          precision: 2
        }
      );

      // Perform advanced fraud detection
      const anomalies = await advancedFraudDetector.detectStatisticalAnomalies(comparison);
      const riskScore = await advancedFraudDetector.calculateProfessionalRiskScore(comparison, anomalies);

      setAnalysisResult({
        comparison,
        riskScore,
        anomalies
      });

    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const validateResults = (scenario: TestScenario, result: typeof analysisResult) => {
    if (!result) return null;

    const validations = [];

    // Check risk level
    const expectedRisk = scenario.expectedRiskLevel;
    const actualRisk = result.riskScore.riskLevel;
    validations.push({
      test: 'Risk Level',
      expected: expectedRisk,
      actual: actualRisk,
      passed: actualRisk === expectedRisk || 
              (expectedRisk === 'high' && (actualRisk === 'high' || actualRisk === 'critical')) ||
              (expectedRisk === 'medium' && (actualRisk === 'medium' || actualRisk === 'high'))
    });

    // Check for expected anomalies
    scenario.expectedAnomalies.forEach(expectedAnomaly => {
      const found = result.anomalies.some(a => a.type === expectedAnomaly);
      validations.push({
        test: `${expectedAnomaly} Anomaly`,
        expected: 'detected',
        actual: found ? 'detected' : 'not detected',
        passed: found
      });
    });

    return validations;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          Advanced Fraud Detection Testing
        </h2>
        <p className="text-slate-600 mb-6">
          Test the advanced fraud detection algorithms with various fraud scenarios to validate accuracy and effectiveness.
        </p>

        {/* Scenario Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {testScenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedScenario === scenario.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => setSelectedScenario(scenario.id)}
            >
              <h3 className="font-semibold text-slate-800 mb-2">{scenario.name}</h3>
              <p className="text-sm text-slate-600 mb-3">{scenario.description}</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Expected Risk:</span>
                <span className={`px-2 py-1 rounded font-medium ${
                  scenario.expectedRiskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                  scenario.expectedRiskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                  scenario.expectedRiskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {scenario.expectedRiskLevel}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Run Analysis Button */}
        {selectedScenario && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={() => {
                const scenario = testScenarios.find(s => s.id === selectedScenario);
                if (scenario) runAnalysis(scenario);
              }}
              disabled={isAnalyzing}
              variant="primary"
            >
              {isAnalyzing ? 'Analyzing...' : 'Run Fraud Detection Analysis'}
            </Button>
          </div>
        )}

        {/* Analysis Status */}
        {isAnalyzing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-800 font-medium">
                Running advanced fraud detection algorithms...
              </span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800 font-medium">Analysis Error</div>
            <div className="text-red-600 text-sm mt-1">{error}</div>
          </div>
        )}
      </div>

      {/* Results Display */}
      {analysisResult && selectedScenario && (
        <div className="space-y-6">
          {/* Validation Results */}
          {(() => {
            const scenario = testScenarios.find(s => s.id === selectedScenario);
            const validations = scenario ? validateResults(scenario, analysisResult) : null;
            
            if (validations) {
              return (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Validation Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validations.map((validation, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          validation.passed
                            ? 'border-green-200 bg-green-50'
                            : 'border-red-200 bg-red-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-slate-800">{validation.test}</span>
                          <span className={`text-sm px-2 py-1 rounded ${
                            validation.passed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {validation.passed ? '✓ PASS' : '✗ FAIL'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          <div>Expected: {validation.expected}</div>
                          <div>Actual: {validation.actual}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Enhanced Fraud Score Card */}
          <EnhancedFraudScoreCard
            riskScore={analysisResult.riskScore}
            anomalies={analysisResult.anomalies}
            showDetailedAnalysis={true}
            onRecommendationSelect={(recommendation) => {
              console.log('Test - Selected recommendation:', recommendation);
            }}
            onRiskFactorSelect={(riskFactor) => {
              console.log('Test - Selected risk factor:', riskFactor);
            }}
          />

          {/* Analysis Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Analysis Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {analysisResult.riskScore.overallScore}
                </div>
                <div className="text-sm text-slate-600">Risk Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {analysisResult.anomalies.length}
                </div>
                <div className="text-sm text-slate-600">Anomalies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {analysisResult.riskScore.riskFactors.length}
                </div>
                <div className="text-sm text-slate-600">Risk Factors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">
                  {analysisResult.riskScore.recommendations.length}
                </div>
                <div className="text-sm text-slate-600">Recommendations</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestAdvancedFraudDetection;