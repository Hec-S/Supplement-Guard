import React, { useState, useMemo } from 'react';
import { Invoice, InvoiceLineItem } from '../types';
import {
  formatCurrency,
  formatPercentage,
  formatDecimal
} from '../utils/formatters';

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
}

// Remove local formatting functions - now using centralized utilities

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
  supplementInvoice: Invoice
}> = ({ comparisons, viewMode, originalInvoice, supplementInvoice }) => {
  
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
              {comparisons.map((comparison) => (
                <div key={comparison.id} className="group hover:bg-slate-50 rounded-lg p-4 border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    {/* Item Details */}
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm leading-tight ${
                        comparison.type === 'new' ? 'text-red-600' : 'text-slate-800'
                      }`}>
                        {comparison.description}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span>Qty: {comparison.supplement.quantity}</span>
                        <span>•</span>
                        <span>Unit: {formatCurrency(comparison.supplement.price)}</span>
                        <span>•</span>
                        <span>Total: {formatCurrency(comparison.supplement.total)}</span>
                      </div>
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

        {/* Supplement Invoice Table */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-4 border-b border-slate-200">
            <h4 className="text-lg font-semibold text-slate-700">Final Invoice (with Supplement)</h4>
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
                {supplementInvoice.lineItems.map((item) => {
                  const comparison = comparisons.find(c => c.supplement?.id === item.id);
                  const rowClass = comparison?.type === 'new' ? 'bg-blue-50 hover:bg-blue-100' :
                                  comparison?.type === 'changed' ? 'bg-orange-50 hover:bg-orange-100' :
                                  'hover:bg-slate-50';
                  
                  // Safe access to variance values with fallbacks
                  const quantityVariance = comparison?.quantityVariance ?? 0;
                  const priceVariance = comparison?.priceVariance ?? 0;
                  const totalVariance = comparison?.totalVariance ?? 0;
                  
                  return (
                    <tr key={item.id} className={rowClass}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          {comparison?.type === 'new' && <span className="text-blue-600 font-bold text-xs">NEW</span>}
                          {comparison?.type === 'changed' && <span className="text-orange-600 font-bold text-xs">CHANGED</span>}
                          <span>{item.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.quantity}
                        {quantityVariance !== 0 && (
                          <ChangeIndicator value={quantityVariance} isCurrency={false} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(item.price)}
                        {priceVariance !== 0 && (
                          <ChangeIndicator value={priceVariance} isCurrency={true} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(item.total)}
                        {totalVariance !== 0 && (
                          <ChangeIndicator value={totalVariance} isCurrency={true} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="font-semibold text-slate-800 bg-slate-50 sticky bottom-0">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right">Subtotal</td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(supplementInvoice.subtotal)}
                    <ChangeIndicator value={supplementInvoice.subtotal - originalInvoice.subtotal} isCurrency={true} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right">Tax</td>
                  <td className="px-4 py-2 text-right">
                    {formatCurrency(supplementInvoice.tax)}
                    <ChangeIndicator value={supplementInvoice.tax - originalInvoice.tax} isCurrency={true} />
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-base">Total</td>
                  <td className="px-4 py-2 text-right text-base">
                    {formatCurrency(supplementInvoice.total)}
                    <ChangeIndicator value={totalVariance} isCurrency={true} />
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
      
      comparisonMap.set(suppItem.id, {
        id: suppItem.id,
        description: suppItem.description,
        original: originalItem,
        supplement: suppItem,
        type,
        quantityVariance,
        priceVariance,
        totalVariance,
        percentageChange
      });
    });
    
    // Process removed items (in original but not in supplement)
    originalInvoice.lineItems.forEach(origItem => {
      const exists = supplementInvoice.lineItems.find(supp =>
        supp.description.toLowerCase().trim() === origItem.description.toLowerCase().trim()
      );
      
      if (!exists) {
        comparisonMap.set(`removed-${origItem.id}`, {
          id: `removed-${origItem.id}`,
          description: origItem.description,
          original: origItem,
          supplement: origItem, // Use original as placeholder
          type: 'removed',
          quantityVariance: -origItem.quantity,
          priceVariance: -origItem.price,
          totalVariance: -origItem.total,
          percentageChange: -100
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
        />
      </div>

      {/* AI Summary Section */}
      <div className="p-6 border-t border-slate-200">
        <h4 className="text-lg font-semibold text-slate-700 mb-3">AI Analysis Summary</h4>
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