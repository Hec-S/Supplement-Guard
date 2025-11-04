import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  ComparisonAnalysis,
  CostCategory,
  VarianceType,
  SeverityLevel
} from '../types';
import {
  formatCurrency,
  formatPercentage,
  formatDecimal
} from '../utils/formatters';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface StatisticalDashboardProps {
  analysis: ComparisonAnalysis;
}

// Using centralized formatting utilities

const StatisticalDashboard: React.FC<StatisticalDashboardProps> = ({ analysis }) => {
  // Category variance chart data
  const categoryChartData = useMemo(() => {
    const categories = Object.keys(analysis.statistics.categoryVariances) as CostCategory[];
    const variances = categories.map(cat => analysis.statistics.categoryVariances[cat].variance);
    const percentages = categories.map(cat => analysis.statistics.categoryVariances[cat].variancePercent);

    return {
      labels: categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1)),
      datasets: [
        {
          label: 'Variance Amount',
          data: variances,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',   // blue
            'rgba(16, 185, 129, 0.8)',   // green
            'rgba(245, 158, 11, 0.8)',   // yellow
            'rgba(139, 92, 246, 0.8)',   // purple
            'rgba(107, 114, 128, 0.8)',  // gray
            'rgba(236, 72, 153, 0.8)',   // pink
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(107, 114, 128, 1)',
            'rgba(236, 72, 153, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [analysis.statistics.categoryVariances]);

  // Variance type distribution pie chart
  const varianceTypeChartData = useMemo(() => {
    const types = Object.keys(analysis.statistics.varianceTypeDistribution) as VarianceType[];
    const counts = types.map(type => analysis.statistics.varianceTypeDistribution[type].count);
    
    return {
      labels: types.map(type => {
        switch (type) {
          case VarianceType.NEW_ITEM: return 'New Items';
          case VarianceType.REMOVED_ITEM: return 'Removed Items';
          case VarianceType.QUANTITY_CHANGE: return 'Quantity Changes';
          case VarianceType.PRICE_CHANGE: return 'Price Changes';
          case VarianceType.DESCRIPTION_CHANGE: return 'Description Changes';
          case VarianceType.NO_CHANGE: return 'No Changes';
          default: return type;
        }
      }),
      datasets: [
        {
          data: counts,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',   // blue - new
            'rgba(107, 114, 128, 0.8)',  // gray - removed
            'rgba(245, 158, 11, 0.8)',   // orange - quantity
            'rgba(139, 92, 246, 0.8)',   // purple - price
            'rgba(236, 72, 153, 0.8)',   // pink - description
            'rgba(16, 185, 129, 0.8)',   // green - no change
          ],
          borderColor: [
            'rgba(59, 130, 246, 1)',
            'rgba(107, 114, 128, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(139, 92, 246, 1)',
            'rgba(236, 72, 153, 1)',
            'rgba(16, 185, 129, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [analysis.statistics.varianceTypeDistribution]);

  // Risk assessment gauge data
  const riskGaugeData = useMemo(() => {
    const riskScore = analysis.riskAssessment.overallRiskScore;
    return {
      labels: ['Low Risk', 'Medium Risk', 'High Risk', 'Critical Risk'],
      datasets: [
        {
          data: [25, 25, 25, 25],
          backgroundColor: [
            riskScore <= 25 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(229, 231, 235, 0.3)',
            riskScore > 25 && riskScore <= 50 ? 'rgba(245, 158, 11, 0.8)' : 'rgba(229, 231, 235, 0.3)',
            riskScore > 50 && riskScore <= 75 ? 'rgba(249, 115, 22, 0.8)' : 'rgba(229, 231, 235, 0.3)',
            riskScore > 75 ? 'rgba(239, 68, 68, 0.8)' : 'rgba(229, 231, 235, 0.3)',
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(245, 158, 11, 1)',
            'rgba(249, 115, 22, 1)',
            'rgba(239, 68, 68, 1)',
          ],
          borderWidth: 2,
        },
      ],
    };
  }, [analysis.riskAssessment.overallRiskScore]);

  // Chart options
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: 'Variance by Category',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y;
            const percentage = analysis.statistics.categoryVariances[Object.keys(analysis.statistics.categoryVariances)[context.dataIndex] as CostCategory].variancePercent;
            return `${formatCurrency(value)} (${formatPercentage(percentage, 2)})`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => formatCurrency(value),
        },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: 'Change Type Distribution',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = formatDecimal((context.parsed / total) * 100, 1);
            return `${context.label}: ${context.parsed} items (${percentage}%)`;
          },
        },
      },
    },
  };

  const riskGaugeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: `Risk Assessment: ${analysis.riskAssessment.overallRiskScore}/100`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        enabled: false,
      },
    },
    circumference: 180,
    rotation: 270,
    cutout: '60%',
  };

  // Key metrics calculations
  const keyMetrics = useMemo(() => {
    const totalItems = analysis.statistics.itemCount;
    const matchedItems = analysis.reconciliation.matchedItems.length;
    const newItems = analysis.reconciliation.newSupplementItems.length;
    const removedItems = analysis.reconciliation.unmatchedOriginalItems.length;
    const significantVariances = analysis.statistics.highVarianceItems.length;

    return {
      totalItems,
      matchedItems,
      newItems,
      removedItems,
      significantVariances,
      matchingAccuracy: analysis.reconciliation.matchingAccuracy,
      processingTime: analysis.processingTime,
    };
  }, [analysis]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600">Total Items</div>
          <div className="text-2xl font-bold text-slate-900">{keyMetrics.totalItems}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600">Matched</div>
          <div className="text-2xl font-bold text-blue-600">{keyMetrics.matchedItems}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600">New Items</div>
          <div className="text-2xl font-bold text-green-600">{keyMetrics.newItems}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600">Removed</div>
          <div className="text-2xl font-bold text-gray-600">{keyMetrics.removedItems}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600">High Variance</div>
          <div className="text-2xl font-bold text-orange-600">{keyMetrics.significantVariances}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-4 border border-slate-200">
          <div className="text-sm font-medium text-slate-600">Match Rate</div>
          <div className="text-2xl font-bold text-purple-600">
            {formatDecimal(keyMetrics.matchingAccuracy * 100, 1)}%
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Financial Impact Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-sm text-slate-600 mb-1">Total Variance</div>
            <div className={`text-3xl font-bold ${
              analysis.statistics.totalVariance > 0 ? 'text-red-600' : 
              analysis.statistics.totalVariance < 0 ? 'text-green-600' : 'text-gray-600'
            }`}>
              {formatCurrency(analysis.statistics.totalVariance)}
            </div>
            <div className="text-sm text-slate-500">
              {formatPercentage(analysis.statistics.totalVariancePercent, 2)} change
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-slate-600 mb-1">Average Variance</div>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(analysis.statistics.averageVariance)}
            </div>
            <div className="text-sm text-slate-500">
              per item
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm text-slate-600 mb-1">Standard Deviation</div>
            <div className="text-3xl font-bold text-slate-900">
              {formatCurrency(analysis.statistics.standardDeviation)}
            </div>
            <div className="text-sm text-slate-500">
              variance spread
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Variance Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="h-80">
            <Bar data={categoryChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Variance Type Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="h-80">
            <Pie data={varianceTypeChartData} options={pieChartOptions} />
          </div>
        </div>
      </div>

      {/* Risk Assessment and Data Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Assessment Gauge */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <div className="h-64">
            <Pie data={riskGaugeData} options={riskGaugeOptions} />
          </div>
          <div className="mt-4 text-center">
            <div className={`text-lg font-semibold ${
              analysis.riskAssessment.riskLevel === 'critical' ? 'text-red-600' :
              analysis.riskAssessment.riskLevel === 'high' ? 'text-orange-600' :
              analysis.riskAssessment.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {analysis.riskAssessment.riskLevel.toUpperCase()} RISK
            </div>
            <div className="text-sm text-slate-600 mt-1">
              Confidence: {formatDecimal(analysis.riskAssessment.confidenceLevel * 100, 1)}%
            </div>
          </div>
        </div>

        {/* Data Quality Metrics */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Data Quality Assessment</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Completeness</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${analysis.statistics.dataQuality.completeness * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatDecimal(analysis.statistics.dataQuality.completeness * 100, 1)}%
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Consistency</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${analysis.statistics.dataQuality.consistency * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatDecimal(analysis.statistics.dataQuality.consistency * 100, 1)}%
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Accuracy</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${analysis.statistics.dataQuality.accuracy * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatDecimal(analysis.statistics.dataQuality.accuracy * 100, 1)}%
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-600">Precision</span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full" 
                    style={{ width: `${analysis.statistics.dataQuality.precision * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatDecimal(analysis.statistics.dataQuality.precision * 100, 1)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Data Quality Issues */}
          {analysis.statistics.dataQuality.issues.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="text-sm font-medium text-slate-600 mb-2">Issues Detected:</div>
              <div className="space-y-1">
                {analysis.statistics.dataQuality.issues.slice(0, 3).map((issue, index) => (
                  <div key={index} className={`text-xs px-2 py-1 rounded ${
                    issue.severity === SeverityLevel.CRITICAL ? 'bg-red-100 text-red-800' :
                    issue.severity === SeverityLevel.HIGH ? 'bg-orange-100 text-orange-800' :
                    issue.severity === SeverityLevel.MEDIUM ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {issue.description}
                  </div>
                ))}
                {analysis.statistics.dataQuality.issues.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{analysis.statistics.dataQuality.issues.length - 3} more issues
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Processing Performance */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Processing Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-sm text-slate-600">Processing Time</div>
            <div className="text-xl font-bold text-slate-900">
              {formatDecimal(keyMetrics.processingTime / 1000, 2)}s
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-600">Items/Second</div>
            <div className="text-xl font-bold text-slate-900">
              {keyMetrics.processingTime > 0 
                ? formatDecimal(keyMetrics.totalItems / (keyMetrics.processingTime / 1000), 1)
                : 'N/A'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-600">Algorithm</div>
            <div className="text-xl font-bold text-slate-900">
              {analysis.reconciliation.matchingAlgorithmUsed}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-slate-600">Version</div>
            <div className="text-xl font-bold text-slate-900">
              {analysis.version}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticalDashboard;