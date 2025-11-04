import React, { useState, useMemo } from 'react';
import {
  ComparisonAnalysis,
  EnhancedInvoiceLineItem,
  MatchedItemPair,
  VarianceType,
  CostCategory,
  SeverityLevel
} from '../types';
import {
  formatCurrency,
  formatPercentage,
  formatVariance,
  formatDecimal,
  formatVarianceDisplay
} from '../utils/formatters';

interface EnhancedComparisonTableProps {
  analysis: ComparisonAnalysis;
  onItemSelect?: (itemId: string) => void;
  viewMode?: 'table' | 'line-by-line';
  showViewToggle?: boolean;
}

interface FilterOptions {
  category: CostCategory | 'all';
  varianceType: VarianceType | 'all';
  severityLevel: SeverityLevel | 'all';
  showOnlySignificant: boolean;
}

interface SortOptions {
  field: 'description' | 'category' | 'variance' | 'percentage';
  direction: 'asc' | 'desc';
}

interface ItemDisplayData {
  type: 'matched' | 'new' | 'removed';
  original?: EnhancedInvoiceLineItem;
  supplement: EnhancedInvoiceLineItem;
  matchedPair?: MatchedItemPair;
}

// Remove local formatting functions - now using centralized utilities

const EnhancedComparisonTable: React.FC<EnhancedComparisonTableProps> = ({
  analysis,
  onItemSelect,
  viewMode: initialViewMode = 'table',
  showViewToggle = true
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    varianceType: 'all',
    severityLevel: 'all',
    showOnlySignificant: false
  });

  const [sort, setSort] = useState<SortOptions>({
    field: 'variance',
    direction: 'desc'
  });

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'table' | 'line-by-line'>(initialViewMode);

  // Combine all items for display
  const allItems = useMemo(() => {
    const items: ItemDisplayData[] = [];

    // Add matched items
    analysis.reconciliation.matchedItems.forEach(match => {
      items.push({
        type: 'matched',
        original: match.original,
        supplement: match.supplement,
        matchedPair: match
      });
    });

    // Add new items
    analysis.reconciliation.newSupplementItems.forEach(item => {
      items.push({
        type: 'new',
        supplement: item
      });
    });

    // Add removed items
    analysis.reconciliation.unmatchedOriginalItems.forEach(item => {
      items.push({
        type: 'removed',
        supplement: item // Display as supplement for consistency
      });
    });

    return items;
  }, [analysis]);

  // Apply filters and sorting
  const filteredAndSortedItems = useMemo(() => {
    let filtered = allItems.filter(item => {
      // Category filter
      if (filters.category !== 'all' && item.supplement.category !== filters.category) {
        return false;
      }

      // Variance type filter
      if (filters.varianceType !== 'all' && item.supplement.varianceType !== filters.varianceType) {
        return false;
      }

      // Severity level filter (based on variance significance)
      if (filters.severityLevel !== 'all') {
        const riskLevel = item.matchedPair?.varianceAnalysis.riskLevel || SeverityLevel.LOW;
        if (riskLevel !== filters.severityLevel) {
          return false;
        }
      }

      // Show only significant variances
      if (filters.showOnlySignificant && !item.supplement.hasSignificantVariance) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'description':
          aValue = a.supplement.description.toLowerCase();
          bValue = b.supplement.description.toLowerCase();
          break;
        case 'category':
          aValue = a.supplement.category;
          bValue = b.supplement.category;
          break;
        case 'variance':
          aValue = Math.abs(a.supplement.totalVariance);
          bValue = Math.abs(b.supplement.totalVariance);
          break;
        case 'percentage':
          aValue = Math.abs(a.supplement.totalChangePercent || 0);
          bValue = Math.abs(b.supplement.totalChangePercent || 0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allItems, filters, sort]);

  // Group items by category for line-by-line view
  const itemsByCategory = useMemo(() => {
    const grouped = new Map<CostCategory, ItemDisplayData[]>();
    
    filteredAndSortedItems.forEach(item => {
      const category = item.supplement.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(item);
    });
    
    return grouped;
  }, [filteredAndSortedItems]);

  const handleSort = (field: SortOptions['field']) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getVarianceColorClass = (item: EnhancedInvoiceLineItem, type: 'matched' | 'new' | 'removed') => {
    if (type === 'new') return 'bg-blue-50 border-l-4 border-blue-500';
    if (type === 'removed') return 'bg-gray-50 border-l-4 border-gray-500';
    
    const variance = item.totalChangePercent;
    if (variance === null || variance === 0) return 'bg-white';
    
    if (variance > 0) {
      // Increases (red spectrum)
      if (Math.abs(variance) > 20) return 'bg-red-100 border-l-4 border-red-600';
      if (Math.abs(variance) > 10) return 'bg-red-50 border-l-4 border-red-400';
      return 'bg-red-25 border-l-4 border-red-300';
    } else {
      // Decreases (green spectrum)
      if (Math.abs(variance) > 20) return 'bg-green-100 border-l-4 border-green-600';
      if (Math.abs(variance) > 10) return 'bg-green-50 border-l-4 border-green-400';
      return 'bg-green-25 border-l-4 border-green-300';
    }
  };

  const getVarianceIcon = (varianceType: VarianceType) => {
    switch (varianceType) {
      case VarianceType.NEW_ITEM:
        return <span className="text-blue-600 font-bold">+</span>;
      case VarianceType.REMOVED_ITEM:
        return <span className="text-gray-600 font-bold">-</span>;
      case VarianceType.QUANTITY_CHANGE:
        return <span className="text-orange-600 font-bold">Q</span>;
      case VarianceType.PRICE_CHANGE:
        return <span className="text-purple-600 font-bold">P</span>;
      case VarianceType.DESCRIPTION_CHANGE:
        return <span className="text-indigo-600 font-bold">D</span>;
      default:
        return <span className="text-gray-400 font-bold">-</span>;
    }
  };

  const getCategoryBadgeColor = (category: CostCategory) => {
    const colors = {
      [CostCategory.LABOR]: 'bg-blue-100 text-blue-800',
      [CostCategory.PARTS]: 'bg-green-100 text-green-800',
      [CostCategory.MATERIALS]: 'bg-yellow-100 text-yellow-800',
      [CostCategory.EQUIPMENT]: 'bg-purple-100 text-purple-800',
      [CostCategory.OVERHEAD]: 'bg-gray-100 text-gray-800',
      [CostCategory.OTHER]: 'bg-pink-100 text-pink-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  // Use centralized formatting utilities

  // Render variance indicator for line-by-line view
  const renderVarianceIndicator = (item: ItemDisplayData) => {
    if (item.type === 'new') {
      return (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-red-600 font-bold text-lg">+</span>
          <span className="text-red-600 font-semibold">{formatCurrency(item.supplement.total)}</span>
          <span className="text-slate-400">|</span>
          <span className="font-bold text-slate-800 bg-blue-100 px-2 py-1 rounded text-xs">NEW</span>
        </div>
      );
    }
    
    if (item.type === 'removed') {
      return (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-600 font-bold text-lg">-</span>
          <span className="text-gray-600 font-semibold">{formatCurrency(item.supplement.total)}</span>
          <span className="text-slate-400">|</span>
          <span className="font-bold text-slate-800 bg-gray-100 px-2 py-1 rounded text-xs">REMOVED</span>
        </div>
      );
    }
    
    if (item.original && item.supplement.totalVariance !== 0) {
      const isIncrease = item.supplement.totalVariance > 0;
      const colorClass = isIncrease ? 'text-red-600' : 'text-green-600';
      const symbol = isIncrease ? '+' : '-';
      
      return (
        <div className="flex items-center space-x-2 text-sm">
          <span className={`font-bold text-lg ${colorClass}`}>{symbol}</span>
          <span className={`font-semibold ${colorClass}`}>
            {formatCurrency(Math.abs(item.supplement.totalVariance))}
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">{formatCurrency(item.original.total)}</span>
          <span className="text-slate-400">→</span>
          <span className="text-slate-600">{formatCurrency(item.supplement.total)}</span>
          <span className="text-slate-400">|</span>
          <span className="font-bold text-slate-800 bg-orange-100 px-2 py-1 rounded text-xs">CHANGED</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-slate-400">No change</span>
      </div>
    );
  };

  // Render individual line item for line-by-line view with enhanced typography
  const renderLineItem = (item: ItemDisplayData) => {
    const isNew = item.type === 'new';
    
    return (
      <div key={item.supplement.id} className="group hover:bg-slate-50 rounded-lg p-3 border border-transparent hover:border-slate-200 transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          {/* Line item name and details */}
          <div className="flex-1 min-w-0">
            <div className={`font-medium text-sm leading-tight ${isNew ? 'text-red-600' : 'text-slate-800'}`}>
              {item.supplement.description}
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span>Qty: {formatDecimal(item.supplement.quantity)}</span>
              <span>•</span>
              <span>Unit: {formatCurrency(item.supplement.price)}</span>
              {item.supplement.hasSignificantVariance && (
                <>
                  <span>•</span>
                  <span className="text-orange-600 font-medium">⚠ Significant</span>
                </>
              )}
            </div>
          </div>
          
          {/* Variance display */}
          <div className="flex-shrink-0">
            {renderVarianceIndicator(item)}
          </div>
        </div>
      </div>
    );
  };

  // Render line-by-line analysis view with collapsible sections
  const renderLineByLineAnalysis = () => {
    const categoryEntries = Array.from(itemsByCategory.entries()) as [CostCategory, ItemDisplayData[]][];
    const [collapsedSections, setCollapsedSections] = useState<Set<CostCategory>>(new Set());
    
    const toggleSection = (category: CostCategory) => {
      setCollapsedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(category)) {
          newSet.delete(category);
        } else {
          newSet.add(category);
        }
        return newSet;
      });
    };
    
    return (
      <div className="space-y-4">
        {categoryEntries.map(([category, items]) => {
          const isCollapsed = collapsedSections.has(category);
          const categoryTotal = items.reduce((sum, item) => sum + item.supplement.totalVariance, 0);
          
          return (
            <div key={category} className="bg-white rounded-lg border border-slate-200 shadow-sm">
              {/* Collapsible Header */}
              <button
                onClick={() => toggleSection(category)}
                className="w-full p-4 text-left hover:bg-slate-50 transition-colors rounded-t-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getCategoryBadgeColor(category)}`}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                    <span className="text-slate-600 text-sm">
                      {items.length} item{items.length !== 1 ? 's' : ''}
                    </span>
                    {categoryTotal !== 0 && (
                      <span className={`text-sm font-semibold ${
                        categoryTotal > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(categoryTotal)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {isCollapsed ? 'Show' : 'Hide'}
                    </span>
                    <span className={`text-slate-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                      ▼
                    </span>
                  </div>
                </div>
              </button>
              
              {/* Collapsible Content */}
              {!isCollapsed && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="space-y-2 mt-3">
                    {items.map(item => renderLineItem(item))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {itemsByCategory.size === 0 && (
          <div className="text-center py-12 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
            <div className="text-slate-400 text-lg mb-2">No items to display</div>
            <div className="text-slate-500 text-sm">Try adjusting your filters to see more items.</div>
          </div>
        )}
      </div>
    );
  };

  // View toggle component
  const ViewToggle = () => (
    <div className="flex bg-slate-100 rounded-lg p-1">
      <button
        onClick={() => setViewMode('table')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'table'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Table View
      </button>
      <button
        onClick={() => setViewMode('line-by-line')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'line-by-line'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Line-by-Line Analysis
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Optimized Header and Controls */}
      <div className="p-4 sm:p-6 border-b border-slate-200">
        <div className="flex flex-col space-y-4">
          {/* Title and View Toggle */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Enhanced Comparison Analysis</h3>
              <p className="text-sm text-slate-600 mt-1">
                {filteredAndSortedItems.length} of {allItems.length} items displayed
              </p>
            </div>
            {showViewToggle && <ViewToggle />}
          </div>
          
          {/* Compact Summary Metrics */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-600">Total Variance:</span>
              <span className={`font-semibold ${
                analysis.statistics.totalVariance > 0 ? 'text-red-600' :
                analysis.statistics.totalVariance < 0 ? 'text-green-600' : 'text-slate-600'
              }`}>
                {formatCurrency(analysis.statistics.totalVariance)}
              </span>
              <span className="text-slate-500">
                ({formatPercentage(analysis.statistics.totalVariancePercent)})
              </span>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-600">Risk Score:</span>
              <span className={`font-semibold ${
                analysis.riskAssessment.overallRiskScore > 75 ? 'text-red-600' :
                analysis.riskAssessment.overallRiskScore > 50 ? 'text-orange-600' :
                analysis.riskAssessment.overallRiskScore > 25 ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {analysis.riskAssessment.overallRiskScore}/100
              </span>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
              <span className="text-slate-600">Match Accuracy:</span>
              <span className="font-semibold text-blue-600">
                {(analysis.reconciliation.matchingAccuracy * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          
          {/* Filter Controls */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              {Object.values(CostCategory).map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filters.varianceType}
              onChange={(e) => setFilters(prev => ({ ...prev, varianceType: e.target.value as any }))}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Changes</option>
              <option value={VarianceType.NEW_ITEM}>New Items</option>
              <option value={VarianceType.REMOVED_ITEM}>Removed Items</option>
              <option value={VarianceType.QUANTITY_CHANGE}>Quantity Changes</option>
              <option value={VarianceType.PRICE_CHANGE}>Price Changes</option>
              <option value={VarianceType.NO_CHANGE}>No Changes</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.showOnlySignificant}
                onChange={(e) => setFilters(prev => ({ ...prev, showOnlySignificant: e.target.checked }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Significant Only
            </label>
          </div>
        </div>
      </div>

      {/* Conditional Content Based on View Mode */}
      {viewMode === 'table' ? (
        /* Enhanced Table View with Improved Spacing */
        <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="w-1/3 px-3 sm:px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('description')}
                  className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                >
                  Description
                  {sort.field === 'description' && (
                    <span className="text-blue-600 text-sm">
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="w-20 px-2 sm:px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('category')}
                  className="flex items-center gap-1 hover:text-slate-700 transition-colors"
                >
                  <span className="hidden sm:inline">Category</span>
                  <span className="sm:hidden">Cat</span>
                  {sort.field === 'category' && (
                    <span className="text-blue-600 text-sm">
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="w-24 px-2 sm:px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="hidden sm:inline">Original</span>
                <span className="sm:hidden">Orig</span>
              </th>
              <th className="w-24 px-2 sm:px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="hidden sm:inline">Supplement</span>
                <span className="sm:hidden">Supp</span>
              </th>
              <th className="w-24 px-2 sm:px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('variance')}
                  className="flex items-center justify-center gap-1 hover:text-slate-700 transition-colors w-full"
                >
                  <span className="hidden sm:inline">Variance</span>
                  <span className="sm:hidden">Var</span>
                  {sort.field === 'variance' && (
                    <span className="text-blue-600 text-sm">
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="w-20 px-2 sm:px-3 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSort('percentage')}
                  className="flex items-center justify-center gap-1 hover:text-slate-700 transition-colors w-full"
                >
                  <span className="hidden sm:inline">Change %</span>
                  <span className="sm:hidden">%</span>
                  {sort.field === 'percentage' && (
                    <span className="text-blue-600 text-sm">
                      {sort.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th className="w-16 px-2 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                <span className="sr-only sm:not-sr-only">Actions</span>
                <span className="sm:hidden">•••</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filteredAndSortedItems.map((item, index) => {
              const isExpanded = expandedItems.has(item.supplement.id);
              const colorClass = getVarianceColorClass(item.supplement, item.type);
              
              return (
                <React.Fragment key={item.supplement.id}>
                  <tr className={`${colorClass} hover:bg-slate-50 transition-colors`}>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {getVarianceIcon(item.supplement.varianceType)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900 text-sm leading-tight truncate">
                            {item.supplement.description}
                          </div>
                          {item.supplement.hasSignificantVariance && (
                            <div className="text-xs text-orange-600 font-medium mt-1">
                              ⚠ Significant Variance
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(item.supplement.category)} truncate`}>
                        <span className="hidden sm:inline">{item.supplement.category}</span>
                        <span className="sm:hidden">{item.supplement.category.charAt(0).toUpperCase()}</span>
                      </span>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm">
                      {item.original ? (
                        <div className="space-y-1">
                          <div className="text-slate-600">Q: {formatDecimal(item.original.quantity)}</div>
                          <div className="text-slate-600 hidden sm:block">{formatCurrency(item.original.price)}</div>
                          <div className="font-semibold text-slate-900">{formatCurrency(item.original.total)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm">
                      <div className="space-y-1">
                        <div className="text-slate-600">Q: {formatDecimal(item.supplement.quantity)}</div>
                        <div className="text-slate-600 hidden sm:block">{formatCurrency(item.supplement.price)}</div>
                        <div className="font-semibold text-slate-900">{formatCurrency(item.supplement.total)}</div>
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm">
                      <div className={`font-semibold ${
                        item.supplement.totalVariance > 0 ? 'text-red-600' :
                        item.supplement.totalVariance < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {item.supplement.totalVariance !== 0 ? formatVariance(item.supplement.totalVariance, true) : '-'}
                      </div>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-center text-xs sm:text-sm">
                      <div className={`font-semibold ${
                        (item.supplement.totalChangePercent || 0) > 0 ? 'text-red-600' :
                        (item.supplement.totalChangePercent || 0) < 0 ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {formatPercentage(item.supplement.totalChangePercent)}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => toggleItemExpansion(item.supplement.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium transition-colors"
                      >
                        <span className="hidden sm:inline">{isExpanded ? 'Less' : 'More'}</span>
                        <span className="sm:hidden">{isExpanded ? '−' : '+'}</span>
                      </button>
                    </td>
                  </tr>
                  
                  {/* Expanded Details */}
                  {isExpanded && (
                    <tr className={`${colorClass} border-t border-slate-100`}>
                      <td colSpan={7} className="px-4 py-4">
                        <div className="bg-white rounded-lg p-4 border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Matching Information */}
                            {item.matchedPair && (
                              <div>
                                <h4 className="font-semibold text-slate-800 mb-2">Matching Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div>Confidence: {(item.matchedPair.matchingScore * 100).toFixed(1)}%</div>
                                  <div>Algorithm: {analysis.reconciliation.matchingAlgorithmUsed}</div>
                                  <div>Risk Level: <span className={`font-medium ${
                                    item.matchedPair.varianceAnalysis.riskLevel === SeverityLevel.CRITICAL ? 'text-red-600' :
                                    item.matchedPair.varianceAnalysis.riskLevel === SeverityLevel.HIGH ? 'text-orange-600' :
                                    item.matchedPair.varianceAnalysis.riskLevel === SeverityLevel.MEDIUM ? 'text-yellow-600' : 'text-green-600'
                                  }`}>{item.matchedPair.varianceAnalysis.riskLevel}</span></div>
                                </div>
                              </div>
                            )}
                            
                            {/* Variance Breakdown */}
                            {item.matchedPair && (
                              <div>
                                <h4 className="font-semibold text-slate-800 mb-2">Variance Breakdown</h4>
                                <div className="space-y-1 text-sm">
                                  <div>Quantity: {formatVarianceDisplay(item.supplement.quantityVariance, 'number')} ({formatVarianceDisplay(item.supplement.quantityChangePercent, 'percentage')})</div>
                                  <div>Price: {formatVarianceDisplay(item.supplement.priceVariance, 'currency')} ({formatVarianceDisplay(item.supplement.priceChangePercent, 'percentage')})</div>
                                  <div>Total: {formatVarianceDisplay(item.supplement.totalVariance, 'currency')} ({formatVarianceDisplay(item.supplement.totalChangePercent, 'percentage')})</div>
                                </div>
                              </div>
                            )}
                            
                            {/* Additional Information */}
                            <div>
                              <h4 className="font-semibold text-slate-800 mb-2">Additional Info</h4>
                              <div className="space-y-1 text-sm">
                                <div>Category Confidence: {(item.supplement.categoryConfidence * 100).toFixed(1)}%</div>
                                <div>Last Modified: {item.supplement.lastModified.toLocaleDateString()}</div>
                                {item.supplement.requiresReview && (
                                  <div className="text-orange-600 font-medium">⚠ Requires Review</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        
        {/* Empty State for Table View */}
        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-12">
            <div className="text-slate-400 text-lg mb-2">No items match the current filters</div>
            <button
              onClick={() => setFilters({
                category: 'all',
                varianceType: 'all',
                severityLevel: 'all',
                showOnlySignificant: false
              })}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
        </div>
      ) : (
        /* Line-by-Line Analysis View */
        <div className="p-6">
          {renderLineByLineAnalysis()}
        </div>
      )}
    </div>
  );
};

export default EnhancedComparisonTable;