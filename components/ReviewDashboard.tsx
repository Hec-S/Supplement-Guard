import React, { useState, useEffect, useMemo } from 'react';
import { ClaimData, ComparisonAnalysis } from '../types';
import FraudScoreCard from './FraudScoreCard';
import EnhancedFraudScoreCard from './EnhancedFraudScoreCard';
import InvoiceViewer from './InvoiceViewer';
import EnhancedComparisonTable from './EnhancedComparisonTable';
import StatisticalDashboard from './StatisticalDashboard';
import AnalysisSummary from './AnalysisSummary';
import Button from './Button';
import { DownloadIcon } from './icons/DownloadIcon';
import { generatePdfReport, generateCsvReport } from '../services/pdfService';
import { comparisonEngine } from '../services/comparisonEngine';
import {
  advancedFraudDetector,
  ProfessionalRiskScore,
  StatisticalAnomalyResult
} from '../services/advancedFraudDetector';
import {
  formatCurrency,
  formatPercentage,
  formatDecimal
} from '../utils/formatters';

interface ReviewDashboardProps {
  claimData: ClaimData;
}

const ReviewDashboard: React.FC<ReviewDashboardProps> = ({ claimData }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'statistics' | 'summary'>('overview');
  const [comparisonAnalysis, setComparisonAnalysis] = useState<ComparisonAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [professionalRiskScore, setProfessionalRiskScore] = useState<ProfessionalRiskScore | null>(null);
  const [statisticalAnomalies, setStatisticalAnomalies] = useState<StatisticalAnomalyResult[]>([]);
  const [isPerformingAdvancedAnalysis, setIsPerformingAdvancedAnalysis] = useState(false);

  // Generate comprehensive comparison analysis
  useEffect(() => {
    const performAnalysis = async () => {
      if (!claimData.originalInvoice || !claimData.supplementInvoice) {
        return;
      }

      setIsAnalyzing(true);
      setAnalysisError(null);

      try {
        // Extract line items from invoice objects
        const originalLineItems = claimData.originalInvoice?.lineItems || [];
        const supplementLineItems = claimData.supplementInvoice?.lineItems || [];
        
        // Validate that we have valid data
        if (originalLineItems.length === 0 && supplementLineItems.length === 0) {
          throw new Error('No line items found in either invoice');
        }
        
        const analysis = await comparisonEngine.analyzeComparison(
          originalLineItems,
          supplementLineItems,
          {
            enableFuzzyMatching: true,
            matchingThreshold: 0.8,
            significanceThreshold: 10, // 10% threshold for significant variance
            enableCategoryClassification: true,
            enableDiscrepancyDetection: true,
            precision: 2
          }
        );

        setComparisonAnalysis(analysis);
        
        // Perform advanced fraud detection analysis
        setIsPerformingAdvancedAnalysis(true);
        try {
          const anomalies = await advancedFraudDetector.detectStatisticalAnomalies(analysis);
          const riskScore = await advancedFraudDetector.calculateProfessionalRiskScore(analysis, anomalies);
          
          setStatisticalAnomalies(anomalies);
          setProfessionalRiskScore(riskScore);
        } catch (advancedError) {
          console.error('Error performing advanced fraud analysis:', advancedError);
          // Don't fail the entire analysis if advanced features fail
        } finally {
          setIsPerformingAdvancedAnalysis(false);
        }
      } catch (error) {
        console.error('Error performing comparison analysis:', error);
        setAnalysisError('Failed to perform comprehensive analysis. Please try again.');
      } finally {
        setIsAnalyzing(false);
      }
    };

    performAnalysis();
  }, [claimData.id, claimData.originalInvoice, claimData.supplementInvoice]);

  // Memoized analysis summary for performance
  const analysisSummary = useMemo(() => {
    if (!comparisonAnalysis) return null;

    return {
      totalVariance: comparisonAnalysis.statistics.totalVariance,
      totalVariancePercent: comparisonAnalysis.statistics.totalVariancePercent,
      riskScore: professionalRiskScore?.overallScore || comparisonAnalysis.riskAssessment.overallRiskScore,
      riskLevel: professionalRiskScore?.riskLevel || comparisonAnalysis.riskAssessment.riskLevel,
      itemCount: comparisonAnalysis.statistics.itemCount,
      matchingAccuracy: comparisonAnalysis.reconciliation.matchingAccuracy,
      discrepancyCount: comparisonAnalysis.discrepancies.length,
      anomalyCount: statisticalAnomalies.length,
      hasHighRiskItems: (professionalRiskScore?.riskLevel === 'high' || professionalRiskScore?.riskLevel === 'critical') ||
                       (comparisonAnalysis.riskAssessment.riskLevel === 'high' ||
                        comparisonAnalysis.riskAssessment.riskLevel === 'critical')
    };
  }, [comparisonAnalysis, professionalRiskScore, statisticalAnomalies]);

  const handleDecision = (decision: 'Approved' | 'Rejected') => {
    const riskInfo = analysisSummary ? 
      ` (Risk Score: ${analysisSummary.riskScore}/100, ${analysisSummary.discrepancyCount} discrepancies)` : '';
    alert(`Claim ${claimData.id} has been ${decision}.${riskInfo}`);
  };

  const handleExportPdf = () => {
    generatePdfReport(claimData, comparisonAnalysis || undefined);
  };

  const handleExportCsv = () => {
    generateCsvReport(claimData);
  };


  const getTabButtonClass = (tab: string) => {
    const baseClass = "px-4 py-2 font-medium text-sm rounded-lg transition-colors duration-200";
    const activeClass = "bg-blue-600 text-white shadow-sm";
    const inactiveClass = "text-slate-600 hover:text-slate-800 hover:bg-slate-100";
    
    return `${baseClass} ${activeTab === tab ? activeClass : inactiveClass}`;
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Compact Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col space-y-4">
          {/* Title and Description */}
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Review for Claim: {claimData.id}</h2>
            <p className="text-slate-600 mt-1">Comprehensive AI-powered analysis with variance detection and risk assessment</p>
          </div>
          
          {/* Export Actions Only */}
          {analysisSummary && (
            <div className="flex justify-end items-center gap-2 pt-4 border-t border-slate-100">
              <Button onClick={handleExportPdf} variant="secondary" size="sm">
                <DownloadIcon />
                PDF
              </Button>
              <Button onClick={handleExportCsv} variant="secondary" size="sm">
                <DownloadIcon />
                CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Analysis Status */}
      {(isAnalyzing || isPerformingAdvancedAnalysis) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800 font-medium">
              {isAnalyzing ? 'Performing comprehensive analysis...' : 'Running advanced fraud detection algorithms...'}
            </span>
          </div>
        </div>
      )}

      {analysisError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Analysis Error</div>
          <div className="text-red-600 text-sm mt-1">{analysisError}</div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={getTabButtonClass('overview')}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={getTabButtonClass('comparison')}
            disabled={!comparisonAnalysis}
          >
            Detailed Comparison
            {comparisonAnalysis && (
              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                {comparisonAnalysis.statistics.itemCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={getTabButtonClass('summary')}
            disabled={!comparisonAnalysis}
          >
            Analysis Summary
            {comparisonAnalysis && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                NEW
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={getTabButtonClass('statistics')}
            disabled={!comparisonAnalysis}
          >
            Statistical Analysis
            {comparisonAnalysis && comparisonAnalysis.discrepancies.length > 0 && (
              <span className="ml-2 bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                {comparisonAnalysis.discrepancies.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content - Optimized Layout */}
      <div className="min-h-[600px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Full-width Invoice Viewer */}
            <InvoiceViewer
              originalInvoice={claimData.originalInvoice}
              supplementInvoice={claimData.supplementInvoice}
              summary={claimData.invoiceSummary}
            />
            
          </div>
        )}

        {activeTab === 'comparison' && comparisonAnalysis && (
          <div className="space-y-6">
            <EnhancedComparisonTable
              analysis={comparisonAnalysis}
              onItemSelect={(item) => {
                console.log('Selected item for detailed view:', item);
              }}
              viewMode="table"
              showViewToggle={true}
            />
          </div>
        )}

        {activeTab === 'summary' && comparisonAnalysis && (
          <div className="space-y-6">
            <AnalysisSummary
              analysis={comparisonAnalysis}
              onItemSelect={(item) => {
                console.log('Selected summary item:', item);
                // Optionally switch to comparison tab to show the selected item
                // setActiveTab('comparison');
              }}
              showDetailedView={true}
              isLoading={isAnalyzing}
            />
          </div>
        )}

        {activeTab === 'statistics' && comparisonAnalysis && (
          <div className="space-y-6">
            <StatisticalDashboard
              analysis={comparisonAnalysis}
              onDiscrepancySelect={(discrepancy) => {
                console.log('Selected discrepancy:', discrepancy);
              }}
              showCharts={true}
              enableInteractivity={true}
            />
          </div>
        )}

        {/* Loading state for tabs */}
        {(activeTab === 'comparison' || activeTab === 'summary' || activeTab === 'statistics') && !comparisonAnalysis && !isAnalyzing && (
          <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
            <div className="text-center">
              <div className="text-slate-400 text-lg mb-2">Analysis Required</div>
              <div className="text-slate-500 text-sm">
                Comprehensive analysis is needed to view this content.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewDashboard;