import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceLineItem, ChargeType, ChargeClassificationResult } from '../types';
import {
  formatCurrency,
  formatPercentage,
  formatDecimal
} from '../utils/formatters';
import { classifyCharge } from '../services/chargeClassificationService';

interface InvoiceViewerProps {
  originalInvoice: Invoice;
  supplementInvoice: Invoice;
  summary: string;
}

interface LineItemComparison {
  id: string;
  description: string;
  original?: InvoiceLineItem;
  supplement: InvoiceLineItem;
  type: 'new' | 'changed' | 'unchanged' | 'removed';
  quantityVariance: number;
  priceVariance: number;
  totalVariance: number;
  percentageChange: number | null;
  classification?: ChargeClassificationResult;
}

// Simplified charge type styling configuration for display
const CHARGE_TYPE_STYLES: Record<ChargeType, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  icon: string;
}> = {
  [ChargeType.PART_WITH_LABOR]: {
    label: 'Part + Labor Charge',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: '🔧'
  },
  [ChargeType.LABOR_ONLY]: {
    label: 'Labor Only Charge',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: '⚙️'
  },
  [ChargeType.MATERIAL]: {
    label: 'Mechanical Charge',
    color: 'purple',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    icon: '🔩'
  },
  [ChargeType.SUBLET]: {
    label: 'Part Only Charge',
    color: 'orange',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    icon: '📦'
  },
  [ChargeType.MISCELLANEOUS]: {
    label: 'Mechanical Charge',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: '🔩'
  },
  [ChargeType.UNKNOWN]: {
    label: 'Part Only Charge',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: '📦'
  }
};

// Charge Type Badge Component
const ChargeTypeBadge: React.FC<{ type: ChargeType; confidence?: number }> = ({ type, confidence }) => {
  const style = CHARGE_TYPE_STYLES[type];
  
  return (
    <div className="flex items-center gap-1">
      <span className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold
        ${style.bgColor} ${style.textColor} border border-${style.color}-300
      `}>
        <span>{style.icon}</span>
        <span>{style.label}</span>
      </span>
      {confidence !== undefined && confidence < 0.7 && (
        <span className="text-xs text-yellow-600" title={`Confidence: ${(confidence * 100).toFixed(0)}%`}>
          ⚠️
        </span>
      )}
    </div>
  );
};

const ChangeIndicator: React.FC<{ value: number, isCurrency: boolean }> = ({ value, isCurrency }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const color = isPositive ? 'text-red-600' : 'text-green-600';
    const prefix = isPositive ? '+' : '';
    const displayValue = isCurrency ? formatCurrency(value) : value;

    return <span className={`ml-2 text-xs font-bold ${color}`}>({prefix}{displayValue})</span>;
};

// Enhanced variance indicator for line-by-line analysis
const VarianceIndicator: React.FC<{ comparison: LineItemComparison }> = ({ comparison }) => {
  if (comparison.type === 'new') {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-red-600 font-bold text-lg">+</span>
        <span className="text-red-600 font-semibold">{formatCurrency(comparison.supplement.total)}</span>
        <span className="text-slate-400">|</span>
        <span className="font-bold text-white bg-blue-600 px-2 py-1 rounded text-xs">NEW</span>
      </div>
    );
  }
  
  if (comparison.type === 'removed') {
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className="text-gray-600 font-bold text-lg">-</span>
        <span className="text-gray-600 font-semibold">{formatCurrency(comparison.original?.total || 0)}</span>
        <span className="text-slate-400">|</span>
        <span className="font-bold text-white bg-gray-600 px-2 py-1 rounded text-xs">REMOVED</span>
      </div>
    );
  }
  
  if (comparison.type === 'changed' && comparison.totalVariance !== 0) {
    const isIncrease = comparison.totalVariance > 0;
    const colorClass = isIncrease ? 'text-red-600' : 'text-green-600';
    const symbol = isIncrease ? '+' : '-';
    
    return (
      <div className="flex items-center space-x-2 text-sm">
        <span className={`font-bold text-lg ${colorClass}`}>{symbol}</span>
        <span className={`font-semibold ${colorClass}`}>
          {formatCurrency(Math.abs(comparison.totalVariance))}
        </span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600">{formatCurrency(comparison.original?.total || 0)}</span>
        <span className="text-slate-400">→</span>
        <span className="text-slate-600">{formatCurrency(comparison.supplement.total)}</span>
        <span className="text-slate-400">|</span>
        <span className="font-bold text-white bg-orange-600 px-2 py-1 rounded text-xs">CHANGED</span>
        {comparison.percentageChange !== null && (
          <span className={`text-xs ${colorClass}`}>
            ({formatPercentage(comparison.percentageChange)})
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-slate-400">No change</span>
    </div>
  );
};

// Enhanced comparison table with proper overflow handling and statistical data
const EnhancedComparisonTable: React.FC<{
  comparisons: LineItemComparison[],
  viewMode: 'side-by-side' | 'line-by-line',
  originalInvoice: Invoice,
  supplementInvoice: Invoice,
  chargeSummary: Record<ChargeType, { count: number; total: number; partCost: number; laborCost: number }>
}> = ({ comparisons, viewMode, originalInvoice, supplementInvoice, chargeSummary }) => {
  
  const totalVariance = supplementInvoice.total - originalInvoice.total;
  const totalVariancePercent = ((totalVariance / originalInvoice.total) * 100);
  
  if (viewMode === 'line-by-line') {
    return (
      <div className="space-y-4">
        {/* Summary Statistics */}
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-800">{comparisons.length}</div>
              <div className="text-sm text-slate-600">Total Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{comparisons.filter(c => c.type === 'new').length}</div>
              <div className="text-sm text-slate-600">New Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{comparisons.filter(c => c.type === 'changed').length}</div>
              <div className="text-sm text-slate-600">Changed Items</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-600' : totalVariance < 0 ? 'text-green-600' : 'text-slate-600'}`}>
                {formatCurrency(totalVariance)}
              </div>
              <div className="text-sm text-slate-600">Total Variance ({formatPercentage(totalVariancePercent)})</div>
            </div>
          </div>
        </div>

        {/* Line-by-Line Analysis */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-lg font-semibold text-slate-800">Line-by-Line Analysis</h4>
            <p className="text-sm text-slate-600 mt-1">Detailed comparison with variance indicators</p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-2 p-4">
              {/* Sort comparisons by type: new first, then changed, then unchanged */}
              {[...comparisons].sort((a, b) => {
                // Define type priority: new = 1, changed = 2, unchanged/removed = 3
                const getTypePriority = (comp: LineItemComparison) => {
                  if (comp.type === 'new') return 1;
                  if (comp.type === 'changed') return 2;
                  return 3;
                };
                
                return getTypePriority(a) - getTypePriority(b);
              }).map((comparison) => (
                <div key={comparison.id} className="group hover:bg-slate-50 rounded-lg p-4 border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex flex-col gap-3">
                    {/* Header Row with Description and Charge Type */}
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium text-sm leading-tight ${
                          comparison.type === 'new' ? 'text-red-600' : 'text-slate-800'
                        }`}>
                          {comparison.description}
                        </div>
                      </div>
                      {comparison.classification && (
                        <div className="flex-shrink-0">
                          <ChargeTypeBadge
                            type={comparison.classification.chargeType}
                            confidence={comparison.classification.confidence}
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Cost Breakdown Row */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Qty: {comparison.supplement.quantity}</span>
                      <span>•</span>
                      <span>Unit: {formatCurrency(comparison.supplement.price)}</span>
                      {comparison.classification?.costBreakdown && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600">Part: {formatCurrency(comparison.classification.costBreakdown.partCost)}</span>
                          <span>•</span>
                          <span className="text-green-600 font-semibold">
                            Labor: {formatCurrency(comparison.classification.costBreakdown.laborCost)}
                            {!comparison.classification.costBreakdown.isValidated && comparison.supplement.total === 0 && (
                              <span className="text-xs text-orange-600 ml-1" title="Calculated from labor hours × rate">*</span>
                            )}
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="font-semibold">Total: {formatCurrency(comparison.supplement.total)}</span>
                    </div>
                    
                    {/* Variance Display */}
                    <div className="flex-shrink-0">
                      <VarianceIndicator comparison={comparison} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Side-by-side view with enhanced table structure
  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-slate-800">{comparisons.length}</div>
            <div className="text-sm text-slate-600">Total Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{comparisons.filter(c => c.type === 'new').length}</div>
            <div className="text-sm text-slate-600">New Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{comparisons.filter(c => c.type === 'changed').length}</div>
            <div className="text-sm text-slate-600">Changed Items</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${totalVariance > 0 ? 'text-red-600' : totalVariance < 0 ? 'text-green-600' : 'text-slate-600'}`}>
              {formatCurrency(totalVariance)}
            </div>
            <div className="text-sm text-slate-600">Total Variance ({formatPercentage(totalVariancePercent)})</div>
          </div>
        </div>
      </div>

      {/* Charge Type Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h4 className="text-md font-semibold text-slate-800 mb-3">Breakdown by Charge Type</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.entries(chargeSummary) as [ChargeType, { count: number; total: number; partCost: number; laborCost: number }][]).map(([chargeType, data]) => {
            if (data.count === 0) return null;
            const style = CHARGE_TYPE_STYLES[chargeType];
            return (
              <div key={chargeType} className={`${style.bgColor} rounded-lg p-3 border border-${style.color}-300`}>
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-lg">{style.icon}</span>
                  <span className={`text-xs font-semibold ${style.textColor}`}>{style.label}</span>
                </div>
                <div className="text-lg font-bold text-slate-900">{formatCurrency(data.total)}</div>
                <div className="text-xs text-slate-600">{data.count} item{data.count !== 1 ? 's' : ''}</div>
                {data.partCost > 0 && (
                  <div className="text-xs text-blue-600 mt-1">Parts: {formatCurrency(data.partCost)}</div>
                )}
                {data.laborCost > 0 && (
                  <div className="text-xs text-green-600">Labor: {formatCurrency(data.laborCost)}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side-by-Side Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Original Invoice Table */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-lg font-semibold text-slate-700">Original Repair Estimate</h4>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-center">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {originalInvoice.lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="font-semibold text-slate-800 bg-slate-50 sticky bottom-0">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right">Subtotal</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(originalInvoice.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right">Tax</td>
                  <td className="px-4 py-2 text-right">{formatCurrency(originalInvoice.tax)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-base">Total</td>
                  <td className="px-4 py-2 text-right text-base">{formatCurrency(originalInvoice.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Repair Changes Summary - Simplified to show only changes */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-lg font-semibold text-slate-700">Repair Changes Summary</h4>
            <p className="text-sm text-slate-600 mt-1">Only showing items added or changed in the supplement</p>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-700 uppercase bg-slate-100 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left">Service / Repair ADDED</th>
                  <th className="px-6 py-3 text-right">Cost</th>
                  <th className="px-6 py-3 text-center">Charge Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Filter to show only NEW and CHANGED items */}
                {comparisons
                  .filter(comparison => comparison.type === 'new' || comparison.type === 'changed')
                  .sort((a, b) => {
                    // Sort NEW items first, then CHANGED
                    if (a.type === 'new' && b.type !== 'new') return -1;
                    if (a.type !== 'new' && b.type === 'new') return 1;
                    return 0;
                  })
                  .map((comparison) => {
                    const rowClass = comparison.type === 'new'
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'bg-orange-50 hover:bg-orange-100';
                    
                    // For changed items, show only the added cost (variance)
                    const displayCost = comparison.type === 'new'
                      ? comparison.supplement.total
                      : Math.abs(comparison.totalVariance);
                    
                    return (
                      <tr key={comparison.id} className={rowClass}>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          <div className="flex flex-col gap-1">
                            <span>{comparison.description}</span>
                            {comparison.type === 'changed' && (
                              <span className="text-xs text-slate-600">
                                (Modified from original: {formatCurrency(comparison.original?.total || 0)})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold text-lg ${comparison.totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {comparison.totalVariance > 0 ? '+' : ''}{formatCurrency(displayCost)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {comparison.classification ? (
                            <ChargeTypeBadge
                              type={comparison.classification.chargeType}
                              confidence={comparison.classification.confidence}
                            />
                          ) : (
                            <span className="text-xs text-slate-400">Unknown</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {comparisons.filter(c => c.type === 'new' || c.type === 'changed').length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      No changes detected between original and supplement invoices
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="font-semibold text-slate-800 bg-slate-50 sticky bottom-0">
                <tr>
                  <td className="px-6 py-3 text-right">Total Added Cost</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`text-lg ${totalVariance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {totalVariance > 0 ? '+' : ''}{formatCurrency(Math.abs(totalVariance))}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center text-xs text-slate-600">
                    {comparisons.filter(c => c.type === 'new' || c.type === 'changed').length} item(s)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  count: number;
}> = ({ label, isActive, onClick, count }) => {
  const baseClasses = "px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center";
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "bg-slate-200 text-slate-700 hover:bg-slate-300";
  return (
    <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
      <span className={`ml-2 text-xs font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}>{count}</span>
    </button>
  );
};


const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ originalInvoice, supplementInvoice, summary }) => {
  const [filter, setFilter] = useState<'all' | 'new' | 'changed'>('all');
  const [viewMode, setViewMode] = useState<'side-by-side' | 'line-by-line'>('side-by-side');
  const [error, setError] = useState<string | null>(null);

  // Generate line item comparisons with error handling
  const comparisons = useMemo(() => {
    try {
      // Validate input data
      if (!originalInvoice || !supplementInvoice) {
        console.warn('Missing invoice data:', { originalInvoice, supplementInvoice });
        return [];
      }
      
      if (!Array.isArray(originalInvoice.lineItems) || !Array.isArray(supplementInvoice.lineItems)) {
        console.warn('Invalid line items structure:', {
          originalItems: originalInvoice.lineItems,
          supplementItems: supplementInvoice.lineItems
        });
        return [];
      }
    const comparisonMap = new Map<string, LineItemComparison>();
    
    // Process supplement items
    supplementInvoice.lineItems.forEach(suppItem => {
      const originalItem = originalInvoice.lineItems.find(orig =>
        orig.description.toLowerCase().trim() === suppItem.description.toLowerCase().trim()
      );
      
      let type: 'new' | 'changed' | 'unchanged' | 'removed' = 'new';
      let quantityVariance = 0;
      let priceVariance = 0;
      let totalVariance = suppItem.total;
      let percentageChange: number | null = null;
      
      if (originalItem) {
        quantityVariance = suppItem.quantity - originalItem.quantity;
        priceVariance = suppItem.price - originalItem.price;
        totalVariance = suppItem.total - originalItem.total;
        percentageChange = ((totalVariance / originalItem.total) * 100);
        
        type = (quantityVariance !== 0 || priceVariance !== 0) ? 'changed' : 'unchanged';
      } else {
        percentageChange = null; // New items don't have percentage change
      }
      
      // Classify the charge
      let classification: ChargeClassificationResult | undefined;
      try {
        classification = classifyCharge(suppItem);
      } catch (classifyError) {
        console.warn('Failed to classify charge:', suppItem.id, classifyError);
      }
      
      comparisonMap.set(suppItem.id, {
        id: suppItem.id,
        description: suppItem.description,
        original: originalItem,
        supplement: suppItem,
        type,
        quantityVariance,
        priceVariance,
        totalVariance,
        percentageChange,
        classification
      });
    });
    
    // Process removed items (in original but not in supplement)
    originalInvoice.lineItems.forEach(origItem => {
      const exists = supplementInvoice.lineItems.find(supp =>
        supp.description.toLowerCase().trim() === origItem.description.toLowerCase().trim()
      );
      
      if (!exists) {
        // Classify removed items too
        let classification: ChargeClassificationResult | undefined;
        try {
          classification = classifyCharge(origItem);
        } catch (classifyError) {
          console.warn('Failed to classify removed charge:', origItem.id, classifyError);
        }
        
        comparisonMap.set(`removed-${origItem.id}`, {
          id: `removed-${origItem.id}`,
          description: origItem.description,
          original: origItem,
          supplement: origItem, // Use original as placeholder
          type: 'removed',
          quantityVariance: -origItem.quantity,
          priceVariance: -origItem.price,
          totalVariance: -origItem.total,
          percentageChange: -100,
          classification
        });
      }
    });
    
      return Array.from(comparisonMap.values());
    } catch (error) {
      console.error('Error generating comparisons:', error);
      setError('Failed to generate comparison data. Please refresh and try again.');
      return [];
    }
  }, [originalInvoice, supplementInvoice]);

  // Calculate summary statistics by charge type
  const chargeSummary = useMemo(() => {
    const summary: Record<ChargeType, { count: number; total: number; partCost: number; laborCost: number }> = {
      [ChargeType.PART_WITH_LABOR]: { count: 0, total: 0, partCost: 0, laborCost: 0 },
      [ChargeType.LABOR_ONLY]: { count: 0, total: 0, partCost: 0, laborCost: 0 },
      [ChargeType.MATERIAL]: { count: 0, total: 0, partCost: 0, laborCost: 0 },
      [ChargeType.SUBLET]: { count: 0, total: 0, partCost: 0, laborCost: 0 },
      [ChargeType.MISCELLANEOUS]: { count: 0, total: 0, partCost: 0, laborCost: 0 },
      [ChargeType.UNKNOWN]: { count: 0, total: 0, partCost: 0, laborCost: 0 }
    };
    
    comparisons.forEach(comp => {
      if (comp.classification) {
        const chargeType = comp.classification.chargeType;
        summary[chargeType].count++;
        summary[chargeType].total += comp.supplement.total;
        
        if (comp.classification.costBreakdown) {
          summary[chargeType].partCost += comp.classification.costBreakdown.partCost;
          summary[chargeType].laborCost += comp.classification.costBreakdown.laborCost;
        }
      }
    });
    
    return summary;
  }, [comparisons]);

  const newItemsCount = comparisons.filter(c => c.type === 'new').length;
  const changedItemsCount = comparisons.filter(c => c.type === 'changed').length;
  const removedItemsCount = comparisons.filter(c => c.type === 'removed').length;

  const filteredComparisons = comparisons.filter(comparison => {
    if (filter === 'new') return comparison.type === 'new';
    if (filter === 'changed') return comparison.type === 'changed';
    return true; // 'all'
  });

  // Show error state if there's an error
  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="text-red-600">⚠️</div>
              <div>
                <div className="text-red-800 font-medium">Comparison Error</div>
                <div className="text-red-600 text-sm mt-1">{error}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state if data is missing
  if (!originalInvoice || !supplementInvoice) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-slate-600">Loading invoice data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Enhanced Header with View Controls */}
      <div className="p-6 border-b border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Enhanced Invoice Comparison</h3>
            <p className="text-sm text-slate-600 mt-1">
              Comprehensive analysis with variance detection and statistical insights
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'side-by-side'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Side-by-Side
              </button>
              <button
                onClick={() => setViewMode('line-by-line')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'line-by-line'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Line-by-Line
              </button>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex items-center space-x-2">
              <FilterButton
                label="All"
                isActive={filter === 'all'}
                onClick={() => setFilter('all')}
                count={comparisons.length}
              />
              <FilterButton
                label="New"
                isActive={filter === 'new'}
                onClick={() => setFilter('new')}
                count={newItemsCount}
              />
              <FilterButton
                label="Changed"
                isActive={filter === 'changed'}
                onClick={() => setFilter('changed')}
                count={changedItemsCount}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Comparison Content */}
      <div className="p-6">
        <EnhancedComparisonTable
          comparisons={filteredComparisons}
          viewMode={viewMode}
          originalInvoice={originalInvoice}
          supplementInvoice={supplementInvoice}
          chargeSummary={chargeSummary}
        />
      </div>

      {/* AI Summary Section */}
      <div className="p-6 border-t border-slate-200">
        <h4 className="text-lg font-semibold text-slate-700 mb-3">Analysis Summary</h4>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 prose prose-sm max-w-none">
          {summary.split('\n').map((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
              return <strong key={index} className="block mt-2 font-bold text-slate-800">{trimmedLine.replace(/\*\*/g, '')}</strong>
            }
            if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
              return <li key={index} className="ml-4 list-disc">{trimmedLine.substring(2)}</li>
            }
            if (trimmedLine) {
              return <p key={index}>{trimmedLine}</p>;
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewer;