# Analysis Summary Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Analysis Summary feature in the SupplementGuard application. Follow these steps in order to ensure proper integration with the existing system.

## Prerequisites

- Familiarity with React, TypeScript, and Tailwind CSS
- Understanding of the existing SupplementGuard codebase
- Access to the project repository
- Development environment set up

## Implementation Phases

### Phase 1: Foundation Setup

#### Step 1: Extend Type Definitions

**File**: `types.ts`

Add the following type definitions to the existing `types.ts` file:

```typescript
// Add these interfaces after the existing type definitions

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
```

**Verification**: Ensure TypeScript compilation succeeds after adding these types.

#### Step 2: Create Analysis Summary Service

**File**: `services/analysisSummaryService.ts`

Create a new file with the following implementation:

```typescript
import { 
  ComparisonAnalysis, 
  AnalysisSummaryData, 
  CategorySummary, 
  SummaryLineItem,
  ChangeType,
  VisualIndicator,
  CostCategory,
  ChangeTypeSummary,
  ChangeTypeDetail,
  GrandTotalSummary,
  CategorySubtotal
} from '../types';

export class AnalysisSummaryService {
  private readonly SIGNIFICANCE_THRESHOLD = 10; // 10% change threshold
  private readonly CRITICAL_THRESHOLD = 50; // 50% change threshold

  /**
   * Main method to generate comprehensive summary data
   */
  generateSummaryData(analysis: ComparisonAnalysis): AnalysisSummaryData {
    const startTime = Date.now();
    
    try {
      // Process category breakdowns
      const categoryBreakdown = this.processCategoryBreakdown(analysis);
      
      // Calculate change type summaries
      const changesByType = this.calculateChangesByType(analysis);
      
      // Generate grand total summary
      const grandTotalSummary = this.generateGrandTotalSummary(analysis, changesByType);
      
      // Configure visual indicators
      const visualIndicators = this.getVisualIndicatorConfig();
      
      // Generate metadata
      const metadata = {
        generatedAt: new Date(),
        processingTime: Date.now() - startTime,
        dataQualityScore: analysis.statistics.dataQuality.accuracy,
        completenessScore: analysis.statistics.dataQuality.completeness,
        version: '1.0.0'
      };

      return {
        categoryBreakdown,
        changesByType,
        grandTotalSummary,
        visualIndicators,
        metadata
      };
    } catch (error) {
      throw new Error(`Failed to generate analysis summary: ${error.message}`);
    }
  }

  /**
   * Processes category-specific breakdowns with detailed line items
   */
  private processCategoryBreakdown(analysis: ComparisonAnalysis): CategorySummary[] {
    const categories = Object.values(CostCategory);
    const categoryBreakdowns: CategorySummary[] = [];

    for (const category of categories) {
      const categoryItems = this.getCategoryItems(analysis, category);
      
      if (categoryItems.length === 0) continue;

      const subtotal = this.calculateCategorySubtotal(categoryItems);
      
      categoryBreakdowns.push({
        category,
        categoryName: category,
        categoryDisplayName: this.getCategoryDisplayName(category),
        items: categoryItems,
        subtotal,
        hasChanges: subtotal.netChange !== 0
      });
    }

    // Sort by absolute net change (highest impact first)
    return categoryBreakdowns.sort((a, b) => 
      Math.abs(b.subtotal.netChange) - Math.abs(a.subtotal.netChange)
    );
  }

  /**
   * Extracts and processes items for a specific category
   */
  private getCategoryItems(analysis: ComparisonAnalysis, category: CostCategory): SummaryLineItem[] {
    const items: SummaryLineItem[] = [];

    // Process matched items (changed items)
    for (const match of analysis.reconciliation.matchedItems) {
      if (match.supplement.category === category) {
        const item = this.createSummaryLineItem(
          match.supplement,
          match.original.total,
          match.supplement.total,
          this.determineChangeType(match.original.total, match.supplement.total)
        );
        items.push(item);
      }
    }

    // Process new items
    for (const newItem of analysis.reconciliation.newSupplementItems) {
      if (newItem.category === category) {
        const item = this.createSummaryLineItem(
          newItem,
          null,
          newItem.total,
          'new'
        );
        items.push(item);
      }
    }

    // Process removed items
    for (const removedItem of analysis.reconciliation.unmatchedOriginalItems) {
      if (removedItem.category === category) {
        const item = this.createSummaryLineItem(
          removedItem,
          removedItem.total,
          null,
          'removed'
        );
        items.push(item);
      }
    }

    // Sort by absolute dollar change (highest impact first)
    return items.sort((a, b) => Math.abs(b.dollarChange) - Math.abs(a.dollarChange));
  }

  /**
   * Creates a standardized summary line item
   */
  private createSummaryLineItem(
    item: any,
    originalAmount: number | null,
    supplementAmount: number | null,
    changeType: ChangeType
  ): SummaryLineItem {
    const dollarChange = this.calculateDollarChange(originalAmount, supplementAmount);
    const percentageChange = this.calculatePercentageChange(originalAmount, supplementAmount);
    const significance = this.determineSignificance(percentageChange, Math.abs(dollarChange));
    
    return {
      id: item.id,
      description: item.description,
      category: item.category,
      changeType,
      originalAmount,
      supplementAmount,
      dollarChange,
      percentageChange,
      visualIndicator: this.getVisualIndicator(changeType, dollarChange),
      significance,
      isSignificant: significance === 'high' || significance === 'critical'
    };
  }

  /**
   * Calculates dollar change between original and supplement amounts
   */
  private calculateDollarChange(original: number | null, supplement: number | null): number {
    if (original === null && supplement !== null) return supplement;
    if (original !== null && supplement === null) return -original;
    if (original === null && supplement === null) return 0;
    return supplement! - original!;
  }

  /**
   * Calculates percentage change with proper null handling
   */
  private calculatePercentageChange(original: number | null, supplement: number | null): number | null {
    if (original === null || original === 0) return null;
    if (supplement === null) return -100;
    return ((supplement - original) / original) * 100;
  }

  /**
   * Determines change type based on amounts
   */
  private determineChangeType(original: number, supplement: number): ChangeType {
    if (supplement > original) return 'increase';
    if (supplement < original) return 'decrease';
    return 'unchanged';
  }

  /**
   * Determines significance level based on percentage and dollar amount
   */
  private determineSignificance(percentageChange: number | null, dollarAmount: number): 'low' | 'medium' | 'high' | 'critical' {
    const absPercentage = Math.abs(percentageChange || 0);
    const absDollar = Math.abs(dollarAmount);

    if (absPercentage >= this.CRITICAL_THRESHOLD || absDollar >= 1000) return 'critical';
    if (absPercentage >= this.SIGNIFICANCE_THRESHOLD || absDollar >= 500) return 'high';
    if (absPercentage >= 5 || absDollar >= 100) return 'medium';
    return 'low';
  }

  /**
   * Calculates category subtotals
   */
  private calculateCategorySubtotal(items: SummaryLineItem[]): CategorySubtotal {
    const originalTotal = items.reduce((sum, item) => sum + (item.originalAmount || 0), 0);
    const supplementTotal = items.reduce((sum, item) => sum + (item.supplementAmount || 0), 0);
    const totalIncrease = items.filter(item => item.dollarChange > 0).reduce((sum, item) => sum + item.dollarChange, 0);
    const totalDecrease = Math.abs(items.filter(item => item.dollarChange < 0).reduce((sum, item) => sum + item.dollarChange, 0));
    const netChange = supplementTotal - originalTotal;
    const percentageChange = originalTotal > 0 ? (netChange / originalTotal) * 100 : null;
    const significantItemCount = items.filter(item => item.isSignificant).length;

    return {
      originalTotal,
      supplementTotal,
      totalIncrease,
      totalDecrease,
      netChange,
      percentageChange,
      itemCount: items.length,
      significantItemCount
    };
  }

  /**
   * Calculates change type summaries across all categories
   */
  private calculateChangesByType(analysis: ComparisonAnalysis): ChangeTypeSummary {
    const allItems: SummaryLineItem[] = [];
    
    // Collect all items from all categories
    const categories = Object.values(CostCategory);
    for (const category of categories) {
      const categoryItems = this.getCategoryItems(analysis, category);
      allItems.push(...categoryItems);
    }

    const totalAmount = allItems.reduce((sum, item) => sum + Math.abs(item.dollarChange), 0);

    const calculateDetail = (filterFn: (item: SummaryLineItem) => boolean): ChangeTypeDetail => {
      const filteredItems = allItems.filter(filterFn);
      const amount = filteredItems.reduce((sum, item) => sum + Math.abs(item.dollarChange), 0);
      
      return {
        count: filteredItems.length,
        totalAmount: amount,
        averageAmount: filteredItems.length > 0 ? amount / filteredItems.length : 0,
        percentageOfTotal: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        items: filteredItems.map(item => item.id)
      };
    };

    return {
      increases: calculateDetail(item => item.changeType === 'increase'),
      decreases: calculateDetail(item => item.changeType === 'decrease'),
      additions: calculateDetail(item => item.changeType === 'new'),
      removals: calculateDetail(item => item.changeType === 'removed'),
      unchanged: calculateDetail(item => item.changeType === 'unchanged')
    };
  }

  /**
   * Generates grand total summary with risk indicators
   */
  private generateGrandTotalSummary(analysis: ComparisonAnalysis, changesByType: ChangeTypeSummary): GrandTotalSummary {
    const originalTotal = analysis.statistics.totalVariance + analysis.originalInvoice.total;
    const supplementTotal = analysis.supplementInvoice.total;
    const netChange = analysis.statistics.totalVariance;
    const percentageChange = analysis.statistics.totalVariancePercent;

    // Generate risk indicators based on analysis
    const riskIndicators = this.generateRiskIndicators(analysis, changesByType);

    return {
      originalTotal,
      supplementTotal,
      netChange,
      percentageChange,
      breakdown: changesByType,
      riskIndicators
    };
  }

  /**
   * Generates risk indicators based on analysis data
   */
  private generateRiskIndicators(analysis: ComparisonAnalysis, changesByType: ChangeTypeSummary): any[] {
    const indicators = [];

    // High variance indicator
    if (Math.abs(analysis.statistics.totalVariancePercent) > 25) {
      indicators.push({
        type: 'high_variance',
        severity: Math.abs(analysis.statistics.totalVariancePercent) > 50 ? 'critical' : 'high',
        description: `Total variance of ${analysis.statistics.totalVariancePercent.toFixed(1)}% exceeds normal thresholds`,
        affectedItems: [],
        recommendedAction: 'Detailed review of all changes recommended'
      });
    }

    // Scope creep indicator
    if (changesByType.additions.count > 5) {
      indicators.push({
        type: 'scope_creep',
        severity: changesByType.additions.count > 15 ? 'high' : 'medium',
        description: `${changesByType.additions.count} new items added to supplement`,
        affectedItems: changesByType.additions.items,
        recommendedAction: 'Verify necessity of all new items'
      });
    }

    return indicators;
  }

  /**
   * Gets visual indicator configuration for change types
   */
  private getVisualIndicator(changeType: ChangeType, amount: number): VisualIndicator {
    const indicators = {
      increase: {
        color: '#dc2626',
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        icon: '↗️',
        label: 'Price Increase',
        cssClass: 'change-increase'
      },
      decrease: {
        color: '#16a34a',
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        icon: '↘️',
        label: 'Price Decrease',
        cssClass: 'change-decrease'
      },
      new: {
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        icon: '➕',
        label: 'New Item',
        cssClass: 'change-new'
      },
      removed: {
        color: '#6b7280',
        backgroundColor: '#f9fafb',
        borderColor: '#e5e7eb',
        icon: '➖',
        label: 'Removed Item',
        cssClass: 'change-removed'
      },
      unchanged: {
        color: '#6b7280',
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        icon: '➡️',
        label: 'No Change',
        cssClass: 'change-unchanged'
      }
    };

    return indicators[changeType];
  }

  /**
   * Gets display-friendly category names
   */
  private getCategoryDisplayName(category: CostCategory): string {
    const displayNames = {
      [CostCategory.LABOR]: 'Labor & Services',
      [CostCategory.PARTS]: 'Parts & Components',
      [CostCategory.MATERIALS]: 'Materials & Supplies',
      [CostCategory.EQUIPMENT]: 'Equipment & Tools',
      [CostCategory.OVERHEAD]: 'Overhead & Fees',
      [CostCategory.OTHER]: 'Other Charges'
    };
    return displayNames[category] || category;
  }

  /**
   * Gets visual indicator configuration
   */
  private getVisualIndicatorConfig() {
    return {
      colorScheme: 'default' as const,
      showIcons: true,
      showLabels: true
    };
  }
}

// Export singleton instance
export const analysisSummaryService = new AnalysisSummaryService();
```

**Verification**: Test the service with sample data to ensure it processes correctly.

### Phase 2: UI Component Development

#### Step 3: Create Analysis Summary Component

**File**: `components/AnalysisSummary.tsx`

Create a new file with the following implementation:

```typescript
import React, { useMemo, useState } from 'react';
import { ComparisonAnalysis, AnalysisSummaryData, SummaryLineItem, CategorySummary } from '../types';
import { analysisSummaryService } from '../services/analysisSummaryService';
import { formatCurrency, formatPercentage } from '../utils/formatters';

interface AnalysisSummaryProps {
  analysis: ComparisonAnalysis;
  onItemSelect?: (item: SummaryLineItem) => void;
  showDetailedView?: boolean;
}

export const AnalysisSummary: React.FC<AnalysisSummaryProps> = ({
  analysis,
  onItemSelect,
  showDetailedView = true
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'significant' | 'increases' | 'decreases'>('all');

  // Generate summary data with memoization for performance
  const summaryData: AnalysisSummaryData = useMemo(() => {
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
  }, [analysis]);

  // Filter categories based on selected filter
  const filteredCategories = useMemo(() => {
    return summaryData.categoryBreakdown.filter(category => {
      if (filterType === 'all') return category.hasChanges;
      if (filterType === 'significant') return category.subtotal.significantItemCount > 0;
      if (filterType === 'increases') return category.subtotal.netChange > 0;
      if (filterType === 'decreases') return category.subtotal.netChange < 0;
      return true;
    });
  }, [summaryData.categoryBreakdown, filterType]);

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

  if (summaryData.categoryBreakdown.length === 0) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="flex flex-wrap gap-2 items-center justify-between">
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
```

**Verification**: Test the component with sample data to ensure proper rendering.

#### Step 4: Update ReviewDashboard Component

**File**: `components/ReviewDashboard.tsx`

Add the following modifications to the existing file:

```typescript
// Add import at the top
import AnalysisSummary from './AnalysisSummary';

// Update the tab state type (around line 29)
const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'statistics' | 'summary'>('overview');

// Add helper function for total changes count (around line 115)
const getTotalChangesCount = (analysis: ComparisonAnalysis): number => {
  if (!analysis) return 0;
  return analysis.reconciliation.matchedItems.length + 
         analysis.reconciliation.newSupplementItems.length + 
         analysis.reconciliation.unmatchedOriginalItems.length;
};

// Add new tab button (around line 340, after the statistics tab button)
<button
  onClick={() => setActiveTab('summary')}
  className={getTabButtonClass('summary')}
  disabled={!comparisonAnalysis}
>
  Analysis Summary
  {comparisonAnalysis && (
    <span className="ml-2 bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
      {getTotalChangesCount(comparisonAnalysis)}
    </span>
  )}
</button>

// Add tab content (around line 425, after the statistics tab content)
{activeTab === 'summary' && comparisonAnalysis && (
  <div className="space-y-6">
    <AnalysisSummary
      analysis={comparisonAnalysis}
      onItemSelect={(item) => {
        console.log('Selected item for detailed view:', item);
        // Future: Could open detailed item view or highlight in comparison table
      }}
      showDetailedView={true}
    />
  </div>
)}
```

**Verification**: Test the tab navigation and ensure the Analysis Summary tab appears and functions correctly.

### Phase 3: PDF Integration

#### Step 5: Create PDF Integration Service

**File**: `services/pdfIntegrationService.ts`

Create a new file with the following implementation:

```typescript
import jsPDF from 'jspdf';
import { AnalysisSummaryData, CategorySummary } from '../types';
import { formatCurrency, formatPercentage } from '../utils/formatters';

export class PdfIntegrationService {
  /**
   * Adds Analysis Summary section to any PDF document
   */
  addAnalysisSummarySection(
    doc: jsPDF,
    summaryData: AnalysisSummaryData,
    startY: number,
    pageWidth: number,
    safeZone: number
  ): number {
    let currentY = startY;
    const maxContentWidth = pageWidth - (2 * safeZone);

    // Check if we need a new page
    this.checkPageSpace(doc, currentY, 50, pageWidth, safeZone);

    // Section header
    currentY = this.addSectionHeader(doc, 'Analysis Summary', currentY, safeZone, maxContentWidth);

    // Executive summary
    currentY = this.addExecutiveSummary(doc, summaryData, currentY, safeZone, maxContentWidth, pageWidth);

    // Category breakdowns
    currentY = this.addCategoryBreakdowns(doc, summaryData.categoryBreakdown, currentY, safeZone, maxContentWidth, pageWidth);

    // Grand total summary
    currentY = this.addGrandTotalSummary(doc, summaryData.grandTotalSummary, currentY, safeZone, maxContentWidth, pageWidth);

    return currentY;
  }

  private checkPageSpace(doc: jsPDF, currentY: number, requiredHeight: number, pageWidth: number, safeZone: number): number {
    const pageHeight = doc.internal.pageSize.getHeight();
    const availableSpace = pageHeight - safeZone - currentY;
    
    if (availableSpace < requiredHeight) {
      doc.addPage();
      return safeZone;
    }
    return currentY;
  }

  private addSectionHeader(doc: jsPDF, title: string, y: number, x: number, maxWidth: number): number {
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(title, x, y);
    
    // Add underline
    doc.setDrawColor(200, 200, 200);
    doc.line(x, y + 2, x + maxWidth, y + 2);
    
    return y + 15;
  }

  private addExecutiveSummary(doc: jsPDF, summaryData: AnalysisSummaryData, y: number, x: number, maxWidth: number, pageWidth: number): number {
    y = this.checkPageSpace(doc, y, 40, pageWidth, x);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Executive Summary', x, y);
    y += 10;

    // Summary metrics in a grid
    const metrics = [
      ['Total Change:', formatCurrency(summaryData.grandTotalSummary.netChange)],
      ['Items Added:', summaryData.changesByType.additions.count.toString()],
      ['Items Removed:', summaryData.changesByType.removals.count.toString()],
      ['Price Changes:', (summaryData.changesByType.increases.count + summaryData.changesByType.decreases.count).toString()]
    ];

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    metrics.forEach(([label, value], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const xPos = x + (col * maxWidth / 2);
      const yPos = y + (row * 8);

      doc.setTextColor(102, 102, 102);
      doc.text(label, xPos, yPos);
      doc.setTextColor(51, 51, 51);
      doc.setFont(undefined, 'bold');
      doc.text(value, xPos + 60, yPos);
      doc.setFont(undefined, 'normal');
    });

    return y + 25;
  }

  private addCategoryBreakdowns(doc: jsPDF, categories: CategorySummary[], y: number, x: number, maxWidth: number, pageWidth: number): number {
    y = this.checkPageSpace(doc, y, 30, pageWidth, x);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Category Breakdown', x, y);
    y += 15;

    categories.forEach(category => {
      if (!category.hasChanges) return;

      y = this.checkPageSpace(doc, y, 25, pageWidth, x);

      // Category header
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text(`${category.categoryDisplayName} (${category.subtotal.itemCount} items)`, x, y);
      
      // Category net change
      const netChangeColor = category.subtotal.netChange >= 0 ? [220, 38, 38] : [22, 163, 74];
      doc.setTextColor(netChangeColor[0], netChangeColor[1], netChangeColor[2]);
      doc.text(
        `${category.subtotal.netChange >= 0 ? '+' : ''}${formatCurrency(category.subtotal.netChange)}`,
        x + maxWidth - 60,
        y
      );
      y += 10;

      // Top 5 most significant items
      const significantItems = category.items
        .filter(item => item.isSignificant)
        .slice(0, 5);

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');

      significantItems.forEach(item => {
        y = this.checkPageSpace(doc, y, 8, pageWidth, x);
        
        // Item description (truncated if needed)
        const description = item.description.length > 50 
          ? item.description.substring(0, 47) + '...' 
          : item.description;
        
        doc.setTextColor(51, 51, 51);
        doc.text(`${item.visualIndicator.icon} ${description}`, x + 5, y);
        
        // Change amount
        const changeColor = item.dollarChange >= 0 ? [220, 38, 38] : [22, 163, 74];
        doc.setTextColor(changeColor[0], changeColor[1], changeColor[2]);
        doc.text(
          `${item.dollarChange >= 0 ? '+' : ''}${formatCurrency(item.dollarChange)}`,
          x + maxWidth - 60,
          y
        );
        
        // Percentage change
        if (item.percentageChange !== null) {
          doc.setTextColor(102, 102, 102);
          doc.text(
            `(${formatPercentage(item.percentageChange)})`,
            x + maxWidth - 25,
            y
          );
        }
        
        y += 6;
      });

      // Category subtotal
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(51, 51, 51);
      doc.text('Subtotal:', x + 10, y);
      doc.setTextColor(netChangeColor[0], netChangeColor[1], netChangeColor[2]);
      doc.text(
        `${category.subtotal.netChange >= 0 ? '+' : ''}${formatCurrency(category.subtotal.netChange)}`,
        x + maxWidth - 60,
        y
      );
      
      y += 15;
    });

    return y;
  }

  private addGrandTotalSummary(doc: jsPDF, grandTotal: any, y: number, x: number, maxWidth: number, pageWidth: number): number {
    y = this.checkPageSpace(doc, y, 40, pageWidth, x);
    
    // Add background box
    doc.setFillColor(248, 250, 252);
    doc.rect(x, y - 5, maxWidth, 35, 'F');

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text('Grand Total Summary', x + 5, y + 5);
    y += 15;

    // Three-column layout
    const colWidth = maxWidth / 3;
    
    // Original Total
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text('Original Total:', x + 5, y);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(formatCurrency(grandTotal.originalTotal), x + 5, y + 6);

    // Supplement Total
    doc.setFont(undefined, 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text('Supplement Total:', x + colWidth + 5, y);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(51, 51, 51);
    doc.text(formatCurrency(grandTotal.supplementTotal), x + colWidth + 5, y + 6);

    // Net Change
    doc.setFont(undefined, 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text('Net Change:', x + (colWidth * 2) + 5, y);
    doc.setFont(undefined, 'bold');
    const netChangeColor = grandTotal.netChange >= 0 ? [220, 38, 38] : [22, 163, 74];
    doc.setTextColor(netChangeColor[0], netChangeColor[1], netChangeColor[2]);
    doc.text(
      `${grandTotal.netChange >= 0 ? '+' : ''}${formatCurrency(grandTotal.netChange)}`,
      x + (colWidth * 2) + 5,
      y + 6
    );
    doc.setFont(undefined, 'normal');
    doc.setTextColor(102, 102, 102);
    doc.text(
      `(${formatPercentage(grandTotal.percentageChange)})`,
      x + (colWidth * 2) + 5,
      y + 12
    );

    return y + 25;
  }
}

// Export singleton instance
export const pdfIntegrationService = new PdfIntegrationService();
```

**Verification**: Test the PDF integration service with sample data.

#### Step 6: Update All PDF Services

For each PDF service, add the Analysis Summary integration. Here's the pattern to follow:

**Files to update**:
- `services/pdfService.ts`
- `services/improvedPdfService.ts`
- `services/enhancedPdfService.ts`
- `services/premiumPdfService.ts`

**Add these imports at the top of each file**:
```typescript
import { analysisSummaryService } from './analysisSummaryService';
import { pdfIntegrationService } from './pdfIntegrationService';
import { ComparisonAnalysis } from '../types';
```

**Modify the main generation function in each service**:

For `pdfService.ts`, add this after the existing content (around line 200):
```typescript
// Add Analysis Summary section if comparison analysis is available
// Note: You'll need to pass comparisonAnalysis as a parameter to generatePdfReport
if (comparisonAnalysis) {
  try {
    const summaryData = analysisSummaryService.generateSummaryData(comparisonAnalysis);
    currentY = pdfIntegrationService.addAnalysisSummarySection(
      doc,
      summaryData,
      currentY + 20,
      pageWidth,
      safeZone
    );
  } catch (error) {
    console.error('Error adding analysis summary to PDF:', error);
    // Continue without summary section
  }
}
```

**Update function signatures** to accept `comparisonAnalysis`:
```typescript
// Change from:
export const generatePdfReport = (claimData: ClaimData) => {

// To:
export const generatePdfReport = (claimData: ClaimData, comparisonAnalysis?: ComparisonAnalysis) => {
```

**Verification**: Test PDF generation with the new Analysis Summary section.

### Phase 4: Integration and Testing

#### Step 7: Update ReviewDashboard PDF Export Functions

**File**: `components/ReviewDashboard.tsx`

Update the PDF export functions to pass the comparison analysis:

```typescript
// Update handleExportPdf function (around line 122)
const handleExportPdf = () => {
  generatePdfReport(claimData, comparisonAnalysis);
};

// Update handleExportCsv function (around line 126)
const handleExportCsv = () => {
  generateCsvReport(claimData, comparisonAnalysis);
};
```

**Verification**: Test that PDF exports now include the Analysis Summary section.

#### Step 8: Add Error Handling and Loading States

**File**: `components/AnalysisSummary.tsx`

Add error boundary and loading state handling:

```typescript
// Add loading state to the component props
interface AnalysisSummaryProps {
  analysis: ComparisonAnalysis;
  onItemSelect?: (item: SummaryLineItem) => void;
  showDetailedView?: boolean;
  isLoading?: boolean;
}

// Add loading state handling in the component
if (isLoading) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-3 text-slate-600">Generating analysis summary...</span>
    </div>
  );
}
```

**Verification**: Test error handling and loading states.

#### Step 9: Add Responsive Design Improvements

**File**: `components/AnalysisSummary.tsx`

Ensure responsive design works across all screen sizes:

```typescript
// Update grid classes for better mobile experience
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Update filter controls for mobile
<div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center justify-between">
```

**Verification**: Test on different screen sizes and devices.

#### Step 10: Final Testing and Validation

1. **Unit Tests**: Create test files for each new component and service
2. **Integration Tests**: Test the complete workflow from analysis to PDF generation
3. **Visual Tests**: Verify color coding and visual indicators work correctly
4. **Accessibility Tests**: Ensure WCAG compliance
5. **Performance Tests**: Verify performance with large datasets

## Deployment Checklist

- [ ] All TypeScript compilation errors resolved
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Visual regression tests passing
- [ ] Accessibility audit completed
- [ ] Performance benchmarks met
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified
- [ ] PDF generation tested across all services
- [ ] Error handling tested
- [ ] Loading states tested

## Troubleshooting Common Issues

### Issue: TypeScript compilation errors
**Solution**: Ensure all new types are properly exported and imported

### Issue: Component not rendering
**Solution**: Check that the component is properly imported and the analysis data is available

### Issue: PDF generation fails
**Solution**: Verify that the comparison analysis data is properly passed to PDF services

### Issue: Colors not displaying correctly
**Solution**: Check Tailwind CSS classes and ensure proper color mapping

### Issue: Performance issues with large datasets
**Solution**: Implement virtualization or pagination for large item lists

## Future Enhancements

1. **Export Options**: Add CSV export for Analysis Summary
2. **Interactive Features**: Add drill-down capabilities
3. **Customization**: Allow users to customize thresholds and colors
4. **Advanced Analytics**: Add trend analysis and benchmarking
5. **Real-time Updates**: Add live updates as analysis progresses

This implementation guide provides a complete roadmap for adding the Analysis Summary feature to the SupplementGuard application. Follow each step carefully and test thoroughly to ensure a successful implementation.