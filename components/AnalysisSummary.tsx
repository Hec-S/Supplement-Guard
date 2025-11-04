import React, { useMemo, useState } from 'react';
import { ComparisonAnalysis, AnalysisSummaryData, SummaryLineItem, CategorySummary } from '../types';
import { analysisSummaryService } from '../services/analysisSummaryService';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface AnalysisSummaryProps {
  analysis: ComparisonAnalysis;
  onItemSelect?: (item: SummaryLineItem) => void;
  showDetailedView?: boolean;
  isLoading?: boolean;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  analysis,
  onItemSelect,
  showDetailedView = true,
  isLoading = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'significant' | 'increases' | 'decreases'>('all');

  // Generate summary data with memoization for performance
  const summaryData: AnalysisSummaryData = useMemo(() => {
    if (isLoading) return null;
    
    try {
      return analysisSummaryService.generateSummaryData(analysis);
    } catch (error) {
      console.error('Error generating summary data:', error);
      // Return empty summary data as fallback
      return {
        categoryBreakdown: [],
        changesByType: {
          increases: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
          decreases: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
          additions: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
          removals: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
          unchanged: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] }
        },
        grandTotalSummary: {
          originalTotal: 0,
          supplementTotal: 0,
          netChange: 0,
          percentageChange: 0,
          breakdown: {
            increases: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
            decreases: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
            additions: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
            removals: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] },
            unchanged: { count: 0, totalAmount: 0, averageAmount: 0, percentageOfTotal: 0, items: [] }
          },
          riskIndicators: []
        },
        visualIndicators: {
          colorScheme: 'default',
          showIcons: true,
          showLabels: true
        },
        metadata: {
          generatedAt: new Date(),
          processingTime: 0,
          dataQualityScore: 0,
          completenessScore: 0,
          version: '1.0.0'
        }
      };
    }
  }, [analysis, isLoading]);

  // Filter categories based on selected filter
  const filteredCategories = useMemo(() => {
    if (!summaryData) return [];
    
    return summaryData.categoryBreakdown.filter(category => {
      if (filterType === 'all') return category.hasChanges;
      if (filterType === 'significant') return category.subtotal.significantItemCount > 0;
      if (filterType === 'increases') return category.subtotal.netChange > 0;
      if (filterType === 'decreases') return category.subtotal.netChange < 0;
      return true;
    });
  }, [summaryData?.categoryBreakdown, filterType]);

  const toggleCategoryExpansion = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const handleItemClick = (item: SummaryLineItem) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-slate-600">Generating analysis summary...</span>
      </div>
    );
  }

  if (!summaryData || summaryData.categoryBreakdown.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
        <div className="text-center">
          <div className="text-slate-400 text-lg mb-2">No Changes Detected</div>
          <div className="text-slate-500 text-sm">
            No pricing changes or modifications found in this analysis.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Change"
          value={formatCurrency(summaryData.grandTotalSummary.netChange)}
          subtitle={formatPercentage(summaryData.grandTotalSummary.percentageChange)}
          type={summaryData.grandTotalSummary.netChange >= 0 ? 'increase' : 'decrease'}
        />
        <SummaryCard
          title="Items Added"
          value={summaryData.changesByType.additions.count.toString()}
          subtitle={formatCurrency(summaryData.changesByType.additions.totalAmount)}
          type="new"
        />
        <SummaryCard
          title="Items Removed"
          value={summaryData.changesByType.removals.count.toString()}
          subtitle={formatCurrency(summaryData.changesByType.removals.totalAmount)}
          type="removed"
        />
        <SummaryCard
          title="Price Changes"
          value={(summaryData.changesByType.increases.count + summaryData.changesByType.decreases.count).toString()}
          subtitle={`${summaryData.changesByType.increases.count} up, ${summaryData.changesByType.decreases.count} down`}
          type="unchanged"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <FilterButton
            active={filterType === 'all'}
            onClick={() => setFilterType('all')}
            label="All Changes"
          />
          <FilterButton
            active={filterType === 'significant'}
            onClick={() => setFilterType('significant')}
            label="Significant Only"
          />
          <FilterButton
            active={filterType === 'increases'}
            onClick={() => setFilterType('increases')}
            label="Increases"
          />
          <FilterButton
            active={filterType === 'decreases'}
            onClick={() => setFilterType('decreases')}
            label="Decreases"
          />
        </div>
        <div className="text-sm text-slate-500">
          {filteredCategories.length} categories with changes
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4">
        {filteredCategories.map((category) => (
          <CategoryBreakdownCard
            key={category.category}
            category={category}
            isExpanded={expandedCategories.has(category.category)}
            onToggleExpansion={() => toggleCategoryExpansion(category.category)}
            onItemClick={handleItemClick}
            showDetailedView={showDetailedView}
          />
        ))}
      </div>

      {/* Grand Total Summary */}
      <GrandTotalSummaryCard summary={summaryData.grandTotalSummary} />

      {/* Visual Legend */}
      <VisualLegend />
    </div>
  );
};

// Supporting components
const SummaryCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  type: 'increase' | 'decrease' | 'new' | 'removed' | 'unchanged';
}> = ({ title, value, subtitle, type }) => {
  const getCardStyles = (type: string) => {
    const styles = {
      increase: 'border-red-200 bg-red-50',
      decrease: 'border-green-200 bg-green-50',
      new: 'border-blue-200 bg-blue-50',
      removed: 'border-gray-200 bg-gray-50',
      unchanged: 'border-slate-200 bg-slate-50'
    };
    return styles[type] || styles.unchanged;
  };

  return (
    <div className={`rounded-lg border p-4 ${getCardStyles(type)}`}>
      <div className="text-sm font-medium text-slate-600">{title}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
      <div className="text-sm text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
};

const FilterButton: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
}> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-sm rounded-md transition-colors ${
      active
        ? 'bg-blue-600 text-white'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    {label}
  </button>
);

const CategoryBreakdownCard: React.FC<{
  category: CategorySummary;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  onItemClick: (item: SummaryLineItem) => void;
  showDetailedView: boolean;
}> = ({ category, isExpanded, onToggleExpansion, onItemClick, showDetailedView }) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Category Header */}
      <div
        className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggleExpansion}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getCategoryColor(category.category)}`} />
            <h3 className="font-semibold text-slate-800">{category.categoryDisplayName}</h3>
            <span className="text-sm text-slate-500">({category.subtotal.itemCount} items)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className={`font-semibold ${category.subtotal.netChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {category.subtotal.netChange >= 0 ? '+' : ''}{formatCurrency(category.subtotal.netChange)}
              </div>
              {category.subtotal.percentageChange !== null && (
                <div className="text-sm text-slate-500">
                  {formatPercentage(category.subtotal.percentageChange)}
                </div>
              )}
            </div>
            <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </div>
        </div>
      </div>

      {/* Category Items (Expandable) */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          <div className="p-4 space-y-2">
            {category.items.map((item) => (
              <LineItemRow
                key={item.id}
                item={item}
                onClick={() => onItemClick(item)}
                showDetailedView={showDetailedView}
              />
            ))}
          </div>
          
          {/* Category Subtotal */}
          <div className="bg-slate-50 p-4 border-t border-slate-200">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-slate-700">Category Subtotal:</span>
              <div className="flex gap-4">
                {category.subtotal.totalIncrease > 0 && (
                  <span className="text-red-600">+{formatCurrency(category.subtotal.totalIncrease)}</span>
                )}
                {category.subtotal.totalDecrease > 0 && (
                  <span className="text-green-600">-{formatCurrency(category.subtotal.totalDecrease)}</span>
                )}
                <span className={`font-semibold ${category.subtotal.netChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  Net: {category.subtotal.netChange >= 0 ? '+' : ''}{formatCurrency(category.subtotal.netChange)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LineItemRow: React.FC<{
  item: SummaryLineItem;
  onClick: () => void;
  showDetailedView: boolean;
}> = ({ item, onClick, showDetailedView }) => {
  const getBorderColor = (changeType: string) => {
    const colors = {
      increase: 'border-red-200',
      decrease: 'border-green-200',
      new: 'border-blue-200',
      removed: 'border-gray-200',
      unchanged: 'border-slate-200'
    };
    return colors[changeType] || colors.unchanged;
  };

  const getBackgroundColor = (changeType: string) => {
    const colors = {
      increase: 'bg-red-50',
      decrease: 'bg-green-50',
      new: 'bg-blue-50',
      removed: 'bg-gray-50',
      unchanged: 'bg-white'
    };
    return colors[changeType] || colors.unchanged;
  };

  return (
    <div
      className={`p-3 rounded-md border cursor-pointer hover:shadow-sm transition-all ${
        getBackgroundColor(item.changeType)
      } ${getBorderColor(item.changeType)}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-lg">{item.visualIndicator.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 truncate">{item.description}</div>
            {showDetailedView && (
              <div className="text-sm text-slate-500 mt-1">
                {item.originalAmount !== null && item.supplementAmount !== null && (
                  <>
                    {formatCurrency(item.originalAmount)} → {formatCurrency(item.supplementAmount)}
                  </>
                )}
                {item.originalAmount === null && item.supplementAmount !== null && (
                  <>New: {formatCurrency(item.supplementAmount)}</>
                )}
                {item.originalAmount !== null && item.supplementAmount === null && (
                  <>Removed: {formatCurrency(item.originalAmount)}</>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-semibold ${item.dollarChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {item.dollarChange >= 0 ? '+' : ''}{formatCurrency(item.dollarChange)}
          </div>
          {item.percentageChange !== null && (
            <div className="text-sm text-slate-500">
              {formatPercentage(item.percentageChange)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const GrandTotalSummaryCard: React.FC<{
  summary: any;
}> = ({ summary }) => {
  return (
    <div className="bg-slate-900 text-white rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Grand Total Summary</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-slate-300">Original Total</div>
          <div className="text-xl font-bold">{formatCurrency(summary.originalTotal)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-300">Supplement Total</div>
          <div className="text-xl font-bold">{formatCurrency(summary.supplementTotal)}</div>
        </div>
        <div>
          <div className="text-sm text-slate-300">Net Change</div>
          <div className={`text-xl font-bold ${summary.netChange >= 0 ? 'text-red-400' : 'text-green-400'}`}>
            {summary.netChange >= 0 ? '+' : ''}{formatCurrency(summary.netChange)}
          </div>
          <div className="text-sm text-slate-300">
            ({formatPercentage(summary.percentageChange)})
          </div>
        </div>
      </div>
    </div>
  );
};

const VisualLegend: React.FC = () => {
  const legendItems = [
    { type: 'increase', label: 'Price Increase', icon: '↗️', color: 'text-red-600' },
    { type: 'decrease', label: 'Price Decrease', icon: '↘️', color: 'text-green-600' },
    { type: 'new', label: 'New Item', icon: '➕', color: 'text-blue-600' },
    { type: 'removed', label: 'Removed Item', icon: '➖', color: 'text-gray-600' }
  ];

  return (
    <div className="bg-slate-50 rounded-lg p-4">
      <h4 className="font-medium text-slate-700 mb-3">Legend</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center gap-2">
            <span className="text-lg">{item.icon}</span>
            <span className={`text-sm ${item.color}`}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Utility functions
const getCategoryColor = (category: string): string => {
  const colors = {
    labor: 'bg-blue-500',
    parts: 'bg-green-500',
    materials: 'bg-yellow-500',
    equipment: 'bg-purple-500',
    overhead: 'bg-orange-500',
    other: 'bg-gray-500'
  };
  return colors[category] || colors.other;
};

export default AnalysisSummary;