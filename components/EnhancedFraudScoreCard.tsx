import React, { useState, useMemo } from 'react';
import {
  ProfessionalRiskScore,
  EnhancedRiskFactor,
  ProfessionalRecommendation,
  StatisticalAnomalyResult
} from '../services/advancedFraudDetector';
import { SeverityLevel } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface EnhancedFraudScoreCardProps {
  riskScore: ProfessionalRiskScore;
  anomalies: StatisticalAnomalyResult[];
  onRecommendationSelect?: (recommendation: ProfessionalRecommendation) => void;
  onRiskFactorSelect?: (riskFactor: EnhancedRiskFactor) => void;
  showDetailedAnalysis?: boolean;
}

const EnhancedFraudScoreCard: React.FC<EnhancedFraudScoreCardProps> = ({
  riskScore,
  anomalies,
  onRecommendationSelect,
  onRiskFactorSelect,
  showDetailedAnalysis = true
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'factors' | 'recommendations' | 'anomalies'>('overview');
  const [expandedFactors, setExpandedFactors] = useState<Set<string>>(new Set());

  // Color schemes based on risk level
  const riskLevelColors = useMemo(() => {
    const colorMap = {
      minimal: {
        primary: 'text-green-600',
        background: 'bg-green-50',
        border: 'border-green-200',
        borderBottom: 'border-b-green-200',
        accent: 'bg-green-100',
        gauge: '#10b981'
      },
      low: {
        primary: 'text-blue-600',
        background: 'bg-blue-50',
        border: 'border-blue-200',
        borderBottom: 'border-b-blue-200',
        accent: 'bg-blue-100',
        gauge: '#3b82f6'
      },
      moderate: {
        primary: 'text-yellow-600',
        background: 'bg-yellow-50',
        border: 'border-yellow-200',
        borderBottom: 'border-b-yellow-200',
        accent: 'bg-yellow-100',
        gauge: '#f59e0b'
      },
      high: {
        primary: 'text-orange-600',
        background: 'bg-orange-50',
        border: 'border-orange-200',
        borderBottom: 'border-b-orange-200',
        accent: 'bg-orange-100',
        gauge: '#f97316'
      },
      critical: {
        primary: 'text-red-600',
        background: 'bg-red-50',
        border: 'border-red-200',
        borderBottom: 'border-b-red-200',
        accent: 'bg-red-100',
        gauge: '#ef4444'
      }
    };
    return colorMap[riskScore.riskLevel];
  }, [riskScore.riskLevel]);

  const toggleFactorExpansion = (factorId: string) => {
    setExpandedFactors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(factorId)) {
        newSet.delete(factorId);
      } else {
        newSet.add(factorId);
      }
      return newSet;
    });
  };

  const getSeverityIcon = (severity: SeverityLevel) => {
    const icons = {
      [SeverityLevel.CRITICAL]: '🚨',
      [SeverityLevel.HIGH]: '⚠️',
      [SeverityLevel.MEDIUM]: '⚡',
      [SeverityLevel.LOW]: 'ℹ️'
    };
    return icons[severity];
  };

  const getPriorityIcon = (priority: string) => {
    const icons = {
      immediate: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[priority as keyof typeof icons] || '⚪';
  };

  // Risk gauge component
  const RiskGauge = () => {
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (riskScore.overallScore / 100) * circumference;

    return (
      <div className="relative w-48 h-48 mx-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="text-slate-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
          />
          {/* Progress circle */}
          <circle
            className="transition-all duration-1000 ease-out"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke={riskLevelColors.gauge}
            fill="transparent"
            r="45"
            cx="50"
            cy="50"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${riskLevelColors.primary}`}>
            {riskScore.overallScore}
          </span>
          <span className="text-sm text-slate-600 mt-1">Risk Score</span>
          <span className={`text-xs font-medium ${riskLevelColors.primary} mt-1 uppercase`}>
            {riskScore.riskLevel}
          </span>
        </div>
      </div>
    );
  };

  // Component scores visualization
  const ComponentScores = () => (
    <div className="grid grid-cols-2 gap-4">
      {Object.entries(riskScore.componentScores).map(([component, score]) => {
        const numericScore = Number(score);
        return (
          <div key={component} className="bg-white rounded-lg p-4 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700 capitalize">
                {component}
              </span>
              <span className={`text-lg font-bold ${numericScore > 70 ? 'text-red-600' : numericScore > 40 ? 'text-yellow-600' : 'text-green-600'}`}>
                {numericScore}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  numericScore > 70 ? 'bg-red-500' : numericScore > 40 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${numericScore}%` }}
              ></div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Confidence interval display
  const ConfidenceInterval = () => (
    <div className={`p-4 rounded-lg ${riskLevelColors.background} ${riskLevelColors.border} border`}>
      <h4 className="font-semibold text-slate-800 mb-2">Statistical Confidence</h4>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">
          {riskScore.confidenceInterval.confidence}% Confidence Interval:
        </span>
        <span className={`font-medium ${riskLevelColors.primary}`}>
          {riskScore.confidenceInterval.lower} - {riskScore.confidenceInterval.upper}
        </span>
      </div>
      <div className="mt-2 text-xs text-slate-500">
        The true risk score is likely within this range with {riskScore.confidenceInterval.confidence}% confidence
      </div>
    </div>
  );

  // Risk factors list
  const RiskFactorsList = () => (
    <div className="space-y-3">
      {riskScore.riskFactors.slice(0, 10).map((factor) => {
        const isExpanded = expandedFactors.has(factor.id);
        return (
          <div
            key={factor.id}
            className="bg-white rounded-lg border border-slate-200 overflow-hidden"
          >
            <button
              onClick={() => toggleFactorExpansion(factor.id)}
              aria-expanded={isExpanded}
              aria-label={`${factor.description} - Click to ${isExpanded ? 'collapse' : 'expand'} details`}
              className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getSeverityIcon(factor.severity)}</span>
                    <span className="font-medium text-slate-800">{factor.description}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>Impact: {factor.impact}%</span>
                    <span>Likelihood: {formatPercentage(factor.likelihood * 100)}</span>
                    <span>Confidence: {formatPercentage(factor.confidence * 100)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    factor.severity === SeverityLevel.CRITICAL ? 'bg-red-100 text-red-800' :
                    factor.severity === SeverityLevel.HIGH ? 'bg-orange-100 text-orange-800' :
                    factor.severity === SeverityLevel.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {factor.severity}
                  </span>
                  <span className="text-slate-400">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </div>
            </button>
            
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <div className="mt-3 space-y-3">
                  <div>
                    <h5 className="font-medium text-slate-700 mb-1">Evidence</h5>
                    <div className="space-y-2">
                      {factor.evidence.map((evidence, index) => (
                        <div key={index} className="text-sm bg-slate-50 rounded p-2">
                          <div className="font-medium text-slate-700">{evidence.description}</div>
                          <div className="text-slate-600 mt-1">
                            Actual: {evidence.value.toFixed(2)} | 
                            Expected: {evidence.expectedValue.toFixed(2)} | 
                            Deviation: {evidence.deviation.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-slate-700 mb-1">Recommended Mitigation</h5>
                    <p className="text-sm text-slate-600">{factor.mitigation}</p>
                  </div>
                  
                  {onRiskFactorSelect && (
                    <button
                      onClick={() => onRiskFactorSelect(factor)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Detailed Analysis →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Recommendations list
  const RecommendationsList = () => (
    <div className="space-y-3">
      {riskScore.recommendations.map((recommendation) => (
        <div
          key={recommendation.id}
          className="bg-white rounded-lg border border-slate-200 p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getPriorityIcon(recommendation.priority)}</span>
              <span className="font-semibold text-slate-800">{recommendation.action}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              recommendation.priority === 'immediate' ? 'bg-red-100 text-red-800' :
              recommendation.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {recommendation.priority}
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-slate-700">Rationale: </span>
              <span className="text-slate-600">{recommendation.rationale}</span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Expected Outcome: </span>
              <span className="text-slate-600">{recommendation.expectedOutcome}</span>
            </div>
            <div className="flex gap-4">
              <div>
                <span className="font-medium text-slate-700">Timeframe: </span>
                <span className="text-slate-600">{recommendation.timeframe}</span>
              </div>
              <div>
                <span className="font-medium text-slate-700">Category: </span>
                <span className="text-slate-600 capitalize">{recommendation.category}</span>
              </div>
            </div>
            {recommendation.resources.length > 0 && (
              <div>
                <span className="font-medium text-slate-700">Required Resources: </span>
                <span className="text-slate-600">{recommendation.resources.join(', ')}</span>
              </div>
            )}
          </div>
          
          {onRecommendationSelect && (
            <button
              onClick={() => onRecommendationSelect(recommendation)}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Implement Recommendation →
            </button>
          )}
        </div>
      ))}
    </div>
  );

  // Anomalies list
  const AnomaliesList = () => (
    <div className="space-y-3">
      {anomalies.map((anomaly, index) => (
        <div
          key={index}
          className="bg-white rounded-lg border border-slate-200 p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getSeverityIcon(anomaly.severity)}</span>
              <span className="font-medium text-slate-800">{anomaly.description}</span>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              anomaly.severity === SeverityLevel.CRITICAL ? 'bg-red-100 text-red-800' :
              anomaly.severity === SeverityLevel.HIGH ? 'bg-orange-100 text-orange-800' :
              anomaly.severity === SeverityLevel.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {anomaly.type.replace('_', ' ')}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm mb-3">
            <div>
              <span className="font-medium text-slate-700">Confidence: </span>
              <span className="text-slate-600">{formatPercentage(anomaly.confidence * 100)}</span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Measure: </span>
              <span className="text-slate-600">{anomaly.statisticalMeasure.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-medium text-slate-700">Threshold: </span>
              <span className="text-slate-600">{anomaly.threshold.toFixed(2)}</span>
            </div>
          </div>
          
          {anomaly.affectedItems.length > 0 && (
            <div className="text-sm">
              <span className="font-medium text-slate-700">Affected Items: </span>
              <span className="text-slate-600">
                {anomaly.affectedItems.length} item{anomaly.affectedItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Tab navigation
  type TabId = 'overview' | 'factors' | 'recommendations' | 'anomalies';
  
  const TabNavigation = () => (
    <div className="border-b border-slate-200 mb-6">
      <nav className="flex space-x-1" role="tablist">
        {[
          { id: 'overview' as TabId, label: 'Overview', count: null },
          { id: 'factors' as TabId, label: 'Risk Factors', count: riskScore.riskFactors.length },
          { id: 'recommendations' as TabId, label: 'Recommendations', count: riskScore.recommendations.length },
          { id: 'anomalies' as TabId, label: 'Anomalies', count: anomalies.length }
        ].map((tab) => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? `${riskLevelColors.primary} border-b-2 ${riskLevelColors.borderBottom}`
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                activeTab === tab.id ? riskLevelColors.accent : 'bg-slate-100'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-800 mb-2">
          Professional Fraud Risk Assessment
        </h3>
        <p className="text-sm text-slate-600">
          Comprehensive statistical analysis with industry-standard methodologies
        </p>
      </div>

      {showDetailedAnalysis && <TabNavigation />}

      {/* Overview Tab */}
      {(!showDetailedAnalysis || activeTab === 'overview') && (
        <div 
          role="tabpanel" 
          id="panel-overview" 
          aria-labelledby="tab-overview"
          className="space-y-6"
        >
          <RiskGauge />
          <ConfidenceInterval />
          <ComponentScores />
          
          {/* Quick Summary */}
          <div className={`p-4 rounded-lg ${riskLevelColors.background} ${riskLevelColors.border} border`}>
            <h4 className="font-semibold text-slate-800 mb-2">Assessment Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Risk Factors:</span>
                <span className={`ml-2 font-medium ${riskLevelColors.primary}`}>
                  {riskScore.riskFactors.length}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Anomalies:</span>
                <span className={`ml-2 font-medium ${riskLevelColors.primary}`}>
                  {anomalies.length}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Recommendations:</span>
                <span className={`ml-2 font-medium ${riskLevelColors.primary}`}>
                  {riskScore.recommendations.length}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Confidence:</span>
                <span className={`ml-2 font-medium ${riskLevelColors.primary}`}>
                  {riskScore.confidenceInterval.confidence}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Factors Tab */}
      {showDetailedAnalysis && activeTab === 'factors' && (
        <div 
          role="tabpanel" 
          id="panel-factors" 
          aria-labelledby="tab-factors"
        >
          <h4 className="font-semibold text-slate-800 mb-4">Identified Risk Factors</h4>
          <RiskFactorsList />
        </div>
      )}

      {/* Recommendations Tab */}
      {showDetailedAnalysis && activeTab === 'recommendations' && (
        <div 
          role="tabpanel" 
          id="panel-recommendations" 
          aria-labelledby="tab-recommendations"
        >
          <h4 className="font-semibold text-slate-800 mb-4">Professional Recommendations</h4>
          <RecommendationsList />
        </div>
      )}

      {/* Anomalies Tab */}
      {showDetailedAnalysis && activeTab === 'anomalies' && (
        <div 
          role="tabpanel" 
          id="panel-anomalies" 
          aria-labelledby="tab-anomalies"
        >
          <h4 className="font-semibold text-slate-800 mb-4">Statistical Anomalies</h4>
          <AnomaliesList />
        </div>
      )}
    </div>
  );
};

export default EnhancedFraudScoreCard;