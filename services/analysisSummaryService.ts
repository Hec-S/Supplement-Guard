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
    const originalTotal = analysis.originalInvoice.total;
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